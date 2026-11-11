package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.os.*;
import android.provider.Settings;
import org.json.*;
import java.util.*;

public final class UnlockQueue extends Service {
    private static final Handler main=new Handler(Looper.getMainLooper());
    private static UnlockQueue active;
    private final UnlockDelivery delivery=new UnlockDelivery();
    private BroadcastReceiver receiver;
    private String notificationState="";
    private boolean stopping;
    static boolean pending(Context c,String id){return Mail.prefs(c).getBoolean("unlock:"+id,false);}
    static void remove(Context c,String id){Mail.prefs(c).edit().remove("unlock:"+id).commit();}
    static void arm(Context c,String id){
        if(!Mail.prefs(c).edit().putBoolean("unlock:"+id,true).commit())return;
        watch(c);
    }
    static void watch(Context ctx){
        final Context c=ctx.getApplicationContext();
        if(Looper.myLooper()!=Looper.getMainLooper()){main.post(()->watch(c));return;}
        if(!hasPending(c)){cleanup(c);return;}
        if(active!=null){active.schedule(0);return;}
        try{c.startForegroundService(new Intent(c,UnlockQueue.class));}
        catch(RuntimeException error){android.util.Log.w("Pigeon","Unlock watcher unavailable; mail remains in Inbox",error);}
    }
    private static boolean hasPending(Context c){
        for(String key:Mail.prefs(c).getAll().keySet())if(key.startsWith("unlock:")&&pending(c,key.substring(7)))return true;
        return false;
    }
    static void reset(Context c){
        SharedPreferences.Editor edit=Mail.prefs(c).edit();
        for(String key:Mail.prefs(c).getAll().keySet())if(key.startsWith("unlock:"))edit.remove(key);
        edit.commit();cleanup(c);
    }
    static void cleanup(Context c){
        if(Looper.myLooper()!=Looper.getMainLooper()){main.post(()->cleanup(c.getApplicationContext()));return;}
        if(hasPending(c))return;
        if(active!=null)active.stopWaiting();else c.stopService(new Intent(c,UnlockQueue.class));
    }
    static void afterUnlock(Context c){watch(c);}
    private List<String> waiting(){
        List<JSONObject> history=Mail.history(this);Collections.reverse(history);
        List<String> ids=new ArrayList<>();
        for(JSONObject m:history){
            String id=m.optString("id");if(!pending(this,id))continue;
            String state=m.optString("status");
            if(Mail.prefs(this).getLong("seenAt:"+id,0)>0||"cancelled".equals(state)||"rejected".equals(state)){remove(this,id);continue;}
            ids.add(id);
        }
        // A deleted/corrupt metadata row must not leave an orphan foreground notification.
        for(String key:Mail.prefs(this).getAll().keySet())if(key.startsWith("unlock:")&&!ids.contains(key.substring(7)))remove(this,key.substring(7));
        return ids;
    }
    private final Runnable tick=()->drain();
    private void schedule(long delay){
        if(stopping)return;
        main.removeCallbacks(tick);main.postDelayed(tick,delay);
    }
    private void drain(){
        if(stopping)return;
        boolean enabled=Mail.full(this)&&Mail.prefs(this).getBoolean("onUnlock",true)&&Settings.canDrawOverlays(this);
        UnlockDelivery.State state=delivery.tick(SystemClock.uptimeMillis(),enabled,Delivery.locked(this),Delivery.busy(),Delivery.allowed(this),new UnlockDelivery.Pending(){
            public List<String> ids(){return waiting();}
            public boolean present(String id){return Delivery.show(UnlockQueue.this,Mail.meta(UnlockQueue.this,id));}
            public void completed(String id){remove(UnlockQueue.this,id);getSystemService(NotificationManager.class).cancel(id,1);}
        });
        if(state==UnlockDelivery.State.DISABLED){reset(this);return;}
        if(state==UnlockDelivery.State.EMPTY||!hasPending(this)){stopWaiting();return;}
        updateNotification(state);
        // The foreground watcher recovers missed/delayed unlock broadcasts. No wake lock:
        // it sleeps with the phone, and SCREEN_ON wakes the check immediately.
        boolean interactive=getSystemService(PowerManager.class).isInteractive();
        schedule(!interactive?30000:(state==UnlockDelivery.State.FAILED||state==UnlockDelivery.State.PAUSED)?5000:state==UnlockDelivery.State.BUSY?1000:500);
    }
    private Notification notification(UnlockDelivery.State state){
        String title="Mail waiting for unlock",text="Queued for after unlock. Tap to open your inbox.";
        if(state==UnlockDelivery.State.PAUSED){title="Mail pop-up paused";text=getSystemService(NotificationManager.class).getCurrentInterruptionFilter()!=NotificationManager.INTERRUPTION_FILTER_ALL?"Do Not Disturb is on. Your mail is saved in Inbox.":"Waiting until the pop-up can open. Tap to view Inbox.";}
        else if(state==UnlockDelivery.State.FAILED){title="Mail is in your inbox";text="The pop-up could not open. Tap to view your mail.";}
        else if(state==UnlockDelivery.State.BUSY||state==UnlockDelivery.State.SHOWN){title="Mail waiting its turn";text="Close the current parcel to see the next one, or tap for Inbox.";}
        else if(state==UnlockDelivery.State.SETTLING){title="Preparing your mail";text="Your phone has unlocked. Tap to open Inbox.";}
        return new Notification.Builder(this,Mail.LISTEN).setSmallIcon(android.R.drawable.ic_dialog_email)
          .setContentTitle(title).setContentText(text).setOngoing(true).setOnlyAlertOnce(true)
          .setContentIntent(PendingIntent.getActivity(this,202,new Intent(this,Main.class).setAction("mailbox").addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT)).build();
    }
    private void updateNotification(UnlockDelivery.State state){
        if(state.name().equals(notificationState))return;
        notificationState=state.name();getSystemService(NotificationManager.class).notify(202,notification(state));
    }
    private void unregister(){
        if(receiver!=null){unregisterReceiver(receiver);receiver=null;}
        main.removeCallbacks(tick);
    }
    private void stopWaiting(){
        stopping=true;unregister();if(active==this)active=null;
        stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();
    }
    public int onStartCommand(Intent intent,int flags,int startId){
        stopping=false;active=this;Mail.channels(this);
        startForeground(202,notification(Delivery.locked(this)?UnlockDelivery.State.LOCKED:UnlockDelivery.State.SETTLING));
        if(!hasPending(this)){stopWaiting();return START_NOT_STICKY;}
        if(receiver==null){
            receiver=new BroadcastReceiver(){public void onReceive(Context c,Intent event){schedule(0);}};
            IntentFilter filter=new IntentFilter(Intent.ACTION_USER_PRESENT);
            filter.addAction(Intent.ACTION_SCREEN_ON);filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(NotificationManager.ACTION_INTERRUPTION_FILTER_CHANGED);
            if(Build.VERSION.SDK_INT>=33)registerReceiver(receiver,filter,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(receiver,filter);
        }
        schedule(0);return START_STICKY;
    }
    public void onDestroy(){stopping=true;unregister();if(active==this)active=null;super.onDestroy();}
    public IBinder onBind(Intent i){return null;}
}
