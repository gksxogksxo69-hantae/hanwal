package com.hanwol.service;

import com.hanwol.domain.character.Affinity;
import com.hanwol.domain.character.AffinityRepository;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.enums.GyeongjiTier;
import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CharacterGrowthService {

    private final UserRepository userRepository;
    private final UserCharacterRepository userCharacterRepository;
    private final AffinityRepository affinityRepository;

    /**
     * 경험치 획득 및 레벨업 (전투 종료 시 호출)
     */
    @Transactional
    public void gainExp(Long userCharacterId, long expAmount) {
        UserCharacter uc = userCharacterRepository.findById(userCharacterId)
                .orElseThrow(() -> new IllegalArgumentException("캐릭터를 찾을 수 없습니다."));

        int currentLevel = uc.getLevel();
        long requiredExp = calculateRequiredExp(currentLevel);

        boolean leveledUp = uc.gainExp(expAmount, requiredExp);

        if (leveledUp) {
            log.info("캐릭터 레벨업! {} (Lv.{} -> Lv.{})", uc.getCharacter().getName(), currentLevel, uc.getLevel());
            // 레벨업에 따른 자동 경지 돌파 체크 (선택사항)
            checkAutoBreakthrough(uc);
        }
    }

    /**
     * 수동 경지 돌파 (돌파석 등 재화 소모 로직 포함 가능)
     */
    @Transactional
    public void breakthroughGyeongji(Long userCharacterId) {
        UserCharacter uc = userCharacterRepository.findById(userCharacterId)
                .orElseThrow(() -> new IllegalArgumentException("캐릭터를 찾을 수 없습니다."));
        User user = uc.getUser();

        GyeongjiTier currentTier = GyeongjiTier.valueOf(uc.getCurrentGyeongji());
        int nextTierOrder = currentTier.ordinal() + 1;

        if (nextTierOrder >= GyeongjiTier.values().length) {
            throw new IllegalStateException("이미 최고 경지(현경)에 도달했습니다.");
        }

        GyeongjiTier nextTier = GyeongjiTier.values()[nextTierOrder];

        // 1. 레벨 조건 검증
        if (uc.getLevel() < nextTier.getLevelMin()) {
            throw new IllegalStateException(nextTier.getDisplayName() + " 돌파를 위해 Lv." + nextTier.getLevelMin() + "이 필요합니다.");
        }

        // 2. 스토리 조건 검증
        if (user.getStoryChapter() < nextTier.getRequiredChapter()) {
            throw new IllegalStateException(nextTier.getDisplayName() + " 돌파를 위해 스토리 " + nextTier.getRequiredChapter() + "막 클리어가 필요합니다.");
        }

        // TODO: 돌파 재화 소모 로직 추가

        uc.breakthroughGyeongji(nextTier.name());
        log.info("경지 돌파! {} -> {}", currentTier.getDisplayName(), nextTier.getDisplayName());
    }

    /**
     * 호감도 상승 (선물하기, 대화 등)
     */
    @Transactional
    public void gainAffinity(Long userId, Long characterId, int affinityAmount) {
        Affinity affinity = affinityRepository.findByUserIdAndCharacterId(userId, characterId)
                .orElseThrow(() -> new IllegalArgumentException("보유하지 않은 캐릭터이거나 인연 정보가 없습니다."));

        int requiredExp = calculateRequiredAffinityExp(affinity.getAffinityLevel());
        boolean leveledUp = affinity.gainAffinityExp(affinityAmount, requiredExp);

        if (leveledUp) {
            log.info("{} 캐릭터와의 인연 레벨업! (현재 Lv.{})", affinity.getCharacter().getName(), affinity.getAffinityLevel());
        }
    }

    // 경험치 공식: 100 + (level × 30) + (level² × 5)
    private long calculateRequiredExp(int level) {
        return 100 + (level * 30L) + ((long) level * level * 5);
    }

    // 호감도 경험치 공식: 레벨당 1000 고정 (예시)
    private int calculateRequiredAffinityExp(int level) {
        return 1000 * level; 
    }

    private void checkAutoBreakthrough(UserCharacter uc) {
        GyeongjiTier calculatedTier = GyeongjiTier.fromLevel(uc.getLevel());
        GyeongjiTier currentTier = GyeongjiTier.valueOf(uc.getCurrentGyeongji());

        // 레벨이 해당 경지 범위에 들어갔고, 스토리를 만족했다면 자동 진급 (또는 알림만 줄 수 있음)
        if (calculatedTier.ordinal() > currentTier.ordinal() && 
            uc.getUser().getStoryChapter() >= calculatedTier.getRequiredChapter()) {
            // 이 게임에서는 수동 돌파로 기획했으므로 여기서는 로그만 찍거나 UI 알림용 플래그를 세팅
            log.info("돌파 가능 상태 도달: {}", calculatedTier.getDisplayName());
        }
    }
}
