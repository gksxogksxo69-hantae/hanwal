package com.hanwol.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AccessLevel;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "character_template")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CharacterTemplate {

    @Id
    @Column(name = "template_id", length = 50)
    private String templateId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(name = "base_hp")
    private int baseHp;

    @Column(name = "base_mp")
    private int baseMp;

    @Column(name = "base_atk")
    private int baseAtk;

    @Column(name = "base_def")
    private int baseDef;

    @Column(name = "base_spd")
    private int baseSpd;

    // 다대다(M:N) 관계지만 매핑 테이블(character_skill_relation)을 통해 단방향으로 가져옴
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "character_skill_relation",
        joinColumns = @JoinColumn(name = "template_id"),
        inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private List<SkillTemplate> skills = new ArrayList<>();
}
