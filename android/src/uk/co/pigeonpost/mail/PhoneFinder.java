package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import org.json.*;

/** Short, authenticated alarm. FCM is only a wake signal; the server supplies the request. */
public final class PhoneFinder extends Service {
    static final String CHANNEL="find-phone", STOP="stop-find-phone";
    private final Handler handler=new Handler(Looper.getMainLooper());
    private MediaPlayer player; private AudioManager audio; private AudioFocusRequest focus;
    private String requestId="",friendCode="",outcome="unavailable"; private boolean finished,checking;
    static boolean allowed(Context c,String code){return Mail.prefs(c).getBoolean("open",true)&&Mail.prefs(c).getBoolean("finder:"+code,false)&&Mail.enabled(c,CHANNEL);}
    static void wake(Context c){
        if(!Mail.prefs(c).getBoolean("open",true)||!Mail.enabled(c,CHANNEL))return;
        try{c.startForegroundService(new Intent(c,PhoneFinder.class));}catch(RuntimeException ignored){
            // A downgraded push cannot always start background audio. Never claim it rang.
        }
    }
    static void restoreVolume(Context c){
        android.content.SharedPreferences p=Mail.prefs(c);if(!p.contains("finderPreviousVolume"))return;
        AudioManager a=c.getSystemService(AudioManager.class);
        try{if(a.getStreamVolume(AudioManager.STREAM_ALARM)==a.getStreamMaxVolume(AudioManager.STREAM_ALARM))a.setStreamVolume(AudioManager.STREAM_ALARM,p.getInt("finderPreviousVolume",0),0);}catch(RuntimeException ignored){}
        p.edit().remove("finderPreviousVolume").apply();
    }
    private Notification notice(String text){
        PendingIntent stop=PendingIntent.getService(this,0,new Intent(this,PhoneFinder.class).setAction(STOP),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Find phone").setContentText(text).setCategory(Notification.CATEGORY_ALARM)
            .setContentIntent(stop).addAction(new Notification.Action.Builder(null,"Stop ringing",stop).build())
            .setOngoing(true).setVisibility(Notification.VISIBILITY_PUBLIC).build();
    }
    @Override public void onCreate(){super.onCreate();restoreVolume(this);Mail.channels(this);audio=getSystemService(AudioManager.class);}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null||STOP.equals(intent.getAction())){finish("stopped");return START_NOT_STICKY;}
        if(checking||!requestId.isEmpty()||finished)return START_NOT_STICKY;
        checking=true;Notification n=notice("Checking a friend’s ring request…");
        if(Build.VERSION.SDK_INT>=29)startForeground(904,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(904,n);
        // Covers a stuck network call, as well as ordinary playback.
        handler.postDelayed(()->finish("unavailable"),45000);
        Mail.io.execute(()->{
            try{
                JSONObject row=Mail.request(this,"finder/claim",new JSONObject()).optJSONObject("request");
                handler.post(()->{
                    if(row==null){finish("unavailable");return;}
                    String id=row.optString("id");
                    if(finished){report(id,"declined");return;}
                    requestId=id;friendCode=row.optString("code");
                    if(!allowed(this,friendCode)||row.optLong("expires")<=System.currentTimeMillis()){finish("declined");return;}
                    ring(row.optString("name","A friend"));
                });
            }catch(Exception ignored){handler.post(()->finish("unavailable"));}
        });
        return START_NOT_STICKY;
    }
    private void ring(String name){
        try{
            AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(change->{if(change<0)finish("stopped");},handler).build();
            if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED){finish("unavailable");return;}
            int old=audio.getStreamVolume(AudioManager.STREAM_ALARM);
            if(!Mail.prefs(this).edit().putInt("finderPreviousVolume",old).commit())throw new IllegalStateException("Volume restore unavailable");
            audio.setStreamVolume(AudioManager.STREAM_ALARM,audio.getStreamMaxVolume(AudioManager.STREAM_ALARM),0);
            player=new MediaPlayer();player.setAudioAttributes(attributes);player.setDataSource(this,RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
            for(AudioDeviceInfo device:audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS))if(device.getType()==AudioDeviceInfo.TYPE_BUILTIN_SPEAKER){player.setPreferredDevice(device);break;}
            player.setLooping(true);player.setOnErrorListener((p,what,extra)->{finish("unavailable");return true;});player.prepare();
            if(!allowed(this,friendCode)){finish("declined");return;}
            player.start();outcome="stopped";Mail.prefs(this).edit().putBoolean("finderRinging",true).apply();
            getSystemService(NotificationManager.class).notify(904,notice(name+" is finding this phone · tap Stop ringing"));
            report(requestId,"ringing");handler.removeCallbacksAndMessages(null);
            handler.postDelayed(()->finish("stopped"),30000);
            handler.postDelayed(this::checkReceiving,500);
        }catch(Exception ignored){finish("unavailable");}
    }
    private void checkReceiving(){if(finished)return;if(!allowed(this,friendCode)){finish("stopped");return;}handler.postDelayed(this::checkReceiving,500);}
    private void report(String id,String status){if(id.isEmpty())return;Mail.io.execute(()->{try{Mail.request(this,"finder/report",new JSONObject().put("id",id).put("status",status));}catch(Exception ignored){}});}
    private void finish(String status){if(finished)return;finished=true;outcome=status;cleanup();report(requestId,status);stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}
    private void cleanup(){
        handler.removeCallbacksAndMessages(null);if(player!=null){try{player.stop();}catch(RuntimeException ignored){}player.release();player=null;}
        if(audio!=null&&focus!=null)audio.abandonAudioFocusRequest(focus);restoreVolume(this);Mail.prefs(this).edit().putBoolean("finderRinging",false).apply();
    }
    @Override public void onDestroy(){cleanup();if(!finished)report(requestId,outcome);super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
