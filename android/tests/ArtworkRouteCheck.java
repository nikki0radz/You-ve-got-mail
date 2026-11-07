package uk.co.pigeonpost.mail;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
public class ArtworkRouteCheck{
 static String host="pigeon-post-delivery.nikki0radz.chatgpt.site";
 static String appOrigin="https://appassets.androidplatform.net";
 static void require(boolean ok,String why){if(!ok)throw new AssertionError(why);}
 static HttpURLConnection request(String method,String path)throws Exception{
  require(Main.allowsArtworkRequest("https",host,-1,path,method),"App route "+path+" "+method);
  HttpURLConnection c=(HttpURLConnection)new URL("https://"+host+path).openConnection();
  c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setRequestMethod(method);c.setInstanceFollowRedirects(false);
  c.setRequestProperty("Origin",appOrigin);c.setRequestProperty("Accept","application/json");return c;
 }
 public static void main(String[]args)throws Exception{
  String path="/api/catalogue/items";
  require(Main.allowsArtworkRequest("https",host,-1,"/api/art/items","GET"),"Private library");
  require(Main.allowsArtworkRequest("https",host,-1,"/api/catalogue/files/example","POST"),"Image upload");
  require(!Main.allowsArtworkRequest("http",host,-1,path,"GET"),"HTTP blocked");
  require(!Main.allowsArtworkRequest("https",host,8443,path,"GET"),"Custom port blocked");
  require(!Main.allowsArtworkRequest("https","example.org",-1,path,"GET"),"External hosts blocked");
  require(!Main.allowsArtworkRequest("https",host,-1,"/api/catalogue-other/items","GET"),"Neighbouring API blocked");
  require(!Main.allowsArtworkRequest("https",host,-1,path,"DELETE"),"Unsupported method blocked");
  require(!Main.allowsArtworkRequest("https",host,-1,"/api/catalogue/../accounts","GET"),"Path traversal blocked");
  if(args.length==0)return;
  HttpURLConnection get=request("GET",path);
  try{
    require(get.getResponseCode()==200,"Public list status "+get.getResponseCode());
    require("*".equals(get.getHeaderField("Access-Control-Allow-Origin"))||appOrigin.equals(get.getHeaderField("Access-Control-Allow-Origin")),"CORS origin");
    require(new String(get.getInputStream().readAllBytes(),StandardCharsets.UTF_8).contains("\"categories\""),"Expected categories in catalogue response");
  }finally{get.disconnect();}
  HttpURLConnection preflight=request("OPTIONS","/api/catalogue/unlock");
  try{
    preflight.setRequestProperty("Access-Control-Request-Method","POST");
    preflight.setRequestProperty("Access-Control-Request-Headers","authorization, content-type");
    require(preflight.getResponseCode()==204,"Preflight "+preflight.getResponseCode());
    require(preflight.getHeaderField("Access-Control-Allow-Headers").toLowerCase().contains("authorization"),"Owner authentication header");
  }finally{preflight.disconnect();}
  System.out.println("PASS Android request filter, public GET and owner OPTIONS against live service.");
 }
}
