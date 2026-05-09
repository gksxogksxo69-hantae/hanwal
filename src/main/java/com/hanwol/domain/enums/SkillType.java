package com.hanwol.domain.enums;

/**
 * 스킬 타입
 */
public enum SkillType {
    NORMAL,     // 평타 (기력+1, 투기+1)
    BATTLE,     // 전투 스킬 (기력-1, 투기+2)
    ULTIMATE,   // 궁극기 (투기-6)
    PASSIVE     // 패시브
}
