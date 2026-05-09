package com.hanwol.service;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StoryProgressionService {

    private final UserRepository userRepository;

    /**
     * 스토리 막 클리어 및 다음 챕터로 진행
     */
    @Transactional
    public void clearCurrentChapter(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        int previousChapter = user.getStoryChapter();
        user.advanceStoryChapter();
        int newChapter = user.getStoryChapter();

        log.info("유저 [{}] 스토리 진행: {}막 -> {}막", user.getNickname(), previousChapter, newChapter);
        
        // TODO: 챕터 클리어에 따른 기본 보상 지급 로직 (영석, 재화 등)
    }
}
