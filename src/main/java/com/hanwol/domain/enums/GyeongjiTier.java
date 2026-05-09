package com.hanwol.domain.enums;

/**
 * 경지 (무공 레벨 티어)
 * 레벨 캡과 스토리 진행에 의해 돌파
 */
public enum GyeongjiTier {
    SAMRYU(1, 15, 0, "삼류"),       // 삼류 Lv1~15
    IRYU(16, 25, 1, "이류"),        // 이류 Lv16~25, 1막 클리어
    ILRYU(26, 35, 2, "일류"),       // 일류 Lv26~35, 2막 클리어
    CHOILRYU(36, 45, 3, "초일류"),   // 초일류 Lv36~45, 3막 클리어
    HWAGYEONG(46, 55, 4, "화경"),    // 화경 Lv46~55, 4막 클리어
    HYEONGYEONG(56, 60, 5, "현경"); // 현경 Lv56~60, 5막 클리어

    private final int levelMin;
    private final int levelMax;
    private final int requiredChapter;
    private final String displayName;

    GyeongjiTier(int levelMin, int levelMax, int requiredChapter, String displayName) {
        this.levelMin = levelMin;
        this.levelMax = levelMax;
        this.requiredChapter = requiredChapter;
        this.displayName = displayName;
    }

    public int getLevelMin() { return levelMin; }
    public int getLevelMax() { return levelMax; }
    public int getRequiredChapter() { return requiredChapter; }
    public String getDisplayName() { return displayName; }

    /**
     * 레벨에 해당하는 경지 반환
     */
    public static GyeongjiTier fromLevel(int level) {
        for (GyeongjiTier tier : values()) {
            if (level >= tier.levelMin && level <= tier.levelMax) {
                return tier;
            }
        }
        return SAMRYU;
    }
}
