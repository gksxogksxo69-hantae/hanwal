package com.hanwol.domain.user;

import com.hanwol.domain.enums.RouteType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true, length = 50)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Builder.Default
    @Column(nullable = false)
    private int level = 1;

    @Builder.Default
    @Column(nullable = false)
    private long exp = 0;

    @Builder.Default
    @Column(nullable = false)
    private long gold = 0;

    @Builder.Default
    @Column(nullable = false)
    private long premiumCurrency = 0;

    @Builder.Default
    @Column(nullable = false)
    private int stamina = 150;

    @Column
    private LocalDateTime lastStaminaUpdateTime;

    // --- 루트 시스템 ---
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private RouteType routeType; // 최초 선택 후 변경 불가

    @Builder.Default
    @Column(nullable = false)
    private int storyChapter = 0; // 0=프롤로그, 1~5=각 막

    // --- 파티 편성 (출진 슬롯) ---
    @Builder.Default
    @Column
    private Long partySlot1 = null;

    @Builder.Default
    @Column
    private Long partySlot2 = null;

    @Builder.Default
    @Column
    private Long partySlot3 = null;

    @Builder.Default
    @Column
    private Long partySlot4 = null;

    // --- 위치 ---
    @Builder.Default
    @Column(nullable = false)
    private int locX = 400;

    @Builder.Default
    @Column(nullable = false)
    private int locY = 300;

    @Column
    private LocalDateTime lastSyncTime;

    // --- 프로필 설정 ---
    @Column
    private Long mainCharacterId; // 로비에 표시될 대표 캐릭터 ID

    @Column
    private String profileImagePath; // 유저 프로필 이미지 경로

    // --- 튜토리얼 ---
    @Builder.Default
    @Column(nullable = false)
    private int tutorialStep = 0;

    @Builder.Default
    @Column(nullable = false)
    private boolean isTutorialCompleted = false;

    // --- 레벨 보상 수령 현황 ---
    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String claimedLevelRewards = ""; // "1,2,5,10" 형식

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // JPA 등을 위한 생성자는 유지하되 Builder는 클래스 레벨로 양도
    public User(String email, String password, String nickname) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.locX = 400;
        this.locY = 300;
        this.lastSyncTime = LocalDateTime.now();
    }

    /**
     * 루트 선택 (최초 1회만)
     */
    public void selectRoute(RouteType route) {
        if (this.routeType != null) {
            throw new IllegalStateException("루트는 한 번만 선택할 수 있습니다.");
        }
        this.routeType = route;
    }

    /**
     * 스토리 챕터 진행
     */
    public void advanceStoryChapter() {
        if (this.storyChapter >= 10) {
            throw new IllegalStateException("이미 최종 막에 도달했습니다.");
        }
        this.storyChapter++;
    }

    public void updateLocation(int x, int y, LocalDateTime syncTime) {
        this.locX = x;
        this.locY = y;
        this.lastSyncTime = syncTime;
    }

    public void selectGender(Gender gender) {
        if (this.gender != null) {
            throw new IllegalStateException("성별은 한 번만 선택할 수 있습니다.");
        }
        this.gender = gender;
    }

    public void updatePassword(String newPassword) {
        this.password = newPassword;
    }

    public void updateTutorialStep(int step) {
        this.tutorialStep = step;
    }

    public void completeTutorial() {
        this.isTutorialCompleted = true;
    }

    public long getRequiredExp() {
        if (this.level >= 60) return Long.MAX_VALUE;
        if (this.level <= 20) return this.level * 100L;
        if (this.level <= 40) return 2000L + (this.level - 20) * 500L;
        return 12000L + (this.level - 40) * 2000L;
    }

    public boolean gainExp(long amount) {
        if (this.level >= 60) return false;
        boolean leveledUp = false;
        this.exp += amount;
        while (this.level < 60 && this.exp >= getRequiredExp()) {
            this.exp -= getRequiredExp();
            this.level++;
            leveledUp = true;
        }
        return leveledUp;
    }

    public boolean isLevelRewardClaimed(int targetLevel) {
        if (this.claimedLevelRewards == null || this.claimedLevelRewards.isEmpty()) return false;
        return java.util.Arrays.asList(this.claimedLevelRewards.split(",")).contains(String.valueOf(targetLevel));
    }

    public void claimLevelReward(int targetLevel) {
        if (isLevelRewardClaimed(targetLevel)) return;
        if (this.claimedLevelRewards == null || this.claimedLevelRewards.isEmpty()) {
            this.claimedLevelRewards = String.valueOf(targetLevel);
        } else {
            this.claimedLevelRewards += "," + targetLevel;
        }
    }

    public void levelUp() {
        if (this.level < 60) {
            this.level++;
        }
    }

    public void spendGold(long amount) {
        if (this.gold < amount) {
            throw new IllegalStateException("골드가 부족합니다.");
        }
        this.gold -= amount;
    }

    public void gainGold(long amount) {
        this.gold += amount;
    }

    public void updateParty(Long slot1, Long slot2, Long slot3, Long slot4) {
        this.partySlot1 = slot1;
        this.partySlot2 = slot2;
        this.partySlot3 = slot3;
        this.partySlot4 = slot4;
    }

    public void spendGems(long amount) {
        if (this.premiumCurrency < amount) {
            throw new IllegalStateException("보석이 부족합니다.");
        }
        this.premiumCurrency -= amount;
    }

    public void gainGems(long amount) {
        this.premiumCurrency += amount;
    }

    public void updateProfile(Long mainCharacterId, String profileImagePath) {
        if (mainCharacterId != null) {
            this.mainCharacterId = mainCharacterId;
        }
        if (profileImagePath != null) {
            this.profileImagePath = profileImagePath;
        }
    }

    public int getCurrentStamina() {
        if (this.stamina >= 200) {
            // 최대치 이상이면 업데이트 불필요
            return this.stamina;
        }
        if (this.lastStaminaUpdateTime == null) {
            this.lastStaminaUpdateTime = LocalDateTime.now();
            return this.stamina;
        }
        long minutesPassed = java.time.Duration.between(this.lastStaminaUpdateTime, LocalDateTime.now()).toMinutes();
        int recovered = (int) (minutesPassed / 3);
        if (recovered > 0) {
            this.stamina = Math.min(200, this.stamina + recovered);
            // 200개 도달 시 갱신 시간을 null로 하거나, 마지막 회복 시점을 정확히 밀어줌
            if (this.stamina >= 200) {
                this.lastStaminaUpdateTime = null;
            } else {
                this.lastStaminaUpdateTime = this.lastStaminaUpdateTime.plusMinutes(recovered * 3);
            }
        }
        return this.stamina;
    }

    public void useStamina(int amount) {
        getCurrentStamina(); // 계산 후 소모
        if (this.stamina < amount) {
            throw new IllegalStateException("지령서가 부족합니다.");
        }
        // 풀피 상태에서 소모를 시작하면 타이머 가동
        if (this.stamina >= 200 && amount > 0) {
            this.lastStaminaUpdateTime = LocalDateTime.now();
        }
        this.stamina -= amount;
    }
}
