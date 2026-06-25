package com.bviit.analytics.common.exception;

public class InvalidPeriodException extends IllegalArgumentException {

    public InvalidPeriodException(String message) {
        super(message);
    }

    public InvalidPeriodException(String message, Throwable cause) {
        super(message, cause);
    }
}
