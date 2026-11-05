package uk.co.pigeonpost.mail;

import android.app.Application;

public final class PushApplication extends Application {
    @Override public void onCreate() { super.onCreate(); PushSync.schedule(this,false); }
}
