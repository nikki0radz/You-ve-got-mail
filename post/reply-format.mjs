// Older apps saved every picture reply with kind "Reply". Keep unknown pictures
// neutral, and use the chosen collection for newly sent picture replies.
const pictureLabels={Photos:'Photo reply','Photo frames':'Photo reply',Postcards:'Postcard reply',Stickers:'Sticker reply',Pigeons:'Sticker reply',Flowers:'Flower reply',Reminders:'Reminder reply','Love notes':'Love note reply',Notes:'Note reply'};
export function pictureReplyLabel(category){return pictureLabels[category]||'Picture reply';}
export function replyPreview(row){
 const text=typeof row.text==='string'&&(row.text!=='null'||row.nullChecked)?row.text:'';
 if(row.isReply)return text||(row.hasImage?'Picture reply':'Reply');
 if(/^a?\s*text reply$/i.test(row.kind||''))return text||'Text reply';
 return (row.kind||'').replace(/^a\s+(.* reply)$/i,(_,label)=>label[0].toUpperCase()+label.slice(1));
}
export function replyDestination(row,rows=[]){
 if(!row.remote)return {self:true,name:'Myself'};
 const original=rows.find(m=>m.sent&&m.id===row.originalId);
 const code=row.senderCode||original?.code||'';
 if(!/^[A-F0-9]{10}$/i.test(code))throw Error('This reply has no friend address. Refresh your mailbox and try again.');
 return {self:false,code:code.toUpperCase(),name:row.sender||original?.sender||'Your friend'};
}
