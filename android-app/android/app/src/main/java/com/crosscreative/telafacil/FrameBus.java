package com.crosscreative.telafacil;

import java.io.InputStream;

final class FrameBus {
    static final FrameBus VIDEO = new FrameBus(3, true);
    static final FrameBus AUDIO = new FrameBus(120, false);

    private final int capacity;
    private final boolean keepLast;
    private QueueInputStream consumer;
    private byte[] last;

    private FrameBus(int capacity, boolean keepLast) {
        this.capacity = capacity;
        this.keepLast = keepLast;
    }

    synchronized InputStream attach() {
        if (consumer != null) consumer.shut();
        consumer = new QueueInputStream(this, capacity);
        if (keepLast && last != null) consumer.offer(last);
        return consumer;
    }

    synchronized void detach(QueueInputStream stream) {
        if (consumer == stream) consumer = null;
    }

    synchronized void push(byte[] data) {
        if (keepLast) last = data;
        if (consumer != null) consumer.offer(data);
    }

    synchronized void reset() {
        last = null;
    }

    synchronized void end() {
        last = null;
        if (consumer != null) {
            consumer.finish();
            consumer = null;
        }
    }
}
