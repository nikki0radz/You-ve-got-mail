import { MAX_IMAGE, checkReceipt, closedMail, digest, InputError, jsonBody, label, parcelContents, secret } from "./mail-data";

type Profile = {owner:string,code:string,name:string,mode:string};
type Event = {cursor:number,code:string,name:string,mode:string,at:number};
type Output = (value:unknown,status?:number)=>Response;
const day = 86_400_000;
const modes = ["open","inbox","closed"];

function parseCode(value:unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{10}$/i.test(value.trim())) throw new InputError(400,"Use the full 10-character friend code.");
  return value.trim().toUpperCase();
}
function publicProfile(profile:Profile) {
  return {code:profile.code,name:profile.name,mode:profile.mode};
}

async function updateProfile(db:D1Database, request:Request, owner:string, output:Output) {
  const body = await jsonBody(request,2048), now=Date.now();
  const name = body.name === undefined ? null : label(body.name,64);
  const mode = body.mode === undefined ? null : body.mode;
  if (mode !== null && !modes.includes(mode)) throw new InputError(400,"Unknown mail setting.");
  const lookup=()=>db.prepare("SELECT owner,code,name,mode FROM profiles WHERE owner=?").bind(owner).first<Profile>();
  if (!await lookup()) {
    const ip=request.headers.get("CF-Connecting-IP") || "unknown";
    const bucket=await digest("signups-"+Math.floor(now/day),ip);
    // A concurrent first launch for the same key must keep one stable friend code.
    for(let attempt=0;attempt<3;attempt++){
      const code=secret().slice(0,10).toUpperCase();
      await db.prepare(`INSERT OR IGNORE INTO profiles(owner,code,name,mode,signup_bucket) SELECT ?,?,?,?,?
        WHERE (SELECT count(*) FROM profiles WHERE signup_bucket=?)<100`)
        .bind(owner,code,name ?? "Pigeon post",mode ?? "open",bucket,bucket).run();
      if (await lookup()) break;
      if (attempt===2) throw new InputError(429,"Profile creation is busy. Try again later.");
    }
  }
  const results=await db.batch([
    // Fan out only to people who were accepted friends at this instant. An unchanged
    // setting (including a network retry) never produces a second status event.
    db.prepare(`INSERT INTO friend_events(owner,code,name,mode,at)
      SELECT CASE WHEN f.low=p.owner THEN f.high ELSE f.low END,p.code,COALESCE(?,p.name),?,?
      FROM profiles p JOIN friendships f ON (f.low=p.owner OR f.high=p.owner) AND f.accepted=1
      WHERE p.owner=? AND ? IS NOT NULL AND p.mode<>?`).bind(name,mode,now,owner,mode,mode),
    db.prepare("UPDATE profiles SET name=COALESCE(?,name),mode=COALESCE(?,mode) WHERE owner=?").bind(name,mode,owner),
    db.prepare("SELECT code,name,mode FROM profiles WHERE owner=?").bind(owner)
  ]);
  return output(results[2].results[0]);
}

async function friendsSnapshot(db:D1Database, url:URL, me:Profile, output:Output) {
  const cursorText=url.searchParams.get("cursor"), cursor=Number(cursorText);
  if (cursorText !== null && (!/^\d+$/.test(cursorText) || !Number.isSafeInteger(cursor))) throw new InputError(400,"Invalid friend update cursor.");
  const roster=db.prepare(`SELECT p.code,p.name,p.mode,f.accepted,f.requester=? AS outgoing
    FROM friendships f JOIN profiles p ON p.owner=CASE WHEN f.low=? THEN f.high ELSE f.low END
    WHERE f.low=? OR f.high=? ORDER BY p.name COLLATE NOCASE,p.code`).bind(me.owner,me.owner,me.owner,me.owner);
  const results=await db.batch([
    roster,
    db.prepare("SELECT COALESCE(MAX(seq),0) AS latest FROM friend_events WHERE owner=?").bind(me.owner),
    db.prepare("SELECT seq AS cursor,code,name,mode,at FROM friend_events WHERE owner=? AND seq>? AND ?=1 ORDER BY seq LIMIT 100")
      .bind(me.owner,cursor,cursorText===null?0:1)
  ]);
  const friends=[],incoming=[],outgoing=[];
  for(const row of results[0].results as {code:string,name:string,mode:string,accepted:number,outgoing:number}[]){
    const contact={code:row.code,name:row.name};
    if(row.accepted) friends.push({...contact,mode:row.mode});
    else if(row.outgoing) outgoing.push(contact);
    else incoming.push(contact);
  }
  const events=results[2].results as Event[];
  return output({me:publicProfile(me),friends,incoming,outgoing,events,
    cursor:events.length ? events[events.length-1].cursor : Number((results[1].results[0] as {latest:number}).latest)});
}

