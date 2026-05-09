package com.hanwol.service;

import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.enums.Element;
import com.hanwol.domain.skill.Skill;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Random;

@Slf4j
@Service
public class BattleLogicService {

    private final Random random = new Random();

    /**
     * 데미지 계산 공식 (방어력, 속성, 치명타, 스케일링 스탯 모두 포함)
     */
    public int calculateDamage(UserCharacter attacker, Skill skill, Element defenderElement, int defenderDef) {
        
        // 1. 기준 스탯 결정 (ATK, DEF, HP 중 하나)
        int baseStat = switch (skill.getScalingStat()) {
            case ATK -> attacker.getEffectiveAtk();
            case DEF -> attacker.getEffectiveDef(); // 남궁천 특화
            case HP -> attacker.getEffectiveHp();   // 특정 캐릭터 특화
        };

        // 2. 스킬 배율 적용
        double skillMultiplier = skill.getDamageMultiplier().doubleValue();
        double rawDamage = baseStat * skillMultiplier;

        // 3. 속성 상성 적용
        double elementMultiplier = skill.getElement() != null ? 
                skill.getElement().getDamageMultiplier(defenderElement) : 1.0;
        
        // 4. 방어력 차감 로직 (간단한 공식: 데미지 = 공격치 * (1000 / (1000 + 방어력)))
        double defenseMultiplier = 1000.0 / (1000.0 + defenderDef);
        
        // 5. 치명타 계산
        boolean isCrit = (random.nextDouble() * 100) < attacker.getCharacter().getBaseCritRate().doubleValue();
        double critMultiplier = isCrit ? (attacker.getCharacter().getBaseCritDmg().doubleValue() / 100.0) : 1.0;

        // 최종 계산
        int finalDamage = (int) Math.round(rawDamage * elementMultiplier * defenseMultiplier * critMultiplier);
        
        // 최소 데미지 보정
        return Math.max(finalDamage, 1);
    }

    /**
     * SP(기력) 및 투기 체크 후 스킬 사용 가능 여부 검증
     * @param currentPartyEnergy 파티 공용 기력 (최대 5)
     * @param currentSpirit 개인 투기 (최대 6)
     */
    public boolean canUseSkill(Skill skill, int currentPartyEnergy, int currentSpirit) {
        if (skill.getEnergyCost() < 0 && currentPartyEnergy < Math.abs(skill.getEnergyCost())) {
            log.warn("파티 기력이 부족합니다.");
            return false;
        }
        if (skill.getSpiritCost() > currentSpirit) {
            log.warn("투기가 부족합니다. (필요:{}, 현재:{})", skill.getSpiritCost(), currentSpirit);
            return false;
        }
        return true;
    }

    /**
     * 합벽기 사용 가능 여부 (두 캐릭터의 투기 모두 확인)
     */
    public boolean canUseComboSkill(int spiritCostA, int spiritCostB, int currentSpiritA, int currentSpiritB) {
        return currentSpiritA >= spiritCostA && currentSpiritB >= spiritCostB;
    }
}
