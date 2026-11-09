package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.*;
import java.util.*;

final class FriendRequests {
    static final String CHANNEL="friend_requests", TEST="friend-request:simulation";
    static void update(Context c,JSONArray incoming){
        SharedPreferences prefs=Mail.prefs(c);
        Set<String> previous=new HashSet<>(prefs.getStringSet("notifiedFriendRequests",Collections.emptySet()));
        Set<String> current=new HashSet<>(),notified=new HashSet<>();
        NotificationManager manager=c.getSystemService(NotificationManager.class);
        for(int i=0;incoming!=null&&i<incoming.length();i++){
            JSONObject request=incoming.optJSONObject(i);if(request==null)continue;
            String code=request.optString("code");if(code.isEmpty()||!current.add(code))continue;
            if(previous.contains(code)||show(c,"friend-request:"+code,request.optString("name","Someone"),false))notified.add(code);
        }
        for(String code:previous)if(!current.contains(code))manager.cancel("friend-request:"+code,4);
        if(!notified.equals(previous))prefs.edit().putStringSet("notifiedFriendRequests",notified).apply();
    }
    static boolean show(Context c,String tag,String name,boolean test){
        if(!Mail.enabled(c,CHANNEL))return false;
        Intent open=new Intent(c,Main.class).setAction("friends")
            .setData(new Uri.Builder().scheme("pigeon").authority("friend-request").appendPath(tag).build());
        Notification notice=new Notification.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(test?"Test friend request":"Friend request")
            .setContentText(name+" would like to be your friend."+(test?" Simulation only.":""))
            .setCategory(Notification.CATEGORY_SOCIAL).setVisibility(Notification.VISIBILITY_PRIVATE)
            .setNumber(1).setAutoCancel(true)
            .setContentIntent(PendingIntent.getActivity(c,104,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT)).build();
        try{c.getSystemService(NotificationManager.class).notify(tag,4,notice);return true;}catch(SecurityException denied){return false;}
    }
    static void clearTest(Context c){c.getSystemService(NotificationManager.class).cancel(TEST,4);}
}
