package com.hanwol.service;

import com.hanwol.domain.story.MainQuest;
import com.hanwol.domain.story.MainQuestRepository;
import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserProgress;
import com.hanwol.domain.user.UserProgressRepository;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestService {

    private final MainQuestRepository questRepository;
    private final UserProgressRepository progressRepository;
    private final UserRepository userRepository;

    /**
     * 현재 진행 중인 퀘스트 정보 조회
     */
    @Transactional
    public Map<String, Object> getCurrentQuestInfo(Long userId) {
        UserProgress progress = getOrCreateProgress(userId);
        
        Optional<MainQuest> questOpt = questRepository.findById(progress.getCurrentQuestId());
        
        if (questOpt.isEmpty()) {
            return Map.of(
                "title", "진행 가능한 퀘스트 없음",
                "goalDesc", "모든 시련을 극복하셨습니다.",
                "status", "CLAIMED"
            );
        }

        MainQuest quest = questOpt.get();
        return Map.of(
            "id", quest.getId(),
            "title", quest.getTitle(),
            "goalDesc", quest.getGoalDesc(),
            "status", progress.getQuestStatus(),
            "rewardGold", quest.getRewardGold(),
            "rewardGems", quest.getRewardGems()
        );
    }

    @Transactional
    public boolean claimRewards(Long userId) {
        UserProgress progress = progressRepository.findById(userId).orElse(null);
        if (progress == null) return false;
        
        Integer qId = progress.getCurrentQuestId();
        if (qId == null) return false;
        
        return true;
    }

    private UserProgress getOrCreateProgress(Long userId) {
        UserProgress progress = progressRepository.findById(userId).orElse(null);
        if (progress != null) return progress;

        UserProgress newProgress = UserProgress.builder()
                .userId(userId)
                .maxClearedStageId(0)
                .currentQuestId(1) 
                .questStatus(UserProgress.STATUS_IN_PROGRESS)
                .build();
        UserProgress saved = progressRepository.save(newProgress);
        if (saved == null) throw new RuntimeException("Failed to initialize user progress");
        return saved;
    }

    /**
     * 스테이지 클리어 시 퀘스트 달성 여부 체크
     */
    @Transactional
    public void checkQuestProgress(Long userId, Integer clearedStageId) {
        UserProgress progress = getOrCreateProgress(userId);
        
        // 최고 클리어 기록 갱신
        if (clearedStageId > progress.getMaxClearedStageId()) {
            progress.setMaxClearedStageId(clearedStageId);
        }

        // 현재 퀘스트의 목표와 비교
        MainQuest currentQuest = questRepository.findById(progress.getCurrentQuestId()).orElse(null);
        if (currentQuest != null && clearedStageId >= currentQuest.getTargetStageId()) {
            if (UserProgress.STATUS_IN_PROGRESS.equals(progress.getQuestStatus())) {
                log.info("[Quest] Quest {} completed for user {}", currentQuest.getId(), userId);
                progress.setQuestStatus(UserProgress.STATUS_COMPLETED);
            }
        }
        
        progressRepository.save(progress);
    }

    /**
     * 퀘스트 보상 수령 (수동 클릭)
     */
    @Transactional
    public QuestClaimResponse claimReward(Long userId) {
        UserProgress progress = getOrCreateProgress(userId);
        
        if (!UserProgress.STATUS_COMPLETED.equals(progress.getQuestStatus())) {
            throw new IllegalStateException("보상을 수령할 수 있는 상태가 아닙니다.");
        }

        MainQuest quest = questRepository.findById(progress.getCurrentQuestId())
                .orElseThrow(() -> new IllegalStateException("Quest not found: " + progress.getCurrentQuestId()));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found: " + userId));

        // 1. 보상 지급
        user.gainGold(quest.getRewardGold());
        user.gainGems(quest.getRewardGems());

        // 2. 다음 퀘스트로 갱신
        Integer nextQuestId = quest.getId() + 1;
        boolean hasNext = questRepository.existsById(nextQuestId);

        if (hasNext) {
            progress.setCurrentQuestId(nextQuestId);
            progress.setQuestStatus(UserProgress.STATUS_IN_PROGRESS);
        } else {
            progress.setQuestStatus(UserProgress.STATUS_CLAIMED); // 모든 퀘스트 완료
        }

        progressRepository.save(progress);
        
        return new QuestClaimResponse(true, quest, nextQuestId, hasNext);
    }

    /**
     * 특정 퀘스트 ID를 강제로 완료 상태로 만듦 (예: 가챠 퀘스트)
     */
    @Transactional
    public void completeQuestById(Long userId, Integer questId) {
        UserProgress progress = getOrCreateProgress(userId);
        if (progress.getCurrentQuestId().equals(questId) && UserProgress.STATUS_IN_PROGRESS.equals(progress.getQuestStatus())) {
            progress.setQuestStatus(UserProgress.STATUS_COMPLETED);
            progressRepository.save(progress);
        }
    }

    public record QuestClaimResponse(boolean success, MainQuest completedQuest, Integer nextQuestId, boolean hasNext) {}
}
