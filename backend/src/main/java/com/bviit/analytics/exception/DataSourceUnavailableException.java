package com.bviit.analytics.exception;

import lombok.Getter;

@Getter
public class DataSourceUnavailableException extends RuntimeException {

    private final Object meta;

    public DataSourceUnavailableException(String message) {
        this(message, null);
    }

    public DataSourceUnavailableException(String message, Object meta) {
        super(message);
        this.meta = meta;
    }
}
