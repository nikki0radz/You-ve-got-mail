package uk.co.pigeonpost.mail;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.ColorDrawable;
import android.view.*;

final class ParcelFrost {
    static final String OPACITY="backdropOpacity";
    static int opacity(Context c){return Math.max(0,Math.min(100,Mail.prefs(c).getInt(OPACITY,70)));}
    // A translucent window background sits under the transparent PNG and buttons on both entry paths.
    static void attach(Context c,Window window){
        window.setFormat(PixelFormat.TRANSLUCENT);
        window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND|WindowManager.LayoutParams.FLAG_BLUR_BEHIND);
        int black=Color.argb(Math.round(255*opacity(c)/100f),0,0,0);
        window.setBackgroundDrawable(new ColorDrawable(black));
    }
}
