package uk.co.pigeonpost.mail;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.Build;
import androidx.work.*;

public final class PushMailboxWorker extends Worker {
    public PushMailboxWorker(Context context,WorkerParameters params){super(context,params);}
    @Override public Result doWork(){
        try{Mail.sync(getApplicationContext());return Result.success();}catch(Exception unavailable){return Result.retry();}
    }
    @Override public ForegroundInfo getForegroundInfo(){
        Context c=getApplicationContext();Mail.channels(c);
        Notification notification=new Notification.Builder(c,Mail.LISTEN).setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle("Receiving your mail").setContentText("Checking the post office").setOngoing(true).build();
        return Build.VERSION.SDK_INT>=29?new ForegroundInfo(203,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC):new ForegroundInfo(203,notification);
    }
}
