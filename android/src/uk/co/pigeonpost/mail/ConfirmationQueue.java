package uk.co.pigeonpost.mail;

/** Durable, compare-before-clear confirmations. One failed item never starves the rest. */
final class ConfirmationQueue {
 interface Store { String[] keys(); String read(String key); void clear(String key,String value)throws Exception; }
 interface Sender { void send(String key,String value)throws Exception; }
 static void flush(Store store,Sender sender)throws Exception{
  Exception failure=null;
  for(String key:store.keys()){
   String value=store.read(key);if(value.isEmpty())continue;
   try{sender.send(key,value);store.clear(key,value);}catch(Exception error){if(failure==null)failure=error;}
  }
  if(failure!=null)throw failure;
 }
}
