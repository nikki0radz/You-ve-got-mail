package uk.co.pigeonpost.mail;

import android.app.*;
import android.os.*;
import android.content.*;
import android.view.*;
import android.widget.*;
import android.provider.Settings;
import org.json.*;

// A transparent, separate notification entry point keeps the previously visible app underneath.
public final class OpenParcel extends Activity {
    protected void onCreate(Bundle b){super.onCreate(b);
        String id=getIntent().getStringExtra("id");JSONObject m=Mail.meta(this,id);
        if(!m.has("id")||"scheduled".equals(m.optString("status"))){finish();return;}
        KeyguardManager k=getSystemService(KeyguardManager.class);
        if(k.isKeyguardLocked()){
            setShowWhenLocked(true);k.requestDismissKeyguard(this,new KeyguardManager.KeyguardDismissCallback(){
                public void onDismissSucceeded(){open(m);}public void onDismissCancelled(){finish();}public void onDismissError(){finish();}
            });
        }else open(m);
    }
    void open(JSONObject m){String id=m.optString("id");UnlockQueue.remove(this,id);UnlockQueue.cleanup(this);
        getSystemService(NotificationManager.class).cancel(id,1);
        if("warning".equals(m.optString("status")))Mail.state(this,m,"received");
        Delivery.clear(this);
        Delivery.present(this,m,false);
    }
    protected void onDestroy(){Delivery.closeActivityWindow(this);super.onDestroy();}
}
