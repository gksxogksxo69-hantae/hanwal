package com.hanwol.domain.character;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hanwol.domain.enums.Element;
import com.hanwol.domain.enums.RouteType;

import java.util.List;
import java.util.Optional;

public interface GameCharacterRepository extends JpaRepository<GameCharacter, Long> {

    Optional<GameCharacter> findByName(String name);

    Optional<GameCharacter> findByCode(String code);

    List<GameCharacter> findByRouteType(RouteType routeType);

    /** 공용 캐릭터 + 특정 루트 캐릭터 조회 */
    @Query("SELECT c FROM GameCharacter c WHERE c.routeType IS NULL OR c.routeType = :route")
    List<GameCharacter> findAvailableByRoute(@Param("route") RouteType route);

    List<GameCharacter> findByElement(Element element);
}
