package com.dragonnine.game01;

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
        Log.d(TAG, "signIn called");
        Activity activity = getActivity();
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);

        signInClient.isAuthenticated().addOnCompleteListener(task -> {
            boolean isAuthenticated = task.isSuccessful() && task.getResult().isAuthenticated();
            Log.d(TAG, "isAuthenticated: " + isAuthenticated);
            JSObject result = new JSObject();
            result.put("isSignedIn", isAuthenticated);

            if (!isAuthenticated) {
                Log.d(TAG, "Attempting signIn...");
                signInClient.signIn().addOnCompleteListener(signInTask -> {
                    boolean signedIn = signInTask.isSuccessful();
                    Log.d(TAG, "signIn result: " + signedIn);
                    if (!signInTask.isSuccessful()) {
                        Log.e(TAG, "signIn failed", signInTask.getException());
                    }
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

        // 리더보드 열기 전에 인증 확인 → 미인증 시 signIn 후 재시도
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);
        signInClient.isAuthenticated().addOnCompleteListener(authTask -> {
            boolean isAuth = authTask.isSuccessful() && authTask.getResult().isAuthenticated();
            Log.d(TAG, "showLeaderboard auth check: " + isAuth);

            if (!isAuth) {
                signInClient.signIn().addOnCompleteListener(signInTask -> {
                    if (signInTask.isSuccessful()) {
                        openLeaderboardUI(activity, leaderboardId, call);
                    } else {
                        Log.e(TAG, "signIn before leaderboard failed", signInTask.getException());
                        call.reject("Sign-in required to view leaderboard");
                    }
                });
            } else {
                openLeaderboardUI(activity, leaderboardId, call);
            }
        });
    }

    private void openLeaderboardUI(Activity activity, String leaderboardId, PluginCall call) {
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
