package com.crosscreative.telafacil;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "ScreenCapture",
    permissions = { @Permission(alias = "mic", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class ScreenCapturePlugin extends Plugin {
    private static int sessionCounter = 0;

    private PluginCall startCall;
    private int reqWidth = 1280;
    private int reqHeight = 720;
    private int reqFps = 15;
    private boolean reqAudio = false;
    private int currentSession = 0;

    @Override
    public void load() {
        CaptureService.listener = new CaptureService.Listener() {
            @Override
            public void onStarted(int session, int width, int height, boolean audio) {
                PluginCall call = startCall;
                startCall = null;
                if (call == null) return;
                JSObject result = new JSObject();
                result.put("session", session);
                result.put("width", width);
                result.put("height", height);
                result.put("audio", audio);
                call.resolve(result);
            }

            @Override
            public void onError(int session, String message) {
                PluginCall call = startCall;
                startCall = null;
                if (call != null) call.reject(message == null ? "erro" : message);
            }

            @Override
            public void onStopped(int session) {
                JSObject data = new JSObject();
                data.put("session", session);
                notifyListeners("stopped", data);
            }
        };
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sdk", Build.VERSION.SDK_INT);
        result.put("audio", Build.VERSION.SDK_INT >= 29);
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        reqWidth = call.getInt("width", 1280);
        reqHeight = call.getInt("height", 720);
        reqFps = call.getInt("fps", 15);
        reqAudio = Boolean.TRUE.equals(call.getBoolean("audio", false)) && Build.VERSION.SDK_INT >= 29;
        if (startCall != null) {
            startCall.reject("substituido");
        }
        startCall = call;
        if (reqAudio && getPermissionState("mic") != PermissionState.GRANTED) {
            requestPermissionForAlias("mic", call, "micResult");
            return;
        }
        askProjection(call);
    }

    @PermissionCallback
    private void micResult(PluginCall call) {
        if (getPermissionState("mic") != PermissionState.GRANTED) {
            reqAudio = false;
        }
        askProjection(call);
    }

    private void askProjection(PluginCall call) {
        MediaProjectionManager manager = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        startActivityForResult(call, manager.createScreenCaptureIntent(), "projectionResult");
    }

    @ActivityCallback
    private void projectionResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            startCall = null;
            call.reject("negado");
            return;
        }
        currentSession = ++sessionCounter;
        Context context = getContext();
        Intent intent = new Intent(context, CaptureService.class);
        intent.setAction(CaptureService.ACTION_START);
        intent.putExtra("session", currentSession);
        intent.putExtra("code", result.getResultCode());
        intent.putExtra("data", result.getData());
        intent.putExtra("width", reqWidth);
        intent.putExtra("height", reqHeight);
        intent.putExtra("fps", reqFps);
        intent.putExtra("audio", reqAudio);
        try {
            ContextCompat.startForegroundService(context, intent);
        } catch (Throwable error) {
            startCall = null;
            call.reject(String.valueOf(error.getMessage()));
        }
    }

    @PluginMethod
    public void setQuality(PluginCall call) {
        CaptureService service = CaptureService.instance;
        if (service != null) {
            service.updateQuality(call.getInt("width", 1280), call.getInt("height", 720), call.getInt("fps", 15));
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        CaptureService service = CaptureService.instance;
        if (service != null) {
            service.stopCapture(false);
        }
        call.resolve();
    }
}
