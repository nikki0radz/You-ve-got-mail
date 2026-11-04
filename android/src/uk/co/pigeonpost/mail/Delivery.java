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
    private static Dialog glass;
    private static final Handler ui=new Handler(Looper.getMainLooper());
    static boolean busy(){return visible!=null;}
    static boolean locked(Context c){return c.getSystemService(KeyguardManager.class).isKeyguardLocked()||!c.getSystemService(PowerManager.class).isInteractive();}
    static boolean allowed(Context c){
        return Mail.full(c)&&Settings.canDrawOverlays(c)&&!c.getSystemService(KeyguardManager.class).isKeyguardLocked()&&c.getSystemService(PowerManager.class).isInteractive()&&c.getSystemService(NotificationManager.class).getCurrentInterruptionFilter()==NotificationManager.INTERRUPTION_FILTER_ALL;
    }
    static void notice(Context c,JSONObject m,boolean warning){
        String id=m.optString("id"),channel=warning?Mail.ALERT:Mail.QUIET;
        if(!Mail.enabled(c,channel)){if(!warning)Mail.outcome(c,m,"inbox");return;}
        Notification.Builder b=new Notification.Builder(c,channel).setSmallIcon(android.R.drawable.ic_dialog_email)
          .setContentTitle(warning?"Incoming from "+m.optString("sender"):"You've got mail")
          .setContentText(warning?m.optString("kind")+" arriving in "+Mail.delay(c)+" seconds":Mail.label(m)+" · Tap to open")
          .setVisibility(Notification.VISIBILITY_PRIVATE).setAutoCancel(true)
          .setContentIntent(Mail.action(c,id,"open",true));
        b.setDeleteIntent(Mail.action(c,id,warning?"reject":"clearPending",false));
        if(warning)b.addAction(new Notification.Action.Builder(null,"Reject",Mail.action(c,id,"reject",false)).build()).setDeleteIntent(Mail.action(c,id,"reject",false));
        try{
            boolean locked=c.getSystemService(KeyguardManager.class).isKeyguardLocked();
            c.getSystemService(NotificationManager.class).notify(id,1,b.build());
            if(!warning)Mail.outcome(c,m,locked?"locked_notification":"notification");
        }catch(SecurityException e){if(!warning)Mail.outcome(c,m,"inbox");}
    }
    @Override public void onReceive(Context ctx,Intent intent){
        Context c=ctx.getApplicationContext();String id=intent.getStringExtra("id"),act=intent.getAction();Mail.channels(c);
        if(id==null){for(JSONObject m:Mail.history(c)){if("scheduled".equals(m.optString("status")))Mail.alarm(c,m.optString("id"),m.optLong("when"));else if("warning".equals(m.optString("status")))Mail.schedule(c,m.optString("id"),"finishWarning",System.currentTimeMillis()+1000);}SyncJob.register(c);UnlockQueue.watch(c);return;}
        JSONObject m=Mail.meta(c,id);if(!m.has("id"))return;
        if("clearPending".equals(act)){UnlockQueue.remove(c,id);UnlockQueue.cleanup(c);return;}
        if("reject".equals(act)){if("warning".equals(m.optString("status"))){Mail.state(c,m,"rejected");Mail.outcome(c,m,"rejected");c.getSystemService(NotificationManager.class).cancel(id,1);}return;}
        if("finishWarning".equals(act)){
            if(!"warning".equals(m.optString("status")))return;
            c.getSystemService(NotificationManager.class).cancel(id,1);Mail.state(c,m,"received");route(c,m,false);return;
        }
        if(!"arrive".equals(act)||!"scheduled".equals(m.optString("status")))return;
        Mail.state(c,m,"received");route(c,m,true);
    }
    private static void route(Context c,JSONObject m,boolean warn){
        if(m.optBoolean("inboxOnly")||!Mail.prefs(c).getBoolean("open",true)){Mail.outcome(c,m,"inbox");return;}
        if(!allowed(c)){
            if(Mail.full(c)&&locked(c)&&Settings.canDrawOverlays(c)&&Mail.prefs(c).getBoolean("onUnlock",true))UnlockQueue.arm(c,m.optString("id"));
            notice(c,m,false);return;
        }
        if(warn&&Mail.prefs(c).getBoolean("warning",true)){
            NotificationManager n=c.getSystemService(NotificationManager.class);
            if(!Mail.enabled(c,Mail.ALERT)||n.getNotificationChannel(Mail.ALERT).getImportance()<NotificationManager.IMPORTANCE_HIGH){notice(c,m,false);return;}
            Mail.state(c,m,"warning");notice(c,m,true);
            Mail.schedule(c,m.optString("id"),"finishWarning",System.currentTimeMillis()+Mail.delay(c)*1000L);
        }else{if(warn)notice(c,m,false);show(c,m);}
    }
    static void closeActivityWindow(Activity c){if(visible!=null&&visible.getContext()==c)clear(c);}
    static void clear(Context c){
        if(glass!=null){Dialog previous=glass;glass=null;visible=null;previous.dismiss();UnlockQueue.afterUnlock(c.getApplicationContext());}
    }
    static void show(Context c,JSONObject m){present(c,m,null,true);}
    static void present(Context c,JSONObject m,android.os.IBinder appToken,boolean automatic){
        String id=m.optString("id");if(visible!=null){notice(c,m,false);return;}
        try{
            int type=appToken==null?WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY:WindowManager.LayoutParams.TYPE_APPLICATION_PANEL;
            Context windowContext=c;
            if(appToken==null&&Build.VERSION.SDK_INT>=30){
                Display display=c.getSystemService(android.hardware.display.DisplayManager.class).getDisplay(Display.DEFAULT_DISPLAY);
                windowContext=c.createDisplayContext(display).createWindowContext(type,null);
            }
            Dialog pane=new Dialog(windowContext,R.style.ParcelGlass);
            Window window=pane.getWindow();
            window.setType(type);window.setFormat(PixelFormat.TRANSLUCENT);
            window.addFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
            GradientDrawable frost=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{0x2ce6f1ed,0x18778c8a,0x2732474c});
            window.setBackgroundDrawable(frost);
            WindowManager.LayoutParams attrs=window.getAttributes();
            if(appToken!=null)attrs.token=appToken;
            if(Build.VERSION.SDK_INT>=31){
                float density=c.getResources().getDisplayMetrics().density;
                attrs.flags|=WindowManager.LayoutParams.FLAG_BLUR_BEHIND;
                attrs.setBlurBehindRadius(Math.round(24*density));
                window.setBackgroundBlurRadius(Math.round(38*density));
            }
            attrs.width=attrs.height=WindowManager.LayoutParams.MATCH_PARENT;window.setAttributes(attrs);
            pane.setCancelable(false);
            FrameLayout root=new FrameLayout(c);ImageView art=new ImageView(c);
            art.setImageBitmap(BitmapFactory.decodeFile(Mail.image(c,id).getPath()));art.setScaleType(ImageView.ScaleType.FIT_CENTER);
            art.setContentDescription(Mail.label(m));root.addView(art,new FrameLayout.LayoutParams(-1,-1));
            int dp=(int)(c.getResources().getDisplayMetrics().density*12);
            LinearLayout actions=new LinearLayout(c);actions.setPadding(dp,dp,dp,dp);actions.setGravity(Gravity.CENTER);
            Button dismiss=new Button(c);dismiss.setText("×  Dismiss");Button reply=new Button(c);reply.setText("Reply");
            for(Button button:new Button[]{dismiss,reply}){GradientDrawable bg=new GradientDrawable();bg.setColor(0xff254939);bg.setCornerRadius(dp*3);button.setTextColor(-1);button.setBackground(bg);LinearLayout.LayoutParams bp=new LinearLayout.LayoutParams(-2,-2);bp.setMargins(dp/2,0,dp/2,0);actions.addView(button,bp);}
            root.setOnApplyWindowInsetsListener((v,insets)->{actions.setPadding(dp+insets.getSystemWindowInsetLeft(),dp,dp+insets.getSystemWindowInsetRight(),dp+insets.getSystemWindowInsetBottom());return insets;});
            root.addView(actions,new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));actions.setVisibility(View.INVISIBLE);
            Runnable dismissParcel=()->{
                if(visible!=root)return;
                c.getSystemService(NotificationManager.class).cancel(id,1);
                clear(c);if(c instanceof OpenParcel)((OpenParcel)c).finish();
            };
            root.setOnTouchListener(new View.OnTouchListener(){
                float startX,startY;boolean dragging=false;int pointer=-1;
                final int slop=ViewConfiguration.get(c).getScaledTouchSlop();
                void reset(){pointer=-1;dragging=false;art.animate().translationX(0).translationY(0).alpha(1).setDuration(140).start();}
                public boolean onTouch(View v,MotionEvent event){
                    float x=event.getRawX(),y=event.getRawY(),dx=x-startX,dy=y-startY;
                    switch(event.getActionMasked()){
                    case MotionEvent.ACTION_DOWN:
                        art.animate().cancel();startX=x;startY=y;pointer=event.getPointerId(0);dragging=false;return true;
                    case MotionEvent.ACTION_POINTER_DOWN:case MotionEvent.ACTION_CANCEL:reset();return true;
                    case MotionEvent.ACTION_MOVE:
                        if(pointer<0)return true;
                        if(Math.hypot(dx,dy)>slop)dragging=true;
                        if(dragging){art.setTranslationX(dx);art.setTranslationY(dy);art.setAlpha(Math.max(.35f,1-(float)Math.hypot(dx,dy)/root.getWidth()));}
                        return true;
                    case MotionEvent.ACTION_UP:
                        if(pointer>=0&&dragging&&Math.hypot(dx,dy)>=Math.max(dp*6,slop*4)){dismissParcel.run();return true;}
                        reset();return true;
                    default:return true;
                    }
                }
            });
            dismiss.setOnClickListener(v->dismissParcel.run());reply.setOnClickListener(v->{try{c.startActivity(new Intent(c,Main.class).setAction("reply").putExtra("id",id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP));}catch(Exception ignored){notice(c,m,false);}clear(c);if(c instanceof OpenParcel)((OpenParcel)c).finish();});
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
            pane.setContentView(root);
            pane.show();glass=pane;visible=root;window.setLayout(-1,-1);
            root.postDelayed(()->actions.setVisibility(View.VISIBLE),1000);
        }catch(Exception e){clear(c);notice(c,m,false);}
    }
}
