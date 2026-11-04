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
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
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
    private void handleBack(){
        if(!webReady){finish();return;}
        web.evaluateJavascript("Boolean(window.pigeonBack?.())",handled->{if(!"true".equals(handled)&&!isFinishing())finish();});
    }
    @Override public void onBackPressed(){handleBack();}
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
    protected void onResume(){super.onResume();if(webReady)web.evaluateJavascript("window.refreshDeliverySettings?.()",null);UnlockQueue.watch(this);if(Mail.prefs(this).contains("owner"))Mail.io.execute(()->{try{Mail.sync(this);}catch(Exception ignored){}runOnUiThread(()->web.evaluateJavascript("window.refreshMailbox?.()",null));});}
    protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);
        if(req==41&&photo!=null){Uri u=res==RESULT_OK&&data!=null?data.getData():null;photo.onReceiveValue(u!=null&&"content".equals(u.getScheme())?new Uri[]{u}:null);photo=null;}
        if(req==42&&saveData!=null){String png=saveData;saveData=null;if(res==RESULT_OK&&data!=null&&data.getData()!=null)try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(android.util.Base64.decode(png.substring(22),0));toast("PNG saved");}catch(Exception e){toast("Could not save PNG");}}
    }
    void settings(){pendingReply="@settings";dispatchIntent();}
    void openSetting(String key){
        switch(key){
        case "overlay":startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())));break;
        case "notifications":
            if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=0)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},9);
            else startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()));
            break;
        case "warningChannel":startActivity(new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName()).putExtra(Settings.EXTRA_CHANNEL_ID,Mail.ALERT));break;
        case "precise":if(Build.VERSION.SDK_INT>=31)startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));else toast("Precise schedules are available.");break;
        case "updates":checkUpdates();break;
        case "listen":listen();toast("Listening for mail for 30 minutes.");break;
        }
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){
        super.onRequestPermissionsResult(code,permissions,results);
        if(webReady)web.evaluateJavascript("window.refreshDeliverySettings?.()",null);
    }
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

        @JavascriptInterface public String deliveryPrefs(){
            SharedPreferences p=Mail.prefs(Main.this);JSONObject data=new JSONObject();
            try{
                for(String k:new String[]{"fullPopup","onUnlock","warning","friendAlerts","closedInbox"})data.put(k,p.getBoolean(k,"closedInbox".equals(k)?p.getBoolean("quiet",true):!"friendAlerts".equals(k)));
                data.put("warningSeconds",Mail.delay(Main.this)).put("blur",ParcelFrost.systemState(Main.this)).put("overlay",Settings.canDrawOverlays(Main.this)).put("notifications",Mail.enabled(Main.this,Mail.ALERT)).put("precise",Mail.exact(Main.this));
            }catch(JSONException ignored){}
            return data.toString();
        }
        @JavascriptInterface public void deliverySetting(String key,String value){
            SharedPreferences.Editor change=Mail.prefs(Main.this).edit();
            if("warningSeconds".equals(key)){
                if(!Arrays.asList("3","10","15").contains(value))return;
                change.putInt(key,Integer.parseInt(value)).apply();return;
            }
            if(!Arrays.asList("fullPopup","onUnlock","warning","friendAlerts","closedInbox").contains(key))return;
            boolean on="true".equals(value);change.putBoolean(key,on).apply();
            if(!on&&("fullPopup".equals(key)||"onUnlock".equals(key)))runOnUiThread(()->UnlockQueue.reset(Main.this));
            if("closedInbox".equals(key))PostOffice.syncSoon(Main.this);
        }
        @JavascriptInterface public void settingsAction(String key){runOnUiThread(()->openSetting(key));}
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
