package com.hanwol.domain.enums;

/**
 * 스탯 성장 등급
 * 레벨당 성장값 = 기본값 × 배율
 */
public enum GrowthGrade {
    S(0.068),   // Lv60 시 약 ×5.0
    A(0.051),   // Lv60 시 약 ×4.0
    B(0.034),   // Lv60 시 약 ×3.0
    C(0.025),   // Lv60 시 약 ×2.5
    D(0.017);   // Lv60 시 약 ×2.0

    private final double multiplier;

    GrowthGrade(double multiplier) {
        this.multiplier = multiplier;
    }

    public double getMultiplier() { return multiplier; }

    /**
     * 기본값과 등급으로 레벨당 성장값 계산
     */
    public double calcGrowthPerLevel(int baseValue) {
        return baseValue * multiplier;
    }

    /**
     * 특정 레벨에서의 스탯값 계산
     */
    public int calcStatAtLevel(int baseValue, int level) {
        double growth = calcGrowthPerLevel(baseValue);
        return (int) Math.round(baseValue + growth * (level - 1));
    }
}
