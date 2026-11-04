package uk.co.pigeonpost.mail;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.view.*;
import java.util.function.Consumer;

final class ParcelFrost {
    static final String MODE="backdropMode",OPACITY="backdropOpacity";
    static String mode(Context c){return Mail.prefs(c).getString(MODE,"blur");}
    static int opacity(Context c){return Math.max(0,Math.min(100,Mail.prefs(c).getInt(OPACITY,25)));}
    static String systemState(Context c){
        if(Build.VERSION.SDK_INT<31)return "unsupported";
        return c.getSystemService(WindowManager.class).isCrossWindowBlurEnabled()?"enabled":"off";
    }
    // A translucent window background sits under the transparent PNG and buttons on both entry paths.
    static void attach(Context c,Window window){
        window.setFormat(PixelFormat.TRANSLUCENT);
        window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND|WindowManager.LayoutParams.FLAG_BLUR_BEHIND);
        int black=Color.argb(Math.round(255*opacity(c)/100f),0,0,0);
        window.setBackgroundDrawable(new ColorDrawable(black));
        if(Build.VERSION.SDK_INT<31||"black".equals(mode(c)))return;

        View decor=window.getDecorView();
        WindowManager wm=window.getWindowManager();
        int radius=Math.round(28*c.getResources().getDisplayMetrics().density);
        Consumer<Boolean> update=enabled->{
            WindowManager.LayoutParams attrs=window.getAttributes();
            if(enabled)attrs.flags|=WindowManager.LayoutParams.FLAG_BLUR_BEHIND;
            else attrs.flags&=~WindowManager.LayoutParams.FLAG_BLUR_BEHIND;
            attrs.setBlurBehindRadius(enabled?radius:0);
            window.setAttributes(attrs);
            window.setBackgroundDrawable(new ColorDrawable(enabled?Color.TRANSPARENT:black));
        };
        decor.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener(){
            public void onViewAttachedToWindow(View v){wm.addCrossWindowBlurEnabledListener(update);}
            public void onViewDetachedFromWindow(View v){wm.removeCrossWindowBlurEnabledListener(update);v.removeOnAttachStateChangeListener(this);}
        });
        if(decor.isAttachedToWindow())wm.addCrossWindowBlurEnabledListener(update);
        update.accept(wm.isCrossWindowBlurEnabled());
    }
}
