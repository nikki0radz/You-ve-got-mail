// Saved replies open offline. Download only to repair absent content or on Refresh.
export async function resolveReplyContent(row,{force=false,loadPicture,fetchReceipt}){
 const text=typeof row.text==='string'?row.text:'';
 const trustedText=text&&!(text==='null'&&!row.nullChecked)?text:'';
 let pictureFailed=false;
 async function saved(fallback=false){
  if(row.hasImage&&!pictureFailed){
   try{return {text:trustedText,image:await loadPicture(),verified:false};}catch{pictureFailed=true;}
  }
  if(trustedText&&(!row.hasImage||fallback))return {text:trustedText,image:'',verified:false};
 }
 if(!force){const content=await saved();if(content)return content;}
 if(row.remote&&row.originalId){
  try{
   const receipt=await fetchReceipt(row.originalId);
   return {text:typeof receipt.reply==='string'?receipt.reply:'',image:typeof receipt.replyImage==='string'&&receipt.replyImage.startsWith('data:image/png;base64,')?receipt.replyImage:'',verified:true};
  }catch{
   const content=await saved(true);
   if(content)return {...content,warning:'Could not refresh this reply. Showing the copy saved on this phone.'};
   return {text:'',image:'',warning:'This reply could not be downloaded. Connect to the internet and tap Refresh reply.'};
  }
 }
 return {text,image:'',verified:false};
}
