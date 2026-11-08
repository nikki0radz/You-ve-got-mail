package uk.co.pigeonpost.mail;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class DesignBundleTest {
    static byte[] bytes(String value){return value.getBytes(StandardCharsets.UTF_8);}
    static DesignBundle manifest(String revision,String script)throws Exception {
        Map<String,DesignBundle.Asset> files=new LinkedHashMap<>();
        for(String path:Arrays.asList("index.html","app.js","styles.css")){
            byte[] content=bytes(path.equals("app.js")?script:path);
            files.put(path,new DesignBundle.Asset(path,DesignBundle.digest(content),content.length));
        }
        return new DesignBundle(DesignBundle.digest(bytes(revision)),1,files);
    }
    static void expectFailure(RunnableWithError action)throws Exception{try{action.run();throw new AssertionError("Expected invalid update to fail");}catch(IOException expected){}}
    interface RunnableWithError{void run()throws Exception;}
    public static void main(String[] args)throws Exception {
        File cache=Files.createTempDirectory("pigeon-design-test").toFile();
        try{
            DesignBundle old=manifest("old","old code"),next=manifest("new","new code");
            int[] downloads={0};
            next.prepare(cache,old,path->{downloads[0]++;if(!path.equals("app.js"))throw new AssertionError("Unchanged asset downloaded");return new ByteArrayInputStream(bytes("new code"));});
            if(downloads[0]!=1||!next.available(cache,old))throw new AssertionError("Complete release not cached");
            next.prepare(cache,old,path->{throw new AssertionError("Cached release needs network");});
            DesignBundle.Source bundled=path->new ByteArrayInputStream(bytes(path.equals("app.js")?"old code":path));
            if(!Arrays.equals(DesignBundle.read(old.open("app.js",cache,old,bundled),100),bytes("old code")))throw new AssertionError("Running release changed while staging");
            if(!Arrays.equals(DesignBundle.read(next.open("app.js",cache,old,bundled),100),bytes("new code")))throw new AssertionError("New release not served offline");
            expectFailure(()->next.open("not-in-release.js",cache,old,bundled));
            DesignBundle broken=manifest("broken","bad code");
            expectFailure(()->broken.prepare(cache,old,path->new ByteArrayInputStream(bytes("wrong!!!"))));
            if(broken.available(cache,old))throw new AssertionError("Corrupt download became available");
            expectFailure(()->broken.prepare(cache,old,path->new ByteArrayInputStream(bytes("x"))));
            expectFailure(()->new DesignBundle(next.revision,2,next.files));
            for(String path:Arrays.asList("../app.js","/app.js","assets/../app.js","assets/%2e%2e/app.js","assets//app.js","classes.dex")){
                if(DesignBundle.safePath(path))throw new AssertionError("Unsafe update path accepted: "+path);
            }
            // A damaged cached file is repaired, rather than trusted by its filename or length.
            Files.write(new File(cache,next.files.get("app.js").hash).toPath(),bytes("wrong!!!"));
            next.prepare(cache,old,path->new ByteArrayInputStream(bytes("new code")));
            if(!Arrays.equals(DesignBundle.read(next.open("app.js",cache,old,bundled),100),bytes("new code")))throw new AssertionError("Cache repair failed");
            System.out.println("Native design cache: offline, staged releases, interrupted downloads, integrity and compatibility passed.");
        }finally{try(java.util.stream.Stream<Path> paths=Files.walk(cache.toPath())){paths.sorted(Comparator.reverseOrder()).forEach(p->{try{Files.delete(p);}catch(IOException ignored){}});}}
    }
}
