package com.dragonnine.workernightmare;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.LeaderboardsClient;

@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private static final String TAG = "PlayGamesPlugin";
    private static final int RC_LEADERBOARD_UI = 9004;

    @Override
    public void load() {
        PlayGamesSdk.initialize(getContext());
    }

    @PluginMethod()
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);

        signInClient.isAuthenticated().addOnCompleteListener(task -> {
            boolean isAuthenticated = task.isSuccessful() && task.getResult().isAuthenticated();
            JSObject result = new JSObject();
            result.put("isSignedIn", isAuthenticated);

            if (!isAuthenticated) {
                signInClient.signIn().addOnCompleteListener(signInTask -> {
                    boolean signedIn = signInTask.isSuccessful();
                    result.put("isSignedIn", signedIn);
                    call.resolve(result);
                });
            } else {
                call.resolve(result);
            }
        });
    }

    @PluginMethod()
    public void submitScore(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        Integer score = call.getInt("score");

        if (leaderboardId == null || score == null) {
            call.reject("leaderboardId and score are required");
            return;
        }

        Activity activity = getActivity();
        LeaderboardsClient client = PlayGames.getLeaderboardsClient(activity);
        client.submitScore(leaderboardId, score);

        Log.d(TAG, "Score submitted: " + score + " to " + leaderboardId);
        call.resolve();
    }

    @PluginMethod()
    public void showLeaderboard(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");

        if (leaderboardId == null) {
            call.reject("leaderboardId is required");
            return;
        }

        Activity activity = getActivity();
        LeaderboardsClient client = PlayGames.getLeaderboardsClient(activity);

        client.getLeaderboardIntent(leaderboardId).addOnSuccessListener(intent -> {
            activity.startActivityForResult(intent, RC_LEADERBOARD_UI);
            call.resolve();
        }).addOnFailureListener(e -> {
            Log.e(TAG, "Failed to open leaderboard", e);
            call.reject("Failed to open leaderboard: " + e.getMessage());
        });
    }
}