async function sendToFriend(db:D1Database, me:Profile, peer:Profile, body:Record<string,unknown>, key:string, output:Output, wake:(owner:string,urgent:boolean)=>void){
  const now=Date.now(), receipt=checkReceipt(body.receiptSecret,key) ?? secret();
  const receiptHash=await digest("receipt",receipt);
  // Binding the retry token to this sender/recipient pair prevents a receipt
  // from being used to replay a parcel against someone else's mailbox.
  const token=await digest("direct",me.owner+peer.owner+receipt);
  const recover=()=>db.prepare("SELECT id FROM parcels WHERE token=? AND receipt=? AND expires>?").bind(token,receiptHash,now).first<{id:string}>();
  const prior=await recover();
  if(prior) return output({id:prior.id,receipt});
  const contents=parcelContents(body,me.name,now), id=crypto.randomUUID();
  const [low,high]=[me.owner,peer.owner].sort(), rateKey="friend:"+me.owner;
  const result=await db.prepare(`INSERT OR IGNORE INTO parcels(id,owner,token,receipt,expires,issued,rate_key,sent,scheduled_for,payload)
    SELECT ?,p.owner,?,?,?,?,?,?,?,
      json_set(?,'$.inboxOnly',json(CASE WHEN p.mode='inbox' THEN 'true' ELSE 'false' END)) FROM profiles p WHERE p.owner=? AND p.mode<>'closed'
    AND (p.owner=? OR EXISTS(SELECT 1 FROM friendships WHERE low=? AND high=? AND accepted=1))
    AND (SELECT count(*) FROM parcels WHERE rate_key=? AND issued>?)<200
    AND (SELECT count(*) FROM parcels WHERE owner=p.owner AND payload IS NOT NULL AND expires>?)<100`)
    .bind(id,token,receiptHash,Math.max(contents.when,now)+7*day,now,rateKey,now,contents.when,JSON.stringify({...contents,senderCode:me.code}),
      peer.owner,me.owner,low,high,rateKey,now-day,now).run();
  if(result.meta.changes){wake(peer.owner,contents.when<=now+5000);return output({id,receipt},201);}
  const sent=await recover();
  if(sent) return output({id:sent.id,receipt});
  if(me.owner!==peer.owner && !await db.prepare("SELECT 1 FROM friendships WHERE low=? AND high=? AND accepted=1").bind(low,high).first()) {
    return output({error:"You need to be accepted friends to send mail."},403);
  }
  const current=await db.prepare("SELECT mode FROM profiles WHERE owner=?").bind(peer.owner).first<{mode:string}>();
  if(current?.mode==="closed") return output(closedMail,409);
  if(await db.prepare("SELECT 1 FROM parcels WHERE receipt=?").bind(receiptHash).first()) throw new InputError(409,"Use a fresh receipt key for this parcel.");
  return output({error:"The mailbox is busy. Try again later."},429);
}

export async function friendAction(request:Request,db:D1Database,route:string,key:string,output:Output,wake:(owner:string,urgent:boolean)=>void){
  const owner=await digest("owner",key);
  if(route==="POST /api/profile") return updateProfile(db,request,owner,output);
  const me=await db.prepare("SELECT owner,code,name,mode FROM profiles WHERE owner=?").bind(owner).first<Profile>();
  if(!me) throw new InputError(409,"Set up your postal profile first.");
  if(route==="GET /api/friends") return friendsSnapshot(db,new URL(request.url),me,output);
  const actions=["POST /api/friends/request","POST /api/friends/accept","POST /api/friends/decline","POST /api/friends/send"];
  if(!actions.includes(route)) throw new InputError(404,"Unknown friend action.");
  const body=await jsonBody(request,route==="POST /api/friends/send" ? MAX_IMAGE+2048 : 1024);
  const code=parseCode(body.code);
  const peer=await db.prepare("SELECT owner,code,name,mode FROM profiles WHERE code=?").bind(code).first<Profile>();
  if(!peer) throw new InputError(404,"No person found with that code.");
  if(route==="POST /api/friends/send") return sendToFriend(db,me,peer,body,key,output,wake);
  if(owner===peer.owner) throw new InputError(400,"This is your own friend code.");
  const [low,high]=[owner,peer.owner].sort();
  if(route==="POST /api/friends/request"){
    const result=await db.prepare(`INSERT OR IGNORE INTO friendships(low,high,requester) SELECT ?,?,?
      WHERE (SELECT count(*) FROM friendships WHERE (low=? OR high=?) AND accepted=0)<100
        AND (SELECT count(*) FROM friendships WHERE (low=? OR high=?) AND accepted=0)<100`).bind(low,high,owner,owner,owner,peer.owner,peer.owner).run();
    if(result.meta.changes) return output({ok:true});
    const edge=await db.prepare("SELECT accepted,requester FROM friendships WHERE low=? AND high=?").bind(low,high).first<{accepted:number,requester:string}>();
    if(!edge) throw new InputError(429,"Too many pending friend requests.");
    if(!edge.accepted && edge.requester!==owner) throw new InputError(409,"They already requested you. Accept their request.");
    return output({ok:true});
  }
  const result=route==="POST /api/friends/accept"
    ? await db.prepare("UPDATE friendships SET accepted=1 WHERE low=? AND high=? AND requester=?").bind(low,high,peer.owner).run()
    : await db.prepare("DELETE FROM friendships WHERE low=? AND high=? AND requester=? AND accepted=0").bind(low,high,peer.owner).run();
  return result.meta.changes ? output({ok:true}) : output({error:"No incoming request from this person."},404);
}
