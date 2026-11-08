package uk.co.pigeonpost.mail;
import android.content.*;import android.database.*;import android.net.Uri;import android.os.ParcelFileDescriptor;import android.provider.OpenableColumns;
import java.io.*;import java.util.*;
/** Temporary full-resolution camera output, accessible only through a scoped URI grant. */
public final class CameraPhotos extends ContentProvider {
 static final String AUTHORITY="uk.co.pigeonpost.mail.camera";
 private static File root(Context c){return new File(c.getCacheDir(),"camera-captures");}
 static Uri create(Context c)throws IOException{
  File root=root(c);if(!root.isDirectory()&&!root.mkdirs())throw new IOException("Camera storage is unavailable.");
  File[] old=root.listFiles();if(old!=null)for(File f:old)if(f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
  String name=UUID.randomUUID().toString()+".jpg";if(!new File(root,name).createNewFile())throw new IOException("Camera storage is unavailable.");
  return new Uri.Builder().scheme("content").authority(AUTHORITY).appendPath(name).build();
 }
 private static File file(Context c,Uri uri){String name=uri.getLastPathSegment();return AUTHORITY.equals(uri.getAuthority())&&uri.getPathSegments().size()==1&&name!=null&&name.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.jpg")?new File(root(c),name):null;}
 static void discard(Context c,Uri uri){if(uri!=null){c.revokeUriPermission(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);File f=file(c,uri);if(f!=null)f.delete();}}
 @Override public boolean onCreate(){return true;}
 @Override public String getType(Uri uri){return file(getContext(),uri)==null?null:"image/jpeg";}
 @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort){String[] columns=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;MatrixCursor result=new MatrixCursor(columns);File f=file(getContext(),uri);if(f!=null&&f.isFile()){Object[] row=new Object[columns.length];for(int i=0;i<columns.length;i++)row[i]=OpenableColumns.DISPLAY_NAME.equals(columns[i])?"Selfie.jpg":OpenableColumns.SIZE.equals(columns[i])?f.length():null;result.addRow(row);}return result;}
 @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{File f=file(getContext(),uri);if(f==null||!f.isFile())throw new FileNotFoundException();return ParcelFileDescriptor.open(f,ParcelFileDescriptor.parseMode(mode));}
 @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}
 @Override public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
 @Override public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException();}
}
