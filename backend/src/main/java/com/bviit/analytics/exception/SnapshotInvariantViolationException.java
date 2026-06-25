package com.bviit.analytics.exception;

public class SnapshotInvariantViolationException extends IllegalArgumentException {

    public SnapshotInvariantViolationException(String message) {
        super(message);
    }

    public SnapshotInvariantViolationException(String message, Throwable cause) {
        super(message, cause);
    }
}
