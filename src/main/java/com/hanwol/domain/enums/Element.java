package com.hanwol.domain.enums;

/**
 * 오행 속성 + 무(특수)
 * 상극: METAL→WOOD→EARTH→WATER→FIRE→METAL
 * VOID: 상성 초월 (현경급 전용)
 * ※ 뇌전(雷電)은 METAL의 상위 표현
 */
public enum Element {
    METAL,  // 금(金)
    WOOD,   // 목(木)
    EARTH,  // 토(土)
    WATER,  // 수(水)
    FIRE,   // 화(火)
    VOID,   // 무(無) - 상성 초월
    NONE;   // 속성 없음

    /**
     * 상극 대상 반환 (이 속성이 유리한 상대)
     */
    public Element getAdvantageOver() {
        return switch (this) {
            case METAL -> WOOD;
            case WOOD -> EARTH;
            case EARTH -> WATER;
            case WATER -> FIRE;
            case FIRE -> METAL;
            case VOID, NONE -> null;
        };
    }

    /**
     * 상성 배율 계산
     */
    public double getDamageMultiplier(Element defender) {
        if (this == VOID || defender == VOID || this == NONE || defender == NONE) return 1.0;
        if (this.getAdvantageOver() == defender) return 1.3;
        if (defender.getAdvantageOver() == this) return 0.7;
        return 1.0;
    }
}
