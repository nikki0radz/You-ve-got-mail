package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.widget.*;

/** Real Android access checks; returning from Settings never implies approval. */
final class DeliverySetup {
    private static final String PREFIX="deliverySetup.";
    private static final String[] KEYS={"notifications","overlay","precise","battery"};
    private static final String[] TITLES={"Let the post office notify you","Let parcels pop up","Deliver at the right time","Background delivery"};
    private static final String[] COPY={
        "Allow notifications so you can see incoming mail and its warning banner. Android will ask you to allow them. If a notification category is off, switch it on in the next screen.",
        "Allow display over other apps so a parcel can appear while you are using your phone. In Android, find You’ve Got Mail and turn on Allow display over other apps (sometimes called Appear on top), then come back here.",
        "Allow Alarms & reminders for precise delivery of parcels already saved on this phone. Turn on Allow setting alarms and reminders, then come back here. Without this, scheduled parcels can arrive late.",
        "Optional: let the app run without battery optimisation to reduce background delays. Open the battery list, choose All apps if needed, find You’ve Got Mail and choose Don’t optimise. This can use more battery; delivery timing still depends on Android and your connection."
    };
    private final Main activity;
    private AlertDialog dialog;
    private TextView status;
    private Button enable;
    private boolean active;
    // 0 is the introduction, 1–4 are permissions, 5 is the checked summary.
    private int step;

    DeliverySetup(Main activity,Bundle saved){
        this.activity=activity;
        if(saved!=null){active=saved.getBoolean(PREFIX+"active");step=Math.max(0,Math.min(5,saved.getInt(PREFIX+"step")));}
    }
    void resume(){
        if(!active&&!Mail.prefs(activity).getBoolean(PREFIX+"introduced",false))start();
        else if(active){if(dialog==null)show();else refresh();}
    }
    void start(){
        Mail.prefs(activity).edit().putBoolean(PREFIX+"introduced",true).putBoolean("intro",true).apply();
        active=true;step=0;show();
    }
    void save(Bundle out){out.putBoolean(PREFIX+"active",active);out.putInt(PREFIX+"step",step);}
    boolean back(){
        if(!active)return false;
        if(step>0){step--;show();}else stop();
        return true;
    }
    void destroy(){if(dialog!=null){dialog.dismiss();dialog=null;}}
    private void stop(){active=false;destroy();}
    private int dp(int n){return Math.round(activity.getResources().getDisplayMetrics().density*n);}
    private TextView text(String value,int size,int ink){
        TextView view=new TextView(activity);view.setText(value);view.setTextSize(size);view.setTextColor(ink);view.setPadding(0,dp(7),0,dp(7));return view;
    }
    static boolean enabled(android.content.Context c,String key){
        switch(key){
        case "notifications":return Mail.enabled(c,Mail.ALERT)&&Mail.enabled(c,Mail.QUIET);
        case "overlay":return Settings.canDrawOverlays(c);
        case "precise":return Mail.exact(c);
        case "battery":return c.getSystemService(PowerManager.class).isIgnoringBatteryOptimizations(c.getPackageName());
        default:return false;
        }
    }
    private void show(){
        if(activity.isFinishing()||activity.isDestroyed())return;
        destroy();
        boolean dark=Mail.prefs(activity).getBoolean("night",true);
        int ink=Color.parseColor(dark?"#fff9ed":"#253e31");
        ContextThemeWrapper theme=new ContextThemeWrapper(activity,dark?android.R.style.Theme_Material_Dialog_Alert:android.R.style.Theme_Material_Light_Dialog_Alert);
        LinearLayout body=new LinearLayout(activity);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(dp(24),dp(6),dp(24),dp(8));
        String title;
        if(step==0){
            title="Set up your deliveries";
            body.addView(text("A quick check before the pigeons arrive. We’ll help you turn on notifications, floating parcels and precise schedules, one at a time.",16,ink));
            body.addView(text("You choose what to allow. You can skip a step and return through Settings → Phone & appearance → Delivery setup. Camera access is only requested when you use the camera; the photo picker shares only the pictures you choose.",14,ink));
        }else if(step<=KEYS.length){
            int index=step-1;title=TITLES[index];
            body.addView(text("Step "+step+" of "+KEYS.length+(step==4?" · Optional":""),13,ink));
            body.addView(text(COPY[index],16,ink));
            status=text("",16,ink);status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);body.addView(status);
            enable=new Button(activity);enable.setAllCaps(false);enable.setText("Open Android settings");enable.setMinHeight(dp(48));enable.setTextColor(Color.WHITE);enable.setBackgroundTintList(ColorStateList.valueOf(Color.parseColor("#365a40")));
            enable.setOnClickListener(v->activity.openSetting(KEYS[step-1]));body.addView(enable);
        }else{
            title="Delivery check";
            status=text("",16,ink);status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);body.addView(status);
            body.addView(text("Change these any time in Settings → Phone & appearance. Keep Open to mail switched on when you want to receive parcels.",14,ink));
        }
        ScrollView scroll=new ScrollView(activity);scroll.addView(body);
        AlertDialog.Builder builder=new AlertDialog.Builder(theme).setTitle(title).setView(scroll)
            .setPositiveButton(step==0?"Start setup":step==5?"Done":"Next",null)
            .setNegativeButton(step==5?"Review again":"Later",null);
        if(step>0)builder.setNeutralButton("Back",null);
        dialog=builder.create();dialog.setCanceledOnTouchOutside(false);
        dialog.setOnCancelListener(d->stop());
        dialog.setOnKeyListener((d,key,event)->{if(key==KeyEvent.KEYCODE_BACK&&event.getAction()==KeyEvent.ACTION_UP)return back();return key==KeyEvent.KEYCODE_BACK;});
        dialog.show();
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(Color.parseColor(dark?"#b9dfc3":"#365a40"));
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{if(step==5)stop();else{step++;show();}});
        dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setOnClickListener(v->{if(step==5){step=1;show();}else stop();});
        if(step>0)dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v->back());
        refresh();
    }
    void refresh(){
        if(!active||dialog==null||step==0)return;
        if(step<=KEYS.length){
            boolean on=enabled(activity,KEYS[step-1]);
            status.setText(on?"✓ Enabled":"○ Not enabled yet");
            boolean dark=Mail.prefs(activity).getBoolean("night",true);
            status.setTextColor(Color.parseColor(on?(dark?"#b9dfc3":"#365a40"):(dark?"#f0ae93":"#a5422b")));
            enable.setEnabled(!on);enable.setText(on?"Enabled":"Open Android settings");
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setText(on?"Next":"Skip for now");
        }else{
            String[] names={"Notifications","Display over apps","Precise schedules","Background battery access (optional)"};
            StringBuilder check=new StringBuilder();boolean ready=true;
            for(int i=0;i<KEYS.length;i++){boolean on=enabled(activity,KEYS[i]);if(i<3&&!on)ready=false;check.append(on?"✓ ":"○ ").append(names[i]).append(on?": On\n\n":": Off\n\n");}
            status.setText((ready?"Your delivery permissions are ready.\n\n":"Some delivery features are still off.\n\n")+check.toString());
        }
    }
}
