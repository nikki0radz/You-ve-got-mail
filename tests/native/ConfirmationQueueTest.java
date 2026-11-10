package uk.co.pigeonpost.mail;
import java.util.*;
public class ConfirmationQueueTest {
 static class Memory implements ConfirmationQueue.Store {
  final Map<String,String> rows=new LinkedHashMap<>();boolean diskFailure=false;
  public String[] keys(){return rows.keySet().toArray(new String[0]);}
  public String read(String key){return rows.getOrDefault(key,"");}
  public void clear(String key,String value)throws Exception{if(diskFailure)throw new Exception("Storage unavailable");if(value.equals(rows.get(key)))rows.remove(key);}
 }
 static void check(boolean value){if(!value)throw new AssertionError();}
 public static void main(String[] args)throws Exception{
  Memory disk=new Memory();disk.rows.put("first","123");disk.rows.put("second","124");List<String> sent=new ArrayList<>();
  try{ConfirmationQueue.flush(disk,(key,value)->{if(key.equals("first"))throw new Exception("Offline");sent.add(key);});throw new AssertionError();}catch(Exception expected){}
  check(sent.equals(Arrays.asList("second")));check(disk.rows.size()==1&&disk.rows.containsKey("first"));
  // New process / worker retries the durable item, without alert or screen state.
  ConfirmationQueue.flush(disk,(key,value)->sent.add(key));check(disk.rows.isEmpty());check(sent.equals(Arrays.asList("second","first")));
  disk.rows.put("changed","old");ConfirmationQueue.flush(disk,(key,value)->disk.rows.put(key,"new"));check(disk.rows.get("changed").equals("new"));
  disk.diskFailure=true;try{ConfirmationQueue.flush(disk,(key,value)->{});throw new AssertionError();}catch(Exception expected){}check(!disk.rows.isEmpty());
  disk.diskFailure=false;ConfirmationQueue.flush(disk,(key,value)->{});check(disk.rows.isEmpty());
 }
}
