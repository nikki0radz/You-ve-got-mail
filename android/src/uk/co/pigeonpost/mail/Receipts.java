package uk.co.pigeonpost.mail;
import android.content.*;
import org.json.*;

/** Opening is explicit; notification delivery and automatic presentation are separate. */
final class Receipts {
 static synchronized void seen(Context c,JSONObject row){
  String id=row.optString("id");
  if(id.isEmpty()||"scheduled".equals(row.optString("status"))||Delivery.locked(c))return;
  Mail.markRead(c,id);
  long at=Mail.prefs(c).getLong("seenAt:"+id,0);
  if(at==0){at=System.currentTimeMillis();Mail.prefs(c).edit().putLong("seenAt:"+id,at).commit();}
  try{JSONObject current=Mail.meta(c,id);current.put("seenAt",at);Mail.save(c,current);}catch(Exception ignored){}
  if(row.optBoolean("remote"))enqueue(c,row,row.optBoolean("isReply")?"reply_seen":"seen",at);
 }
 static void deliveredReply(Context c,JSONObject row){if(row.optBoolean("remote"))enqueue(c,row,"reply_delivered",System.currentTimeMillis());}
 static synchronized void enqueue(Context c,JSONObject row,String event,long at){
  try{
   boolean reply=row.optBoolean("isReply");long version=row.optLong("replyAt");
   if(reply&&version<=0)return;
   String id=reply?row.getString("originalId"):row.getString("id");
   String key="receiptEvent:"+event+":"+id+(reply?":"+version:"");
   if(Mail.prefs(c).getBoolean("receiptDone:"+key,false)||Mail.prefs(c).contains(key))return;
   JSONObject body=new JSONObject().put("id",id).put("event",event).put("at",at);
   if(reply)body.put("replyAt",version);
   Mail.prefs(c).edit().putString(key,body.toString()).commit();
   Mail.io.execute(()->{try{flush(c);}catch(Exception ignored){}});
  }catch(JSONException ignored){}
 }
 static void flush(Context c)throws Exception{
  for(String key:Mail.prefs(c).getAll().keySet())if(key.startsWith("receiptEvent:")){
   JSONObject body=new JSONObject(Mail.prefs(c).getString(key,"{}"));
   if(System.currentTimeMillis()-body.optLong("at")>31L*86400000){Mail.prefs(c).edit().remove(key).apply();continue;}
   try{Mail.request(c,"opened",body);}catch(Mail.HttpFailure unavailable){
    if(unavailable.status!=404&&unavailable.status!=409&&unavailable.status!=410)throw unavailable;
   }
   Mail.prefs(c).edit().remove(key).putBoolean("receiptDone:"+key,true).commit();
  }
 }
 static void sync(Context c)throws Exception{
  flush(c);String after="";
  do{
   JSONObject page=Mail.request(c,"statuses"+(after.isEmpty()?"":"?after="+after),null);
   JSONArray rows=page.getJSONArray("receipts");
   for(int i=0;i<rows.length();i++){
    JSONObject receipt=rows.getJSONObject(i);String id=receipt.getString("id");
    boolean outgoing=receipt.optInt("outgoing")==1;String key=(outgoing?"s:":"m:")+id;
    String raw=Mail.prefs(c).getString(key,"");if(raw.isEmpty())continue;
    JSONObject row=new JSONObject(raw);row.put(outgoing?"delivery":"replyDelivery",receipt);
    Mail.prefs(c).edit().putString(key,row.toString()).apply();
   }
   after=page.optString("next","");
  }while(!after.isEmpty());
 }
}
