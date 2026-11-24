package com.crosscreative.telafacil;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;

final class QueueInputStream extends InputStream {
    static final byte[] END = new byte[0];

    private final LinkedBlockingDeque<byte[]> queue = new LinkedBlockingDeque<>();
    private final int capacity;
    private final FrameBus bus;
    private byte[] current;
    private int position;
    private volatile boolean closed;

    QueueInputStream(FrameBus bus, int capacity) {
        this.bus = bus;
        this.capacity = capacity;
    }

    void offer(byte[] data) {
        if (closed) return;
        while (queue.size() >= capacity) {
            queue.pollFirst();
        }
        queue.offerLast(data);
    }

    void finish() {
        queue.offerLast(END);
    }

    void shut() {
        closed = true;
        queue.clear();
        queue.offerLast(END);
    }

    @Override
    public int read() throws IOException {
        byte[] one = new byte[1];
        int n = read(one, 0, 1);
        return n < 0 ? -1 : (one[0] & 0xff);
    }

    @Override
    public int read(byte[] target, int offset, int length) throws IOException {
        if (length == 0) return 0;
        while (true) {
            if (closed) return -1;
            if (current != null && position < current.length) {
                int n = Math.min(length, current.length - position);
                System.arraycopy(current, position, target, offset, n);
                position += n;
                return n;
            }
            byte[] next;
            try {
                next = queue.poll(300, TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                return -1;
            }
            if (next == null) {
                if (!CaptureService.running) return -1;
                continue;
            }
            if (next == END) return -1;
            current = next;
            position = 0;
        }
    }

    @Override
    public void close() {
        closed = true;
        queue.clear();
        bus.detach(this);
    }
}
