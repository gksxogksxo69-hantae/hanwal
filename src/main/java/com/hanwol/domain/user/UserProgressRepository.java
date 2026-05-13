package com.hanwol.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {
    // 기본 CRUD만으로도 충분함
}
