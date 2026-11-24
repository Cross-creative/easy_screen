package com.crosscreative.telafacil;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.view.Display;
import androidx.core.app.NotificationCompat;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

public class CaptureService extends Service {
    public static final String ACTION_START = "com.crosscreative.telafacil.START";
    public static final String ACTION_STOP = "com.crosscreative.telafacil.STOP";

    public interface Listener {
        void onStarted(int session, int width, int height, boolean audio);
        void onError(int session, String message);
        void onStopped(int session);
    }

    public static volatile Listener listener;
    public static volatile boolean running;
    static volatile CaptureService instance;

    private static final String CHANNEL_ID = "tela_facil_captura";
    private static final int NOTIFICATION_ID = 4711;
    private static final int SAMPLE_RATE = 48000;
    private static final int MAX_FPS = 30;

    private final Object lock = new Object();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private MediaProjection projection;
    private VirtualDisplay display;
    private ImageReader reader;
    private HandlerThread frameThread;
    private Handler frameHandler;
    private Image held;
    private Bitmap bitmap;
    private final ByteArrayOutputStream jpegBuffer = new ByteArrayOutputStream(262144);
    private AudioRecord record;
    private Thread audioThread;
    private volatile boolean audioRun;
    private PowerManager.WakeLock wakeLock;
    private int session;
    private int requestedWidth = 1280;
    private int requestedHeight = 720;
    private int fps = 15;
    private int outWidth;
    private int outHeight;
    private int dpi;
    private boolean audioActive;
    private boolean stopped = true;
    private long lastFrameAt;

    private final ImageReader.OnImageAvailableListener imageListener = new ImageReader.OnImageAvailableListener() {
        @Override
        public void onImageAvailable(ImageReader source) {
            Image image = null;
            try {
                image = source.acquireLatestImage();
            } catch (Throwable ignored) {
            }
            if (image == null) return;
            synchronized (lock) {
                if (held != null) {
                    try {
                        held.close();
                    } catch (Throwable ignored) {
                    }
                }
                held = image;
            }
            scheduleFlush();
        }
    };

    private final Runnable flush = new Runnable() {
        @Override
        public void run() {
            Image image;
            synchronized (lock) {
                image = held;
                held = null;
            }
            if (image == null) return;
            try {
                encode(image);
            } catch (Throwable ignored) {
            } finally {
                try {
                    image.close();
                } catch (Throwable ignored) {
                }
            }
            lastFrameAt = SystemClock.elapsedRealtime();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopCapture(true);
            return START_NOT_STICKY;
        }
        if (ACTION_START.equals(action)) {
            startCapture(intent);
        }
        return START_NOT_STICKY;
    }

