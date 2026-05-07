package com.hanwol.service;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TutorialService {

    private final UserRepository userRepository;

    /**
     * 튜토리얼 진행 상태 조회
     */
    @Transactional(readOnly = true)
    public User getTutorialStatus(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
    }

    /**
     * 튜토리얼 단계 완료 처리
     * - step 1: 성별 선택 (AuthService에서 처리)
     * - step 2: 프롤로그 컷신 완료
     * - step 3: 튜토리얼 전투 완료 (추후 확장)
     * - step 4: 초보자 가챠 완료 (추후 확장)
     * - step 5: 마을 도착 → 튜토리얼 최종 완료
     */
    @Transactional
    public void completeStep(Long userId, int step) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        // 이미 완료한 단계보다 낮은 단계는 무시 (중복 요청 방어)
        if (step <= user.getTutorialStep()) {
            return;
        }

        // 단계 순서 검증: 이전 단계를 건너뛸 수 없음
        // (스킵 기능을 위해 step 2 직접 완료는 허용)
        user.updateTutorialStep(step);

        // step 5 이상이면 튜토리얼 최종 완료
        if (step >= 5) {
            user.completeTutorial();
        }
    }

    /**
     * 프롤로그 스킵 (바로 step 2 완료로 처리)
     */
    @Transactional
    public void skipPrologue(Long userId) {
        completeStep(userId, 2);
    }
}
