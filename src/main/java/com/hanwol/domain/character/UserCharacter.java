package com.hanwol.domain.character;

import com.hanwol.domain.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 유저가 보유한 캐릭터 인스턴스
 * 캐릭터 마스터(GameCharacter) + 유저별 레벨/경험치/장비 상태
 */
@Entity
@Table(name = "user_characters")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserCharacter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    private GameCharacter character;

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private long currentExp = 0;

    @Column(nullable = false, length = 20)
    private String currentGyeongji = "SAMRYU"; // 현재 경지

    // 원신식 돌파 (0~6)
    @Column(nullable = false)
    private int breakthrough = 0;

    // 스킬 레벨 (무공 수련)
    @Column(nullable = false)
    private int skillLevelNormal = 1;

    @Column(nullable = false)
    private int skillLevelBattle = 1;

    @Column(nullable = false)
    private int skillLevelUltimate = 1;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public UserCharacter(User user, GameCharacter character) {
        this.user = user;
        this.character = character;
    }

    /**
     * 경험치 획득 및 레벨업 처리
     */
    public boolean gainExp(long amount, long requiredExpForNextLevel) {
        this.currentExp += amount;
        if (this.currentExp >= requiredExpForNextLevel) {
            this.currentExp -= requiredExpForNextLevel;
            this.level++;
            return true; // 레벨업 발생
        }
        return false;
    }

    /**
     * 경지 돌파
     */
    public void breakthroughGyeongji(String newGyeongji) {
        this.currentGyeongji = newGyeongji;
    }

    /**
     * 캐릭터 중복 획득 시 돌파 (최대 6돌파)
     * @return 6돌파 초과 여부 (초과 시 다른 재화로 변환하기 위함)
     */
    public boolean addBreakthrough() {
        if (this.breakthrough >= 6) {
            return false; // 이미 풀돌파 상태
        }
        this.breakthrough++;
        return true;
    }

    /**
     * 현재 레벨에서의 실제 HP
     */
    public int getEffectiveHp() {
        return character.calcHpAtLevel(this.level);
    }

    public int getEffectiveAtk() {
        return character.calcAtkAtLevel(this.level);
    }

    public int getEffectiveDef() {
        return character.calcDefAtLevel(this.level);
    }

    public int getEffectiveSpd() {
        return character.calcSpdAtLevel(this.level);
    }
}
