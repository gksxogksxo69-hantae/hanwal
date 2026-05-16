package com.hanwol.domain.story;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 메인 퀘스트 마스터 엔티티 (JPA 버전)
 */
@Entity
@Table(name = "mst_main_quest")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MainQuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer targetStageId; // 목표 스테이지 ID

    @Column(nullable = false)
    private Integer chapterId;     // 소속 막

    @Column(nullable = false, length = 100)
    private String title;          // 퀘스트 제목

    @Column(nullable = false)
    private String goalDesc;       // 퀘스트 요약

    @Column(columnDefinition = "int default 0")
    private Integer rewardGems;    // 보상 보석

    @Column(columnDefinition = "int default 0")
    private Integer rewardGold;    // 보상 골드
}
