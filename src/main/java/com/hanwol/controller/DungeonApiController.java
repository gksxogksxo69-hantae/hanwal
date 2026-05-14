package com.hanwol.controller;

import com.hanwol.service.QuestService;
import com.hanwol.service.StageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dungeon")
@RequiredArgsConstructor
public class DungeonApiController {

    private final StageService stageService;
    private final QuestService questService;
    private final UserRepository userRepository;

    private Long getUserIdOrThrow(UserDetails userDetails) {
        if (userDetails == null) return null;
        return userRepository.findByEmail(userDetails.getUsername())
                .map(User::getId)
                .orElse(null);
    }

    /**
     * 특정 막의 스테이지 목록 조회
     */
    @GetMapping("/stages/{chapterId}")
    public ResponseEntity<?> getStages(@PathVariable Long chapterId, @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdOrThrow(userDetails);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        
        List<StageService.StageResponse> stages = stageService.getStagesByChapter(userId, chapterId);
        return ResponseEntity.ok(stages);
    }

    /**
     * 스테이지 진입 전 스토리 확인
     */
    @GetMapping("/check-story/{stageId}")
    public ResponseEntity<?> checkStory(@PathVariable Long stageId, @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdOrThrow(userDetails);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        return stageService.getBeforeStoryId(stageId, userId)
                .map(storyId -> ResponseEntity.ok(Map.of("hasStory", true, "storyId", storyId)))
                .orElse(ResponseEntity.ok(Map.of("hasStory", false)));
    }

    /**
     * 스테이지 클리어 처리
     */
    @PostMapping("/clear/{stageId}")
    public ResponseEntity<?> clearStage(@PathVariable Long stageId, @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdOrThrow(userDetails);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        // 1. 스테이지 클리어 및 퀘스트 체크
        questService.checkQuestProgress(userId, stageId.intValue());
        return ResponseEntity.ok(Map.of("success", true, "clearedStageId", stageId));
    }
}
