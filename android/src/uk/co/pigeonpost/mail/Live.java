package uk.co.pigeonpost.mail;
import android.app.*;import android.content.*;import android.os.*;

public class Live extends Service {
    final Handler ui=new Handler(Looper.getMainLooper());
    long deadline; boolean alive;
    final Runnable check=new Runnable(){public void run(){
        if(!alive||PushConnection.registered(Live.this)||SystemClock.elapsedRealtime()>deadline){stopSelf();return;}
        Mail.io.execute(()->{try{Mail.sync(Live.this);}catch(Exception ignored){}ui.postDelayed(this,5000);});
    }};
    public int onStartCommand(Intent i,int flags,int startId){
        if(i!=null&&"stop".equals(i.getAction())){stopSelf();return START_NOT_STICKY;}
        Mail.channels(this);Intent stop=new Intent(this,Live.class).setAction("stop");
        Notification n=new Notification.Builder(this,Mail.LISTEN).setSmallIcon(android.R.drawable.ic_dialog_email).setContentTitle("Listening for pigeon post")
          .setContentText("Checking for incoming parcels").setOngoing(true).addAction(new Notification.Action.Builder(null,"Stop",PendingIntent.getService(this,0,stop,PendingIntent.FLAG_IMMUTABLE)).build()).build();
        startForeground(201,n);deadline=SystemClock.elapsedRealtime()+30*60*1000L;if(!alive){alive=true;ui.post(check);}return START_NOT_STICKY;
    }
    public void onTimeout(int startId,int type){stopSelf();}
    public void onDestroy(){alive=false;ui.removeCallbacksAndMessages(null);stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
    public IBinder onBind(Intent i){return null;}
}
