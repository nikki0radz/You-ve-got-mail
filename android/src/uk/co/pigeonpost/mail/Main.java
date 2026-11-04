package uk.co.pigeonpost.mail;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.graphics.Color;
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
    private String saveData,pendingReply="";
    private boolean webReady;
    private FrameLayout frame;
    void bars(boolean dark){
        int colour=Color.parseColor(dark?"#192824":"#faf4e5");frame.setBackgroundColor(colour);
        getWindow().setStatusBarColor(colour);getWindow().setNavigationBarColor(colour);
        getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        if(Build.VERSION.SDK_INT>=29)getWindow().setNavigationBarContrastEnforced(false);
    }
    static final String HOST="appassets.androidplatform.net";
    private int dp(int n){return Math.round(getResources().getDisplayMetrics().density*n);}
    void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override public void onCreate(Bundle b){super.onCreate(b);Mail.channels(this);SyncJob.register(this);
        frame=new FrameLayout(this);web=new WebView(this);frame.addView(web);setContentView(frame);bars(Mail.prefs(this).getBoolean("night",true));
        frame.setOnApplyWindowInsetsListener((v,i)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}
            else v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());
            return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:i.consumeSystemWindowInsets();
        });
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient(){
            public void onPageFinished(WebView v,String url){webReady=true;dispatchIntent();}
            public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest req){return true;}
            public WebResourceResponse shouldInterceptRequest(WebView w,WebResourceRequest req){
                Uri uri=req.getUrl();
                if(!req.isForMainFrame()&&"data".equals(uri.getScheme())&&uri.toString().startsWith("data:image/"))return null;
                String path=uri.getPath();
                if("https".equals(uri.getScheme())&&HOST.equals(uri.getHost())&&path!=null&&path.startsWith("/")&&!path.contains("..")&&!path.contains("\\")){
                    if(path.startsWith("/mail-art/")&&path.endsWith(".png")){
                        try{return new WebResourceResponse("image/png",null,new FileInputStream(Mail.image(Main.this,path.substring(10,path.length()-4))));}catch(IOException ignored){}
                    }
                    try{String mime=path.endsWith(".mjs")||path.endsWith(".js")?"text/javascript":path.endsWith(".html")?"text/html":path.endsWith(".css")?"text/css":path.endsWith(".json")?"application/json":path.endsWith(".png")?"image/png":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".woff")?"font/woff":path.endsWith(".webp")?"image/webp":"application/octet-stream";
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
    void dispatchIntent(){
        if(!webReady||pendingReply.isEmpty())return;
        String value=pendingReply;pendingReply="";web.evaluateJavascript("window.openParcelAction("+JSONObject.quote(value)+")",null);
    }
    private void incoming(Intent i){
        if("friends".equals(i.getAction())){pendingReply="@friends";dispatchIntent();return;}
        String id=i.getStringExtra("id");if(id==null)return;
        JSONObject m=Mail.meta(this,id);if(!m.has("id"))return;
        if("reply".equals(i.getAction())){pendingReply=id;dispatchIntent();}
        else startActivity(new Intent(this,OpenParcel.class).putExtra("id",id));
        i.removeExtra("id");
    }
    protected void onResume(){super.onResume();UnlockQueue.watch(this);if(Mail.prefs(this).contains("owner"))Mail.io.execute(()->{try{Mail.sync(this);}catch(Exception ignored){}runOnUiThread(()->web.evaluateJavascript("window.refreshMailbox?.()",null));});}
    protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);
        if(req==41&&photo!=null){Uri u=res==RESULT_OK&&data!=null?data.getData():null;photo.onReceiveValue(u!=null&&"content".equals(u.getScheme())?new Uri[]{u}:null);photo=null;}
        if(req==42&&saveData!=null){String png=saveData;saveData=null;if(res==RESULT_OK&&data!=null&&data.getData()!=null)try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(android.util.Base64.decode(png.substring(22),0));toast("PNG saved");}catch(Exception e){toast("Could not save PNG");}}
    }
    void settings(){
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(1);panel.setPadding(dp(18),dp(8),dp(18),dp(8));
        RadioGroup openMode=choice(panel,"When open","fullPopup","Full pop-up","Notification only",true);
        Switch unlock=option(panel,"Pop up 1 second after unlock","onUnlock",true);
        unlock.setEnabled(Mail.prefs(this).getBoolean("fullPopup",true));
        openMode.setOnCheckedChangeListener((group,id)->{boolean full=id==group.getChildAt(0).getId();Mail.prefs(this).edit().putBoolean("fullPopup",full).apply();unlock.setEnabled(full);if(!full)UnlockQueue.reset(this);});
        choice(panel,"When closed","closedInbox","Inbox only","Completely closed",Mail.prefs(this).getBoolean("quiet",true));
        option(panel,"Warn before a pop-up","warning",true);
        Button delayButton=new Button(this);delayButton.setText("Warning time · "+Mail.delay(this)+" seconds");panel.addView(delayButton);
        delayButton.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("Warning time").setItems(new String[]{"3 seconds","10 seconds","15 seconds"},(dialog,i)->{
            int seconds=new int[]{3,10,15}[i];Mail.prefs(this).edit().putInt("warningSeconds",seconds).apply();delayButton.setText("Warning time · "+seconds+" seconds");
        }).show());
        option(panel,"Notify me when friends change status","friendAlerts",false);
        button(panel,"Phone notifications · "+(Mail.enabled(this,Mail.ALERT)?"on":"set up"),()->{
            if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=0)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},9);
            else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));
        });
        button(panel,"Incoming warning banner settings",()->startActivity(new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()).putExtra(Settings.EXTRA_CHANNEL_ID,Mail.ALERT)));
        button(panel,"Display over apps · "+(Settings.canDrawOverlays(this)?"on":"set up"),()->startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName()))));
        if(Build.VERSION.SDK_INT>=31)button(panel,"Precise schedules · "+(Mail.exact(this)?"on":"set up"),()->startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName()))));
        button(panel,"Check for updates",this::checkUpdates);
        button(panel,"Listen for mail for 30 minutes",this::listen);
        TextView tip=new TextView(this);tip.setText("Display over apps lets a parcel appear above your current screen. Notification only lets you open it when you choose.");panel.addView(tip);
        ScrollView scroll=new ScrollView(this);scroll.addView(panel);new AlertDialog.Builder(this).setTitle("Notification settings").setView(scroll).setPositiveButton("Done",null).show();
    }
    RadioGroup choice(LinearLayout panel,String title,String key,String first,String second,boolean fallback){
        TextView heading=new TextView(this);heading.setText(title);panel.addView(heading);
        RadioGroup group=new RadioGroup(this);panel.addView(group);
        for(String text:new String[]{first,second}){RadioButton radio=new RadioButton(this);radio.setId(View.generateViewId());radio.setText(text);group.addView(radio);}
        group.check(group.getChildAt(Mail.prefs(this).getBoolean(key,fallback)?0:1).getId());
        group.setOnCheckedChangeListener((g,id)->{Mail.prefs(this).edit().putBoolean(key,id==g.getChildAt(0).getId()).apply();PostOffice.syncSoon(this);});return group;
    }
    Switch option(LinearLayout parent,String title,String key,boolean initial){Switch sw=new Switch(this);sw.setText(title);sw.setPadding(0,dp(8),0,dp(8));sw.setChecked(Mail.prefs(this).getBoolean(key,initial));sw.setOnCheckedChangeListener((b,on)->{Mail.prefs(this).edit().putBoolean(key,on).apply();if("onUnlock".equals(key)&&!on)UnlockQueue.reset(this);});parent.addView(sw);return sw;}
    void button(LinearLayout p,String title,Runnable action){Button b=new Button(this);b.setText(title);b.setOnClickListener(v->action.run());p.addView(b);}
    void checkUpdates(){
        toast("Checking for updates…");
        Mail.io.execute(()->{
            java.net.HttpURLConnection connection=null;
            try{
                connection=(java.net.HttpURLConnection)new java.net.URL("https://nikki0radz.github.io/You-ve-got-mail/latest.json").openConnection();
                connection.setConnectTimeout(8000);connection.setReadTimeout(8000);connection.setUseCaches(false);
                JSONObject latest=new JSONObject(new String(Mail.read(connection.getInputStream()),java.nio.charset.StandardCharsets.UTF_8));
                String version=latest.getString("version");
                if(!version.matches("[0-9]+[.][0-9]+[.][0-9]+"))throw new IOException();
                boolean newer=latest.getInt("code")>getPackageManager().getPackageInfo(getPackageName(),0).getLongVersionCode();
                runOnUiThread(()->{if(isFinishing()||isDestroyed())return;
                    if(!newer){toast("You’re up to date.");return;}
                    new AlertDialog.Builder(this).setTitle("Update to "+version+"?").setPositiveButton("Download",(d,k)->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://pigeon-post-delivery.nikki0radz.chatgpt.site/downloads/Youve-Got-Mail-"+version+".apk")))).setNegativeButton("Later",null).show();});
            }catch(Exception e){runOnUiThread(()->toast("Couldn’t check for updates. Try again."));}
            finally{if(connection!=null)connection.disconnect();}
        });
    }
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
    void reply(JSONObject m){pendingReply=m.optString("id");dispatchIntent();}
    public class Bridge {
        @JavascriptInterface public void setTheme(boolean dark){Mail.prefs(Main.this).edit().putBoolean("night",dark).apply();runOnUiThread(()->bars(dark));}
        @JavascriptInterface public String mailbox(){
            JSONArray rows=new JSONArray();for(JSONObject m:Mail.history(Main.this))rows.put(m);
            for(String key:Mail.prefs(Main.this).getAll().keySet())if(key.startsWith("s:"))try{rows.put(new JSONObject(Mail.prefs(Main.this).getString(key,"{}")));}catch(JSONException ignored){}
            return rows.toString();
        }
        @JavascriptInterface public void markRead(String id){Mail.prefs(Main.this).edit().putBoolean("read:"+id,true).apply();}
        @JavascriptInterface public boolean wasRead(String id){return Mail.prefs(Main.this).getBoolean("read:"+id,false);}
        @JavascriptInterface public String friendsCached(){return Mail.prefs(Main.this).getString("friendsSnapshot","{}");}
        @JavascriptInterface public void name(String name){String clean=name.trim();if(!clean.isEmpty()&&clean.length()<=40&&!clean.equals(Mail.prefs(Main.this).getString("displayName",""))){Mail.prefs(Main.this).edit().putString("displayName",clean).apply();PostOffice.syncSoon(Main.this);}}
        @JavascriptInterface public void post(int ticket,String op,String payload){
            Mail.io.execute(()->{String value;try{value=new JSONObject().put("data",PostOffice.perform(Main.this,op,new JSONObject(payload))).toString();}
            catch(Exception e){try{value=new JSONObject().put("error",e.getMessage()==null?"Try again when connected.":e.getMessage()).toString();}catch(Exception ignored){return;}}
            final String answer=value;runOnUiThread(()->{if(!isDestroyed())web.evaluateJavascript("window.postOfficeResult("+ticket+","+JSONObject.quote(answer)+")",null);});});
        }
        @JavascriptInterface public void cancelScheduled(String id){JSONObject m=Mail.meta(Main.this,id);if("scheduled".equals(m.optString("status"))){getSystemService(AlarmManager.class).cancel(Mail.action(Main.this,id,"arrive",false));Mail.state(Main.this,m,"cancelled");}}

        @JavascriptInterface public void settings(){runOnUiThread(Main.this::settings);}
        @JavascriptInterface public void invite(){runOnUiThread(Main.this::invite);}
        @JavascriptInterface public void history(){runOnUiThread(Main.this::history);}
        @JavascriptInterface public boolean isOpen(){return Mail.prefs(Main.this).getBoolean("open",true);}
        @JavascriptInterface public void receiving(boolean b){Mail.prefs(Main.this).edit().putBoolean("open",b).apply();if(!b)runOnUiThread(()->{UnlockQueue.reset(Main.this);Delivery.clear(Main.this);});PostOffice.syncSoon(Main.this);}
        @JavascriptInterface public String queue(String json){try{JSONObject data=new JSONObject(json);if(data.optLong("when")<=0)data.put("when",System.currentTimeMillis()+5000);Mail.accept(Main.this,data,false);return "ok";}catch(Exception e){return "Could not save this parcel: "+e.getMessage();}}
        @JavascriptInterface public boolean precise(){return Mail.exact(Main.this);}
        @JavascriptInterface public void savePNG(String image){if(!image.startsWith("data:image/png;base64,"))return;runOnUiThread(()->{saveData=image;startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/png").putExtra(Intent.EXTRA_TITLE,"Pigeon post.png"),42);});}
    }
}
