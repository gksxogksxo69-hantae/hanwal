package com.hanwol.dto.battle;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HeroSkillDto {
    private Long skillId;
    private String name;
    private String description;
    private String skillType;
    private String targetType;
    private boolean isUltimate;
    private double damageMultiplier;
    private int energyCost;
    private int spiritCost;
}
