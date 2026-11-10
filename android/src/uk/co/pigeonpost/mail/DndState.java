package uk.co.pigeonpost.mail;
import android.app.NotificationManager;
import android.content.Context;

/** Read the system filter; never request DND control or change the user's mode. */
final class DndState {
 static String read(Context c){
  try{switch(c.getSystemService(NotificationManager.class).getCurrentInterruptionFilter()){
   case NotificationManager.INTERRUPTION_FILTER_ALL:return "off";
   case NotificationManager.INTERRUPTION_FILTER_PRIORITY:
   case NotificationManager.INTERRUPTION_FILTER_ALARMS:
   case NotificationManager.INTERRUPTION_FILTER_NONE:return "on";
   default:return "unknown";
  }}catch(RuntimeException unavailable){return "unknown";}
 }
}
