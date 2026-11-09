export const practiceCode='practice-friend';
export function incomingRequests(book={}){
 const codes=new Set();return (book.incoming||[]).filter(request=>{
  if(!request?.code||codes.has(request.code))return false;
  codes.add(request.code);return true;
 });
}
export function withPracticeFriend(book={},practice=null){
 const result={...book,friends:[...(book.friends||[])],incoming:incomingRequests(book),outgoing:[...(book.outgoing||[])]};
 if(practice?.status==='pending'||practice?.status==='accepted'){
  const contact={code:practiceCode,id:practice.id,name:'Practice pigeon',mode:'open',simulated:true};
  result[practice.status==='pending'?'incoming':'friends'].push(contact);
 }
 return result;
}
export function createRequestPrompts({requests,available,open}){
 const shown=new Set();
 return {
  reset(){shown.clear();},
  pump(){
   const current=requests(),pending=new Set(current.map(request=>request.id||request.code));
   for(const key of shown)if(!pending.has(key))shown.delete(key);
   if(!available())return false;
   const next=current.find(request=>!shown.has(request.id||request.code));
   if(!next)return false;
   shown.add(next.id||next.code);open(next);return true;
  }
 };
}
