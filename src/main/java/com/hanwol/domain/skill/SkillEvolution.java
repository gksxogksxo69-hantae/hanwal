package com.hanwol.domain.skill;

import com.hanwol.domain.enums.RouteType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 스킬 진화 매핑 (스토리 진행에 따라 스킬이 진화)
 * 예: 36계 줄랑랑 → 창궁대연보 (1막 클리어 시)
 */
@Entity
@Table(name = "skill_evolutions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SkillEvolution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "before_skill_id", nullable = false)
    private Skill beforeSkill;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "after_skill_id", nullable = false)
    private Skill afterSkill;

    @Column(nullable = false)
    private int requiredChapter; // 해금 스토리 막 (1~5)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RouteType routeType; // CHUN, SULHWA, 또는 공용은 null

    @Column(columnDefinition = "TEXT")
    private String eventDescription; // 진화 서사
}
