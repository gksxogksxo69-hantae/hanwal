package com.hanwol.domain.story;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MainQuestRepository extends JpaRepository<MainQuest, Integer> {
    
    // 특정 스테이지 클리어를 목표로 하는 퀘스트 찾기
    Optional<MainQuest> findByTargetStageId(Integer targetStageId);
}
