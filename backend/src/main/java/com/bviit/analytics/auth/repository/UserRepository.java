package com.bviit.analytics.auth.repository;

import com.bviit.analytics.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByLoginIdIgnoreCase(String loginId);
}
