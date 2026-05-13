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

    @Column(columnDefinition = "int default 0")
    private Integer maxClearedStageId; // 클리어한 최고 스테이지 ID

    @Column(columnDefinition = "int default 1")
    private Integer currentQuestId;    // 수행 중인 퀘스트 ID

    @Column(length = 20, columnDefinition = "varchar(20) default 'IN_PROGRESS'")
    private String questStatus;        // IN_PROGRESS, COMPLETED, CLAIMED

    public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CLAIMED = "CLAIMED";

    public boolean isRewardClaimable() {
        return STATUS_COMPLETED.equals(this.questStatus);
    }
}
