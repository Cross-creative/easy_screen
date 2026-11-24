package com.crosscreative.telafacil;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean inForeground = true;

    private final Runnable keepAlive = new Runnable() {
        @Override
        public void run() {
            if (!CaptureService.running) return;
            if (!inForeground && bridge != null) {
                WebView web = bridge.getWebView();
                if (web != null) {
                    web.onResume();
                    web.resumeTimers();
                    web.dispatchWindowVisibilityChanged(View.VISIBLE);
                }
            }
            handler.postDelayed(this, 1500);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenCapturePlugin.class);
        super.onCreate(savedInstanceState);
        if (bridge == null) return;
        WebView web = bridge.getWebView();
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if ("/__screen".equals(path)) {
                    return stream("application/octet-stream", FrameBus.VIDEO);
                }
                if ("/__audio".equals(path)) {
                    return stream("application/octet-stream", FrameBus.AUDIO);
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
    }

    private WebResourceResponse stream(String mime, FrameBus bus) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-store");
        if (!CaptureService.running) {
            return new WebResourceResponse(mime, null, 200, "OK", headers, new ByteArrayInputStream(new byte[0]));
        }
        return new WebResourceResponse(mime, null, 200, "OK", headers, bus.attach());
    }

    @Override
    public void onResume() {
        super.onResume();
        inForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        inForeground = false;
        handler.removeCallbacks(keepAlive);
        handler.postDelayed(keepAlive, 500);
    }

    @Override
    public void onStop() {
        super.onStop();
        handler.removeCallbacks(keepAlive);
        handler.postDelayed(keepAlive, 500);
    }
}
