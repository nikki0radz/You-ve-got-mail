package uk.co.pigeonpost.mail;

import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;

/** A complete, immutable web release; never mix files from different releases. */
final class DesignBundle {
    static final int BRIDGE=1, MAX_FILES=1000;
    static final long MAX_FILE=8L*1024*1024, MAX_TOTAL=64L*1024*1024;
    interface Source { InputStream open(String path)throws IOException; }
    static final class Asset {
        final String path,hash;final long size;
        Asset(String p,String h,long s)throws IOException {
            if(!safePath(p)||h==null||!h.matches("[a-f0-9]{64}")||s<0||s>MAX_FILE)throw new IOException("Invalid design asset");
            path=p;hash=h;size=s;
        }
    }
    final String revision;
    final Map<String,Asset> files;
    DesignBundle(String revision,int bridge,Map<String,Asset> files)throws IOException {
        if(bridge!=BRIDGE||revision==null||!revision.matches("[a-f0-9]{64}")||files.size()>MAX_FILES)throw new IOException("Incompatible design");
        long total=0;for(Map.Entry<String,Asset> entry:files.entrySet()){
            if(!entry.getKey().equals(entry.getValue().path))throw new IOException("Invalid design path");
            total+=entry.getValue().size;
        }
        if(total>MAX_TOTAL||!files.keySet().containsAll(Arrays.asList("index.html","app.js","styles.css")))throw new IOException("Incomplete design");
        this.revision=revision;this.files=Collections.unmodifiableMap(new LinkedHashMap<>(files));
    }
    static boolean safePath(String path){
        return path!=null&&path.length()<=240&&path.matches("[A-Za-z0-9_-][A-Za-z0-9_./-]*")
            &&!path.contains("..")&&!path.contains("//")&&!path.endsWith("/")
            &&path.matches(".*\\.(html|js|mjs|css|json|png|svg|webp|woff|woff2|txt)");
    }
    static String digest(byte[] bytes)throws IOException {
        try{return hex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(NoSuchAlgorithmException e){throw new IOException(e);}
    }
    private static String hex(byte[] bytes){StringBuilder value=new StringBuilder();for(byte b:bytes)value.append(String.format(Locale.ROOT,"%02x",b&255));return value.toString();}
    static byte[] read(InputStream in,long limit)throws IOException {
        try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] block=new byte[8192];int n;while((n=source.read(block))!=-1){if(out.size()+n>limit)throw new IOException("Design file too large");out.write(block,0,n);}return out.toByteArray();
        }
    }
    void prepare(File cache,DesignBundle bundled,Source network)throws IOException {
        if(!cache.isDirectory()&&!cache.mkdirs())throw new IOException("Design storage unavailable");
        for(Asset asset:files.values()){
            Asset built=bundled.files.get(asset.path);
            if(built!=null&&built.hash.equals(asset.hash))continue;
            File file=new File(cache,asset.hash);
            if(file.isFile()&&file.length()==asset.size&&digest(read(new FileInputStream(file),MAX_FILE)).equals(asset.hash))continue;
            byte[] bytes=read(network.open(asset.path),asset.size);
            if(bytes.length!=asset.size||!digest(bytes).equals(asset.hash))throw new IOException("Incomplete or changed design download");
            File temp=File.createTempFile("download-",".tmp",cache);
            try{
                try(FileOutputStream out=new FileOutputStream(temp)){out.write(bytes);out.getFD().sync();}
                Files.move(temp.toPath(),file.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);
            }finally{temp.delete();}
        }
    }
    boolean available(File cache,DesignBundle bundled){
        for(Asset asset:files.values()){
            Asset built=bundled.files.get(asset.path);
            if(built!=null&&built.hash.equals(asset.hash))continue;
            File file=new File(cache,asset.hash);if(!file.isFile()||file.length()!=asset.size)return false;
        }return true;
    }
    InputStream open(String path,File cache,DesignBundle bundled,Source source)throws IOException {
        Asset asset=files.get(path);if(asset==null)throw new FileNotFoundException("Asset not in this design release");
        Asset built=bundled.files.get(path);
        return built!=null&&built.hash.equals(asset.hash)?source.open(path):new FileInputStream(new File(cache,asset.hash));
    }
}
