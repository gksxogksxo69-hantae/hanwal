package com.hanwol.domain.skill;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hanwol.domain.enums.RouteType;

import java.util.List;

public interface ComboSkillRepository extends JpaRepository<ComboSkill, Long> {

    List<ComboSkill> findByRouteType(RouteType routeType);

    /** 두 캐릭터 간 사용 가능한 합벽기 조회 (순서 무관) */
    @Query("SELECT cs FROM ComboSkill cs WHERE " +
           "(cs.characterA.id = :charA AND cs.characterB.id = :charB) OR " +
           "(cs.characterA.id = :charB AND cs.characterB.id = :charA)")
    List<ComboSkill> findByCharacterPair(@Param("charA") Long charAId, @Param("charB") Long charBId);

    /** 특정 루트 + 스토리 챕터 이하의 해금된 합벽기 */
    @Query("SELECT cs FROM ComboSkill cs WHERE cs.routeType = :route AND cs.requiredChapter <= :chapter")
    List<ComboSkill> findUnlockedCombos(@Param("route") RouteType route, @Param("chapter") int chapter);
}
