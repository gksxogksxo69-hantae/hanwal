package com.hanwol.domain.skill;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.enums.ComboRank;
import com.hanwol.domain.enums.RouteType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 합벽기 (두 캐릭터의 합동 궁극기)
 */
@Entity
@Table(name = "combo_skills")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ComboSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RouteType routeType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "char_a_id", nullable = false)
    private GameCharacter characterA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "char_b_id", nullable = false)
    private GameCharacter characterB;

    @Column(nullable = false, length = 100)
    private String comboName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ComboRank comboRank;

    @Column(name = "spirit_cost_a", nullable = false)
    private int spiritCostA = 6;

    @Column(name = "spirit_cost_b", nullable = false)
    private int spiritCostB = 6;

    @Column(nullable = false)
    private int requiredChapter;

    @Column(length = 50)
    private String elementFusion; // 예: 용암, 동결독

    @Column(nullable = false, columnDefinition = "JSON")
    private String effectJson;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
