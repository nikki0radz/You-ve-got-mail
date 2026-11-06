import { registerDevice, wakeMailbox } from './push';
const DAY = 86_400_000;
// Persisted numeric ranks: never reorder. A stronger observation supersedes a weaker one.
const OUTCOMES = ["inbox", "notification", "locked_notification", "rejected", "screen"] as const;
const PAGES = "https://nikki0radz.github.io";
import { MAX_IMAGE, secret, digest, InputError, jsonBody, label, pngSizeSafe, parcelContents, checkReceipt, closedMail } from "./mail-data";
import { friendAction } from "./friends";
import { designAction } from "./design";
export async function deliveryApi(request: Request, db?: D1Database, env: {FCM_SERVICE_ACCOUNT?:string} = {}, ctx?: ExecutionContext) {
  const url = new URL(request.url);
  const design = url.pathname.startsWith("/api/design/");
  const origin = request.headers.get("origin");
  // Native clients omit Origin. The guest page hosts no secrets beyond the visitor's own invite.
  const headers = new Headers({"Content-Type":"application/json","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Vary":"Origin"});
  if (origin === PAGES || origin === url.origin || (design && (origin === "null" || origin === "https://appassets.androidplatform.net"))) headers.set("Access-Control-Allow-Origin",origin);
  const output = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers});
  if (request.method === "OPTIONS") {
    headers.set("Access-Control-Allow-Methods","GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers","Authorization, Content-Type");
    return new Response(null,{status:204,headers});
  }
  if (!db) return output({error:"Delivery server is unavailable."},503);
  try {
    if (design) return await designAction(request,db,url.pathname,output);
    const auth = /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get("Authorization") || "");
    if (!auth) return output({error:"Missing or invalid access key."},401);
    const key = auth[1], now = Date.now();
    const route = request.method + " " + url.pathname;
    if (route === "POST /api/device/register") return registerDevice(request,db,key,output);
    const wake=(owner:string,urgent:boolean)=>{const task=wakeMailbox(db!,owner,urgent,env).catch(()=>{});ctx?.waitUntil(task);};
    if (new URL(request.url).pathname.startsWith("/api/friends") || route === "POST /api/profile") {
      return await friendAction(request,db,route,key,output,wake);
    }
    if (route === "POST /api/links") {
      const owner = await digest("owner",key), token = secret(), expiresAt = now + 7*DAY;
      const rateKey = await digest("rate-"+Math.floor(now/DAY),request.headers.get("CF-Connecting-IP") || "unknown");
      await db.prepare("DELETE FROM parcels WHERE id IN (SELECT id FROM parcels WHERE expires<=? LIMIT 100)").bind(now).run();
      const result = await db.prepare(`INSERT INTO parcels(id,owner,token,issued,expires,rate_key) SELECT ?,?,?,?,?,?
        WHERE (SELECT count(*) FROM parcels WHERE rate_key=? AND issued>?)<200
          AND (SELECT count(*) FROM parcels WHERE owner=? AND sent IS NULL AND expires>?)<30`)
        .bind(crypto.randomUUID(),owner,await digest("invite",token),now,expiresAt,rateKey,rateKey,now-DAY,owner,now).run();
      if (!result.meta.changes) return output({error:"Invite limit reached. Try again later."},429);
      return output({token,expiresAt},201);
    }
    if (route === "GET /api/link" || route === "POST /api/send") {
      const token = await digest("invite",key);
      const gone = () => output({error:"This link has expired or was already used."},410);
      const lookup = () => db.prepare("SELECT parcels.id,parcels.owner,sent,receipt,mode AS recipient_mode,name AS recipient_name FROM parcels LEFT JOIN profiles ON profiles.owner=parcels.owner WHERE token=? AND expires>?")
        .bind(token,Date.now()).first<{id:string,owner:string,sent:number|null,receipt:string|null,recipient_mode:string|null,recipient_name:string|null}>();
      const invite = await lookup();
      if (!invite) return gone();
      if (route === "GET /api/link") {
        if (invite.sent !== null) return gone();
        if (invite.recipient_mode === "closed") return output(closedMail,409);
        return output({available:true,recipientName:invite.recipient_name ?? undefined,mode:invite.recipient_mode ?? "open"});
      }
      const body = await jsonBody(request, MAX_IMAGE+2048);
      const clientSecret = checkReceipt(body.receiptSecret,key);
      const receipt = clientSecret ?? secret();
      const receiptHash = await digest("receipt",receipt);
      const recover = (row: typeof invite | null) => row?.sent != null && clientSecret && row.receipt === receiptHash
        ? output({id:row.id,receipt}) : gone();
      if (invite.sent !== null) return recover(invite);
      if (invite.recipient_mode === "closed") return output(closedMail,409);
      const contents = parcelContents(body,label(body.sender,64),now);
      const sentAt = Date.now(), payload = JSON.stringify(contents), when = contents.when;
      const result = await db.prepare(`UPDATE OR IGNORE parcels SET sent=?,expires=?,receipt=?,
        payload=json_set(?,'$.inboxOnly',json(CASE WHEN EXISTS(SELECT 1 FROM profiles WHERE profiles.owner=parcels.owner AND mode='inbox') THEN 'true' ELSE 'false' END)),
        scheduled_for=? WHERE id=? AND sent IS NULL AND expires>?
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.owner=parcels.owner AND p.mode='closed')`)
        .bind(sentAt,Math.max(sentAt,when)+7*DAY,receiptHash,payload,when,invite.id,sentAt).run();
      if (!result.meta.changes) {
        const current = await lookup();
        if (current?.sent === null && current.recipient_mode === "closed") return output(closedMail,409);
        if (current && current.sent === null) throw new InputError(409,"Use a fresh receipt key for each invitation.");
        return recover(current);
      }
      wake(invite.owner,contents.when<=now+5000);
      return output({id:invite.id,receipt},201);
    }
    if (route === "GET /api/inbox") {
      const owner = await digest("owner",key);
      const row = await db.prepare("SELECT id,sent,payload FROM parcels WHERE owner=? AND expires>? AND payload IS NOT NULL ORDER BY sent,id LIMIT 1").bind(owner,now).first<{id:string,sent:number,payload:string}>();
      return output({messages:row?[{...JSON.parse(row.payload),id:row.id,createdAt:row.sent}]:[]});
    }
    if (route === "POST /api/outcome") {
      const body = await jsonBody(request,8192);
      const rank = OUTCOMES.indexOf(body.outcome) + 1;
      if (!rank) throw new InputError(400,"Unknown delivery outcome.");
      const id = label(body.id,48), owner = await digest("owner",key);
      const result = await db.prepare(`UPDATE parcels SET
        outcome_at=CASE WHEN COALESCE(outcome_rank,0) < ? THEN ? ELSE outcome_at END,
        outcome_rank=MAX(COALESCE(outcome_rank,0),?)
        WHERE id=? AND owner=? AND sent IS NOT NULL AND expires>?`)
        .bind(rank,now,rank,id,owner,now).run();
      return result.meta.changes ? output({ok:true}) : output({error:"Parcel unavailable."},404);
    }
    if (route === "POST /api/ack") {
      const body=await jsonBody(request,8192), id=label(body.id,48), owner=await digest("owner",key);
      const result=await db.prepare("UPDATE parcels SET scheduled_for=COALESCE(scheduled_for,json_extract(payload,'$.when')),payload=NULL WHERE id=? AND owner=? AND sent IS NOT NULL AND expires>?")
        .bind(id,owner,now).run();
      return result.meta.changes ? output({ok:true}) : output({error:"Parcel unavailable."},404);
    }
    if (route === "POST /api/reply") {
      const body=await jsonBody(request,MAX_IMAGE+8192), id=label(body.id,48), owner=await digest("owner",key);
      const text=body.text == null || body.text === "" ? null : label(body.text,1000);
      const image=body.image ?? null;
      if (image !== null && !pngSizeSafe(image)) throw new InputError(422,"Choose a smaller PNG (up to 1.35 MB).");
      if (!text && !image) throw new InputError(400,"Write a reply or choose a sticker.");
      const access="id=? AND owner=? AND sent IS NOT NULL AND expires>?";
      const [result]=await db.batch([
        db.prepare("UPDATE parcels SET reply=? WHERE "+access).bind(text,id,owner,now),
        image ? db.prepare("INSERT INTO reply_images(parcel,image) SELECT id,? FROM parcels WHERE "+access+" ON CONFLICT(parcel) DO UPDATE SET image=excluded.image").bind(image,id,owner,now)
              : db.prepare("DELETE FROM reply_images WHERE parcel IN (SELECT id FROM parcels WHERE "+access+")").bind(id,owner,now)
      ]);
      return result.meta.changes ? output({ok:true}) : output({error:"Parcel unavailable."},404);
    }
    if (route === "GET /api/receipt") {
      const row = await db.prepare(`SELECT reply, CASE WHEN payload IS NULL THEN 'acknowledged' ELSE 'queued' END AS status,
        COALESCE(scheduled_for,json_extract(payload,'$.when')) AS schedule, outcome_rank, outcome_at
         , (SELECT image FROM reply_images WHERE parcel=parcels.id) AS replyImage FROM parcels WHERE receipt=? AND sent IS NOT NULL AND expires>?`)
        .bind(await digest("receipt",key),now).first<{reply:string|null,replyImage:string|null,status:string,schedule:number|null,outcome_rank:number|null,outcome_at:number|null}>();
      if (!row) return output({error:"Receipt unavailable."},404);
      return output({reply:row.reply,replyImage:row.replyImage ?? undefined,status:row.status,when:row.schedule ?? undefined,
        outcome:row.outcome_rank ? OUTCOMES[row.outcome_rank-1] : undefined,outcomeAt:row.outcome_at ?? undefined});
    }
    return output({error:"Unknown delivery action."},404);
  } catch (err) {
    if (err instanceof InputError) return output({error:err.message},err.status);
    return output({error:"Delivery service is temporarily unavailable."},503);
  }
}
