package com.bviit.analytics.exception;

public class InvalidPeriodException extends IllegalArgumentException {

    public InvalidPeriodException(String message) {
        super(message);
    }

    public InvalidPeriodException(String message, Throwable cause) {
        super(message, cause);
    }
}
