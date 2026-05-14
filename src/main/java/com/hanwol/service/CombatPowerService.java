package com.hanwol.service;

import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.enums.Rarity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 무림 전투력(Combat Power) 계산 서비스
 */
@Service
@RequiredArgsConstructor
public class CombatPowerService {

    /**
     * 개별 캐릭터의 전투력 계산
     */
    public long calculateCharacterPower(UserCharacter uc) {
        if (uc == null) return 0;

        // 1. 기본 스탯 합산 (HP는 가중치를 낮게, 속도는 높게)
        double basePower = (uc.getEffectiveHp() / 10.0) + 
                          uc.getEffectiveAtk() + 
                          uc.getEffectiveDef() + 
                          (uc.getEffectiveSpd() * 2.5);

        // 2. 등급(Rarity) 가중치
        double rarityMultiplier = getRarityMultiplier(uc.getEffectiveRarity());

        // 3. 돌파(Breakthrough) 가중치 (1돌파당 5% 증가)
        double breakthroughBonus = 1.0 + (uc.getBreakthrough() * 0.05);

        // 4. 스킬 레벨 가중치
        double skillBonus = 1.0 + ((uc.getSkillLevelNormal() + uc.getSkillLevelBattle() + uc.getSkillLevelUltimate() - 3) * 0.02);

        return Math.round(basePower * rarityMultiplier * breakthroughBonus * skillBonus);
    }

    /**
     * 유저의 보유 캐릭터 총 전투력 합산
     */
    public long calculateTotalAccountPower(List<UserCharacter> characters) {
        return characters.stream()
                .mapToLong(this::calculateCharacterPower)
                .sum();
    }

    private double getRarityMultiplier(Rarity rarity) {
        return switch (rarity) {
            case U -> 1.5;
            case S -> 1.25;
            case A -> 1.1;
            case B -> 1.0;
            case C -> 0.9;
            default -> 1.0;
        };
    }
}
