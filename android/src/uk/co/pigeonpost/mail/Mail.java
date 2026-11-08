package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.util.*;
import android.util.Base64;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;

final class Mail {
    static final String RELAY="https://pigeon-post-delivery.nikki0radz.chatgpt.site/api/";
    static final String GUEST="https://nikki0radz.github.io/You-ve-got-mail/guest.html#";
    static final String ALERT="incoming", QUIET="inbox", LISTEN="listening";
    static final java.util.concurrent.ExecutorService io=java.util.concurrent.Executors.newSingleThreadExecutor();
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("mail",0);}
    static synchronized String owner(Context c){
        String key=prefs(c).getString("owner","");
        if(key.isEmpty()){byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(Locale.ROOT,"%02x",b&255));key=s.toString();if(!prefs(c).edit().putString("owner",key).commit())throw new IllegalStateException("Could not save mailbox key");}
        return key;
    }
    static byte[] read(InputStream in) throws IOException {
        try(InputStream s=in; ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] b=new byte[8192];int n;while((n=s.read(b))!=-1){if(out.size()+n>9000000)throw new IOException("Parcel is too large");out.write(b,0,n);}return out.toByteArray();
        }
    }
    static JSONObject request(Context c,String path,JSONObject body)throws Exception{
        return authorized(path,body,owner(c));
    }
    static JSONObject authorized(String path,JSONObject body,String key)throws Exception{
        HttpURLConnection h=(HttpURLConnection)new URL(RELAY+path).openConnection();
        try{h.setConnectTimeout(10000);h.setReadTimeout(15000);h.setInstanceFollowRedirects(false);
            h.setRequestProperty("Authorization","Bearer "+key);
            if(body!=null){h.setRequestMethod("POST");h.setDoOutput(true);h.setRequestProperty("Content-Type","application/json");try(OutputStream o=h.getOutputStream()){o.write(body.toString().getBytes(StandardCharsets.UTF_8));}}
            int status=h.getResponseCode();if(status<200||status>=300){String error="Post office returned "+status;try{error=new JSONObject(new String(read(h.getErrorStream()),StandardCharsets.UTF_8)).optString("error",error);}catch(Exception ignored){}throw new IOException(error);}
            byte[] b=read(h.getInputStream());return b.length==0?new JSONObject():new JSONObject(new String(b,StandardCharsets.UTF_8));
        }finally{h.disconnect();}
    }
    static void channels(Context c){
        NotificationManager n=c.getSystemService(NotificationManager.class);
        n.createNotificationChannel(new NotificationChannel("friends","Friend status changes",NotificationManager.IMPORTANCE_DEFAULT));
        n.createNotificationChannel(new NotificationChannel(ALERT,"Incoming mail warnings",NotificationManager.IMPORTANCE_HIGH));
        n.createNotificationChannel(new NotificationChannel(QUIET,"Mailbox deliveries",NotificationManager.IMPORTANCE_DEFAULT));
        n.createNotificationChannel(new NotificationChannel(LISTEN,"Incoming parcel checks",NotificationManager.IMPORTANCE_LOW));
    }
    static boolean enabled(Context c,String channel){
        NotificationManager n=c.getSystemService(NotificationManager.class);
        return n.areNotificationsEnabled() && n.getNotificationChannel(channel).getImportance()>NotificationManager.IMPORTANCE_NONE;
    }
    static PendingIntent action(Context c,String id,String action,boolean activity){
        Intent i=new Intent(c,activity?("open".equals(action)?OpenParcel.class:Main.class):Delivery.class).setAction(action).setData(new Uri.Builder().scheme("pigeon").authority("mail").appendPath(id).build()).putExtra("id",id);
        return activity?PendingIntent.getActivity(c,0,i,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT):PendingIntent.getBroadcast(c,0,i,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
    }
    static JSONObject meta(Context c,String id){
        try{return new JSONObject(prefs(c).getString("m:"+id,"{}"));}catch(Exception e){return new JSONObject();}
    }
    static void save(Context c,JSONObject m)throws Exception{
        if(!prefs(c).edit().putString("m:"+m.getString("id"),m.toString()).commit())throw new IOException("Device storage unavailable");
    }
    static File image(Context c,String id) throws IOException{
        if(!id.matches("[A-Za-z0-9_-]{1,128}"))throw new IOException("Invalid parcel ID");
        return new File(c.getFilesDir(),id+".png");
    }
    static boolean exact(Context c){return Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();}
    static boolean full(Context c){return prefs(c).getBoolean("open",true)&&prefs(c).getBoolean("fullPopup",true);}
    static int delay(Context c){return prefs(c).getInt("warningSeconds",3);}
    static void alarm(Context c,String id,long at){schedule(c,id,"arrive",at);}
    static void schedule(Context c,String id,String action,long at){
        AlarmManager mgr=c.getSystemService(AlarmManager.class); PendingIntent p=action(c,id,action,false);
        long delay=at-System.currentTimeMillis();
        if(delay<=16000){new Handler(Looper.getMainLooper()).postDelayed(()->{try{p.send();}catch(PendingIntent.CanceledException ignored){}},Math.max(0,delay));}
        if(exact(c)){try{mgr.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);return;}catch(SecurityException ignored){}}
        mgr.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);
    }
    static synchronized void accept(Context c,JSONObject payload,boolean remote)throws Exception{
        String id=remote?payload.getString("id"):UUID.randomUUID().toString();
        File dest=image(c,id);JSONObject old=meta(c,id);
        if(old.has("id")){if("scheduled".equals(old.optString("status")))alarm(c,id,old.getLong("when"));return;}
        String data=payload.getString("image");byte[] bytes;
        if(!remote&&data.equals("assets/home/test-pigeon.png"))bytes=read(c.getAssets().open("site/"+data));
        else {if(!data.startsWith("data:image/png;base64,")||data.length()>8000000)throw new IOException("Expected a PNG");bytes=Base64.decode(data.substring(22),Base64.DEFAULT);}
        android.graphics.BitmapFactory.Options size=new android.graphics.BitmapFactory.Options();size.inJustDecodeBounds=true;
        android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.length,size);
        if(!"image/png".equals(size.outMimeType)||size.outWidth<1||size.outHeight<1||(long)size.outWidth*size.outHeight>16000000)throw new IOException("Invalid PNG size");
        AtomicFile f=new AtomicFile(dest);FileOutputStream out=f.startWrite();try{out.write(bytes);f.finishWrite(out);}catch(IOException e){f.failWrite(out);throw e;}
        JSONObject m=new JSONObject().put("created",System.currentTimeMillis()).put("inboxOnly",payload.optBoolean("inboxOnly"));for(String k:new String[]{"sender","kind","text","senderCode"})m.put(k,payload.optString(k));
        m.put("id",id).put("remote",remote).put("when",Math.max(System.currentTimeMillis(),payload.optLong("when",0))).put("status","scheduled");save(c,m);alarm(c,id,m.getLong("when"));
    }
    static List<JSONObject> history(Context c){
        List<JSONObject> results=new ArrayList<>();for(String k:prefs(c).getAll().keySet())if(k.startsWith("m:"))results.add(meta(c,k.substring(2)));
        results.sort((a,b)->Long.compare(b.optLong("when"),a.optLong("when")));return results;
    }
    // Persist delivery outcomes separately from the parcel. Retry after a lost response or restart.
    static synchronized void outcome(Context c,JSONObject parcel,String value){
        if(!parcel.optBoolean("remote"))return;
        String id=parcel.optString("id"),key="outcome:"+id;
        if("screen".equals(prefs(c).getString(key,"")))return;
        prefs(c).edit().putString(key,value).commit();
        io.execute(()->{try{flushOutcome(c,key);}catch(Exception ignored){}});
    }
    private static void flushOutcome(Context c,String key)throws Exception{
        String value=prefs(c).getString(key,"");
        if(value.isEmpty())return;
        request(c,"outcome",new JSONObject().put("id",key.substring(8)).put("outcome",value));
        synchronized(Mail.class){if(value.equals(prefs(c).getString(key,"")))prefs(c).edit().remove(key).commit();}
    }
    static void sync(Context c)throws Exception{
        try{PostOffice.friends(c);}catch(Exception ignored){}
        new Handler(Looper.getMainLooper()).post(()->UnlockQueue.watch(c.getApplicationContext()));
        for(String key:prefs(c).getAll().keySet())if(key.startsWith("outcome:")){
            try{flushOutcome(c,key);}catch(Exception ignored){}
        }
        for(int i=0;i<8;i++){JSONArray arr=request(c,"inbox",null).getJSONArray("messages");if(arr.length()==0)return;
            JSONObject m=arr.getJSONObject(0);accept(c,m,true);request(c,"ack",new JSONObject().put("id",m.getString("id")));}
    }
    static void state(Context c,JSONObject m,String status){try{m.put("status",status);save(c,m);}catch(Exception e){Log.e("Pigeon","Unable to update receipt",e);}}
    static String label(JSONObject m){return m.optString("sender","A friend")+" sent you "+m.optString("kind","mail");}
}
