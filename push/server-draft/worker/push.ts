import { createFcmSender } from './fcm.mjs';
import { digest, InputError, jsonBody } from './mail-data';

type PushEnv = { FCM_PROJECT_ID?:string, FCM_CLIENT_EMAIL?:string, FCM_PRIVATE_KEY?:string };
let previous='',sender:ReturnType<typeof createFcmSender>|null=null;
export async function registerDevice(request:Request,db:D1Database,key:string,output:(x:unknown,status?:number)=>Response) {
  const body=await jsonBody(request,8192),token=body.token;
  if(typeof token!=='string'||token.length<20||token.length>4096||/\s/.test(token))throw new InputError(400,'Invalid push registration');
  const owner=await digest('owner',key),now=Date.now();
  // A token can only belong to one mailbox, including after reinstall or account changes.
  await db.batch([
    db.prepare('DELETE FROM push_devices WHERE token=? AND owner<>?').bind(token,owner),
    db.prepare(`INSERT INTO push_devices(owner,token,updated) VALUES(?,?,?)
      ON CONFLICT(owner,token) DO UPDATE SET updated=excluded.updated`).bind(owner,token,now),
    db.prepare(`DELETE FROM push_devices WHERE owner=? AND token NOT IN
      (SELECT token FROM push_devices WHERE owner=? ORDER BY updated DESC LIMIT 10)`).bind(owner,owner)
  ]);
  return output({ok:true});
}
export async function wakeMailbox(db:D1Database,owner:string,urgent:boolean,env:PushEnv){
  const {FCM_PROJECT_ID,FCM_CLIENT_EMAIL,FCM_PRIVATE_KEY}=env;
  if(!FCM_PROJECT_ID||!FCM_CLIENT_EMAIL||!FCM_PRIVATE_KEY)return;
  const fingerprint=FCM_PROJECT_ID+'\n'+FCM_CLIENT_EMAIL+'\n'+FCM_PRIVATE_KEY;
  if(previous!==fingerprint){sender=createFcmSender({projectId:FCM_PROJECT_ID,clientEmail:FCM_CLIENT_EMAIL,privateKey:FCM_PRIVATE_KEY});previous=fingerprint;}
  const rows=await db.prepare('SELECT token FROM push_devices WHERE owner=? ORDER BY updated DESC LIMIT 10').bind(owner).all<{token:string}>();
  await Promise.allSettled(rows.results.map(({token})=>sender!(token,{urgent})));
}
