package com.hanwol.repository;

import com.hanwol.domain.CharacterTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CharacterTemplateRepository extends JpaRepository<CharacterTemplate, String> {

    // N+1 문제를 방지하기 위해 Fetch Join 사용 (MyBatis의 1방 쿼리와 동일한 효과)
    @Query("SELECT c FROM CharacterTemplate c LEFT JOIN FETCH c.skills WHERE c.templateId = :templateId")
    CharacterTemplate findWithSkillsById(@Param("templateId") String templateId);
}
