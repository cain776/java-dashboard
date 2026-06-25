package com.bviit.analytics.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SimpleDriverDataSource;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.sql.Driver;

/**
 * SQLite 더미 데이터 전용 JdbcTemplate.
 * DataSource를 빈으로 등록하지 않아서 JPA/Hibernate에 영향 없음.
 */
@Configuration
public class MockDataSourceConfig {

    @Value("${app.mock.db-path:}")
    private String customDbPath;

    @Bean("mockJdbcTemplate")
    public NamedParameterJdbcTemplate mockJdbcTemplate() throws Exception {
        String dbPath = resolveDbPath();
        var ds = new SimpleDriverDataSource();
        ds.setDriverClass((Class<? extends Driver>) Class.forName("org.sqlite.JDBC"));
        ds.setUrl("jdbc:sqlite:" + dbPath);
        return new NamedParameterJdbcTemplate(ds);
    }

    private String resolveDbPath() throws IOException {
        if (customDbPath != null && !customDbPath.isBlank()) {
            return customDbPath;
        }
        ClassPathResource res = new ClassPathResource("mock/mock-data.db");
        try {
            return res.getFile().getAbsolutePath();
        } catch (IOException ignored) {
            // JAR 내부인 경우 임시 파일로 복사
        }
        Path temp = Files.createTempFile("mock-data-", ".db");
        try (InputStream is = res.getInputStream()) {
            Files.copy(is, temp, StandardCopyOption.REPLACE_EXISTING);
        }
        return temp.toAbsolutePath().toString();
    }
}
