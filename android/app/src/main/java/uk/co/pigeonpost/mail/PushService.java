package uk.co.pigeonpost.mail;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/** Receives a private wake-up only. Parcel content is fetched from our server. */
public final class PushService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) { PushSync.schedule(this, false); }
    @Override public void onMessageReceived(RemoteMessage message) {
        if ("mail_available".equals(message.getData().get("type"))) PushSync.schedule(this, true);
    }
    @Override public void onDeletedMessages() { PushSync.schedule(this, false); }
}
