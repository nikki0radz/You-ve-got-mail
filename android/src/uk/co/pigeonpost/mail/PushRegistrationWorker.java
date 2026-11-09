package uk.co.pigeonpost.mail;
import android.content.*;
import androidx.work.*;
import org.json.JSONObject;

public final class PushRegistrationWorker extends Worker {
    public PushRegistrationWorker(Context context,WorkerParameters params){super(context,params);}
    @Override public Result doWork(){
        Context c=getApplicationContext();SharedPreferences p=Mail.prefs(c);
        String token=p.getString("pushToken","");if(token.isEmpty())return Result.success();
        try{
            String owner=Mail.owner(c);
            if(!Mail.request(c,"device/register",new JSONObject().put("token",token)).optBoolean("ok"))throw new java.io.IOException("Registration not confirmed");
            if(isStopped()||!token.equals(p.getString("pushToken","")))return Result.success();
            p.edit().putString("pushRegisteredToken",token).putString("pushRegisteredOwner",owner).putLong("pushRegisteredAt",System.currentTimeMillis()).putString("pushStatus","Connected").apply();
            SyncJob.register(c);PushConnection.sync(c,false);return Result.success();
        }catch(Exception unavailable){p.edit().putString("pushStatus","Connecting · will retry").apply();return Result.retry();}
    }
}
