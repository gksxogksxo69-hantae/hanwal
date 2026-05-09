package com.hanwol.domain.skill;

import com.hanwol.domain.enums.Element;
import com.hanwol.domain.enums.ScalingStat;
import com.hanwol.domain.enums.SkillType;
import com.hanwol.domain.enums.TargetType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 스킬 마스터 데이터
 * MP 제거 → SP 시스템(기력/투기) 기반
 */
@Entity
@Table(name = "skills")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SkillType skillType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TargetType targetType;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Element element;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private ScalingStat scalingStat = ScalingStat.ATK;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal damageMultiplier = BigDecimal.ONE;

    // --- SP 시스템 ---
    @Column(nullable = false)
    private int energyCost = 0; // 기력 변동 (평타:+1→-1로 표기, 스킬:-1)

    @Column(nullable = false)
    private int spiritGain = 0; // 투기 획득 (평타:1, 스킬:2)

    @Column(nullable = false)
    private int spiritCost = 0; // 투기 소모 (궁극기:6)

    // --- 디버프/버프 효과 ---
    @Column(columnDefinition = "JSON")
    private String effectJson; // 상세 효과 (빙결, 화상, 출혈 등)

    @Column(length = 100)
    private String animationKey;

    @Column(length = 200)
    private String iconPath;
}
