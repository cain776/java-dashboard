package com.bviit.analytics.common.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

/**
 * primary DataSource — mssql 프로파일이 아닐 때(기본 H2 / postgres).
 *
 * <p><b>왜 필요한가</b> — {@link StatsDataSourceConfig}(mssql) 는 @Primary DataSource 를 직접
 * 정의하지만, 나머지 프로파일(미지정=H2 / postgres)에서는 아무도 primary 를 정의하지 않는다.
 * 원래는 Spring Boot 의 DataSourceAutoConfiguration 이 spring.datasource 로 만들어줬다.
 *
 * <p>그런데 그 auto-config 는 {@code @ConditionalOnMissingBean(DataSource.class)} 다 —
 * <b>DataSource 빈이 하나라도 있으면 통째로 물러난다.</b> {@link LegacyDataSourceConfig} 가 켜지면
 * 그 SQLite/MariaDB DataSource 가 유일한 DataSource 가 되어 JPA 가 그걸 집어들고
 * "Unable to determine Dialect for SQLite" 로 기동이 깨진다.
 *
 * <p>그래서 mssql 과 같은 방식으로 primary 를 명시한다. auto-config 가 만들던 것과 동일한
 * spring.datasource 기반 Hikari 라 동작은 그대로다 — 값은 프로파일이 결정한다
 * (기본 application.properties=H2 / application-postgres.properties=PostgreSQL).
 * 보조 DataSource 가 늘어나도 primary 가 흔들리지 않는다.
 *
 * <p>{@link MockDataSourceConfig} 는 무관하다 — 거기 SimpleDriverDataSource 는 JdbcTemplate 안에만
 * 있고 <b>빈으로 등록되지 않아서</b> auto-config 를 물러나게 하지 않는다.
 */
@Configuration
@Profile("!mssql")
public class DefaultDataSourceConfig {

    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties primaryDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Primary
    @Bean
    public DataSource dataSource() {
        return primaryDataSourceProperties()
                .initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .build();
    }
}
