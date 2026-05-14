package com.hanwol.domain.story;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 던전 스테이지 마스터 엔티티 (JPA 확장 연동 버전)
 */
@Entity
@Table(name = "mst_stage")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Stage {

    @Id
    // 💥 [수정 1] @GeneratedValue(IDENTITY) 걷어냄!
    // 기획적인 고유 코드 ID(예: 201, 815)를 수동으로 강제 매핑하기 위해 전략 제거.
    // [수정 2] Initializer의 규칙과 안전하게 매핑되도록 타입을 Long으로 승격!
    private Long id;

    @Column(nullable = false)
    private Long chapterId; // 💥 [수정 3] Long 타입 일치 작업 (막: Chapter 1, 2...)

    @Column(nullable = false)
    private Integer stageNum; // 막 내 순서 (1~15)

    @Column(nullable = false, length = 100)
    private String title; // 스테이지 명칭

    @Column(columnDefinition = "int default 0")
    private Long storyBeforeId; // 전투 시작 전 출력할 스토리 ID (0이면 없음)

    @Column(columnDefinition = "int default 0")
    private Long storyAfterId; // 전투 종료 후 출력할 스토리 ID (0이면 없음)

    private Long monsterGroupId; // 몬스터 구성 ID

    @Column(columnDefinition = "int default 0")
    private Integer rewardGold; // 클리어 골드 보상

    @Column(columnDefinition = "int default 0")
    private Integer rewardExp; // 클리어 경험치 보상

    public boolean hasBeforeStory() {
        return storyBeforeId != null && storyBeforeId > 0;
    }

    public boolean hasAfterStory() {
        return storyAfterId != null && storyAfterId > 0;
    }
}