package com.hanwol.controller;

import com.hanwol.dto.battle.HeroTemplateDto;
import com.hanwol.dto.battle.HeroSkillDto;
import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.skill.Skill;
import com.hanwol.repository.GameCharacterRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/battle")
public class BattleApiController {

    private final GameCharacterRepository gameCharacterRepository;

    public BattleApiController(GameCharacterRepository gameCharacterRepository) {
        this.gameCharacterRepository = gameCharacterRepository;
    }

    @GetMapping("/character/{templateId}")
    public ResponseEntity<HeroTemplateDto> getCharacterTemplate(@PathVariable("templateId") String templateId) {
        Long charId = "CH_NAMGUNG_CHUN".equals(templateId) ? 1L : 2L;
        
        GameCharacter character = gameCharacterRepository.findById(charId).orElse(null);
        if (character == null) {
            return ResponseEntity.notFound().build();
        }

        List<HeroSkillDto> skillDtos = character.getCharacterSkills().stream().map(cs -> {
            Skill skill = cs.getSkill();
            return HeroSkillDto.builder()
                    .skillId(skill.getId())
                    .name(skill.getName())
                    .description(skill.getDescription())
                    .skillType(skill.getSkillType().name())
                    .targetType(skill.getTargetType().name())
                    .isUltimate("BATTLE".equals(cs.getSkillSlot()) || skill.getEnergyCost() == 0 && skill.getSpiritCost() >= 3)
                    .damageMultiplier(skill.getDamageMultiplier().doubleValue())
                    .energyCost(skill.getEnergyCost())
                    .spiritCost(skill.getSpiritCost())
                    .build();
        }).collect(Collectors.toList());

        HeroTemplateDto dto = HeroTemplateDto.builder()
                .name(character.getName())
                .role(character.getRole())
                .baseHp(character.getBaseHp())
                .baseAtk(character.getBaseAtk())
                .baseDef(character.getBaseDef())
                .baseSpd(character.getBaseSpd())
                .skills(skillDtos)
                .build();

        return ResponseEntity.ok(dto);
    }
}
