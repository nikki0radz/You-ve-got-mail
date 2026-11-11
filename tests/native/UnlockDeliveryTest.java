package uk.co.pigeonpost.mail;
import java.util.*;

public final class UnlockDeliveryTest {
 static final class Queue implements UnlockDelivery.Pending {
  final List<String> waiting=new ArrayList<>(Arrays.asList("first","second"));
  final List<String> attempts=new ArrayList<>(),completed=new ArrayList<>();boolean success=true;
  public List<String> ids(){return new ArrayList<>(waiting);}
  public boolean present(String id){attempts.add(id);return success;}
  public void completed(String id){completed.add(id);waiting.remove(id);}
 }
 static void expect(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args){
  UnlockDelivery d=new UnlockDelivery();Queue q=new Queue();
  expect(d.tick(0,true,true,false,false,q)==UnlockDelivery.State.LOCKED,"locked mail must wait");
  expect(d.tick(1500,true,true,false,false,q)==UnlockDelivery.State.LOCKED,"slow keyguard must not consume mail");
  expect(d.tick(2000,true,false,false,true,q)==UnlockDelivery.State.SETTLING,"unlock must settle for one second");
  expect(d.tick(2500,true,true,false,false,q)==UnlockDelivery.State.LOCKED,"a relock restarts the delay");
  expect(d.tick(4000,true,false,false,true,q)==UnlockDelivery.State.SETTLING,"a delayed/missed broadcast is recovered by the next tick");
  expect(d.tick(4999,true,false,false,true,q)==UnlockDelivery.State.SETTLING,"never display early");
  expect(q.completed.isEmpty(),"no attempted unlock may remove mail");
  expect(d.tick(5000,true,false,false,true,q)==UnlockDelivery.State.SHOWN,"display after stable unlock");
  expect(q.completed.equals(Arrays.asList("first")),"only the shown parcel is removed");
  expect(d.tick(6000,true,false,true,true,q)==UnlockDelivery.State.BUSY,"an existing overlay must not consume the next item");
  expect(d.tick(7000,true,false,false,false,q)==UnlockDelivery.State.PAUSED,"DND must pause popups");
  expect(q.waiting.equals(Arrays.asList("second")),"DND and busy states preserve mail");
  q.success=false;
  expect(d.tick(8000,true,false,false,true,q)==UnlockDelivery.State.FAILED,"a rejected overlay stays pending");
  expect(q.waiting.equals(Arrays.asList("second")),"failed display must not discard pending mail");
  q.success=true;
  expect(d.tick(13000,true,false,false,true,q)==UnlockDelivery.State.SHOWN,"retry after failure displays exactly one item");
  expect(d.tick(14000,true,false,false,true,q)==UnlockDelivery.State.EMPTY,"last delivery stops the watcher");
  Queue restored=new Queue();d=new UnlockDelivery();
  expect(d.tick(20000,true,false,false,true,restored)==UnlockDelivery.State.SETTLING,"service restart must settle instead of firing immediately");
  expect(d.tick(21000,true,false,false,true,restored)==UnlockDelivery.State.SHOWN,"persisted queue works after restart");
  expect(d.tick(22000,false,false,false,true,restored)==UnlockDelivery.State.DISABLED,"respect disabled popups");
  System.out.println("Unlock delivery timing, retries, DND, queue ordering and restart passed");
 }
}
