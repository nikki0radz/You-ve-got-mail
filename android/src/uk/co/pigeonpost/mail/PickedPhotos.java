package uk.co.pigeonpost.mail;

import android.content.ContentProvider;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

/** Read-only, app-private originals whose lifetime is independent of a picker grant. */
public class PickedPhotos extends ContentProvider {
    private static final String AUTHORITY="uk.co.pigeonpost.mail.picked";
    private static final long MAX_BYTES=32L*1024*1024;
    private static final long MAX_AGE=24L*60*60*1000;
    private static final String[] COLUMNS={OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE};
    private static File root(Context context){return new File(context.getCacheDir(),"selected-photos");}

    static void expire(Context context){
        File[] batches=root(context).listFiles();
        if(batches==null)return;
        long cutoff=System.currentTimeMillis()-MAX_AGE;
        for(File dir:batches)if(dir.lastModified()<cutoff)discard(dir);
    }
    private static void discard(File dir){
        File[] files=dir.listFiles();
        if(files!=null)for(File file:files)file.delete();
        dir.delete();
    }

    static Uri copy(Context context,Uri source)throws IOException{
        ContentResolver resolver=context.getContentResolver();
        String mime=resolver.getType(source);
        if(mime==null||!mime.startsWith("image/"))throw new IOException("Choose an image.");
        String name="";
        try(Cursor cursor=resolver.query(source,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){
            if(cursor!=null&&cursor.moveToFirst()&&!cursor.isNull(0))name=cursor.getString(0);
        }
        name=name.replaceAll("[\\p{Cntrl}/\\\\]","_").trim();
        if(name.isEmpty()||name.startsWith(".")||name.length()>180){
            String extension=MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            name="Photo"+(extension==null?"":"."+extension);
        }
        String key=UUID.randomUUID().toString();
        File dir=new File(root(context),key);
        if(!dir.mkdirs())throw new IOException("Free up space and try again.");
        boolean complete=false;
        try{
            // Store the immutable display name and MIME separately from the bytes.
            try(java.io.DataOutputStream out=new java.io.DataOutputStream(new FileOutputStream(new File(dir,"metadata")))){
                out.writeUTF(name);out.writeUTF(mime);
            }
            long bytes=0;
            try(InputStream in=resolver.openInputStream(source);
                FileOutputStream out=new FileOutputStream(new File(dir,"original"))){
                if(in==null)throw new IOException("Choose the picture again.");
                byte[] block=new byte[64*1024];int count;
                while((count=in.read(block))!=-1){
                    bytes+=count;if(bytes>MAX_BYTES)throw new IOException("Pictures must be 32 MB or smaller.");
                    out.write(block,0,count);
                }
                if(bytes==0)throw new IOException("The picture was empty.");
            }
            Uri result=new Uri.Builder().scheme("content").authority(AUTHORITY).appendPath(key).appendPath(name).build();
            complete=true;return result;
        }finally{if(!complete)discard(dir);}
    }
    private File directory(Uri uri){
        List<String> segments=uri.getPathSegments();
        if(!AUTHORITY.equals(uri.getAuthority())||segments.size()!=2||!segments.get(0).matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"))return null;
        File dir=new File(root(getContext()),segments.get(0));
        return new File(dir,"original").isFile()?dir:null;
    }
    @Override public boolean onCreate(){return true;}
    @Override public String getType(Uri uri){
        File dir=directory(uri);if(dir==null)return null;
        try(java.io.DataInputStream in=new java.io.DataInputStream(new FileInputStream(new File(dir,"metadata")))){
            in.readUTF();return in.readUTF();
        }catch(IOException e){return null;}
    }
    @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort){
        String[] columns=projection==null?COLUMNS:projection;
        MatrixCursor cursor=new MatrixCursor(columns,1);
        File dir=directory(uri);if(dir==null)return cursor;
        File original=new File(dir,"original");
        Object[] values=new Object[columns.length];
        for(int n=0;n<columns.length;n++){
            if(OpenableColumns.DISPLAY_NAME.equals(columns[n]))values[n]=uri.getLastPathSegment();
            else if(OpenableColumns.SIZE.equals(columns[n]))values[n]=original.length();
            else if("last_modified".equals(columns[n]))values[n]=original.lastModified();
        }
        cursor.addRow(values);return cursor;
    }
    @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{
        File dir=directory(uri);
        if(dir==null||!"r".equals(mode))throw new FileNotFoundException();
        return ParcelFileDescriptor.open(new File(dir,"original"),ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
    @Override public int update(Uri uri,ContentValues values,String selection,String[] args){throw new UnsupportedOperationException();}
    @Override public int delete(Uri uri,String selection,String[] args){throw new UnsupportedOperationException();}
}
