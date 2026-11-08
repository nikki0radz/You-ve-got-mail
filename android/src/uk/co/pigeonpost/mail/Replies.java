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
 }
 static synchronized void receive(Context c,JSONObject reply,boolean remote)throws Exception{
  String original=reply.getString("id"),id="reply-"+original;
  String text=reply.optString("reply",""),image=reply.optString("replyImage","");
  if(text.isEmpty()&&image.isEmpty())return;
  StringBuilder hash=new StringBuilder();
  for(byte b:MessageDigest.getInstance("SHA-256").digest((text+"\u0000"+image).getBytes(StandardCharsets.UTF_8)))hash.append(String.format(Locale.ROOT,"%02x",b&255));
  JSONObject old=Mail.meta(c,id);if(hash.toString().equals(old.optString("fingerprint")))return;
  if(!image.isEmpty())PostOffice.writeImage(c,id,image);
  long now=System.currentTimeMillis();
  JSONObject m=new JSONObject().put("id",id).put("originalId",original).put("isReply",true).put("remote",remote)
   .put("sender",reply.optString("sender","A friend")).put("senderCode",reply.optString("senderCode"))
   .put("kind","Reply").put("text",text).put("hasImage",!image.isEmpty()).put("status","received")
   .put("created",now).put("when",now).put("fingerprint",hash.toString());
  if(!Mail.prefs(c).edit().putString("m:"+id,m.toString()).putBoolean("read:"+id,false).commit())throw new java.io.IOException("Could not save reply");
  if(!Mail.prefs(c).getBoolean("replyAlerts",true)||"closed".equals(PostOffice.mode(c))||!Mail.enabled(c,"replies"))return;
  Notification notice=new Notification.Builder(c,"replies").setSmallIcon(android.R.drawable.ic_dialog_email)
   .setContentTitle(m.optString("sender")+" replied").setContentText(text.isEmpty()?"Sticker reply":text)
   .setVisibility(Notification.VISIBILITY_PRIVATE).setAutoCancel(true).setContentIntent(Mail.action(c,id,"inbox",true)).build();
  c.getSystemService(NotificationManager.class).notify(id,5,notice);
 }
}
