package uk.co.pigeonpost.mail;

import android.content.Context;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** HTTPS web-asset updates only. The native bridge and Android permissions stay in the APK. */
final class DesignUpdates {
    static final java.util.concurrent.ExecutorService io=java.util.concurrent.Executors.newSingleThreadExecutor();
    private static final Object RECORDS=new Object();
    static final String ORIGIN="https://pigeon-post-delivery.nikki0radz.chatgpt.site", ROOT=ORIGIN+"/workroom/";
    private final Context context;
    final DesignBundle bundled;
    private final File root,cache;
    DesignUpdates(Context context)throws IOException {
        this.context=context.getApplicationContext();root=new File(context.getFilesDir(),"design-updates");cache=new File(root,"files");
        bundled=parse(new String(DesignBundle.read(context.getAssets().open("site/design-update.json"),384000),StandardCharsets.UTF_8));
    }
    static DesignBundle parse(String text)throws IOException {
        try{
            JSONObject value=new JSONObject(text);if(value.getInt("schema")!=1)throw new IOException("Unsupported design format");
            JSONObject records=value.getJSONObject("files");Map<String,DesignBundle.Asset> assets=new LinkedHashMap<>();
            for(Iterator<String> keys=records.keys();keys.hasNext();){String path=keys.next();JSONObject file=records.getJSONObject(path);assets.put(path,new DesignBundle.Asset(path,file.getString("sha256"),file.getLong("size")));}
            return new DesignBundle(value.getString("revision"),value.getInt("bridge"),assets);
        }catch(JSONException|IllegalArgumentException e){throw new IOException("Invalid design manifest",e);}
    }
    private String readRecord(String name)throws IOException {
        synchronized(RECORDS){return new String(DesignBundle.read(new AtomicFile(new File(root,name)).openRead(),384000),StandardCharsets.UTF_8);}
    }
    private void writeRecord(String name,String text)throws IOException {
        synchronized(RECORDS){
        if(!root.isDirectory()&&!root.mkdirs())throw new IOException("Design storage unavailable");
        AtomicFile file=new AtomicFile(new File(root,name));FileOutputStream out=null;
        try{out=file.startWrite();out.write(text.getBytes(StandardCharsets.UTF_8));file.finishWrite(out);}catch(IOException e){if(out!=null)file.failWrite(out);throw e;}
        }
    }
    synchronized DesignBundle saved(){
        try{DesignBundle current=parse(readRecord("active.json"));if(!current.revision.equals(bad())&&current.available(cache,bundled))return current;}catch(IOException ignored){}
        return bundled;
    }
    private String bad(){return context.getSharedPreferences("design-updates",0).getString("bad","");}
    synchronized DesignBundle refresh()throws IOException {
        String text=new String(DesignBundle.read(fetch(ROOT+"design-update.json?check="+System.currentTimeMillis()),384000),StandardCharsets.UTF_8);
        DesignBundle next=parse(text),current=saved();
        if(next.revision.equals(bad()))return current;
        if(next.revision.equals(current.revision))return current;
        next.prepare(cache,bundled,path->fetch(ROOT+path+"?design="+next.revision));
        // Do not change the active pointer until every new file has passed its checksum.
        if(!current.revision.equals(bundled.revision))try{writeRecord("previous.json",readRecord("active.json"));}catch(FileNotFoundException ignored){}
        else new AtomicFile(new File(root,"previous.json")).delete();
        writeRecord("active.json",text);return next;
    }
    synchronized DesignBundle reject(String revision){
        context.getSharedPreferences("design-updates",0).edit().putString("bad",revision).apply();
        try{String previous=readRecord("previous.json");DesignBundle release=parse(previous);if(!release.revision.equals(revision)&&release.available(cache,bundled)){writeRecord("active.json",previous);return release;}}catch(IOException ignored){}
        new AtomicFile(new File(root,"active.json")).delete();return bundled;
    }
    InputStream open(DesignBundle release,String path)throws IOException {
        return release.open(path,cache,bundled,p->context.getAssets().open("site/"+p));
    }
    private static boolean trusted(URL url){
        return "https".equals(url.getProtocol())&&url.getPort()==-1&&url.getUserInfo()==null&&
            (("pigeon-post-delivery.nikki0radz.chatgpt.site".equals(url.getHost())&&url.getPath().startsWith("/workroom/"))||
            ("nikki0radz.github.io".equals(url.getHost())&&url.getPath().startsWith("/You-ve-got-mail/")));
    }
    private static InputStream fetch(String address)throws IOException {
        URL url=new URL(address);
        for(int redirects=0;redirects<4;redirects++){
            if(!trusted(url))throw new IOException("Untrusted design host");
            HttpURLConnection connection=(HttpURLConnection)url.openConnection();
            connection.setConnectTimeout(4000);connection.setReadTimeout(8000);connection.setInstanceFollowRedirects(false);connection.setUseCaches(false);connection.setRequestProperty("Cache-Control","no-cache");
            try{
                int status=connection.getResponseCode();
                if(status>=300&&status<400){String location=connection.getHeaderField("Location");if(location==null)throw new IOException("Missing design redirect");url=new URL(url,location);connection.disconnect();continue;}
                if(status!=200)throw new IOException("Design server returned "+status);
                if(connection.getContentLengthLong()>DesignBundle.MAX_FILE)throw new IOException("Design download too large");
                final HttpURLConnection active=connection;
                return new FilterInputStream(connection.getInputStream()){@Override public void close()throws IOException{try{super.close();}finally{active.disconnect();}}};
            }catch(IOException e){connection.disconnect();throw e;}
        }throw new IOException("Too many design redirects");
    }
}
