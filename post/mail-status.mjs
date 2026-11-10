export const mailModes={open:'Accepting mail',inbox:'Accepting mail · inbox only',closed:'Not accepting mail'};
export const statusTime=value=>Number.isFinite(Number(value))&&Number(value)>0?new Date(Number(value)).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
export function deliverySummary(r={},when=0,reply=false){
 if(reply){
  if(r.replySeenAt)return {label:'Your reply seen · '+statusTime(r.replySeenAt),seen:true};
  if(r.replyDeliveredAt)return {label:'Your reply delivered · seen not confirmed'};
  return {label:r.replyAt?'Reply sent · waiting for delivery':'Reply sent · status not reported yet'};
 }
 if(r.seenAt)return {label:'Seen · '+statusTime(r.seenAt),seen:true};
 if(r.displayedAt||r.outcome==='screen')return {label:'Displayed · seen not confirmed'};
 if(r.rejectedAt||r.outcome==='rejected')return {label:'Pop-up declined · kept in inbox'};
 if(r.lockedNotificationAt||r.outcome==='locked_notification')return {label:'Seen not confirmed · notification posted while locked'};
 if(r.notificationAt||r.outcome==='notification')return {label:'Notification posted · seen not confirmed'};
 if(Number(when)>Date.now())return {label:'Scheduled · '+statusTime(when)};
 if(r.deliveredAt||r.status==='acknowledged'||r.outcome==='inbox')return {label:'Delivered to phone · seen not confirmed'};
 return {label:'Sent · waiting for delivery confirmation'};
}
export function deliveryTimeline(r={},when=0,reply=false){
 const fields=reply?[['Reply sent',r.replyAt],['Reply delivered to phone',r.replyDeliveredAt],['Reply seen',r.replySeenAt]]:
  [['Sent',r.sentAt],['Delivered to phone',r.deliveredAt],['Notification posted',r.notificationAt],['Notification posted while phone was locked',r.lockedNotificationAt],['Pop-up declined',r.rejectedAt],['Displayed on unlocked screen',r.displayedAt],['Seen',r.seenAt]];
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
