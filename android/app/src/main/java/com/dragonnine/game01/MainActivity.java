package com.dragonnine.game01;

import android.graphics.Color;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayGamesPlugin.class);
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);

        // Edge-to-edge: 배경이 상태바 뒤까지 확장
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);

        // 네비게이션바 숨김, 상태바 아이콘 밝게
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.navigationBars());
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.setAppearanceLightStatusBars(false);

        // 상태바 높이를 CSS 변수로 주입 (물리px → CSS px 변환)
        int statusBarHeightPx = getStatusBarHeight();
        float density = getResources().getDisplayMetrics().density;
        int statusBarHeightCss = Math.round(statusBarHeightPx / density);
        Log.d("MainAct", "statusBarHeight: " + statusBarHeightPx + "px (physical), " + statusBarHeightCss + "px (css), density=" + density);
        WebView webView = bridge.getWebView();
        String js = "document.documentElement.style.setProperty('--sat', '" + statusBarHeightCss + "px')";

        // 1초 후 주입 (페이지 로드 대기) + 3초 후 재주입 (SPA 전환 대비)
        webView.postDelayed(() -> webView.evaluateJavascript(js, null), 1000);
        webView.postDelayed(() -> webView.evaluateJavascript(js, null), 3000);
    }

    private int getStatusBarHeight() {
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : 0;
    }
}
