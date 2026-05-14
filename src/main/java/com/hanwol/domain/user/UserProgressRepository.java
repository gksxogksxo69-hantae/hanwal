package com.hanwol.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProgressRepository extends JpaRepository<UserProgress, Long> {
    java.util.List<UserProgress> findAllByOrderByTotalPowerDesc();
    java.util.List<UserProgress> findTop100ByOrderByTotalPowerDesc();
}
