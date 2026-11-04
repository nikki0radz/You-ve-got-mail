package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.os.*;
import org.json.*;
import java.util.*;

public final class UnlockQueue extends Service {
    private static final Handler main=new Handler(Looper.getMainLooper());
    private static BroadcastReceiver receiver;
    private static Runnable drain;
    private static boolean running;
    static boolean pending(Context c,String id){return Mail.prefs(c).getBoolean("unlock:"+id,false);}
    static void remove(Context c,String id){Mail.prefs(c).edit().remove("unlock:"+id).apply();}
    static void arm(Context c,String id){
        Mail.prefs(c).edit().putBoolean("unlock:"+id,true).commit();
        watch(c);
    }
    static void watch(Context ctx){
        final Context c=ctx.getApplicationContext();
        if(!hasPending(c))return;
        if(receiver==null){
            receiver=new BroadcastReceiver(){public void onReceive(Context unused,Intent i){afterUnlock(c);}};
            IntentFilter f=new IntentFilter(Intent.ACTION_USER_PRESENT);
            f.addAction(Intent.ACTION_SCREEN_ON);
            if(Build.VERSION.SDK_INT>=33)c.registerReceiver(receiver,f,Context.RECEIVER_NOT_EXPORTED);else c.registerReceiver(receiver,f);
        }
        if(!running)try{c.startForegroundService(new Intent(c,UnlockQueue.class));}catch(RuntimeException ignored){}
        if(!Delivery.locked(c))afterUnlock(c);
    }
    private static boolean hasPending(Context c){
        for(String key:Mail.prefs(c).getAll().keySet())if(key.startsWith("unlock:"))return true;
        return false;
    }
    static void reset(Context c){
        for(String key:Mail.prefs(c).getAll().keySet())if(key.startsWith("unlock:"))Mail.prefs(c).edit().remove(key).apply();
        cleanup(c);
    }
    static void cleanup(Context c){
        if(hasPending(c))return;
        if(receiver!=null){c.getApplicationContext().unregisterReceiver(receiver);receiver=null;}
        c.stopService(new Intent(c,UnlockQueue.class));
    }
    static void afterUnlock(Context c){
        if(drain!=null||Delivery.locked(c))return;
        drain=()->{drain=null;
            if(Delivery.locked(c)||Delivery.busy())return;
            if(!Mail.full(c)||!Mail.prefs(c).getBoolean("onUnlock",true)){reset(c);return;}
            List<JSONObject> items=Mail.history(c);Collections.reverse(items);
            for(JSONObject m:items){String id=m.optString("id");if(!pending(c,id))continue;
                remove(c,id);
                if(Delivery.allowed(c)){c.getSystemService(NotificationManager.class).cancel(id,1);Delivery.show(c,m);break;}
            }
            cleanup(c);
        };main.postDelayed(drain,1000);
    }
    public int onStartCommand(Intent intent,int flags,int startId){
        running=true;Mail.channels(this);
        Notification n=new Notification.Builder(this,Mail.LISTEN).setSmallIcon(android.R.drawable.ic_dialog_email)
          .setContentTitle("Mail waiting for unlock").setContentText("Your pop-up will open after you unlock.").setOngoing(true).build();
        startForeground(202,n);
        if(!hasPending(this)){stopSelf();return START_NOT_STICKY;}
        if(receiver==null)watch(getApplicationContext());
        if(!Delivery.locked(this))afterUnlock(getApplicationContext());
        return START_STICKY;
    }
    public void onDestroy(){running=false;super.onDestroy();}
    public IBinder onBind(Intent i){return null;}
}
