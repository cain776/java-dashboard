package com.bviit.analytics;

import com.bviit.analytics.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
		"app.jwt.secret=test-jwt-secret-value-for-context-tests-123456",
		"spring.h2.console.enabled=false"
})
class AnalyticsApplicationTests {

	@Autowired
	private UserRepository userRepository;

	@Test
	void contextLoadsWithoutDefaultSeedData() {
		assertThat(userRepository.count()).isZero();
	}

}
