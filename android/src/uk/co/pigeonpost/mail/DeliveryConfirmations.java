package uk.co.pigeonpost.mail;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.Build;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

/** Receipts have their own persistent network queue, independent of DND and artwork sync. */
public final class DeliveryConfirmations extends Worker {
 public DeliveryConfirmations(Context c,WorkerParameters params){super(c,params);}
 static void enqueue(Context c){
  try{WorkManager.getInstance(c).enqueueUniqueWork("pigeon-delivery-confirmations",ExistingWorkPolicy.APPEND_OR_REPLACE,
   new OneTimeWorkRequest.Builder(DeliveryConfirmations.class)
    .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,10,TimeUnit.SECONDS)
    .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST).build());
  }catch(RuntimeException unavailable){android.util.Log.w("Pigeon","Receipt work will retry on next check-in",unavailable);}
 }
 static void resume(Context c){for(String key:Mail.prefs(c).getAll().keySet())if(key.startsWith("ack:")||key.startsWith("receiptEvent:")||key.startsWith("outcome:")){enqueue(c);return;}}
 @Override public Result doWork(){
  Context c=getApplicationContext();boolean failed=false;
  try{Mail.flushAcknowledgements(c);}catch(Exception retry){failed=true;}
  try{Receipts.flush(c);}catch(Exception retry){failed=true;}
  try{Mail.flushOutcomes(c);}catch(Exception retry){failed=true;}
  return failed?Result.retry():Result.success();
 }
 @Override public ForegroundInfo getForegroundInfo(){
  Context c=getApplicationContext();Mail.channels(c);
  Notification n=new Notification.Builder(c,Mail.LISTEN).setSmallIcon(android.R.drawable.ic_dialog_email)
   .setContentTitle("Confirming mail delivery").setContentText("Updating delivery status").setOngoing(true).build();
  return Build.VERSION.SDK_INT>=29?new ForegroundInfo(204,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC):new ForegroundInfo(204,n);
 }
}
