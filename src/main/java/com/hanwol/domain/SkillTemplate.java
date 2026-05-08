package com.hanwol.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AccessLevel;

import java.math.BigDecimal;

@Entity
@Table(name = "skill_template")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SkillTemplate {

    @Id
    @Column(name = "skill_id", length = 50)
    private String skillId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "skill_type", length = 20)
    private String skillType = "DAMAGE"; // DAMAGE, HEAL, BUFF

    @Column(name = "target_type", length = 20)
    private String targetType = "SINGLE"; // SINGLE, ALL, SELF

    @Column(name = "is_ultimate")
    private boolean isUltimate = false;

    @Column(name = "damage_multiplier", precision = 5, scale = 2)
    private BigDecimal damageMultiplier;

    @Column(name = "mp_cost")
    private int mpCost = 0;
}
