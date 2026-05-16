package com.hanwol.domain.character;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserCharacterRepository extends JpaRepository<UserCharacter, Long> {

    List<UserCharacter> findByUserId(Long userId);

    List<UserCharacter> findByUserIdOrderByLevelDesc(Long userId);

    java.util.Optional<UserCharacter> findByUserIdAndCharacterId(Long userId, Long characterId);

    boolean existsByUserIdAndCharacterId(Long userId, Long characterId);

    int countByUserId(Long userId);
}
