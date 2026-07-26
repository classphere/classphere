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

    // ── Disable overscroll glow (the blue/grey Android rubber-band effect) ────
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

    // ── Disable text selection & long-press context menu ─────────────────────
    webView.setOnLongClickListener(v -> true);
    webView.setLongClickable(false);
    webView.setHapticFeedbackEnabled(false);

    // ── Disable pinch-to-zoom (feels very "browser") ──────────────────────────
    WebSettings settings = webView.getSettings();
    settings.setSupportZoom(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);

    // ── Edge-to-edge: let our web layer draw under status + nav bars ──────────
    webView.setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
      View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
    );
  }
}
