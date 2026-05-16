package com.hanwol.service;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.GameCharacterRepository;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TutorialService {

    private final UserRepository userRepository;
    private final GameCharacterRepository gameCharacterRepository;
    private final UserCharacterRepository userCharacterRepository;

    @Transactional(readOnly = true)
    public User getTutorialStatus(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
    }

    /**
     * 튜토리얼 단계 완료 처리
     * - step 3: 튜토리얼 전투 완료 → 주인공 캐릭터 자동 지급
     * - step 5: 튜토리얼 최종 완료
     */
    @Transactional
    public void completeStep(Long userId, int step) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        if (step <= user.getTutorialStep()) {
            return; // 중복 요청 방어
        }

        user.updateTutorialStep(step);

        // 튜토리얼 전투 완료 시 → 주인공 캐릭터 자동 지급
        if (step >= 3) {
            grantStarterCharacter(user);
        }

        // step 5 이상이면 튜토리얼 최종 완료
        if (step >= 5) {
            user.completeTutorial();
            // 스토리 챕터 1 해금
            if (user.getStoryChapter() < 1) {
                user.advanceStoryChapter();
            }
            // 초보자 골드 지급
            user.gainGold(5000);
            log.info("튜토리얼 최종 완료! 유저: {}, 골드 5000 지급", user.getNickname());
        }
    }

    /**
     * 주인공 캐릭터 자동 지급
     * MALE → 남궁천(id=1), FEMALE → 남궁설화(id=2)
     */
    private void grantStarterCharacter(User user) {
        Long charId = "FEMALE".equals(user.getGender() != null ? user.getGender().name() : "MALE") ? 2L : 1L;

        // 이미 보유 중인지 확인 (중복 지급 방어)
        if (userCharacterRepository.existsByUserIdAndCharacterId(user.getId(), charId)) {
            log.info("이미 주인공 캐릭터를 보유 중입니다. (userId={}, charId={})", user.getId(), charId);
            return;
        }

        GameCharacter starterChar = gameCharacterRepository.findById(charId).orElse(null);
        if (starterChar == null) {
            log.error("주인공 캐릭터 마스터 데이터가 없습니다! (charId={})", charId);
            return;
        }

        UserCharacter uc = UserCharacter.builder()
                .user(user)
                .character(starterChar)
                .build();
        userCharacterRepository.save(uc);

        log.info("주인공 캐릭터 지급 완료! 유저: {}, 캐릭터: {}", user.getNickname(), starterChar.getName());
    }

    @Transactional
    public void skipPrologue(Long userId) {
        completeStep(userId, 2);
    }
}
