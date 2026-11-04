package uk.co.pigeonpost.mail;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.os.*;
import android.text.InputType;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** Isolated, read-only composer preview. The main mailbox bridge is never installed here. */
public final class DesignMode extends Activity {
    static final String PAGE="https://"+Main.HOST+"/design/composer.html?phone=1";
    static final String SCREEN="postcard-composer",VERSION="0.1.9";
    static final int LIMIT=1800000;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private FrameLayout frame;
    private WebView web;
    private ValueCallback<android.net.Uri[]> photo;
    private String key="",revision="",lastProfile="";
    private JSONObject draft=null,metrics=new JSONObject();
    private String error="";
    private volatile String snapshot="{}";
    private boolean loaded=false,busy=false,closed=false;
    private boolean appliedInsets=false, keyboardVisible=false;
    private int viewportGeneration=0;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable measure=this::measureViewport, report=this::reportProfile;
    private static SharedPreferences store(Context c){return c.getSharedPreferences("design-preview",MODE_PRIVATE);}
    static boolean paired(Context c){return store(c).contains("key");}
    static void forget(Main a){new AlertDialog.Builder(a).setTitle("Disconnect this laptop?")
        .setMessage("This clears the pairing key and saved preview on this phone. The laptop draft stays in place.")
        .setPositiveButton("Disconnect",(d,w)->{store(a).edit().clear().apply();a.toast("Laptop disconnected.");a.settings();})
        .setNegativeButton("Cancel",null).show();}
    @Override public void onCreate(Bundle state){super.onCreate(state);
        if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
        else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        getWindow().setStatusBarColor(Color.rgb(25,40,36));getWindow().setNavigationBarColor(Color.rgb(25,40,36));
        frame=new FrameLayout(this);frame.setBackgroundColor(Color.rgb(25,40,36));setContentView(frame);
        frame.setOnApplyWindowInsetsListener((v,i)->{
            appliedInsets=true;
            // API 28–29 combine the keyboard and navigation bar into the system bottom inset.
            keyboardVisible=Build.VERSION.SDK_INT>=30?i.isVisible(WindowInsets.Type.ime()):
                i.getSystemWindowInsetBottom()>i.getStableInsetBottom();
            viewportGeneration++;
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets b=i.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(b.left,b.top,b.right,b.bottom);}
            else v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());
            scheduleMeasurement();return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:i.consumeSystemWindowInsets();
        });
        key=store(this).getString("key","");
        if(key.isEmpty()){pair("");return;}
        try{draft=new JSONObject(store(this).getString("draft",""));revision=draft.getString("id");}catch(JSONException ignored){draft=null;}
        openPreview();
    }
    private void pair(String hint){
        EditText field=new EditText(this);field.setSingleLine();field.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        field.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);field.setHint("Laptop pairing key");
        FrameLayout holder=new FrameLayout(this);int pad=Math.round(22*getResources().getDisplayMetrics().density);holder.setPadding(pad,0,pad,0);holder.addView(field);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Pair with your laptop").setMessage(hint.isEmpty()?"Copy the pairing key from the laptop editor. This phone will share its screen measurements and show the latest saved draft.":hint)
            .setView(holder).setPositiveButton("Pair",null).setNegativeButton("Cancel",(d,w)->finish()).setOnCancelListener(d->finish()).create();
        dialog.setOnShowListener(d->dialog.getButton(-1).setOnClickListener(v->{
            String entered=field.getText().toString().trim().toLowerCase(Locale.ROOT);
            if(!entered.matches("[0-9a-f]{32}")){field.setError("Enter the 32-character key from the laptop.");return;}
            dialog.getButton(-1).setEnabled(false);dialog.getButton(-1).setText("Pairing…");
            io.execute(()->{try{JSONObject data=call("read",new JSONObject().put("key",entered));runOnUiThread(()->{
                if(closed||!dialog.isShowing())return;key=entered;store(this).edit().clear().putString("key",key).apply();
                dialog.dismiss();accept(data);openPreview();
            });}catch(Exception ex){runOnUiThread(()->{if(closed||!dialog.isShowing())return;field.setError(ex instanceof UnknownKey?"That key wasn't found. Copy it from the laptop again.":"Couldn’t reach the laptop workspace. Check the connection and try again.");dialog.getButton(-1).setEnabled(true);dialog.getButton(-1).setText("Pair");});}});
        }));dialog.show();
    }
    private void openPreview(){
        web=new WebView(this);frame.addView(web);
        WebSettings s=web.getSettings();s.setTextZoom(getIntent().getIntExtra("textZoom",s.getTextZoom()));s.setJavaScriptEnabled(true);s.setDomStorageEnabled(false);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
                android.net.Uri u=r.getUrl();String p=u.getPath();
                if(!r.isForMainFrame()&&"data".equals(u.getScheme())&&u.toString().startsWith("data:image/"))return null;
                if("https".equals(u.getScheme())&&Main.HOST.equals(u.getHost())&&p!=null&&p.startsWith("/")&&!p.contains("..")&&!p.contains("\\")&&"GET".equals(r.getMethod())&&(!r.isForMainFrame()||"/design/composer.html".equals(p))){
                    try{String mime=p.endsWith(".mjs")||p.endsWith(".js")?"text/javascript":p.endsWith(".html")?"text/html":p.endsWith(".css")?"text/css":p.endsWith(".json")?"application/json":p.endsWith(".png")?"image/png":p.endsWith(".svg")?"image/svg+xml":p.endsWith(".woff2")?"font/woff2":p.endsWith(".woff")?"font/woff":p.endsWith(".webp")?"image/webp":"application/octet-stream";
                        Map<String,String> headers=Collections.singletonMap("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; frame-src 'none'; connect-src 'self'; form-action 'none'; base-uri 'self'");
                        return new WebResourceResponse(mime,null,200,"OK",headers,getAssets().open("site"+p));
                    }catch(IOException ignored){}
                }return new WebResourceResponse("text/plain","UTF-8",404,"Missing",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public void onPageFinished(WebView v,String url){if(!PAGE.equals(url))return;loaded=true;measureViewport();refreshDraft();}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<android.net.Uri[]> cb,FileChooserParams chooser){
                if(photo!=null)photo.onReceiveValue(null);photo=cb;
                try{startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE),81);}
                catch(ActivityNotFoundException e){photo.onReceiveValue(null);photo=null;}return true;
            }
        });
        web.addJavascriptInterface(new PreviewBridge(),"PigeonDesign");
        web.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob)->scheduleMeasurement());
        publish();web.loadUrl(PAGE);
    }
    private class PreviewBridge {
        @JavascriptInterface public String state(){return snapshot;}
        @JavascriptInterface public void refresh(){runOnUiThread(()->refreshDraft());}
        @JavascriptInterface public void close(){runOnUiThread(()->finish());}
    }
    private void scheduleMeasurement(){handler.removeCallbacks(measure);handler.postDelayed(measure,80);}
    private boolean stableViewport(){
        if(!appliedInsets||keyboardVisible)return false;
        if(Build.VERSION.SDK_INT>=30)return true;
        // Some older window managers resize the app before delivering keyboard insets.
        android.graphics.Rect visible=new android.graphics.Rect();
        View decor=getWindow().getDecorView();
        decor.getWindowVisibleDisplayFrame(visible);
        WindowInsets insets=decor.getRootWindowInsets();
        if(insets==null)return false;
        int obscured=decor.getRootView().getHeight()-visible.bottom-insets.getStableInsetBottom();
        return obscured<Math.round(75*getResources().getDisplayMetrics().density);
    }
    private void measureViewport(){
        if(closed||!loaded||web==null||!stableViewport())return;
        int generation=viewportGeneration;
        web.evaluateJavascript("[window.innerWidth,window.innerHeight,window.devicePixelRatio]",result->{
            if(closed||generation!=viewportGeneration||!stableViewport())return;
            try{JSONArray d=new JSONArray(result);double density=getResources().getDisplayMetrics().density,ratio=d.getDouble(2);
                if(!Double.isFinite(ratio)||ratio<=0||d.getInt(0)<=0||d.getInt(1)<=0)return;
                JSONObject next=new JSONObject().put("width",d.getInt(0)).put("height",d.getInt(1)).put("density",density).put("pixelRatio",ratio)
                    .put("fontScale",(double)getResources().getConfiguration().fontScale).put("textZoom",web.getSettings().getTextZoom()).put("appVersion",VERSION)
                    .put("insets",new JSONObject().put("top",Math.round(frame.getPaddingTop()/ratio)).put("right",Math.round(frame.getPaddingRight()/ratio)).put("bottom",Math.round(frame.getPaddingBottom()/ratio)).put("left",Math.round(frame.getPaddingLeft()/ratio)));
                if(!next.toString().equals(metrics.toString())){metrics=next;publish();}handler.removeCallbacks(report);handler.postDelayed(report,350);
            }catch(JSONException ignored){}
        });
    }
    private void reportProfile(){if(closed||key.isEmpty()||!metrics.has("width")||!stableViewport())return;String k=key,m=metrics.toString();if(m.equals(lastProfile))return;lastProfile=m;
        io.execute(()->{try{call("profile",new JSONObject().put("key",k).put("profile",new JSONObject(m)));}catch(Exception e){runOnUiThread(()->{if(closed)return;lastProfile="";error="Couldn’t share this phone’s measurements. Tap Refresh draft to retry.";publish();});}});
    }
    private void refreshDraft(){
        if(closed||busy||key.isEmpty())return;busy=true;error="";publish();String k=key;
        io.execute(()->{try{JSONObject data=call("read",new JSONObject().put("key",k));runOnUiThread(()->{if(closed)return;busy=false;accept(data);publish();measureViewport();});}
            catch(Exception e){runOnUiThread(()->{if(closed)return;busy=false;error=e instanceof UnknownKey?"The pairing key is no longer valid. Disconnect the laptop in Settings, then pair again.":"Refresh failed. Check your connection and try again.";publish();});}});
    }
    private void accept(JSONObject data){
        error="";
        try{Object book=data.opt("book");if(book==null||book==JSONObject.NULL){clearDraft();return;}JSONObject b=(JSONObject)book;
            if(b.getInt("schema")!=1||!SCREEN.equals(b.getString("screen")))throw new JSONException("screen");
            String active=b.optString("active");JSONArray ds=b.getJSONArray("drafts");
            if(ds.length()==0){clearDraft();return;}
            for(int i=0;i<ds.length();i++){JSONObject doc=ds.getJSONObject(i);if(!active.equals(doc.getString("id")))continue;
                JSONArray rs=doc.getJSONArray("revisions");if(rs.length()==0){clearDraft();return;}JSONObject rev=rs.getJSONObject(rs.length()-1);
                String revisionVersion=rev.getString("appVersion");
                if(!SCREEN.equals(rev.getString("screen"))||!("0.1.8".equals(revisionVersion)||VERSION.equals(revisionVersion)))throw new JSONException("version");
                JSONObject next=new JSONObject().put("id",rev.getString("id")).put("name",doc.getString("name")).put("screen",SCREEN).put("appVersion",revisionVersion).put("layout",rev.getJSONObject("layout"));
                draft=next;revision=next.getString("id");store(this).edit().putString("draft",next.toString()).apply();return;
            }throw new JSONException("active");
        }catch(Exception e){error="This draft doesn’t match this app version. The last compatible preview is kept."; }
    }
    private void clearDraft(){draft=null;revision="";store(this).edit().remove("draft").apply();}
    private void publish(){
        try{snapshot=new JSONObject().put("paired",!key.isEmpty()).put("draft",draft==null?JSONObject.NULL:draft).put("revision",revision).put("metrics",metrics).put("error",error).put("refreshing",busy).toString();}
        catch(JSONException ignored){return;}
        if(!closed&&loaded)web.evaluateJavascript("window.dispatchEvent(new Event('pigeon-design-update'))",null);
    }
    private static final class UnknownKey extends IOException {}
    private static JSONObject call(String action,JSONObject payload)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL(Mail.RELAY+"design/"+action).openConnection();
        try{c.setInstanceFollowRedirects(false);c.setConnectTimeout(8000);c.setReadTimeout(12000);c.setUseCaches(false);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");
            try(OutputStream out=c.getOutputStream()){out.write(payload.toString().getBytes(StandardCharsets.UTF_8));}
            int code=c.getResponseCode();if(code==404||code==401||code==403)throw new UnknownKey();if(code<200||code>=300)throw new IOException("Design relay unavailable");
            if(c.getContentLength()>LIMIT)throw new IOException("Workspace too large");
            try(InputStream in=c.getInputStream();ByteArrayOutputStream buf=new ByteArrayOutputStream()){byte[] block=new byte[8192];int n;while((n=in.read(block))!=-1){if(buf.size()+n>LIMIT)throw new IOException("Workspace too large");buf.write(block,0,n);}return new JSONObject(buf.toString("UTF-8"));}
        }finally{c.disconnect();}
    }
    @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);
        if(req==81&&photo!=null){android.net.Uri uri=result==RESULT_OK&&data!=null?data.getData():null;photo.onReceiveValue(uri!=null&&"content".equals(uri.getScheme())?new android.net.Uri[]{uri}:null);photo=null;}
    }
    @Override protected void onDestroy(){closed=true;handler.removeCallbacksAndMessages(null);io.shutdownNow();if(web!=null){frame.removeView(web);web.removeJavascriptInterface("PigeonDesign");web.destroy();}super.onDestroy();}
}
