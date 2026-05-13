package com.hanwol.controller;

import com.hanwol.service.QuestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/quest")
@RequiredArgsConstructor
public class QuestApiController {

    private final QuestService questService;

    /**
     * 현재 진행 중인 퀘스트 정보 조회
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentQuest() {
        // TODO: 실제 유저 ID 연동
        Long userId = 1L;
        return ResponseEntity.ok(questService.getCurrentQuestInfo(userId));
    }

    /**
     * 퀘스트 보상 수령 요청
     */
    @PostMapping("/claim")
    public ResponseEntity<?> claimReward() {
        // TODO: 실제 유저 ID 연동
        Long userId = 1L;
        try {
            QuestService.QuestClaimResponse response = questService.claimReward(userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
