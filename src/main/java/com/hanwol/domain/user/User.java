package com.hanwol.domain.user;

import com.hanwol.domain.enums.RouteType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
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

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private long exp = 0;

    @Column(nullable = false)
    private long gold = 0;

    @Column(nullable = false)
    private long premiumCurrency = 0;

    // --- 루트 시스템 ---
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private RouteType routeType; // 최초 선택 후 변경 불가

    @Column(nullable = false)
    private int storyChapter = 0; // 0=프롤로그, 1~5=각 막

    // --- 파티 편성 (출진 슬롯) ---
    @Column
    private Long partySlot1;

    @Column
    private Long partySlot2;

    @Column
    private Long partySlot3;

    @Column
    private Long partySlot4;

    // --- 위치 ---
    @Column(nullable = false)
    private int locX = 400;

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
    @Column(nullable = false)
    private int tutorialStep = 0;

    @Column(nullable = false)
    private boolean isTutorialCompleted = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
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
        if (this.storyChapter >= 5) {
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

    public void gainExp(long amount) {
        this.exp += amount;
    }

    public void levelUp() {
        this.level++;
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
}
