package uk.co.pigeonpost.mail;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.graphics.Color;
import android.os.*;
import android.provider.Settings;
import android.provider.MediaStore;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.ext.SdkExtensions;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.util.*;

public class Main extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> photo;
    private final java.util.concurrent.ExecutorService imageImports=java.util.concurrent.Executors.newSingleThreadExecutor();
    private String saveData,reviewData,pendingReply="";
    private boolean webReady;
    private DesignUpdates designUpdates;
    private volatile DesignBundle designBundle;
    private final Handler designHandler=new Handler(Looper.getMainLooper());
    private boolean firstPageLoaded,designChecking,foreground;
    private final Runnable initialDesign=()->loadDesign(designBundle);
    private FrameLayout frame;
    void bars(boolean dark){
        int colour=Color.parseColor(dark?"#192824":"#faf4e5");frame.setBackgroundColor(colour);
        getWindow().setStatusBarColor(colour);getWindow().setNavigationBarColor(colour);
        getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        if(Build.VERSION.SDK_INT>=29)getWindow().setNavigationBarContrastEnforced(false);
    }
    static final String HOST="appassets.androidplatform.net";
    static boolean allowsArtworkRequest(String scheme,String host,int port,String path,String method){
        return "https".equals(scheme) && "pigeon-post-delivery.nikki0radz.chatgpt.site".equals(host) && port==-1
            && path!=null && (path.startsWith("/api/art/") || path.startsWith("/api/catalogue/"))
            && !path.contains("/../") && !path.endsWith("/..")
            && ("GET".equals(method) || "POST".equals(method) || "OPTIONS".equals(method));
    }
    private int dp(int n){return Math.round(getResources().getDisplayMetrics().density*n);}
    void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override public void onCreate(Bundle b){super.onCreate(b);Mail.channels(this);SyncJob.register(this);imageImports.execute(()->PickedPhotos.expire(this));
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        frame=new FrameLayout(this);web=new WebView(this);frame.addView(web);setContentView(frame);bars(Mail.prefs(this).getBoolean("night",true));
        frame.setOnApplyWindowInsetsListener((v,i)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}
            else v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());
            return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:i.consumeSystemWindowInsets();
        });
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);
        try{designUpdates=new DesignUpdates(this);designBundle=designUpdates.saved();}catch(IOException ignored){}
        web.setWebViewClient(new WebViewClient(){
            public void onPageFinished(WebView v,String url){webReady=true;dispatchIntent();verifyDesign();}
            public void onReceivedError(WebView v,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())rejectDesign();}
            public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest req){Uri u=req.getUrl();return req.isForMainFrame()||!"https".equals(u.getScheme())||!HOST.equals(u.getHost());}
            public WebResourceResponse shouldInterceptRequest(WebView w,WebResourceRequest req){
                Uri uri=req.getUrl();
                if(!req.isForMainFrame()&&"data".equals(uri.getScheme())&&uri.toString().startsWith("data:image/"))return null;
                String path=uri.getPath();
                if(!req.isForMainFrame() && allowsArtworkRequest(uri.getScheme(),uri.getHost(),uri.getPort(),path,req.getMethod())) return null;
                if(!req.isForMainFrame() && "blob".equals(uri.getScheme()) &&
                    uri.toString().startsWith("blob:https://"+HOST+"/")) return null;
                if("https".equals(uri.getScheme())&&HOST.equals(uri.getHost())&&path!=null&&path.startsWith("/")&&!path.contains("..")&&!path.contains("\\")){
                    if(path.startsWith("/mail-art/")&&path.endsWith(".png")){
                        try{return new WebResourceResponse("image/png",null,new FileInputStream(Mail.image(Main.this,path.substring(10,path.length()-4))));}catch(IOException ignored){}
                    }
                    try{String mime=path.endsWith(".mjs")||path.endsWith(".js")?"text/javascript":path.endsWith(".html")?"text/html":path.endsWith(".css")?"text/css":path.endsWith(".json")?"application/json":path.endsWith(".png")?"image/png":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".woff2")?"font/woff2":path.endsWith(".woff")?"font/woff":path.endsWith(".webp")?"image/webp":"application/octet-stream";
                        InputStream content=designUpdates!=null&&designBundle!=null?designUpdates.open(designBundle,path.substring(1)):getAssets().open("site"+path);
                        return new WebResourceResponse(mime,null,200,"OK",Collections.singletonMap("Cache-Control","no-store"),content);
                    }catch(IOException ignored){}
                }
                return new WebResourceResponse("text/plain","UTF-8",404,"Missing",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
                if(photo!=null)photo.onReceiveValue(null);photo=cb;
                if(!openPhotoPicker(params)){
                    photo=null;cb.onReceiveValue(null);toast("No photo picker is available.");
                }
                return true;
            }
            public boolean onJsConfirm(WebView v,String url,String msg,JsResult r){new AlertDialog.Builder(Main.this).setMessage(msg).setPositiveButton("Discard",(d,k)->r.confirm()).setNegativeButton("Keep editing",(d,k)->r.cancel()).setOnCancelListener(d->r.cancel()).show();return true;}
        });
        web.addJavascriptInterface(new Bridge(),"Pigeon");incoming(getIntent());
        // Cached screens open promptly; a completed update refreshes only an idle screen.
        designHandler.postDelayed(initialDesign,1200);checkDesignUpdates();
        if(!Mail.prefs(this).getBoolean("intro",false)){
            Mail.prefs(this).edit().putBoolean("intro",true).apply();
            new AlertDialog.Builder(this).setTitle("Let a pigeon land on your screen")
              .setMessage("Enable phone notifications and display over other apps for the floating PNG. For exact delivery times, enable precise schedules too. You can change these later in Settings.")
              .setPositiveButton("Set up delivery",(d,k)->settings()).setNegativeButton("Later",null).show();
        }
    }
    private static final String OEM_PICK_IMAGES="androidx.activity.result.contract.action.PICK_IMAGES";
    private boolean launchPhotoPicker(Intent intent){
        try{startActivityForResult(intent,41);return true;}
        catch(ActivityNotFoundException | SecurityException unavailable){return false;}
    }
    private boolean openPhotoPicker(WebChromeClient.FileChooserParams params){
        boolean multiple=params.getMode()==WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
        boolean pngOnly=false;
        for(String entry:params.getAcceptTypes()){
            for(String token:entry.split(",")){
                String type=token.trim().toLowerCase(Locale.ROOT);
                if(type.isEmpty())continue;
                if(!"image/png".equals(type)&&!".png".equals(type)){
                    return openImagePicker("image/*",multiple);
                }
                pngOnly=true;
            }
        }
        return openImagePicker(pngOnly?"image/png":"image/*",multiple);
    }
    private boolean openImagePicker(String mime,boolean multiple){
        if(Build.VERSION.SDK_INT>=33 || (Build.VERSION.SDK_INT>=30 &&
            SdkExtensions.getExtensionVersion(Build.VERSION_CODES.R)>=2)){
            Intent system=new Intent(MediaStore.ACTION_PICK_IMAGES).setType(mime);
            if(multiple)system.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX,MediaStore.getPickImagesMaxLimit());
            if(launchPhotoPicker(system))return true;
        }
        Intent oem=new Intent(OEM_PICK_IMAGES).setType(mime);
        ResolveInfo handler=getPackageManager().resolveActivity(oem,PackageManager.MATCH_SYSTEM_ONLY|PackageManager.MATCH_DEFAULT_ONLY);
        if(handler!=null){
            oem.setClassName(handler.activityInfo.packageName,handler.activityInfo.name);
            if(multiple)oem.putExtra("androidx.activity.result.contract.extra.PICK_IMAGES_MAX",Integer.MAX_VALUE);
            if(launchPhotoPicker(oem))return true;
        }
        Intent backport=new Intent("com.google.android.gms.provider.action.PICK_IMAGES")
            .setPackage("com.google.android.gms").setType(mime);
        if(multiple)backport.putExtra("com.google.android.gms.provider.extra.PICK_IMAGES_MAX",Integer.MAX_VALUE);
        if(launchPhotoPicker(backport))return true;
        for(String action:new String[]{Intent.ACTION_GET_CONTENT,Intent.ACTION_OPEN_DOCUMENT}){
            Intent chooser=new Intent(action).setType(mime).addCategory(Intent.CATEGORY_OPENABLE);
            if(multiple)chooser.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
            if(launchPhotoPicker(chooser))return true;
        }
        return false;
    }
    private void handleBack(){
        if(!webReady){finish();return;}
        web.evaluateJavascript("Boolean(window.pigeonBack?.())",handled->{if(!"true".equals(handled)&&!isFinishing())finish();});
    }
    @Override public void onBackPressed(){handleBack();}
    protected void onDestroy(){designHandler.removeCallbacksAndMessages(null);imageImports.shutdownNow();Delivery.closeActivityWindow(this);super.onDestroy();}
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
    protected void onResume(){super.onResume();foreground=true;if(webReady)web.evaluateJavascript("window.refreshDeliverySettings?.()",null);checkDesignUpdates();UnlockQueue.watch(this);if(Mail.prefs(this).contains("owner"))Mail.io.execute(()->{try{Mail.sync(this);}catch(Exception ignored){}runOnUiThread(()->{if(!isDestroyed())web.evaluateJavascript("window.refreshMailbox?.()",null);});});}
    protected void onPause(){foreground=false;super.onPause();}
    private void loadDesign(DesignBundle release){
        if(isDestroyed()||isFinishing())return;
        designHandler.removeCallbacks(initialDesign);designBundle=release;firstPageLoaded=true;webReady=false;
        web.stopLoading();web.loadUrl("https://"+HOST+"/index.html");
    }
    private void checkDesignUpdates(){
        if(designUpdates==null||designChecking||isDestroyed())return;designChecking=true;
        DesignUpdates.io.execute(()->{
            DesignBundle next;try{next=designUpdates.refresh();}catch(IOException ignored){next=designUpdates.saved();}
            final DesignBundle release=next;
            runOnUiThread(()->{
                designChecking=false;if(isDestroyed()||isFinishing())return;
                if(!firstPageLoaded){loadDesign(release);return;}
                if(!foreground||!webReady||photo!=null||!pendingReply.isEmpty()||designBundle==null||release.revision.equals(designBundle.revision))return;
                web.evaluateJavascript("Boolean(window.pigeonPrepareDesignReload?.())",safe->{if("true".equals(safe))loadDesign(release);});
            });
        });
    }
    private void verifyDesign(){
        if(designUpdates==null||designBundle==null||designBundle.revision.equals(designUpdates.bundled.revision))return;
        final String revision=designBundle.revision;
        designHandler.postDelayed(()->{
            if(isDestroyed()||designBundle==null||!revision.equals(designBundle.revision))return;
            web.evaluateJavascript("Boolean(window.pigeonAppReady && document.getElementById('app')?.childElementCount)",ready->{if(!"true".equals(ready))rejectDesign();});
        },6000);
    }
    private void rejectDesign(){
        if(designUpdates==null||designBundle==null||designBundle.revision.equals(designUpdates.bundled.revision))return;
        final String revision=designBundle.revision;
        DesignUpdates.io.execute(()->{DesignBundle safe=designUpdates.reject(revision);runOnUiThread(()->{if(designBundle!=null&&revision.equals(designBundle.revision))loadDesign(safe);});});
    }
    private boolean isPickedImage(Uri uri){
        if(uri==null || !"content".equals(uri.getScheme()) || uri.getAuthority()==null)return false;
        try{
            String type=getContentResolver().getType(uri);
            return type!=null && type.startsWith("image/");
        }catch(SecurityException | IllegalArgumentException inaccessible){return false;}
    }
    protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);
        if(req==41 && photo!=null){
            LinkedHashSet<Uri> selected=new LinkedHashSet<>();
            if(res==RESULT_OK && data!=null){
                ClipData clips=data.getClipData();
                if(clips!=null)for(int n=0;n<clips.getItemCount();n++){
                    Uri u=clips.getItemAt(n).getUri();
                    if(isPickedImage(u))selected.add(u);
                }
                Uri single=data.getData();
                if(isPickedImage(single))selected.add(single);
            }
            ValueCallback<Uri[]> callback=photo;photo=null;
            if(selected.isEmpty())callback.onReceiveValue(null);
            else imageImports.execute(()->{
                ArrayList<Uri> copies=new ArrayList<>();
                String reason="";
                for(Uri source:selected){
                    if(Thread.currentThread().isInterrupted())return;
                    try{copies.add(PickedPhotos.copy(Main.this,source));}
                    catch(IOException | RuntimeException e){reason=e.getMessage();}
                }
                final String failure=reason;
                runOnUiThread(()->{
                    if(isDestroyed()||isFinishing())return;
                    callback.onReceiveValue(copies.isEmpty()?null:copies.toArray(new Uri[0]));
                    if(copies.size()!=selected.size()){
                        String detail="Pictures must be 32 MB or smaller.".equals(failure)?" "+failure:" Choose the pictures again to retry.";
                        toast("Could not import "+(selected.size()-copies.size())+" of "+selected.size()+" pictures."+detail);
                    }
                });
            });
        }
        if(req==43 && reviewData!=null){
            String review=reviewData;reviewData=null;
            if(res==RESULT_OK && data!=null && data.getData()!=null){
                try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
                    out.write(review.getBytes(java.nio.charset.StandardCharsets.UTF_8));toast("Design review saved");
                }catch(Exception e){toast("Could not save the review. Your local comments are still here.");}
            }
        }
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
        case "design":startActivity(new Intent(this,DesignMode.class).putExtra("textZoom",web.getSettings().getTextZoom()));break;
        case "designForget":DesignMode.forget(this);break;
        case "updates":checkUpdates();break;
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
    void invite(){new AlertDialog.Builder(this).setTitle("Let a friend send one parcel").setMessage("Your friend can choose a sticker or frame in their browser. The app checks for incoming mail in the background.").setPositiveButton("Create link",(d,k)->Mail.io.execute(()->{
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
        @JavascriptInterface public void saveReview(String json){
            if(json==null || json.isEmpty())return;
            runOnUiThread(()->{
                if(reviewData!=null)return;
                reviewData=json;
                try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json").putExtra(Intent.EXTRA_TITLE,"pigeon-post-design-review.json"),43);}
                catch(ActivityNotFoundException e){reviewData=null;toast("Could not open the file picker.");}
            });
        }
        @JavascriptInterface public void shareDesign(String data){
            if(data==null||data.length()>100000)return;
            runOnUiThread(()->{Intent share=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT,"Pigeon Post Home design").putExtra(Intent.EXTRA_TEXT,data);startActivity(Intent.createChooser(share,"Share your design"));});
        }
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
                data.put(ParcelFrost.OPACITY,ParcelFrost.opacity(Main.this));
                try{data.put("appVersion",getPackageManager().getPackageInfo(getPackageName(),0).versionName);}catch(android.content.pm.PackageManager.NameNotFoundException ignored){}
                data.put("warningSeconds",Mail.delay(Main.this)).put("overlay",Settings.canDrawOverlays(Main.this)).put("notifications",Mail.enabled(Main.this,Mail.ALERT)).put("precise",Mail.exact(Main.this));
            }catch(JSONException ignored){}
            return data.toString();
        }
        @JavascriptInterface public void deliverySetting(String key,String value){
            SharedPreferences.Editor change=Mail.prefs(Main.this).edit();
            if(ParcelFrost.OPACITY.equals(key)){
                try{change.putInt(key,Math.max(0,Math.min(100,Integer.parseInt(value)))).apply();}catch(NumberFormatException ignored){}
                return;
            }
            if("warningSeconds".equals(key)){
                if(!Arrays.asList("3","10","15").contains(value))return;
                change.putInt(key,Integer.parseInt(value)).apply();return;
            }
            if(!Arrays.asList("fullPopup","onUnlock","warning","friendAlerts","closedInbox").contains(key))return;
            boolean on="true".equals(value);change.putBoolean(key,on).apply();
            if(!on&&("fullPopup".equals(key)||"onUnlock".equals(key)))runOnUiThread(()->UnlockQueue.reset(Main.this));
            if("closedInbox".equals(key))PostOffice.syncSoon(Main.this);
        }
        @JavascriptInterface public boolean designPaired(){return DesignMode.paired(Main.this);}
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
