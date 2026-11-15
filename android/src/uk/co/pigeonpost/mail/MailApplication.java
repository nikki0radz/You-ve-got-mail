package uk.co.pigeonpost.mail;
import android.app.Application;
public final class MailApplication extends Application {
    @Override public void onCreate(){super.onCreate();Mail.channels(this);PhoneFinder.restoreVolume(this);PushConnection.start(this);DeliveryConfirmations.resume(this);}
}
