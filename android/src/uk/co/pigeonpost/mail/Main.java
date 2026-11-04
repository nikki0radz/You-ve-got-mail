package uk.co.pigeonpost.mail;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.util.*;

public class Main extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> photo;
    private String saveData;
    static final String HOST="appassets.androidplatform.net";
    private int dp(int n){return Math.round(getResources().getDisplayMetrics().density*n);}
    void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override public void onCreate(Bundle b){super.onCreate(b);Mail.channels(this);SyncJob.register(this);
        web=new WebView(this);web.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});setContentView(web);
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient(){
            public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest req){return true;}
            public WebResourceResponse shouldInterceptRequest(WebView w,WebResourceRequest req){
                Uri uri=req.getUrl();
                if(!req.isForMainFrame()&&"data".equals(uri.getScheme())&&uri.toString().startsWith("data:image/"))return null;
                String path=uri.getPath();
                if("https".equals(uri.getScheme())&&HOST.equals(uri.getHost())&&path!=null&&path.startsWith("/")&&!path.contains("..")&&!path.contains("\\")){
                    try{String mime=path.endsWith(".mjs")||path.endsWith(".js")?"text/javascript":path.endsWith(".html")?"text/html":path.endsWith(".css")?"text/css":path.endsWith(".json")?"application/json":path.endsWith(".png")?"image/png":path.endsWith(".webp")?"image/webp":"application/octet-stream";
                        return new WebResourceResponse(mime,null,getAssets().open("site"+path));
                    }catch(IOException ignored){}
                }
                return new WebResourceResponse("text/plain","UTF-8",404,"Missing",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
                if(photo!=null)photo.onReceiveValue(null);photo=cb;
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);
                try{startActivityForResult(i,41);}catch(Exception e){photo.onReceiveValue(null);photo=null;}return true;
            }
            public boolean onJsConfirm(WebView v,String url,String msg,JsResult r){new AlertDialog.Builder(Main.this).setMessage(msg).setPositiveButton("Discard",(d,k)->r.confirm()).setNegativeButton("Keep editing",(d,k)->r.cancel()).setOnCancelListener(d->r.cancel()).show();return true;}
        });
        web.addJavascriptInterface(new Bridge(),"Pigeon");web.loadUrl("https://"+HOST+"/index.html");incoming(getIntent());
        if(!Mail.prefs(this).getBoolean("intro",false)){
            Mail.prefs(this).edit().putBoolean("intro",true).apply();
            new AlertDialog.Builder(this).setTitle("Let a pigeon land on your screen")
              .setMessage("Enable phone notifications and display over other apps for the floating PNG. For exact delivery times, enable precise schedules too. You can change these later in Settings.")
              .setPositiveButton("Set up delivery",(d,k)->settings()).setNegativeButton("Later",null).show();
        }
    }
    protected void onDestroy(){Delivery.closeActivityWindow(this);super.onDestroy();}
    protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);incoming(i);}
    private void incoming(Intent i){String id=i.getStringExtra("id");if(id==null)return;
        JSONObject m=Mail.meta(this,id);if(!m.has("id"))return;
        if("warning".equals(m.optString("status")))Mail.state(this,m,"received");
        getSystemService(NotificationManager.class).cancel(id,1);Delivery.clear(this);
        if("reply".equals(i.getAction()))reply(m);else web.post(()->Delivery.showOpened(this,m));i.removeExtra("id");
    }
    protected void onResume(){super.onResume();if(Mail.prefs(this).contains("owner"))Mail.io.execute(()->{try{Mail.sync(this);}catch(Exception ignored){}});}
    protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);
        if(req==41&&photo!=null){Uri u=res==RESULT_OK&&data!=null?data.getData():null;photo.onReceiveValue(u!=null&&"content".equals(u.getScheme())?new Uri[]{u}:null);photo=null;}
        if(req==42&&saveData!=null){String png=saveData;saveData=null;if(res==RESULT_OK&&data!=null&&data.getData()!=null)try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(android.util.Base64.decode(png.substring(22),0));toast("PNG saved");}catch(Exception e){toast("Could not save PNG");}}
    }
    void settings(){
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(dp(18),dp(8),dp(18),dp(8));
        option(panel,"Warn me 3 seconds before a pop-up","warning",true);
        option(panel,"Notify me when pop-ups are paused","quiet",true);
        button(panel,"Phone notifications · "+(Mail.enabled(this,Mail.ALERT)?"on":"set up"),()->{
            if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=0)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},9);
            else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));
        });
        button(panel,"Incoming warning banner settings",()->startActivity(new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()).putExtra(Settings.EXTRA_CHANNEL_ID,Mail.ALERT)));
        button(panel,"Display over apps · "+(Settings.canDrawOverlays(this)?"on":"set up"),()->startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName()))));
        if(Build.VERSION.SDK_INT>=31)button(panel,"Precise schedules · "+(Mail.exact(this)?"on":"set up"),()->startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName()))));
        button(panel,"Listen for mail for 30 minutes",this::listen);
        TextView tip=new TextView(this);tip.setText("Allow notification pop-ups in the Incoming mail warnings channel to see Reject. When your phone is locked, mail waits in your inbox.");panel.addView(tip);
        ScrollView scroll=new ScrollView(this);scroll.addView(panel);new AlertDialog.Builder(this).setTitle("Delivery settings").setView(scroll).setPositiveButton("Done",null).show();
    }
    void option(LinearLayout parent,String title,String key,boolean initial){Switch sw=new Switch(this);sw.setText(title);sw.setPadding(0,dp(8),0,dp(8));sw.setChecked(Mail.prefs(this).getBoolean(key,initial));sw.setOnCheckedChangeListener((b,on)->Mail.prefs(this).edit().putBoolean(key,on).apply());parent.addView(sw);}
    void button(LinearLayout p,String title,Runnable action){Button b=new Button(this);b.setText(title);b.setOnClickListener(v->action.run());p.addView(b);}
    void listen(){startForegroundService(new Intent(this,Live.class));}
    void invite(){new AlertDialog.Builder(this).setTitle("Let a friend send one parcel").setMessage("Your friend can choose a sticker or frame in their browser. Sharing starts 30 minutes of live listening on this phone. After that Android checks periodically.").setPositiveButton("Create link",(d,k)->Mail.io.execute(()->{
        try{String token=Mail.request(this,"links",new JSONObject()).getString("token");if(!token.matches("[a-f0-9]{64}"))throw new IOException();
            runOnUiThread(()->{if(isFinishing()||isDestroyed())return;listen();Intent i=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,Mail.GUEST+token);startActivity(Intent.createChooser(i,"Share one-use mail link"));});
        }catch(Exception e){runOnUiThread(()->toast("Could not create your link. Check your connection and try again."));}
    })).setNegativeButton("Cancel",null).show();}
    void history(){
        List<JSONObject> list=Mail.history(this);if(list.isEmpty()){toast("Your phone inbox is empty");return;}
        String[] rows=new String[list.size()];for(int i=0;i<rows.length;i++){JSONObject m=list.get(i);rows[i]=Mail.label(m)+"\n"+m.optString("status")+" · "+java.text.DateFormat.getDateTimeInstance().format(new Date(m.optLong("when")));}
        new AlertDialog.Builder(this).setTitle("Phone inbox & schedules").setItems(rows,(d,k)->view(list.get(k))).setNegativeButton("Close",null).show();
    }
    void view(JSONObject m){
        ImageView image=new ImageView(this);try{image.setImageBitmap(android.graphics.BitmapFactory.decodeFile(Mail.image(this,m.getString("id")).getPath()));}catch(Exception ignored){}
        image.setAdjustViewBounds(true);image.setMaxHeight(getResources().getDisplayMetrics().heightPixels/2);
        AlertDialog.Builder b=new AlertDialog.Builder(this).setTitle(Mail.label(m)).setView(image).setNegativeButton("Close",null);
        if("scheduled".equals(m.optString("status")))b.setNeutralButton("Cancel delivery",(d,k)->{String id=m.optString("id");getSystemService(AlarmManager.class).cancel(Mail.action(this,id,"arrive",false));Mail.state(this,m,"cancelled");});
        else b.setPositiveButton("Reply",(d,k)->reply(m));b.show();
    }
    void reply(JSONObject m){
        EditText field=new EditText(this);field.setHint("Your reply");field.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(500)});field.setText(m.optString("reply"));
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle(m.optBoolean("remote")?"Reply to "+m.optString("sender"):"Reply to local test").setView(field).setPositiveButton("Save",null).setNegativeButton("Cancel",null).create();
        dialog.show();dialog.getButton(-1).setOnClickListener(v->{String text=field.getText().toString().trim();if(text.isEmpty()){field.setError("Write a reply");return;}v.setEnabled(false);Mail.io.execute(()->{
            try{if(m.optBoolean("remote"))Mail.request(this,"reply",new JSONObject().put("id",m.getString("id")).put("text",text));m.put("reply",text);Mail.save(this,m);runOnUiThread(()->{dialog.dismiss();toast(m.optBoolean("remote")?"Reply sent":"Test reply saved");});}
            catch(Exception e){runOnUiThread(()->{v.setEnabled(true);field.setError("Could not send the reply. Try again.");});}
        });});
    }
    public class Bridge {
        @JavascriptInterface public void settings(){runOnUiThread(Main.this::settings);}
        @JavascriptInterface public void invite(){runOnUiThread(Main.this::invite);}
        @JavascriptInterface public void history(){runOnUiThread(Main.this::history);}
        @JavascriptInterface public boolean isOpen(){return Mail.prefs(Main.this).getBoolean("open",true);}
        @JavascriptInterface public void receiving(boolean b){Mail.prefs(Main.this).edit().putBoolean("open",b).apply();if(!b)runOnUiThread(()->Delivery.clear(Main.this));}
        @JavascriptInterface public String queue(String json){try{JSONObject data=new JSONObject(json);if(data.optLong("when")<=0)data.put("when",System.currentTimeMillis()+5000);Mail.accept(Main.this,data,false);return "ok";}catch(Exception e){return "Could not save this parcel: "+e.getMessage();}}
        @JavascriptInterface public boolean precise(){return Mail.exact(Main.this);}
        @JavascriptInterface public void savePNG(String image){if(!image.startsWith("data:image/png;base64,"))return;runOnUiThread(()->{saveData=image;startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/png").putExtra(Intent.EXTRA_TITLE,"Pigeon post.png"),42);});}
    }
}