    private void startCapture(Intent intent) {
        int newSession = intent.getIntExtra("session", 0);
        if (!stopped) {
            teardown(false);
        }
        session = newSession;
        startForegroundCompat();
        try {
            int code = intent.getIntExtra("code", 0);
            Intent data = intent.getParcelableExtra("data");
            requestedWidth = intent.getIntExtra("width", 1280);
            requestedHeight = intent.getIntExtra("height", 720);
            fps = clampFps(intent.getIntExtra("fps", 15));
            boolean wantAudio = intent.getBooleanExtra("audio", false);
            MediaProjectionManager manager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            projection = manager.getMediaProjection(code, data);
            if (projection == null) throw new IllegalStateException("projection");
            frameThread = new HandlerThread("tela-facil-frames");
            frameThread.start();
            frameHandler = new Handler(frameThread.getLooper());
            final MediaProjection created = projection;
            projection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    mainHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            if (created == projection) stopCapture(true);
                        }
                    });
                }
            }, mainHandler);
            FrameBus.VIDEO.reset();
            FrameBus.AUDIO.reset();
            stopped = false;
            running = true;
            rebuild();
            audioActive = wantAudio && startAudio();
            acquireWakeLock();
            Listener l = listener;
            if (l != null) l.onStarted(session, outWidth, outHeight, audioActive);
        } catch (Throwable error) {
            Listener l = listener;
            if (l != null) l.onError(session, String.valueOf(error.getMessage()));
            teardown(false);
            stopForeground(true);
            stopSelf();
        }
    }

    private void startForegroundCompat() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Compartilhamento de tela", NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(channel);
        }
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openIntent = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent stop = new Intent(this, CaptureService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Tela Fácil")
            .setContentText("Sua tela está sendo compartilhada")
            .setOngoing(true)
            .setContentIntent(openIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Parar", stopIntent)
            .build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TelaFacil:captura");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire();
        } catch (Throwable ignored) {
        }
    }

    private static int clampFps(int value) {
        return Math.max(5, Math.min(MAX_FPS, value));
    }

    private static int even(int value) {
        int v = Math.max(2, value);
        return v - (v % 2);
    }

    private void computeSize() {
        DisplayManager dm = (DisplayManager) getSystemService(Context.DISPLAY_SERVICE);
        Display d = dm.getDisplay(Display.DEFAULT_DISPLAY);
        DisplayMetrics metrics = new DisplayMetrics();
        d.getRealMetrics(metrics);
        int rw = metrics.widthPixels;
        int rh = metrics.heightPixels;
        dpi = metrics.densityDpi;
        int reqLong = Math.max(requestedWidth, requestedHeight);
        int reqShort = Math.min(requestedWidth, requestedHeight);
        int realLong = Math.max(rw, rh);
        int realShort = Math.min(rw, rh);
        float scale = Math.min(1f, Math.min((float) reqLong / realLong, (float) reqShort / realShort));
        outWidth = even(Math.round(rw * scale));
        outHeight = even(Math.round(rh * scale));
    }

    private void rebuild() {
        synchronized (lock) {
            if (stopped || projection == null) return;
            int oldW = outWidth;
            int oldH = outHeight;
            computeSize();
            if (reader != null && oldW == outWidth && oldH == outHeight) return;
            ImageReader fresh = ImageReader.newInstance(outWidth, outHeight, PixelFormat.RGBA_8888, 3);
            fresh.setOnImageAvailableListener(imageListener, frameHandler);
            if (display == null) {
                display = projection.createVirtualDisplay(
                    "TelaFacil",
                    outWidth,
                    outHeight,
                    dpi,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    fresh.getSurface(),
                    null,
                    frameHandler
                );
            } else {
                display.resize(outWidth, outHeight, dpi);
                display.setSurface(fresh.getSurface());
            }
            ImageReader old = reader;
            reader = fresh;
            if (held != null) {
                try {
                    held.close();
                } catch (Throwable ignored) {
                }
                held = null;
            }
            if (old != null) {
                try {
                    old.setOnImageAvailableListener(null, null);
                    old.close();
                } catch (Throwable ignored) {
                }
            }
            bitmap = null;
        }
    }

    void updateQuality(int width, int height, int newFps) {
        requestedWidth = width;
        requestedHeight = height;
        fps = clampFps(newFps);
        if (frameHandler != null) {
            frameHandler.post(new Runnable() {
                @Override
                public void run() {
                    rebuild();
                }
            });
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (frameHandler != null && !stopped) {
            frameHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    rebuild();
                }
            }, 400);
        }
    }

    private void scheduleFlush() {
        if (frameHandler == null) return;
        frameHandler.removeCallbacks(flush);
        long interval = 1000L / fps;
        long wait = Math.max(0L, lastFrameAt + interval - SystemClock.elapsedRealtime());
        frameHandler.postDelayed(flush, wait);
    }

    private void encode(Image image) {
        Image.Plane plane = image.getPlanes()[0];
        ByteBuffer buffer = plane.getBuffer();
        int pixelStride = plane.getPixelStride();
        int rowStride = plane.getRowStride();
        int width = image.getWidth();
        int height = image.getHeight();
        int bitmapWidth = rowStride / pixelStride;
        if (bitmap == null || bitmap.getWidth() != bitmapWidth || bitmap.getHeight() != height) {
            bitmap = Bitmap.createBitmap(bitmapWidth, height, Bitmap.Config.ARGB_8888);
        }
        buffer.rewind();
        bitmap.copyPixelsFromBuffer(buffer);
        Bitmap output = bitmapWidth == width ? bitmap : Bitmap.createBitmap(bitmap, 0, 0, width, height);
        jpegBuffer.reset();
        output.compress(Bitmap.CompressFormat.JPEG, 62, jpegBuffer);
        if (output != bitmap) output.recycle();
        byte[] jpeg = jpegBuffer.toByteArray();
        byte[] frame = new byte[jpeg.length + 4];
        frame[0] = (byte) (jpeg.length >>> 24);
        frame[1] = (byte) (jpeg.length >>> 16);
        frame[2] = (byte) (jpeg.length >>> 8);
        frame[3] = (byte) jpeg.length;
        System.arraycopy(jpeg, 0, frame, 4, jpeg.length);
        FrameBus.VIDEO.push(frame);
    }

    private boolean startAudio() {
        if (Build.VERSION.SDK_INT < 29) return false;
        try {
            AudioPlaybackCaptureConfiguration config = new AudioPlaybackCaptureConfiguration.Builder(projection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                .build();
            AudioFormat format = new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_IN_STEREO)
                .build();
            int min = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_STEREO, AudioFormat.ENCODING_PCM_16BIT);
            record = new AudioRecord.Builder()
                .setAudioFormat(format)
                .setBufferSizeInBytes(Math.max(min, 19200) * 2)
                .setAudioPlaybackCaptureConfig(config)
                .build();
            if (record.getState() != AudioRecord.STATE_INITIALIZED) {
                record.release();
                record = null;
                return false;
            }
            record.startRecording();
            audioRun = true;
            final AudioRecord active = record;
            audioThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    byte[] chunk = new byte[3840];
                    while (audioRun) {
                        int n;
                        try {
                            n = active.read(chunk, 0, chunk.length);
                        } catch (Throwable error) {
                            break;
                        }
                        if (n > 0) {
                            byte[] copy = new byte[n];
                            System.arraycopy(chunk, 0, copy, 0, n);
                            FrameBus.AUDIO.push(copy);
                        } else if (n < 0) {
                            break;
                        }
                    }
                }
            }, "tela-facil-audio");
            audioThread.start();
            return true;
        } catch (Throwable error) {
            if (record != null) {
                try {
                    record.release();
                } catch (Throwable ignored) {
                }
                record = null;
            }
            return false;
        }
    }

    private void stopAudio() {
        audioRun = false;
        if (audioThread != null) {
            try {
                audioThread.join(500);
            } catch (InterruptedException ignored) {
            }
            audioThread = null;
        }
        if (record != null) {
            try {
                record.stop();
            } catch (Throwable ignored) {
            }
            try {
                record.release();
            } catch (Throwable ignored) {
            }
            record = null;
        }
        audioActive = false;
    }

    private void teardown(boolean notify) {
        int endedSession = session;
        synchronized (lock) {
            stopped = true;
            running = false;
            if (frameHandler != null) frameHandler.removeCallbacksAndMessages(null);
            if (held != null) {
                try {
                    held.close();
                } catch (Throwable ignored) {
                }
                held = null;
            }
            if (display != null) {
                try {
                    display.release();
                } catch (Throwable ignored) {
                }
                display = null;
            }
            if (reader != null) {
                try {
                    reader.setOnImageAvailableListener(null, null);
                    reader.close();
                } catch (Throwable ignored) {
                }
                reader = null;
            }
            bitmap = null;
        }
        stopAudio();
        if (projection != null) {
            MediaProjection p = projection;
            projection = null;
            try {
                p.stop();
            } catch (Throwable ignored) {
            }
        }
        if (frameThread != null) {
            frameThread.quitSafely();
            frameThread = null;
            frameHandler = null;
        }
        if (wakeLock != null) {
            try {
                if (wakeLock.isHeld()) wakeLock.release();
            } catch (Throwable ignored) {
            }
            wakeLock = null;
        }
        FrameBus.VIDEO.end();
        FrameBus.AUDIO.end();
        outWidth = 0;
        outHeight = 0;
        if (notify) {
            Listener l = listener;
            if (l != null) l.onStopped(endedSession);
        }
    }

    void stopCapture(boolean notify) {
        if (!stopped) teardown(notify);
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (!stopped) teardown(true);
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
