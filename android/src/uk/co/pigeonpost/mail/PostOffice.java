package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.os.*;
import android.util.*;
import org.json.*;
import java.io.*;
import java.util.*;

final class PostOffice {
    static String mode(Context c){
        SharedPreferences p=Mail.prefs(c);
        return p.getBoolean("open",true)?"open":p.getBoolean("closedInbox",p.getBoolean("quiet",true))?"inbox":"closed";
    }
    static void profile(Context c)throws Exception{
        SharedPreferences p=Mail.prefs(c);String mode=mode(c),name=p.getString("displayName","New pigeon");
        if(mode.equals(p.getString("publishedMode",""))&&name.equals(p.getString("publishedName","")))return;
        JSONObject me=Mail.request(c,"profile",new JSONObject().put("name",name).put("mode",mode));
        p.edit().putString("publishedMode",mode).putString("publishedName",name).putString("code",me.getString("code")).apply();
    }
    static synchronized JSONObject friends(Context c)throws Exception{
        profile(c);SharedPreferences p=Mail.prefs(c);long cursor=p.getLong("friendsCursor",-1);
        JSONObject data=Mail.request(c,"friends"+(cursor<0?"":"?cursor="+cursor),null);
        JSONArray events=data.optJSONArray("events");
        if(cursor>=0&&p.getBoolean("friendAlerts",false)&&events!=null&&Mail.enabled(c,"friends")){
            for(int i=0;i<events.length();i++){JSONObject e=events.getJSONObject(i);
                Notification n=new Notification.Builder(c,"friends").setSmallIcon(android.R.drawable.ic_dialog_email)
                    .setContentTitle(e.optString("name")+" changed mail status").setContentText(status(e.optString("mode")))
                    .setAutoCancel(true).setContentIntent(PendingIntent.getActivity(c,93,new Intent(c,Main.class).setAction("friends"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT)).build();
                c.getSystemService(NotificationManager.class).notify("friend:"+e.optString("code"),3,n);
            }
        }
        FriendRequests.update(c,data.optJSONArray("incoming"));
        data.remove("events");p.edit().putLong("friendsCursor",data.getLong("cursor")).putString("friendsSnapshot",data.toString()).apply();return data;
    }
    static String status(String mode){return "open".equals(mode)?"Open to mail":"inbox".equals(mode)?"Inbox only":"Closed to mail";}
    static void syncSoon(Context c){Mail.io.execute(()->{try{friends(c);}catch(Exception ignored){}});}
    static void writeImage(Context c,String id,String data)throws Exception{
        if(!data.startsWith("data:image/png;base64,")||data.length()>2000000)throw new IOException("Choose a smaller PNG");
        byte[] bytes=android.util.Base64.decode(data.substring(22),android.util.Base64.DEFAULT);
        AtomicFile dest=new AtomicFile(Mail.image(c,id));FileOutputStream stream=dest.startWrite();
        try{stream.write(bytes);dest.finishWrite(stream);}catch(IOException e){dest.failWrite(stream);throw e;}
    }
    static JSONObject perform(Context c,String op,JSONObject payload)throws Exception{
        if("friends".equals(op))return friends(c);
        if(Arrays.asList("request","accept","decline").contains(op)){
            profile(c);Mail.request(c,"friends/"+op,new JSONObject().put("code",payload.getString("code")));return friends(c);
        }
        if("send".equals(op)){
            profile(c);String recipient=payload.getString("recipient");payload.remove("recipient");
            JSONObject result=Mail.request(c,"friends/send",payload);String id=result.getString("id");
            writeImage(c,"sent-"+id,payload.getString("image"));
            JSONObject row=new JSONObject().put("id",id).put("sender",recipient).put("kind",payload.getString("kind")).put("when",payload.optLong("when",System.currentTimeMillis())).put("created",System.currentTimeMillis()).put("code",payload.getString("code")).put("status","sent").put("sent",true);
            Mail.prefs(c).edit().putString("s:"+id,row.toString()).putString("receipt:"+id,result.getString("receipt")).commit();
            return new JSONObject().put("ok",true);
        }
        String id=payload.getString("id");
        if("receipt".equals(op)){
            String secret=Mail.prefs(c).getString("receipt:"+id,"");
            if(secret.isEmpty())throw new IOException("Receipt unavailable");
            JSONObject receipt=Mail.authorized("receipt",null,secret);
            JSONObject sent=new JSONObject(Mail.prefs(c).getString("s:"+id,"{}"));
            Replies.receive(c,new JSONObject(receipt.toString()).put("id",id).put("sender",sent.optString("sender","A friend")).put("senderCode",sent.optString("code")),true,false);
            return receipt;
        }
        if("reply".equals(op)){
            JSONObject item=Mail.meta(c,id);if(!item.has("id")||"scheduled".equals(item.optString("status")))throw new IOException("Parcel unavailable");
            if(item.optBoolean("remote"))Mail.request(c,"reply",payload);
            String picture=payload.optString("image");
            if(!picture.isEmpty())writeImage(c,"reply-"+id,picture);
            item=Mail.meta(c,id);item.put("reply",payload.optString("text")).put("pictureReply",!picture.isEmpty());Mail.save(c,item);
            if(!item.optBoolean("remote"))Replies.receive(c,new JSONObject().put("id",id).put("sender","Myself").put("senderCode","self").put("reply",payload.optString("text")).put("replyImage",picture),false);
            return new JSONObject().put("ok",true);
        }
        throw new IOException("Unknown action");
    }
}
