package com.dragonnine.game01;

import android.app.Application;
import com.google.android.gms.games.PlayGamesSdk;

public class GameApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        PlayGamesSdk.initialize(this);
    }
}
