package com.hanwol.service;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserProgress;
import com.hanwol.domain.user.UserProgressRepository;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;

@Slf4j
@Service
@RequiredArgsConstructor
public class RewardService {

    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;

    /**
     * 레벨 보상 수령 가능 여부 확인 및 지급
     */
    @Transactional
    public RewardResult claimLevelReward(Long userId, int targetLevel) {
        if (userId == null) throw new IllegalArgumentException("User ID must not be null");
        User user = userRepository.findById(userId).orElseThrow();
        UserProgress progress = userProgressRepository.findById(userId).orElseThrow();

        if (user.getLevel() < targetLevel) {
            return new RewardResult(false, "아직 해당 레벨에 도달하지 못했습니다.");
        }

        if (isAlreadyClaimed(progress.getClaimedLevelRewards(), targetLevel)) {
            return new RewardResult(false, "이미 수령한 보상입니다.");
        }

        // 보상 계산
        int gems = 100;
        if (targetLevel % 10 == 0) {
            gems = 1000;
        } else if (targetLevel % 5 == 0) {
            gems = 500;
        }

        user.gainGems(gems); // User 엔티티에 gainGems 메소드가 있음
        
        // 수령 기록 저장
        String newRewards = progress.getClaimedLevelRewards();
        if (newRewards == null || newRewards.isEmpty()) {
            newRewards = String.valueOf(targetLevel);
        } else {
            newRewards += "," + targetLevel;
        }
        progress.setClaimedLevelRewards(newRewards);

        userRepository.save(user);
        userProgressRepository.save(progress);

        return new RewardResult(true, gems + " 다이아를 수령했습니다!", gems);
    }

    /**
     * 모험 진척도 (막 클리어) 보상 수령
     */
    @Transactional
    public RewardResult claimActReward(Long userId, int act) {
        if (userId == null) throw new IllegalArgumentException("User ID must not be null");
        User user = userRepository.findById(userId).orElseThrow();
        UserProgress progress = userProgressRepository.findById(userId).orElseThrow();

        // 현재 스토리 챕터(act) 확인 (User 엔티티의 storyChapter 또는 UserProgress의 로직 활용)
        // StageApiController 로직에 따르면 user.getStoryChapter()가 클리어한 '막'을 의미함
        if (user.getStoryChapter() < act) {
            return new RewardResult(false, "아직 " + act + "막을 클리어하지 못했습니다.");
        }

        if (isAlreadyClaimed(progress.getClaimedActRewards(), act)) {
            return new RewardResult(false, "이미 수령한 보상입니다.");
        }

        int gems = 1500;
        user.gainGems(gems);

        String newRewards = progress.getClaimedActRewards();
        if (newRewards == null || newRewards.isEmpty()) {
            newRewards = String.valueOf(act);
        } else {
            newRewards += "," + act;
        }
        progress.setClaimedActRewards(newRewards);

        userRepository.save(user);
        userProgressRepository.save(progress);

        return new RewardResult(true, act + "막 클리어 보상 1500 다이아를 수령했습니다!", gems);
    }

    private boolean isAlreadyClaimed(String claimedStr, int target) {
        if (claimedStr == null || claimedStr.isEmpty()) return false;
        return Arrays.asList(claimedStr.split(",")).contains(String.valueOf(target));
    }

    public record RewardResult(boolean success, String message, int amount) {
        public RewardResult(boolean success, String message) {
            this(success, message, 0);
        }
    }
}
