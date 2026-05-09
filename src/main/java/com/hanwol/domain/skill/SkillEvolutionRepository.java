package com.hanwol.domain.skill;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hanwol.domain.enums.RouteType;

import java.util.List;

public interface SkillEvolutionRepository extends JpaRepository<SkillEvolution, Long> {

    /** 특정 루트 + 특정 챕터에서 해금되는 스킬 진화 목록 */
    List<SkillEvolution> findByRouteTypeAndRequiredChapter(RouteType routeType, int chapter);

    /** 특정 스킬의 진화 대상 조회 */
    List<SkillEvolution> findByBeforeSkillId(Long beforeSkillId);
}
