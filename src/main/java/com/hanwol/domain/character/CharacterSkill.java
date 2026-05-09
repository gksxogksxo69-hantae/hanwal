package com.hanwol.domain.character;

import com.hanwol.domain.skill.Skill;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 캐릭터-스킬 매핑 (어떤 캐릭터가 어떤 스킬을 어떤 슬롯에 보유하는지)
 */
@Entity
@Table(name = "character_skills")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CharacterSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    private GameCharacter character;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(nullable = false, length = 20)
    private String skillSlot; // NORMAL, BATTLE, BATTLE2, ULTIMATE, PASSIVE

    @Column(length = 20)
    private String requiredGyeongji; // 해금 필요 경지 (예: CHOILRYU)
}
