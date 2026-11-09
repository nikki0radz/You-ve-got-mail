package uk.co.pigeonpost.mail;

import android.content.*;
import com.google.android.gms.common.GoogleApiAvailabilityLight;
import com.google.firebase.messaging.FirebaseMessaging;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

final class PushConnection {
    static boolean registered(Context c){
        SharedPreferences p=Mail.prefs(c);String token=p.getString("pushToken","");
        return !token.isEmpty()&&token.equals(p.getString("pushRegisteredToken",""))&&Mail.owner(c).equals(p.getString("pushRegisteredOwner",""));
    }
    static String status(Context c){
        if(registered(c))return "Connected";
        return Mail.prefs(c).getString("pushStatus","Connecting…");
    }
    static void start(Context context){
        Context c=context.getApplicationContext();
        if(GoogleApiAvailabilityLight.getInstance().isGooglePlayServicesAvailable(c)!=0){Mail.prefs(c).edit().putString("pushStatus","Google Play services needed").apply();return;}
        try{
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->{
                if(task.isSuccessful()&&task.getResult()!=null)token(c,task.getResult());
                else Mail.prefs(c).edit().putString("pushStatus","Connecting · will retry").apply();
            });
        }catch(IllegalStateException unavailable){Mail.prefs(c).edit().putString("pushStatus","Connection unavailable").apply();}
    }
    static void token(Context c,String token){
        if(token==null||token.length()<20||token.length()>4096)return;
        SharedPreferences p=Mail.prefs(c);p.edit().putString("pushToken",token).apply();
        if(registered(c)&&System.currentTimeMillis()-p.getLong("pushRegisteredAt",0)<TimeUnit.DAYS.toMillis(1))return;
        if(!registered(c))p.edit().putString("pushStatus","Connecting…").apply();
        WorkManager.getInstance(c).enqueueUniqueWork("pigeon-push-registration",ExistingWorkPolicy.REPLACE,
            new OneTimeWorkRequest.Builder(PushRegistrationWorker.class).setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build());
    }
    static void sync(Context c,boolean urgent){
        OneTimeWorkRequest.Builder work=new OneTimeWorkRequest.Builder(PushMailboxWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS);
        if(urgent)work.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
        // Append so a push arriving during an in-flight sync cannot be lost.
        WorkManager.getInstance(c).enqueueUniqueWork("pigeon-push-mailbox",ExistingWorkPolicy.APPEND_OR_REPLACE,work.build());
    }
}
