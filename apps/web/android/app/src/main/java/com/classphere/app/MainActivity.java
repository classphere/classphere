package com.classphere.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = getBridge().getWebView();

    // ── Standard Web Features (Required for modern SPAs) ──────────────────────
    WebSettings settings = webView.getSettings();
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setJavaScriptEnabled(true);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

    // ── User Agent Spoofing (Fixes "works in browser, not in app" issues) ──────
    String mobileAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";
    settings.setUserAgentString(mobileAgent);

    // ── Enable scrolling if content exceeds height ────────────────────────────
    webView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
    webView.setNestedScrollingEnabled(true);

    // ── Ensure WebView can receive focus for touch events ────────────────────
    webView.setFocusable(true);
    webView.setFocusableInTouchMode(true);
    webView.requestFocus();

    // ── UI Polish ─────────────────────────────────────────────────────────────
    settings.setSupportZoom(true);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);

    // ── Scroll Enforcer Injection ─────────────────────────────────────────────
    webView.postDelayed(() -> {
      webView.evaluateJavascript(
          "(function() {" +
          "  var style = document.createElement('style');" +
          "  style.innerHTML = 'html, body { overflow: auto !important; touch-action: pan-y !important; -webkit-overflow-scrolling: touch !important; position: static !important; height: auto !important; min-height: 100% !important; }';" +
          "  document.head.appendChild(style);" +
          "})();",
          null
      );
    }, 1000); // Shorter delay, stronger CSS
  }
}

