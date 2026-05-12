package com.hanwol.dto.battle;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BattleDamageResult {
    private final int finalDamage; // 최종적으로 차감할 데미지 수치
    private final boolean isCritical; // 치명타가 터졌는지 여부 (프론트 연출용)
    private final double elementEffect; // 속성 상성 배율 (1.5면 '효과 만점', 0.5면 '효과 별로')
}