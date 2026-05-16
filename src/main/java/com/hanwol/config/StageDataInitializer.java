package com.hanwol.config;

import com.hanwol.domain.story.Stage;
import com.hanwol.domain.story.StageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class StageDataInitializer implements CommandLineRunner {

    private final StageRepository stageRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 이미 스테이지가 다 생성되어 있다면 패스! (중복 인서트 방지)
        if (stageRepository.count() > 5) {
            log.info("[StageInitializer] 이미 마스터 데이터가 존재하여 자동 생성을 패스합니다.");
            return;
        }

        log.info("[StageInitializer] 2막~8막 던전 스케일 확장 데이터 자동 빌드를 시작합니다.");

        // 2막부터 8막까지 루프
        for (int chapter = 2; chapter <= 8; chapter++) {
            // 막당 15스테이지 생성
            for (int stageNum = 1; stageNum <= 15; stageNum++) {
                // 고유 ID 생성 규칙 (예: 2막 1스테이지 = 201, 8막 15스테이지 = 815)
                long stageId = (chapter * 100) + stageNum;

                // 밸런스공식: 막과 스테이지가 올라갈수록 골드와 경험치 보상이 동적으로 스케일링됨
                int rewardGold = (chapter * 200) + (stageNum * 20);
                int rewardExp = (chapter * 100) + (stageNum * 10);

                Stage stage = Stage.builder()
                        .id(stageId)
                        .chapterId((long) chapter)
                        .stageNum(stageNum)
                        .title(chapter + "막 " + stageNum + "장: 어둠의 흔적")
                        .storyBeforeId(0L)
                        .storyAfterId(0L)
                        .monsterGroupId(100L + stageId) // 몬스터 그룹 ID도 동적 매핑
                        .rewardGold(rewardGold)
                        .rewardExp(rewardExp)
                        .build();

                stageRepository.save(stage);
            }
        }
        log.info("[StageInitializer] 총 105개의 신규 확장 스테이지 빌드가 성공적으로 완료되었습니다!");
    }
}