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

        // 3. 기력/투기 검증 (클라이언트가 보낸 현재 상태 기반으로 일단 검증)
        // TODO: 보안을 위해 서버 세션이나 Redis에 저장된 '전투 인스턴스'의 실시간 자원 상태와 대조해야 함! (디렉터님 팩폭 반영 예정)
        if (!battleLogicService.canUseSkill(skill, request.getCurrentEnergy(), request.getCurrentSpirit())) {
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
        // Long charId = "CH_NAMGUNG_CHUN".equals(templateId) ? 1L : 2L; <- 디렉터님의 팩폭: 15년 차 시니어는 코드로 긁어온다!
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
        private int currentEnergy; // 추가됨: 현재 기력
        private int currentSpirit; // 추가됨: 현재 투기
        private com.hanwol.domain.enums.Element defenderElement;
        private int defenderDef;
    }
}