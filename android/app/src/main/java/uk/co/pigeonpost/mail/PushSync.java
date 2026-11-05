package uk.co.pigeonpost.mail;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;
import java.util.concurrent.TimeUnit;

public final class PushSync extends Worker {
    public PushSync(@NonNull Context context, @NonNull WorkerParameters params) { super(context,params); }
    static void schedule(Context context, boolean urgent) {
        OneTimeWorkRequest.Builder job=new OneTimeWorkRequest.Builder(PushSync.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build());
        if(urgent)job.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
        WorkManager.getInstance(context.getApplicationContext()).enqueueUniqueWork("pigeon-push-sync",ExistingWorkPolicy.APPEND_OR_REPLACE,job.build());
    }
    @NonNull @Override public Result doWork() {
        try {
            Context c=getApplicationContext();
            String token=Tasks.await(FirebaseMessaging.getInstance().getToken(),20,TimeUnit.SECONDS);
            Mail.request(c,"device/register",new JSONObject().put("token",token));
            Mail.sync(c);
            return Result.success();
        } catch(Exception e) { return Result.retry(); }
    }
}
