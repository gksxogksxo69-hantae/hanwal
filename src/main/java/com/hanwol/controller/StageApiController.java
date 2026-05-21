package com.hanwol.controller;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.user.GameMail;
import com.hanwol.domain.user.GameMailRepository;
import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserProgress;
import com.hanwol.domain.user.UserProgressRepository;
import com.hanwol.domain.user.UserRepository;
import com.hanwol.service.CharacterGrowthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/stage")
@RequiredArgsConstructor
public class StageApiController {

    private final UserRepository userRepository;
    private final UserCharacterRepository userCharacterRepository;
    private final CharacterGrowthService growthService;
    private final com.hanwol.domain.story.StageRepository stageRepository;
    private final com.hanwol.service.QuestService questService;
    private final UserProgressRepository userProgressRepository;
    private final GameMailRepository gameMailRepository;

    /**
     * 전체 막/스테이지 목록 및 유저 진행도 조회
     * GET /api/stage/list
     */
    @GetMapping("/list")
    public ResponseEntity<?> getStageList(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false));
        }

        UserProgress progress = userProgressRepository.findById(user.getId()).orElse(null);
        int maxClearedStageId = (progress != null && progress.getMaxClearedStageId() != null)
                ? progress.getMaxClearedStageId()
                : 0;

        List<com.hanwol.domain.story.Stage> allStages = stageRepository.findAll();
        // 삭제: sorting directly since they might be unsorted. Sort by chapterId then
        // stageNum
        allStages.sort(Comparator.comparing(com.hanwol.domain.story.Stage::getChapterId)
                .thenComparing(com.hanwol.domain.story.Stage::getStageNum));

        // 챕터별로 묶기
        Map<Long, Map<String, Object>> actsMap = new LinkedHashMap<>();

        for (com.hanwol.domain.story.Stage s : allStages) {
            long chapter = s.getChapterId();
            actsMap.putIfAbsent(chapter, new LinkedHashMap<>());
            Map<String, Object> actData = actsMap.get(chapter);

            if (chapter == 0) {
                actData.putIfAbsent("title", "프롤로그");
            } else {
                actData.putIfAbsent("title", "제 " + chapter + " 막");
            }
            actData.putIfAbsent("bg", getBgImage(chapter));
            actData.putIfAbsent("stages", new ArrayList<Map<String, Object>>());

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> stagesList = (List<Map<String, Object>>) actData.get("stages");

            Map<String, Object> stg = new LinkedHashMap<>();
            stg.put("id", s.getId());
            stg.put("name", s.getTitle());
            stg.put("stageNum", s.getStageNum());
            stg.put("desc", "권장 레벨의 적과 조우합니다.");
            
            int recLevel = (chapter == 0) ? s.getStageNum() : (int) (5 + (chapter - 1) * 15 + s.getStageNum());
            stg.put("recommendedLevel", recLevel);
            
            int displayGold = s.getRewardGold() != null ? s.getRewardGold() : (int) (100 + (chapter * 50) + (s.getStageNum() * 20));
            long displayExp = s.getRewardExp() != null ? s.getRewardExp() : 30L + (chapter * 20L) + (s.getStageNum() * 10L);
            stg.put("rewardGold", displayGold);
            stg.put("rewardExp", displayExp);

            // 상태 결정
            if (s.getId() <= maxClearedStageId) {
                stg.put("status", "cleared");
            } else if (s.getId() == maxClearedStageId + 1) {
                stg.put("status", "current");
            } else {
                stg.put("status", "locked");
            }

            // 보스 판정: 프롤로그는 5스테이지, 그 외에는 15스테이지가 보스
            boolean isBoss = (chapter == 0) ? (s.getStageNum() == 5) : (s.getStageNum() == 15);
            stg.put("type", isBoss ? "boss" : "normal");

            stagesList.add(stg);
        }

        List<Map<String, Object>> actsResponse = new ArrayList<>(actsMap.values());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "acts", actsResponse,
                "maxClearedStageId", maxClearedStageId));
    }

    /**
     * 스테이지 진입 시 적 구성/보상 데이터를 내려줌
     * GET /api/stage/data?act=1&stage=3
     */
    @GetMapping("/data")
    public ResponseEntity<?> getStageData(
            @RequestParam(required = false, defaultValue = "0") Long stageId,
            @RequestParam(required = false, defaultValue = "1") long act,
            @RequestParam(required = false, defaultValue = "1") int stage) {

        if (stageId != null && stageId > 0) {
            Optional<com.hanwol.domain.story.Stage> dbStageOpt = stageRepository.findById(stageId);
            if (dbStageOpt.isPresent()) {
                com.hanwol.domain.story.Stage dbStage = dbStageOpt.get();
                Map<String, Object> data = buildStageData(dbStage.getChapterId(), dbStage.getStageNum());
                data.put("title", dbStage.getTitle());
                data.put("id", dbStage.getId());
                // 보상은 result API에서 다시 DB에서 꺼내 쓰겠지만 클라이언트에 참고용으로 보낼 수도 있음
                data.put("rewardGold", dbStage.getRewardGold());
                data.put("rewardExp", dbStage.getRewardExp());
                return ResponseEntity.ok(Map.of("success", true, "stage", data));
            }
        }

        // stageId가 없거나 DB에서 못 찾으면 기존 하드코딩 로직(안전망)
        Map<String, Object> data = buildStageData(act, stage);
        return ResponseEntity.ok(Map.of("success", true, "stage", data));
    }

    /**
     * 스테이지 입장 (지령서 10장 차감)
     * POST /api/stage/enter
     */
    @PostMapping("/enter")
    public ResponseEntity<?> enterStage(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }

        try {
            user.useStamina(10);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * 전투 결과 제출 + 보상 지급
     * POST /api/stage/result
     */
    @PostMapping("/result")
    public ResponseEntity<?> submitResult(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false));
        }

        long stageId = ((Number) body.getOrDefault("stageId", 0)).longValue();
        long act = ((Number) body.getOrDefault("act", 1)).longValue();
        int stageNum = ((Number) body.getOrDefault("stage", 1)).intValue();
        boolean win = (boolean) body.getOrDefault("win", false);
        int stars = ((Number) body.getOrDefault("stars", 1)).intValue();

        if (!win) {
            return ResponseEntity.ok(Map.of("success", true, "win", false, "message", "패배..."));
        }

        // 보상 계산 (DB 기준 우선, 없으면 하드코딩 수식)
        int baseGold = (int) (100 + (act * 50) + (stageNum * 20));
        long baseExp = 30L + (act * 20L) + (stageNum * 10L);

        Optional<com.hanwol.domain.story.Stage> stageOpt = stageId > 0
                ? stageRepository.findById(stageId)
                : stageRepository.findByChapterIdAndStageNum(act, stageNum);

        com.hanwol.domain.story.Stage dbStage = stageOpt.orElse(null);
        if (dbStage != null) {
            // DB 값 대신 밸런싱된 하드코딩 수식을 강제로 덮어씌움
            // baseGold = dbStage.getRewardGold() != null ? dbStage.getRewardGold() : baseGold;
            // baseExp = dbStage.getRewardExp() != null ? dbStage.getRewardExp() : baseExp;
            act = dbStage.getChapterId();
            stageNum = dbStage.getStageNum();
        }

        baseGold *= stars; // 별점 보너스
        baseExp *= stars;

        // 유저 골드 지급
        user.gainGold(baseGold);
        user.gainExp(baseExp);

        // 보유 캐릭터 전원에게 경험치 지급
        List<UserCharacter> userChars = userCharacterRepository.findByUserId(user.getId());
        for (UserCharacter uc : userChars) {
            growthService.gainExp(uc.getId(), baseExp);
        }

        boolean isBoss = false;
        if (dbStage != null) {
            // DB에 데이터가 있으면 DB 기반으로 퀘스트 등 진행 업데이트
            questService.checkQuestProgress(user.getId(), dbStage.getId().intValue());

            // 스토리 챕터 업데이트 로직 (프롤로그는 5, 그 외에는 15가 보스)
            isBoss = (act == 0) ? (stageNum == 5) : (stageNum == 15);
            if (isBoss && user.getStoryChapter() == act) {
                user.advanceStoryChapter();
                
                // 프롤로그 완료 시 다이아 3000개 우편 발송
                if (act == 0) {
                    GameMail mail = GameMail.builder()
                            .user(user)
                            .title("프롤로그 완수 축하 보급품")
                            .content("프롤로그를 무사히 완수하신 것을 축하합니다! 앞으로의 무운을 빕니다.")
                            .rewardGems(3000)
                            .rewardGold(0)
                            .build();
                    gameMailRepository.save(mail);
                }
            }
        }

        userRepository.save(user);

        Map<String, Object> rewards = new LinkedHashMap<>();
        rewards.put("gold", baseGold);
        rewards.put("exp", baseExp);
        rewards.put("stars", stars);
        rewards.put("actCleared", isBoss);

        return ResponseEntity.ok(Map.of("success", true, "win", true, "rewards", rewards));
    }

    /**
     * 유저의 파티(보유 캐릭터) 전투용 데이터 반환
     * GET /api/stage/party
     */
    @GetMapping("/party")
    public ResponseEntity<?> getPartyData(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false));
        }

        // 1. 유저가 설정한 4개 슬롯의 캐릭터ID 수집
        List<Long> slotIds = Arrays.asList(
                user.getPartySlot1(),
                user.getPartySlot2(),
                user.getPartySlot3(),
                user.getPartySlot4());

        // 2. 각 슬롯에 해당하는 UserCharacter 정보를 가져옴
        List<Map<String, Object>> partyList = new ArrayList<>();
        for (int i = 0; i < slotIds.size(); i++) {
            Long charId = slotIds.get(i);
            if (charId == null)
                continue;

            Optional<UserCharacter> ucOpt = userCharacterRepository.findByUserIdAndCharacterId(user.getId(), charId);
            if (ucOpt.isPresent()) {
                UserCharacter uc = ucOpt.get();
                GameCharacter gc = uc.getCharacter();

                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", uc.getId()); // UserCharacter ID (공격 연산용 고유 ID)
                m.put("charId", gc.getId());
                m.put("name", gc.getName());
                m.put("title", gc.getTitle());
                m.put("role", gc.getRole());
                m.put("level", uc.getLevel());
                m.put("hp", uc.getEffectiveHp());
                m.put("atk", uc.getEffectiveAtk());
                m.put("def", uc.getEffectiveDef());
                m.put("spd", uc.getEffectiveSpd());
                m.put("imagePath", gc.getImagePath() != null ? gc.getImagePath() : "/images/portrait_male.png");

                // 스킬 목록
                List<Map<String, Object>> skills = gc.getCharacterSkills().stream()
                        .map(cs -> {
                            var skill = cs.getSkill();
                            Map<String, Object> sm = new LinkedHashMap<>();
                            sm.put("id", skill.getId());
                            sm.put("name", skill.getName());
                            sm.put("description", skill.getDescription());
                            sm.put("type", skill.getSkillType().name());
                            sm.put("target", skill.getTargetType().name());
                            sm.put("isUltimate", "ULTIMATE".equals(cs.getSkillSlot()));
                            sm.put("multiplier", skill.getDamageMultiplier().doubleValue());
                            sm.put("energyCost", skill.getEnergyCost());
                            sm.put("spiritCost", skill.getSpiritCost());
                            return sm;
                        }).collect(Collectors.toList());
                m.put("skills", skills);
                partyList.add(m);
            }
        }

        // 파티가 아예 비어있으면 로비와 동일하게 레벨 높은 순 4명으로 폴백 (안전장치)
        if (partyList.isEmpty()) {
            List<UserCharacter> fallbackChars = userCharacterRepository.findByUserIdOrderByLevelDesc(user.getId());
            for (int i = 0; i < Math.min(4, fallbackChars.size()); i++) {
                partyList.add(buildCharMap(fallbackChars.get(i)));
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "party", partyList,
                "nickname", user.getNickname(),
                "gender", user.getGender() != null ? user.getGender().name() : "MALE"));
    }

    private Map<String, Object> buildCharMap(UserCharacter uc) {
        GameCharacter gc = uc.getCharacter();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", uc.getId()); // UserCharacter ID
        m.put("charId", gc.getId());
        m.put("name", gc.getName());
        m.put("title", gc.getTitle());
        m.put("role", gc.getRole());
        m.put("level", uc.getLevel());
        m.put("hp", uc.getEffectiveHp());
        m.put("atk", uc.getEffectiveAtk());
        m.put("def", uc.getEffectiveDef());
        m.put("spd", uc.getEffectiveSpd());
        m.put("imagePath", gc.getImagePath() != null ? gc.getImagePath() : "/images/portrait_male.png");

        List<Map<String, Object>> skills = gc.getCharacterSkills().stream()
                .map(cs -> {
                    var skill = cs.getSkill();
                    Map<String, Object> sm = new LinkedHashMap<>();
                    sm.put("id", skill.getId());
                    sm.put("name", skill.getName());
                    sm.put("description", skill.getDescription());
                    sm.put("type", skill.getSkillType().name());
                    sm.put("target", skill.getTargetType().name());
                    sm.put("isUltimate", "ULTIMATE".equals(cs.getSkillSlot()));
                    sm.put("multiplier", skill.getDamageMultiplier().doubleValue());
                    sm.put("energyCost", skill.getEnergyCost());
                    sm.put("spiritCost", skill.getSpiritCost());
                    return sm;
                }).collect(Collectors.toList());
        m.put("skills", skills);
        return m;
    }

    // ─────────────── 스테이지 데이터 빌더 (추후 DB 이관 예정) ───────────────

    private Map<String, Object> buildStageData(long act, int stage) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("act", act);
        data.put("stage", stage);

        // 보스 판정 (프롤로그는 5, 그 외에는 15가 보스)
        boolean isBoss = (act == 0) ? (stage == 5) : (stage == 15);
        data.put("type", isBoss ? "boss" : "normal");

        // 적 수 / 레벨 스케일링
        int enemyCount = isBoss ? 1 : Math.min(3, 1 + (stage / 3));
        int enemyLevel = (act == 0) ? stage : (int) (5 + (act - 1) * 15 + stage);

        List<Map<String, Object>> enemies = new ArrayList<>();

        // 스테이지별 적 이름/스탯 생성
        String[] normalNames = { "혈교 하급무사", "혈교 수련생", "혈교 도적", "산적 낭인", "현상금 사냥꾼", "무림맹 포졸" };
        String[] bossNames = { "혈교 선봉장", "석수(石獸)", "현상금 사냥꾼 수장", "무림맹 호법", "혈교 부교주", "천마(天魔)" };

        if (isBoss) {
            String bossName = act < bossNames.length ? bossNames[(int) act] : "혈교 교주";
            Map<String, Object> boss = new LinkedHashMap<>();
            boss.put("id", "enemy-1");
            boss.put("name", bossName);
            boss.put("level", enemyLevel + 2);
            boss.put("hp", (int) (150 + (act * 100) + (stage * 30)));
            boss.put("atk", (int) (15 + (act * 5) + (stage * 2)));
            boss.put("def", (int) (10 + (act * 3)));
            boss.put("spd", (int) (85 + (act * 2)));
            boss.put("portrait", "/images/enemy_demon_cult_pursuer.png");
            enemies.add(boss);
        } else {
            for (int i = 0; i < enemyCount; i++) {
                Map<String, Object> enemy = new LinkedHashMap<>();
                enemy.put("id", "enemy-" + (i + 1));
                enemy.put("name", normalNames[(int) ((act + stage + i) % normalNames.length)]);
                enemy.put("level", enemyLevel);
                enemy.put("hp", (int) (70 + (act * 25) + (stage * 10)));
                enemy.put("atk", (int) (8 + (act * 2) + (stage * 1.5)));
                enemy.put("def", (int) (3 + (act * 1.5)));
                enemy.put("spd", 80 + (stage * 1));
                enemy.put("portrait", "/images/enemy_demon_cult_pursuer.png");
                enemies.add(enemy);
            }
        }

        data.put("enemies", enemies);
        data.put("recommendedLevel", enemyLevel);
        data.put("bgImage", getBgImage(act));

        return data;
    }

    private String getBgImage(long act) {
        int actInt = (int) act;
        return switch (actInt) {
            case 0 -> "/images/bg_estate_fire.png";
            case 1 -> "/images/bg_estate_fire.png";
            case 2 -> "/images/bg_cliff.png";
            case 3 -> "/images/bg_estate_peace.png";
            case 4 -> "/images/bg_main.png";
            case 5 -> "/images/bg_estate_fire.png";
            default -> "/images/bg_main.png";
        };
    }
}
