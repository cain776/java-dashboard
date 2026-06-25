package com.bviit.analytics.common.util;

import java.util.regex.Pattern;

public final class SqlFragments {

    private static final Pattern SAFE_ALIAS = Pattern.compile("[A-Za-z][A-Za-z0-9_]*");
    private static final String EXAM_MEASUREMENTS_BLANK =
            SqlLoader.load("sql/fragments/exam-measurements-blank.sql");

    private SqlFragments() {
    }

    public static String examMeasurementsBlankPredicate(String alias) {
        if (alias == null || !SAFE_ALIAS.matcher(alias).matches()) {
            throw new IllegalArgumentException("SQL alias is not safe: " + alias);
        }
        return EXAM_MEASUREMENTS_BLANK.replace("__ALIAS__", alias);
    }
}
