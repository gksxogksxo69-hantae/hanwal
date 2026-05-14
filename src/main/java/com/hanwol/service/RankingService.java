package com.hanwol.service;

import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.user.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RankingService {

    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;
    private final UserCharacterRepository userCharacterRepository;
    private final CombatPowerService combatPowerService;
    private final GameMailRepository gameMailRepository;

    /**
     * 무림 서열 갱신 (2시간마다 실행)
     */
    @Scheduled(fixedRate = 7200000)
    @Transactional
    public void updateRankings() {
        log.info("무림 서열 갱신 시작: {}", LocalDateTime.now());

        List<User> users = userRepository.findAll();
        for (User user : users) {
            List<UserCharacter> characters = userCharacterRepository.findByUserId(user.getId());
            long totalPower = combatPowerService.calculateTotalAccountPower(characters);

            UserProgress progress = userProgressRepository.findById(user.getId())
                    .orElseGet(() -> UserProgress.builder().userId(user.getId()).build());
            
            if (progress != null) {
                progress.setTotalPower(totalPower);
                userProgressRepository.save(progress);
            }
        }

        // 전체 순위 업데이트 (전투력 내림차순)
        List<UserProgress> allRanked = userProgressRepository.findAllByOrderByTotalPowerDesc();
        for (int i = 0; i < allRanked.size(); i++) {
            UserProgress up = allRanked.get(i);
            up.setCurrentRank(i + 1);
            userProgressRepository.save(up);
        }

        log.info("무림 서열 갱신 완료: 총 {} 명 집계", allRanked.size());
    }

    /**
     * 주간 랭킹 보상 발송 (매주 월요일 00:00)
     */
    @Scheduled(cron = "0 0 0 * * MON")
    @Transactional
    public void sendWeeklyRewards() {
        log.info("주간 랭킹 보상 발송 시작: {}", LocalDateTime.now());

        List<UserProgress> topUsers = userProgressRepository.findTop100ByOrderByTotalPowerDesc();
        
        for (UserProgress up : topUsers) {
            int rank = up.getCurrentRank();
            int gems = calculateRankGems(rank);

            Long uId = up.getUserId();
            if (uId == null) continue;
            
            User user = userRepository.findById(uId).orElse(null);
            if (user != null && gems > 0) {
                GameMail mail = GameMail.builder()
                        .user(user)
                        .title("주간 무림 서열 보상 안내")
                        .content(String.format("대협의 지난주 서열은 %d위였습니다. 연맹에서 보내는 보상(보석 %d개)을 확인하십시오.", rank, gems))
                        .rewardGems(gems)
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                gameMailRepository.save(mail);
            }
        }
        log.info("주간 랭킹 보상 발송 완료");
    }

    private int calculateRankGems(int rank) {
        if (rank == 1) return 3000;
        if (rank <= 3) return 2000;
        if (rank <= 10) return 1000;
        if (rank <= 30) return 500;
        if (rank <= 100) return 300;
        return 0;
    }

    /**
     * 상위 100명의 랭킹 정보를 DTO로 반환
     */
    @Transactional(readOnly = true)
    public List<RankingDto> getTop100() {
        return userProgressRepository.findTop100ByOrderByTotalPowerDesc().stream()
                .map(up -> {
                    Long uId = up.getUserId();
                    if (uId == null) return null;
                    
                    User user = userRepository.findById(uId).orElse(null);
                    String portrait = "/images/portrait_male.png"; // 기본값
                    
                    if (user != null) {
                        if (user.getProfileImagePath() != null) {
                            portrait = user.getProfileImagePath();
                        } else if (user.getMainCharacterId() != null) {
                            UserCharacter uc = userCharacterRepository.findById(user.getMainCharacterId()).orElse(null);
                            if (uc != null) portrait = uc.getCharacter().getImagePath();
                        }
                    }

                    return new RankingDto(
                        up.getCurrentRank(),
                        user != null ? user.getNickname() : "알 수 없는 유저",
                        up.getTotalPower(),
                        portrait
                    );
                })
                .collect(Collectors.toList());
    }

    public record RankingDto(int rank, String nickname, long power, String portrait) {}
}
