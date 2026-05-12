package com.hanwol.controller;

import com.hanwol.dto.battle.HeroTemplateDto;
import com.hanwol.dto.battle.HeroSkillDto;
import com.hanwol.dto.battle.BattleDamageResult; // 형이 만든 DTO 임포트
import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.skill.Skill;
import com.hanwol.domain.character.GameCharacterRepository;
import com.hanwol.domain.character.UserCharacterRepository; // 추가
import com.hanwol.domain.skill.SkillRepository; // 추가
import com.hanwol.service.BattleLogicService; // 추가
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/battle")
public class BattleApiController {

    private final GameCharacterRepository gameCharacterRepository;
    private final UserCharacterRepository userCharacterRepository; // 추가
    private final SkillRepository skillRepository; // 추가
    private final BattleLogicService battleLogicService; // 추가

    // 15년 차 팁: 생성자에 매개변수 늘려서 스프링한테 주입하라고 시킨다!
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

        // 1. DB에서 실제 공격자(UserCharacter) 꺼내오기
        UserCharacter attacker = userCharacterRepository.findById(request.getAttackerId()).orElse(null);
        if (attacker == null) {
            return ResponseEntity.badRequest().body("공격자 캐릭터를 찾을 수 없습니다. ID: " + request.getAttackerId());
        }

        // 2. DB에서 실제 시전할 스킬(Skill) 꺼내오기
        Skill skill = skillRepository.findById(request.getSkillId()).orElse(null);
        if (skill == null) {
            return ResponseEntity.badRequest().body("사용하려는 무공(스킬)을 찾을 수 없습니다. ID: " + request.getSkillId());
        }

        // 3. 기력/투기가 충분한지 서비스에서 검증 (네가 만들어둔 훌륭한 검증 로직 활용!)
        // 단, 여기서는 예시로 기력과 투기 현재 값을 999로 임시 패스하거나, 원래 세션/전투 상태 객체에서 꺼내와야 함.
        if (!battleLogicService.canUseSkill(skill, 999, 999)) {
            return ResponseEntity.badRequest().body("기력 또는 투기가 부족하여 무공을 펼칠 수 없습니다.");
        }

        // 4. 형이 리팩토링한 크린한 대미지 연산 알고리즘 호출
        BattleDamageResult result = battleLogicService.calculateDamage(
                attacker,
                skill,
                request.getDefenderElement(),
                request.getDefenderDef());

        // 5. 결과 DTO(최종뎀, 크리여부, 상성배율) 그대로 JSON 반환!
        return ResponseEntity.ok(result);
    }

    /**
     * 기존에 네가 짜놓은 캐릭터 템플릿 조회 API (그대로 보존)
     */
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
                    .isUltimate("BATTLE".equals(cs.getSkillSlot())
                            || skill.getEnergyCost() == 0 && skill.getSpiritCost() >= 3)
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
     * 프론트엔드가 쏜 JSON 데이터를 받아줄 매핑용 내부 DTO 클래스
     */
    @lombok.Getter
    @lombok.Setter
    public static class BattleAttackRequest {
        private Long attackerId;
        private Long skillId;
        private com.hanwol.domain.enums.Element defenderElement;
        private int defenderDef;
    }
}