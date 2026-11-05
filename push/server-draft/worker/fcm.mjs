// Firebase Cloud Messaging transport. This module is dormant until the app has
// its own Firebase project and the delivery service is wired to it.
const encoder=new TextEncoder();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encoded=value=>b64url(encoder.encode(JSON.stringify(value)));
function parseKey(pem){
  if(typeof pem!=='string'||!/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----\s*$/.test(pem))throw Error('Invalid service account private key');
  const content=pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
  return Uint8Array.from(atob(content),c=>c.charCodeAt(0));
}
export function createFcmSender({projectId,clientEmail,privateKey,fetchImpl=fetch,clock=()=>Date.now()}){
  if(typeof projectId!=='string'||!/^[a-z][a-z0-9-]{4,62}$/.test(projectId))throw Error('Invalid Firebase project ID');
  if(typeof clientEmail!=='string'||!clientEmail.endsWith('.gserviceaccount.com'))throw Error('Invalid Firebase service account');
  let access=null,pending=null;
  async function bearer(){
    if(access&&clock()<access.until-60000)return access.token;
    if(pending)return pending;
    pending=(async()=>{
      const now=Math.floor(clock()/1000),header=encoded({alg:'RS256',typ:'JWT'}),claims=encoded({iss:clientEmail,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
      const unsigned=header+'.'+claims,key=await crypto.subtle.importKey('pkcs8',parseKey(privateKey),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
      const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(unsigned));
      const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+b64url(new Uint8Array(signature))})});
      if(!response.ok)throw Error('Firebase authorization failed');
      const data=await response.json();if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw Error('Invalid Firebase authorization response');
      access={token:data.access_token,until:clock()+1000*data.expires_in};return access.token;
    })();
    try{return await pending}finally{pending=null}
  }
  return async function sendWake(deviceToken,{urgent=true}={}){
    if(typeof deviceToken!=='string'||deviceToken.length<20||deviceToken.length>4096||/\s/.test(deviceToken))throw Error('Invalid device token');
    const token=await bearer();
    // No private note, sender, image, account key, or recipient information goes to FCM.
    const message={message:{token:deviceToken,data:{type:'mail_available'},android:{priority:urgent?'HIGH':'NORMAL',ttl:'86400s',collapse_key:'mail'}}};
    const response=await fetchImpl('https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(projectId)+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(message)});
    if(response.status===401)access=null;
    if(!response.ok){const error=new Error('Firebase push delivery failed');error.status=response.status;throw error;}
    return true;
  };
}
