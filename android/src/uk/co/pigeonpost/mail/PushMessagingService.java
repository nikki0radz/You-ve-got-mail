package uk.co.pigeonpost.mail;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class PushMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token){PushConnection.token(this,token);}
    @Override public void onMessageReceived(RemoteMessage message){
        String type=message.getData().get("type");
        if("friend_request_test".equals(type)){
            Mail.prefs(this).edit().putLong("lastPushReceived",System.currentTimeMillis()).apply();
            FriendRequests.show(this,FriendRequests.TEST,"Practice pigeon",true);
        }else if("mail_available".equals(type)){
            Mail.prefs(this).edit().putLong("lastPushReceived",System.currentTimeMillis()).apply();
            PushConnection.sync(this,message.getPriority()==RemoteMessage.PRIORITY_HIGH);
        }else if(message.getNotification()!=null){
            Mail.prefs(this).edit().putLong("lastPushReceived",System.currentTimeMillis()).apply();
            // Firebase displays console notifications itself when backgrounded.
            // Match that behaviour when its callback arrives in the foreground.
            if(Mail.enabled(this,Mail.QUIET)){
                RemoteMessage.Notification content=message.getNotification();
                android.content.Intent open=new android.content.Intent(this,Main.class);
                android.app.Notification notice=new android.app.Notification.Builder(this,Mail.QUIET)
                    .setSmallIcon(android.R.drawable.ic_dialog_email).setContentTitle(content.getTitle()==null?"Pigeon Post":content.getTitle())
                    .setContentText(content.getBody()).setAutoCancel(true)
                    .setContentIntent(android.app.PendingIntent.getActivity(this,105,open,android.app.PendingIntent.FLAG_IMMUTABLE|android.app.PendingIntent.FLAG_UPDATE_CURRENT)).build();
                try{getSystemService(android.app.NotificationManager.class).notify("firebase-console",6,notice);}catch(SecurityException ignored){}
            }
            PushConnection.sync(this,false);
        }
    }
    @Override public void onDeletedMessages(){PushConnection.sync(this,false);}
}
