package uk.co.pigeonpost.mail;
import android.app.*;
import android.content.*;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** Durable replies are inbox items; notification preference never discards mail. */
final class Replies {
 static void sync(Context c)throws Exception{
  String after="";
  do{
   JSONObject page=Mail.request(c,"replies"+(after.isEmpty()?"":"?after="+after),null);
   JSONArray rows=page.getJSONArray("replies");
   for(int i=0;i<rows.length();i++)receive(c,rows.getJSONObject(i),true);
   after=page.optString("next","");
  }while(!after.isEmpty());
  int checked=0;
  for(JSONObject old:Mail.history(c)){
   if(!old.optBoolean("isReply")||!old.optBoolean("remote")||old.optBoolean("nullChecked")||!"null".equals(old.optString("text")))continue;
   String original=old.optString("originalId"),secret=Mail.prefs(c).getString("receipt:"+original,"");
   if(secret.isEmpty())continue;
   try{
    JSONObject receipt=Mail.authorized("receipt",null,secret).put("id",original).put("sender",old.optString("sender")).put("senderCode",old.optString("senderCode"));
    receive(c,receipt,true,false);
    JSONObject current=Mail.meta(c,old.getString("id"));if(current.has("id")){current.put("nullChecked",true);Mail.save(c,current);}
   }catch(Exception ignored){} // Keep unverified mail and retry later; a real note may say "null".
   if(++checked>=8)break;
  }
 }
 static synchronized void receive(Context c,JSONObject reply,boolean remote)throws Exception{
  receive(c,reply,remote,true);
 }
 static synchronized void receive(Context c,JSONObject reply,boolean remote,boolean alert)throws Exception{
  String original=reply.getString("id"),id="reply-"+original;
  String text=ReplyContents.text(reply.opt("reply")),image=ReplyContents.text(reply.opt("replyImage"));
  if(text.isEmpty()&&image.isEmpty()){
   // An authoritative empty receipt also removes a phantom created by older APKs.
   if(remote){Mail.prefs(c).edit().remove("m:"+id).remove("read:"+id).remove("seenAt:"+id).commit();c.getSystemService(NotificationManager.class).cancel(id,5);}
   return;
  }
  StringBuilder hash=new StringBuilder();
  for(byte b:MessageDigest.getInstance("SHA-256").digest((text+"\u0000"+image).getBytes(StandardCharsets.UTF_8)))hash.append(String.format(Locale.ROOT,"%02x",b&255));
  JSONObject old=Mail.meta(c,id);if(hash.toString().equals(old.optString("fingerprint"))&&reply.optLong("replyAt")==old.optLong("replyAt")&&(image.isEmpty()||Mail.image(c,id).isFile())){Receipts.deliveredReply(c,old);return;}
  if(!image.isEmpty())PostOffice.writeImage(c,id,image);
  long now=System.currentTimeMillis();
  JSONObject m=new JSONObject().put("id",id).put("originalId",original).put("isReply",true).put("remote",remote)
   .put("sender",reply.optString("sender","A friend")).put("senderCode",reply.optString("senderCode"))
   .put("kind","Reply").put("text",text).put("hasImage",!image.isEmpty()).put("status","received")
   .put("created",now).put("when",now).put("fingerprint",hash.toString()).put("replyAt",reply.optLong("replyAt"));
  if(!Mail.prefs(c).edit().putString("m:"+id,m.toString()).putBoolean("read:"+id,false).commit())throw new java.io.IOException("Could not save reply");
  Mail.prefs(c).edit().remove("seenAt:"+id).apply();Receipts.deliveredReply(c,m);
  if(!alert||!Mail.prefs(c).getBoolean("replyAlerts",true)||"closed".equals(PostOffice.mode(c))||!Mail.enabled(c,"replies"))return;
  Notification notice=new Notification.Builder(c,"replies").setSmallIcon(android.R.drawable.ic_dialog_email)
   .setContentTitle(m.optString("sender")+" replied").setContentText(text.isEmpty()?"Sticker reply":text)
   .setVisibility(Notification.VISIBILITY_PRIVATE).setAutoCancel(true).setContentIntent(Mail.action(c,id,"inbox",true)).build();
  c.getSystemService(NotificationManager.class).notify(id,5,notice);
 }
}
