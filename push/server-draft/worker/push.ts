import { createFcmSender } from './fcm.mjs';
import { digest, InputError, jsonBody } from './mail-data';

type PushEnv = { FCM_SERVICE_ACCOUNT?:string };
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
  const credential=env.FCM_SERVICE_ACCOUNT;
  if(!credential)return;
  if(previous!==credential){
    let account:{project_id?:string,client_email?:string,private_key?:string};
    try{account=JSON.parse(credential)}catch{return;}
    if(!account||account.project_id!=='you-ve-got-mail-f8f2b'||typeof account.client_email!=='string'||typeof account.private_key!=='string')return;
    sender=createFcmSender({projectId:account.project_id,clientEmail:account.client_email,privateKey:account.private_key});previous=credential;
  }
  const rows=await db.prepare('SELECT token FROM push_devices WHERE owner=? ORDER BY updated DESC LIMIT 10').bind(owner).all<{token:string}>();
  await Promise.allSettled(rows.results.map(({token})=>sender!(token,{urgent})));
}
