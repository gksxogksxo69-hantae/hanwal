package com.hanwol.controller;

import com.hanwol.service.QuestService;
import com.hanwol.service.StageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dungeon")
@RequiredArgsConstructor
public class DungeonApiController {

    private final StageService stageService;
    private final QuestService questService;

    /**
     * 특정 막의 스테이지 목록 조회
     */
    @GetMapping("/stages/{chapterId}")
    public ResponseEntity<?> getStages(@PathVariable Integer chapterId) {
        // TODO: 세션에서 실제 로그인 유저 ID 가져오기 (현재는 테스트용 1L)
        Long userId = 1L; 
        List<StageService.StageResponse> stages = stageService.getStagesByChapter(userId, chapterId);
        return ResponseEntity.ok(stages);
    }

    /**
     * 스테이지 진입 전 스토리 확인
     */
    @GetMapping("/check-story/{stageId}")
    public ResponseEntity<?> checkStory(@PathVariable Integer stageId) {
        Long userId = 1L;
        return stageService.getBeforeStoryId(stageId, userId)
                .map(storyId -> ResponseEntity.ok(Map.of("hasStory", true, "storyId", storyId)))
                .orElse(ResponseEntity.ok(Map.of("hasStory", false)));
    }

    /**
     * 스테이지 클리어 처리
     */
    @PostMapping("/clear/{stageId}")
    public ResponseEntity<?> clearStage(@PathVariable Integer stageId) {
        Long userId = 1L;
        // 1. 스테이지 클리어 및 퀘스트 체크
        questService.checkQuestProgress(userId, stageId);
        return ResponseEntity.ok(Map.of("success", true, "clearedStageId", stageId));
    }
}
