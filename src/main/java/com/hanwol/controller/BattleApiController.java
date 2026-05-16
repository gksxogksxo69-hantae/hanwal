package com.hanwol.controller;

import com.hanwol.dto.battle.HeroTemplateDto;
import com.hanwol.dto.battle.HeroSkillDto;
import com.hanwol.dto.battle.BattleDamageResult;
import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.skill.Skill;
import com.hanwol.domain.character.GameCharacterRepository;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.skill.SkillRepository;
import com.hanwol.service.BattleLogicService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/battle")
public class BattleApiController {

    private final GameCharacterRepository gameCharacterRepository;
    private final UserCharacterRepository userCharacterRepository;
    private final SkillRepository skillRepository;
    private final BattleLogicService battleLogicService;

    public BattleApiController(GameCharacterRepository gameCharacterRepository,
            UserCharacterRepository userCharacterRepository,
            SkillRepository skillRepository,
            BattleLogicService battleLogicService) {
        this.gameCharacterRepository = gameCharacterRepository;
        this.userCharacterRepository = userCharacterRepository;
        this.skillRepository = skillRepository;
        this.battleLogicService = battleLogicService;
    }

    /**
     * 프론트엔드(battle.js)에서 보낸 공격 요청을 처리하는 엔드포인트
     */
    @PostMapping("/attack")
    public ResponseEntity<?> processAttack(@RequestBody BattleAttackRequest request) {

        // 1. 실제 공격자 검증
        UserCharacter attacker = userCharacterRepository.findById(request.getAttackerId()).orElse(null);
        if (attacker == null) {
            return ResponseEntity.badRequest().body("공격자 캐릭터를 찾을 수 없습니다. ID: " + request.getAttackerId());
        }

        // 2. 시전 무공 검증
        Skill skill = skillRepository.findById(request.getSkillId()).orElse(null);
        if (skill == null) {
            return ResponseEntity.badRequest().body("사용하려는 무공을 찾을 수 없습니다. ID: " + request.getSkillId());
        }

        // 3. 기력/투기 검증 (자원 부족 시 컷)
        if (!battleLogicService.canUseSkill(skill, request.getCurrentEnergy(), request.getCurrentSpirit())) {
            return ResponseEntity.badRequest().body("기력 또는 투기가 부족하여 무공을 펼칠 수 없습니다.");
        }

        // 4. 대미지 연산 호출
        BattleDamageResult result = battleLogicService.calculateDamage(
                attacker,
                skill,
                request.getDefenderElement() != null ? request.getDefenderElement() : com.hanwol.domain.enums.Element.NONE,
                request.getDefenderDef());

        return ResponseEntity.ok(result);
    }

    /**
     * 캐릭터 템플릿 코드 기반 동적 조회 API (하드코딩 100% 박살 버전)
     */
    @GetMapping("/character/{templateId}")
    public ResponseEntity<HeroTemplateDto> getCharacterTemplate(@PathVariable("templateId") String templateId) {
        // findByCode로 동적 긁어오기!
        GameCharacter character = gameCharacterRepository.findByCode(templateId).orElse(null);
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
                    .isUltimate("BATTLE".equals(cs.getSkillSlot())
                            || (skill.getEnergyCost() == 0 && skill.getSpiritCost() >= 3))
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

    /**
     * JSON 바인딩용 DTO (Jackson 파싱 오류 완전 방어)
     */
    @lombok.Getter
    @lombok.Setter
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class BattleAttackRequest {
        private Long attackerId;
        private Long skillId;
        private int currentEnergy; // 프론트엔드의 currentEnergy 키값과 매핑 완료
        private int currentSpirit; // 프론트엔드의 currentSpirit 키값과 매핑 완료
        private com.hanwol.domain.enums.Element defenderElement;
        private int defenderDef;
    }
}