package com.hanwol.domain.story;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StageRepository extends JpaRepository<Stage, Long> {
    
    // 특정 막의 스테이지 목록을 순서대로 가져옴
    List<Stage> findByChapterIdOrderByStageNumAsc(Long chapterId);

    // 막과 내부 번호로 특정 스테이지 찾기
    Optional<Stage> findByChapterIdAndStageNum(Long chapterId, Integer stageNum);
}
