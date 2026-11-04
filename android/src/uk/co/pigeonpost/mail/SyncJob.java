package uk.co.pigeonpost.mail;
import android.app.job.*;import android.content.*;
public class SyncJob extends JobService {
    static void register(Context c){JobScheduler j=c.getSystemService(JobScheduler.class);if(j.getPendingJob(13)==null)j.schedule(new JobInfo.Builder(13,new ComponentName(c,SyncJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000L).setPersisted(true).build());}
    public boolean onStartJob(JobParameters p){Mail.io.execute(()->{boolean failed=false;try{Mail.sync(this);}catch(Exception e){failed=true;}final boolean retry=failed;new android.os.Handler(getMainLooper()).post(()->jobFinished(p,retry));});return true;}
    public boolean onStopJob(JobParameters p){return true;}
}
