package com.dragonnine.game01;

import android.app.Activity;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.LeaderboardsClient;

@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private static final String TAG = "PlayGamesPlugin";
    private static final int RC_LEADERBOARD_UI = 9004;

    // initialize()는 GameApplication.onCreate()에서 호출됨
    // Plugin에서는 호출하지 않음

    /**
     * 인증 상태 확인 (UI 없음)
     * PlayGamesSdk.initialize()가 자동 로그인을 처리하므로 결과만 확인
     */
    @PluginMethod()
    public void signIn(PluginCall call) {
        Log.d(TAG, "signIn (checkAuth) called");
        Activity activity = getActivity();
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);

        signInClient.isAuthenticated().addOnCompleteListener(task -> {
            boolean isAuthenticated = task.isSuccessful() && task.getResult().isAuthenticated();
            Log.d(TAG, "isAuthenticated: " + isAuthenticated);
            JSObject result = new JSObject();
            result.put("isSignedIn", isAuthenticated);
            call.resolve(result);
        });
    }

    /**
     * 점수 제출 — 인증된 경우에만 실행
     */
    @PluginMethod()
    public void submitScore(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");
        Integer score = call.getInt("score");

        if (leaderboardId == null || score == null) {
            call.reject("leaderboardId and score are required");
            return;
        }

        Activity activity = getActivity();
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);

        signInClient.isAuthenticated().addOnCompleteListener(task -> {
            boolean isAuth = task.isSuccessful() && task.getResult().isAuthenticated();
            if (isAuth) {
                LeaderboardsClient client = PlayGames.getLeaderboardsClient(activity);
                client.submitScore(leaderboardId, score);
                Log.d(TAG, "Score submitted: " + score + " to " + leaderboardId);
                call.resolve();
            } else {
                Log.w(TAG, "Not authenticated — score not submitted");
                call.resolve(); // 조용히 실패
            }
        });
    }

    /**
     * 리더보드 UI 표시
     * 인증 안 됐으면 수동 signIn 시도 (유저가 버튼을 눌렀으므로 계정 선택 OK)
     */
    @PluginMethod()
    public void showLeaderboard(PluginCall call) {
        String leaderboardId = call.getString("leaderboardId");

        if (leaderboardId == null) {
            call.reject("leaderboardId is required");
            return;
        }

        Activity activity = getActivity();
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);

        signInClient.isAuthenticated().addOnCompleteListener(authTask -> {
            boolean isAuth = authTask.isSuccessful() && authTask.getResult().isAuthenticated();
            Log.d(TAG, "showLeaderboard auth check: " + isAuth);

            if (isAuth) {
                openLeaderboardUI(activity, leaderboardId, call);
            } else {
                // 유저가 직접 랭킹보기를 눌렀으므로 수동 signIn 시도
                Log.d(TAG, "Not authenticated — attempting manual signIn");
                signInClient.signIn().addOnCompleteListener(signInTask -> {
                    if (signInTask.isSuccessful()) {
                        signInClient.isAuthenticated().addOnCompleteListener(reAuthTask -> {
                            boolean reAuth = reAuthTask.isSuccessful() && reAuthTask.getResult().isAuthenticated();
                            if (reAuth) {
                                openLeaderboardUI(activity, leaderboardId, call);
                            } else {
                                call.reject("Play Games 로그인에 실패했습니다.");
                            }
                        });
                    } else {
                        call.reject("Play Games 로그인이 취소되었습니다.");
                    }
                });
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
