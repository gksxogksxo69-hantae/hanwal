package com.hanwol.service;

import com.hanwol.domain.story.Stage;
import com.hanwol.domain.story.StageRepository;
import com.hanwol.domain.user.UserProgress;
import com.hanwol.domain.user.UserProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StageService {

    private final StageRepository stageRepository;
    private final UserProgressRepository userProgressRepository;

    /**
     * 특정 막(Chapter)의 스테이지 목록을 유저 진행도와 함께 조회
     */
    @Transactional(readOnly = true)
    public List<StageResponse> getStagesByChapter(Long userId, Long chapterId) {
        UserProgress progress = userProgressRepository.findById(userId)
                .orElseGet(() -> createInitialProgress(userId));

        List<Stage> allStages = stageRepository.findByChapterIdOrderByStageNumAsc(chapterId);

        return allStages.stream().map(stage -> {
            boolean isCleared = stage.getId() <= progress.getMaxClearedStageId();
            // 이전 스테이지를 깼거나, 첫 스테이지면 해금
            boolean isLocked = stage.getId() > (progress.getMaxClearedStageId() + 1);

            return new StageResponse(stage, isCleared, isLocked);
        }).collect(Collectors.toList());
    }

    /**
     * 스테이지 진입 전 스토리 정보 확인
     */
    @Transactional(readOnly = true)
    public Optional<Long> getBeforeStoryId(Long stageId, Long userId) {
        // 이미 클리어한 스테이지면 스토리를 보여주지 않음 (도감에서 보게 유도)
        UserProgress progress = userProgressRepository.findById(userId).orElse(null);
        if (progress != null && stageId <= progress.getMaxClearedStageId()) {
            return Optional.empty();
        }

        return stageRepository.findById(stageId)
                .map(Stage::getStoryBeforeId)
                .filter(id -> id > 0);
    }

    private UserProgress createInitialProgress(Long userId) {
        UserProgress newProgress = UserProgress.builder()
                .userId(userId)
                .maxClearedStageId(0)
                .currentQuestId(1)
                .questStatus(UserProgress.STATUS_IN_PROGRESS)
                .build();
        UserProgress saved = userProgressRepository.save(newProgress);
        if (saved == null) throw new RuntimeException("Failed to initialize user progress");
        return saved;
    }

    // 내부 응답용 DTO
    public record StageResponse(Stage stage, boolean isCleared, boolean isLocked) {
    }
}
