package com.hanwol.domain.skill;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hanwol.domain.enums.SkillType;

import java.util.List;
import java.util.Optional;

public interface SkillRepository extends JpaRepository<Skill, Long> {

    Optional<Skill> findByName(String name);

    List<Skill> findBySkillType(SkillType skillType);
}
