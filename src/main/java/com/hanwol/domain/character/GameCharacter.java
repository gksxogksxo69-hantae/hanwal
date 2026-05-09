package com.hanwol.domain.character;

import com.hanwol.domain.enums.Element;
import com.hanwol.domain.enums.GrowthGrade;
import com.hanwol.domain.enums.RouteType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 캐릭터 마스터 데이터 (템플릿)
 * 모든 캐릭터의 기본 스탯과 성장 정보를 관리
 */
@Entity
@Table(name = "characters")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameCharacter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 200)
    private String title; // 별호

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Element element;

    @Column(nullable = false, length = 50)
    private String role; // 포지션 (딜탱, 디버퍼, 속도딜러 등)

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private RouteType routeType; // null이면 공용

    // --- 기본 스탯 (Lv.1) ---
    @Column(nullable = false)
    private int baseHp;

    @Column(nullable = false)
    private int baseAtk;

    @Column(nullable = false)
    private int baseDef;

    @Column(nullable = false)
    private int baseSpd;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal baseCritRate = new BigDecimal("5.00");

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal baseCritDmg = new BigDecimal("150.00");

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal baseEffectHitRate = BigDecimal.ZERO;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal baseEffectResist = BigDecimal.ZERO;

    // --- 성장 등급 ---
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private GrowthGrade hpGrowth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private GrowthGrade atkGrowth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private GrowthGrade defGrowth;

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal spdGrowthPerLevel = new BigDecimal("0.20");

    @Column(nullable = false, precision = 4, scale = 2)
    private BigDecimal ehrGrowthPerLevel = new BigDecimal("0.10");

    // --- 투기 보너스 ---
    @Column(length = 100)
    private String spiritBonusCondition; // 예: "ON_HIT", "ON_DEBUFF_LAND", "ON_CRIT"

    @Column(nullable = false)
    private int spiritBonusAmount = 0;

    // --- 설명 ---
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String lore;

    @Column(length = 200)
    private String imagePath;

    // --- 연관관계 ---
    @OneToMany(mappedBy = "character", fetch = FetchType.LAZY)
    private List<CharacterSkill> characterSkills = new ArrayList<>();

    /**
     * 특정 레벨에서의 HP 계산
     */
    public int calcHpAtLevel(int level) {
        return hpGrowth.calcStatAtLevel(baseHp, level);
    }

    /**
     * 특정 레벨에서의 ATK 계산
     */
    public int calcAtkAtLevel(int level) {
        return atkGrowth.calcStatAtLevel(baseAtk, level);
    }

    /**
     * 특정 레벨에서의 DEF 계산
     */
    public int calcDefAtLevel(int level) {
        return defGrowth.calcStatAtLevel(baseDef, level);
    }

    /**
     * 특정 레벨에서의 SPD 계산
     */
    public int calcSpdAtLevel(int level) {
        return (int) Math.round(baseSpd + spdGrowthPerLevel.doubleValue() * (level - 1));
    }
}
