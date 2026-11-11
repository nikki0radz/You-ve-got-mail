package uk.co.pigeonpost.mail;

import java.util.List;

/** Unlock settling and compare-before-clear delivery, independent of Android events. */
final class UnlockDelivery {
    interface Pending {
        List<String> ids();
        boolean present(String id);
        void completed(String id);
    }
    enum State { EMPTY, DISABLED, LOCKED, SETTLING, BUSY, PAUSED, FAILED, SHOWN }
    private long unlockedAt=-1;
    State tick(long now,boolean enabled,boolean locked,boolean busy,boolean allowed,Pending pending){
        if(!enabled){unlockedAt=-1;return State.DISABLED;}
        List<String> ids=pending.ids();
        if(ids.isEmpty()){unlockedAt=-1;return State.EMPTY;}
        if(locked){unlockedAt=-1;return State.LOCKED;}
        if(unlockedAt<0)unlockedAt=now;
        if(busy)return State.BUSY;
        if(!allowed)return State.PAUSED;
        if(now-unlockedAt<1000)return State.SETTLING;
        for(String id:ids){
            if(pending.present(id)){
                pending.completed(id);
                return State.SHOWN;
            }
        }
        return State.FAILED;
    }
}
