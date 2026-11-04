package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import org.json.*;

public class Delivery extends BroadcastReceiver {
    private static View visible;
    private static String visibleId="";
    private static final Handler ui=new Handler(Looper.getMainLooper());
    private static boolean allowed(Context c){
        return Mail.prefs(c).getBoolean("open",true)&&Settings.canDrawOverlays(c)&&!c.getSystemService(KeyguardManager.class).isKeyguardLocked()&&c.getSystemService(PowerManager.class).isInteractive()&&c.getSystemService(NotificationManager.class).getCurrentInterruptionFilter()==NotificationManager.INTERRUPTION_FILTER_ALL;
    }
    static void notice(Context c,JSONObject m,boolean warning){
        String id=m.optString("id"),channel=warning?Mail.ALERT:Mail.QUIET;
        if(!Mail.enabled(c,channel)){if(!warning)Mail.outcome(c,m,"inbox");return;}
        Notification.Builder b=new Notification.Builder(c,channel).setSmallIcon(android.R.drawable.ic_dialog_email)
          .setContentTitle(warning?"Incoming from "+m.optString("sender"):"You've got mail")
          .setContentText(warning?m.optString("kind")+" arriving in 3 seconds":Mail.label(m)+" · Tap to open")
          .setVisibility(Notification.VISIBILITY_PRIVATE).setAutoCancel(true)
          .setContentIntent(Mail.action(c,id,"open",true));
        if(warning)b.addAction(new Notification.Action.Builder(null,"Reject",Mail.action(c,id,"reject",false)).build()).setDeleteIntent(Mail.action(c,id,"reject",false));
        try{
            boolean locked=c.getSystemService(KeyguardManager.class).isKeyguardLocked();
            c.getSystemService(NotificationManager.class).notify(id,1,b.build());
            if(!warning)Mail.outcome(c,m,locked?"locked_notification":"notification");
        }catch(SecurityException e){if(!warning)Mail.outcome(c,m,"inbox");}
    }
    @Override public void onReceive(Context ctx,Intent intent){
        Context c=ctx.getApplicationContext();String id=intent.getStringExtra("id"),act=intent.getAction();Mail.channels(c);
        if(id==null){for(JSONObject m:Mail.history(c)){if("scheduled".equals(m.optString("status")))Mail.alarm(c,m.optString("id"),m.optLong("when"));}SyncJob.register(c);return;}
        JSONObject m=Mail.meta(c,id);if(!m.has("id"))return;
        if("reject".equals(act)){if("warning".equals(m.optString("status"))){Mail.state(c,m,"rejected");Mail.outcome(c,m,"rejected");c.getSystemService(NotificationManager.class).cancel(id,1);}return;}
        if(!"arrive".equals(act)||!"scheduled".equals(m.optString("status")))return;
        Mail.state(c,m,"received");
        if(!allowed(c)){if(Mail.prefs(c).getBoolean("open",true)||Mail.prefs(c).getBoolean("quiet",true))notice(c,m,false);else Mail.outcome(c,m,"inbox");return;}
        if(Mail.prefs(c).getBoolean("warning",true)){
            NotificationManager n=c.getSystemService(NotificationManager.class);
            if(!Mail.enabled(c,Mail.ALERT)||n.getNotificationChannel(Mail.ALERT).getImportance()<NotificationManager.IMPORTANCE_HIGH){notice(c,m,false);return;}
            Mail.state(c,m,"warning");notice(c,m,true);PendingResult pending=goAsync();
            ui.postDelayed(()->{try{JSONObject fresh=Mail.meta(c,id);if("warning".equals(fresh.optString("status"))){Mail.state(c,fresh,"received");n.cancel(id,1);if(allowed(c))show(c,fresh);else if(Mail.prefs(c).getBoolean("open",true)||Mail.prefs(c).getBoolean("quiet",true))notice(c,fresh,false);else Mail.outcome(c,fresh,"inbox");}}finally{pending.finish();}},3000);
        }else {notice(c,m,false);show(c,m);}
    }
    static void closeActivityWindow(Main c){if(visible!=null&&visible.getContext()==c)clear(c);}
    static void clear(Context c){
        if(visible!=null){try{c.getSystemService(WindowManager.class).removeViewImmediate(visible);}catch(IllegalArgumentException ignored){}visible=null;visibleId="";}
    }
    static void showOpened(Main activity,JSONObject m){
        if(Settings.canDrawOverlays(activity)){present(activity,m,null,false);return;}
        present(activity,m,activity.getWindow().getDecorView().getWindowToken(),false);
    }
    static void show(Context c,JSONObject m){present(c,m,null,true);}
    static void present(Context c,JSONObject m,android.os.IBinder appToken,boolean automatic){
        String id=m.optString("id");if(visible!=null){notice(c,m,false);return;}
        try{
            WindowManager wm=c.getSystemService(WindowManager.class);
            FrameLayout root=new FrameLayout(c);root.setBackgroundColor(0x22edf6f0);ImageView art=new ImageView(c);
            art.setImageBitmap(BitmapFactory.decodeFile(Mail.image(c,id).getPath()));art.setScaleType(ImageView.ScaleType.FIT_CENTER);
            art.setContentDescription(Mail.label(m));root.addView(art,new FrameLayout.LayoutParams(-1,-1));
            WindowManager.LayoutParams lp=new WindowManager.LayoutParams(-1,-1,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,PixelFormat.TRANSLUCENT);
            if(appToken!=null){lp.type=WindowManager.LayoutParams.TYPE_APPLICATION_PANEL;lp.token=appToken;}
            lp.flags|=WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED;
            if(Build.VERSION.SDK_INT>=31){lp.flags|=WindowManager.LayoutParams.FLAG_BLUR_BEHIND;lp.setBlurBehindRadius(48);}
            int dp=(int)(c.getResources().getDisplayMetrics().density*12);
            LinearLayout actions=new LinearLayout(c);actions.setPadding(dp,dp,dp,dp);actions.setGravity(Gravity.CENTER);
            Button dismiss=new Button(c);dismiss.setText("×  Dismiss");Button reply=new Button(c);reply.setText("Reply");
            for(Button button:new Button[]{dismiss,reply}){GradientDrawable bg=new GradientDrawable();bg.setColor(0xff254939);bg.setCornerRadius(dp*3);button.setTextColor(-1);button.setBackground(bg);LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-2,-2);bp.setMargins(dp/2,0,dp/2,0);actions.addView(button,bp);}
            root.addView(actions,new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));actions.setVisibility(View.INVISIBLE);
            dismiss.setOnClickListener(v->clear(c));reply.setOnClickListener(v->{try{c.startActivity(new Intent(c,Main.class).setAction("reply").putExtra("id",id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP));}catch(Exception ignored){notice(c,m,false);}clear(c);});
            if(automatic){
                root.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener(){
                    public boolean onPreDraw(){
                        root.getViewTreeObserver().removeOnPreDrawListener(this);
                        Runnable report=()->{
                            if(root.isAttachedToWindow()&&root.isShown()&&root.getWindowVisibility()==View.VISIBLE&&allowed(c))Mail.outcome(c,m,"screen");
                        };
                        if(Build.VERSION.SDK_INT>=29&&root.isHardwareAccelerated())root.getViewTreeObserver().registerFrameCommitCallback(report);
                        else root.postOnAnimation(report);
                        return true;
                    }
                });
            }
            wm.addView(root,lp);visible=root;visibleId=id;
            root.postDelayed(()->actions.setVisibility(View.VISIBLE),1000);
        }catch(Exception e){clear(c);notice(c,m,false);}
    }
}
