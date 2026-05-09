package com.hanwol.dto.battle;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class HeroTemplateDto {
    private String name;
    private String role;
    private int baseHp;
    private int baseAtk;
    private int baseDef;
    private int baseSpd;
    private List<HeroSkillDto> skills;
}
