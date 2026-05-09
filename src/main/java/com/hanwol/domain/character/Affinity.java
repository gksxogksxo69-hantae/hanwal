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
 * 호감도 (동료 인연)
 * 합벽기 데미지 보너스 + 사이드 스토리 해금
 */
@Entity
@Table(name = "affinity", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "character_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Affinity {

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
    private int affinityLevel = 1; // 1~10

    @Column(nullable = false)
    private int affinityExp = 0;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public Affinity(User user, GameCharacter character) {
        this.user = user;
        this.character = character;
    }

    /**
     * 호감도 경험치 획득
     */
    public boolean gainAffinityExp(int amount, int requiredExp) {
        this.affinityExp += amount;
        if (this.affinityExp >= requiredExp && this.affinityLevel < 10) {
            this.affinityExp -= requiredExp;
            this.affinityLevel++;
            return true; // 인연 등급 상승
        }
        return false;
    }

    /**
     * 합벽기 데미지 보너스 (%)
     */
    public int getComboDamageBonus() {
        return switch (this.affinityLevel) {
            case 1, 2 -> 0;
            case 3, 4 -> 10;
            case 5, 6 -> 20;
            case 7, 8, 9 -> 30;
            case 10 -> 50;
            default -> 0;
        };
    }
}
