package com.hanwol.domain.user;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 유저 게임 진행도 엔티티 (JPA 버전)
 */
@Entity
@Table(name = "user_progress")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProgress {

    @Id
    private Long userId; // User ID와 1:1 매핑 (Primary Key로 사용)

    @Builder.Default
    @Column(columnDefinition = "int default 0")
    private Integer maxClearedStageId = 0; // 클리어한 최고 스테이지 ID

    @Builder.Default
    @Column(columnDefinition = "int default 1")
    private Integer currentQuestId = 1;    // 수행 중인 퀘스트 ID

    @Builder.Default
    @Column(length = 20, columnDefinition = "varchar(20) default 'IN_PROGRESS'")
    private String questStatus = "IN_PROGRESS";        // IN_PROGRESS, COMPLETED, CLAIMED

    @Builder.Default
    @Column(columnDefinition = "int default 1")
    private Integer towerFloor = 1;        // 무한의 탑 진행 층수

    @Builder.Default
    @Column(columnDefinition = "int default 1")
    private Integer hallStage = 1;         // 기억의 전당 진행 단계

    @Builder.Default
    @Column(columnDefinition = "int default 1")
    private Integer raidStage = 1;         // 주간 레이드 단계

    @Builder.Default
    @Column(nullable = false)
    private int skillLevelNormal = 1;

    @Builder.Default
    @Column(nullable = false)
    private int skillLevelBattle = 1;

    @Builder.Default
    @Column(nullable = false)
    private int skillLevelUltimate = 1;

    @Builder.Default
    @Column(length = 500, columnDefinition = "varchar(500) default ''")
    private String claimedActRewards = ""; // "1,2,3" 형태

    @Builder.Default
    @Column(length = 500, columnDefinition = "varchar(500) default ''")
    private String claimedLevelRewards = ""; // "5,10,15" 형태

    @Builder.Default
    @Column
    private Integer lastEventRewardStageId = 0; // 기존 15스테이지 배수 보상용

    @Builder.Default
    @Column(columnDefinition = "bigint default 0")
    private Long totalPower = 0L; // 전 계정 캐릭터 종합 전투력

    @Builder.Default
    @Column(columnDefinition = "int default 0")
    private Integer currentRank = 0; // 현재 서버 순위 (0은 순위권 밖)

    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CLAIMED = "CLAIMED";

    public boolean isRewardClaimable() {
        return STATUS_COMPLETED.equals(this.questStatus);
    }

    public boolean isActRewardClaimed(int act) {
        if (claimedActRewards == null || claimedActRewards.isEmpty()) return false;
        return java.util.Arrays.asList(claimedActRewards.split(",")).contains(String.valueOf(act));
    }

    public void claimActReward(int act) {
        if (claimedActRewards == null || claimedActRewards.isEmpty()) {
            this.claimedActRewards = String.valueOf(act);
        } else if (!isActRewardClaimed(act)) {
            this.claimedActRewards += "," + act;
        }
    }
}
