export const mailModes={open:'Accepting mail',inbox:'Accepting mail · inbox only',closed:'Not accepting mail'};
export const statusTime=value=>Number.isFinite(Number(value))&&Number(value)>0?new Date(Number(value)).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
const earliest=(...values)=>{const times=values.map(Number).filter(n=>Number.isFinite(n)&&n>0);return times.length?Math.min(...times):0;};
export const mailSeenAt=r=>earliest(r.seenAt,r.displayedAt,r.outcome==='screen'?r.outcomeAt:0);
export function deliverySummary(r={},when=0,reply=false){
 if(reply){
  if(r.replySeenAt)return {stage:'seen',label:'Your reply seen · '+statusTime(r.replySeenAt),seen:true};
  if(r.replyDeliveredAt)return {stage:'delivered',label:'Your reply delivered · '+statusTime(r.replyDeliveredAt)};
  return {stage:'sent',label:'Reply sent · waiting for their phone'};
 }
 const seen=mailSeenAt(r);
 if(seen||r.outcome==='screen')return {stage:'seen',label:'Seen'+(seen?' · '+statusTime(seen):''),seen:true};
 if(Number(when)>Date.now())return {stage:'scheduled',label:'Scheduled · '+statusTime(when)};
 const collected=Number(r.deliveredAt)||earliest(r.notificationAt,r.lockedNotificationAt,r.rejectedAt);
 if(collected||r.status==='acknowledged'||['inbox','notification','locked_notification','rejected'].includes(r.outcome))return {stage:'delivered',label:'Delivered to phone'+(collected?' · '+statusTime(collected):'')};
 return {stage:'sent',label:'Sent · waiting for their phone'};
}
export function deliveryTimeline(r={},when=0,reply=false){
 const seen=mailSeenAt(r);
 const fields=reply?[['Reply sent',r.replyAt],['Reply delivered to phone',r.replyDeliveredAt],['Reply seen',r.replySeenAt]]:
  [['Sent',r.sentAt],['Delivered to phone',Number(r.deliveredAt)||earliest(r.notificationAt,r.lockedNotificationAt,r.rejectedAt,seen)],['Notification posted',r.notificationAt],['Notification posted while phone was locked',r.lockedNotificationAt],['Pop-up declined',r.rejectedAt],['Seen',seen]];
 return fields.filter(([,at])=>at>0).map(([label,at])=>({label,at,time:statusTime(at)})).sort((a,b)=>a.at-b.at);
}
export function friendFacts(friend){
 const s=friend.settings||{},facts=[['Mail',mailModes[friend.mode]||'Status not reported']];
 for(const [key,label] of [['notifications','Delivery notifications'],['popups','Full-screen pop-ups'],['warning','Incoming warning'],['onUnlock','Pop-ups after unlocking'],['replyNotifications','Reply notifications'],['precise','Precise schedules']]){
  if(typeof s[key]==='boolean')facts.push([label,s[key]?'On':'Off']);
 }
 if(['connected','pending','unavailable'].includes(s.push))facts.push(['Push connection',{connected:'Registered',pending:'Connecting',unavailable:'Unavailable'}[s.push]]);
 if(friend.lastContactAt)facts.push(['Last app check-in',statusTime(friend.lastContactAt)]);
 if(friend.settingsAt)facts.push(['Settings reported',statusTime(friend.settingsAt)]);
 return facts;
}
