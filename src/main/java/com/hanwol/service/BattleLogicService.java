package com.hanwol.service;

import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.enums.Element;
import com.hanwol.domain.skill.Skill;
import com.hanwol.dto.battle.BattleDamageResult; // DTO 임포트 추가
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
public class BattleLogicService {

    // private final Random random = new Random(); // 디렉터님 팩폭: 15년 차 시니어는 Random 대신 스레드 안전한 ThreadLocalRandom을 쓴다!

    /**
     * 데미지 계산 공식 (A안 반영: 상세 데이터를 담은 BattleDamageResult 리턴)
     */
    public BattleDamageResult calculateDamage(UserCharacter attacker, Skill skill, Element defenderElement,
            int defenderDef) {

        // 1. 기준 스탯 결정 (ATK, DEF, HP 중 하나)
        int baseStat = switch (skill.getScalingStat()) {
            case ATK -> attacker.getEffectiveAtk();
            case DEF -> attacker.getEffectiveDef(); // 남궁천 특화
            case HP -> attacker.getEffectiveHp(); // 특정 캐릭터 특화
        };

        // 2. 스킬 배율 적용
        double skillMultiplier = skill.getDamageMultiplier().doubleValue();
        double rawDamage = baseStat * skillMultiplier;

        // 3. 속성 상성 적용
        double elementMultiplier = skill.getElement() != null ? skill.getElement().getDamageMultiplier(defenderElement)
                : 1.0;

        // 4. 방어력 차감 로직 (매직 넘버 상수는 나중에 application.yml 등으로 주입받아도 굿)
        double defenseConstant = 1000.0;
        double defenseMultiplier = defenseConstant / (defenseConstant + defenderDef);

        // 5. 치명타 계산
        boolean isCrit = (ThreadLocalRandom.current().nextDouble() * 100.0) < attacker.getCharacter().getBaseCritRate().doubleValue();
        double critMultiplier = isCrit ? (attacker.getCharacter().getBaseCritDmg().doubleValue() / 100.0) : 1.0;

        // 6. 무협 맛 가미: 데미지 변동폭(Fluctuation) 추가 (95% ~ 105% 사이의 난수 생성)
        double fluctuation = 0.95 + (ThreadLocalRandom.current().nextDouble() * 0.10);

        // 최종 계산
        int finalDamage = (int) Math
                .round(rawDamage * elementMultiplier * defenseMultiplier * critMultiplier * fluctuation);

        // 최소 데미지 보정
        finalDamage = Math.max(finalDamage, 1);

        // 결과 빌드 후 리턴
        return BattleDamageResult.builder()
                .finalDamage(finalDamage)
                .isCritical(isCrit)
                .elementEffect(elementMultiplier)
                .build();
    }

    /**
     * SP(기력) 및 투기 체크 후 스킬 사용 가능 여부 검증
     */
    public boolean canUseSkill(Skill skill, int currentPartyEnergy, int currentSpirit) {
        if (skill.getEnergyCost() > 0 && currentPartyEnergy < skill.getEnergyCost()) {
            log.warn("파티 기력이 부족합니다. (필요:{}, 현재:{})", skill.getEnergyCost(), currentPartyEnergy);
            return false;
        }
        if (skill.getSpiritCost() > currentSpirit) { // cite:
                                                     // uploaded:src/main/java/com/hanwol/service/BattleLogicService.java
            log.warn("투기가 부족합니다. (필요:{}, 현재:{})", skill.getSpiritCost(), currentSpirit); // cite:
                                                                                         // uploaded:src/main/java/com/hanwol/service/BattleLogicService.java
            return false; // cite: uploaded:src/main/java/com/hanwol/service/BattleLogicService.java
        }
        return true; // cite: uploaded:src/main/java/com/hanwol/service/BattleLogicService.java
    }

    /**
     * 합벽기 사용 가능 여부 (두 캐릭터의 투기 모두 확인)
     */
    public boolean canUseComboSkill(int spiritCostA, int spiritCostB, int currentSpiritA, int currentSpiritB) {
        return currentSpiritA >= spiritCostA && currentSpiritB >= spiritCostB; // cite:
                                                                               // uploaded:src/main/java/com/hanwol/service/BattleLogicService.java
    }
}