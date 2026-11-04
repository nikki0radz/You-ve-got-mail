package uk.co.pigeonpost.mail;

import android.content.Context;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.view.*;
import java.util.function.Consumer;

final class ParcelFrost {
    static String systemState(Context c){
        if(Build.VERSION.SDK_INT<31)return "unsupported";
        return c.getSystemService(WindowManager.class).isCrossWindowBlurEnabled()?"enabled":"off";
    }
    // Install after setContentView and attachment: the decor installs its theme blur settings on creation.
    static void attach(Context c,Window window){
        View decor=window.getDecorView();
        window.setFormat(PixelFormat.TRANSLUCENT);
        window.setBackgroundDrawable(new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{0x26e6f1ed,0x10778c8a,0x1932474c}));
        if(Build.VERSION.SDK_INT<31)return;
        WindowManager wm=window.getWindowManager();
        float density=c.getResources().getDisplayMetrics().density;
        Consumer<Boolean> update=enabled->{
            window.setBackgroundBlurRadius(enabled?Math.round(38*density):0);
            WindowManager.LayoutParams attrs=window.getAttributes();
            attrs.flags|=WindowManager.LayoutParams.FLAG_BLUR_BEHIND|WindowManager.LayoutParams.FLAG_DIM_BEHIND;
            attrs.dimAmount=enabled?.08f:.13f;
            attrs.setBlurBehindRadius(enabled?Math.round(24*density):0);
            window.setAttributes(attrs);
        };
        decor.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener(){
            public void onViewAttachedToWindow(View v){wm.addCrossWindowBlurEnabledListener(update);update.accept(wm.isCrossWindowBlurEnabled());}
            public void onViewDetachedFromWindow(View v){wm.removeCrossWindowBlurEnabledListener(update);v.removeOnAttachStateChangeListener(this);}
        });
        if(decor.isAttachedToWindow()){wm.addCrossWindowBlurEnabledListener(update);update.accept(wm.isCrossWindowBlurEnabled());}
    }
}
