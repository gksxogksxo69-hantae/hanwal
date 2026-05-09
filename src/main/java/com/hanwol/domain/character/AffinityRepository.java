package com.hanwol.domain.character;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AffinityRepository extends JpaRepository<Affinity, Long> {

    Optional<Affinity> findByUserIdAndCharacterId(Long userId, Long characterId);

    List<Affinity> findByUserId(Long userId);

    List<Affinity> findByUserIdAndAffinityLevelGreaterThanEqual(Long userId, int level);
}
