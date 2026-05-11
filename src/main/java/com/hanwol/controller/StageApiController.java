package com.hanwol.controller;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.user.User;
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

    /**
     * 스테이지 진입 시 적 구성/보상 데이터를 내려줌
     * GET /api/stage/data?act=1&stage=3
     */
    @GetMapping("/data")
    public ResponseEntity<?> getStageData(
            @RequestParam int act,
            @RequestParam int stage) {

        // 스테이지별 적 구성 (하드코딩 → 추후 DB 이관)
        Map<String, Object> data = buildStageData(act, stage);
        return ResponseEntity.ok(Map.of("success", true, "stage", data));
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

        int act = (int) body.getOrDefault("act", 1);
        int stageNum = (int) body.getOrDefault("stage", 1);
        boolean win = (boolean) body.getOrDefault("win", false);
        int stars = (int) body.getOrDefault("stars", 1);

        if (!win) {
            return ResponseEntity.ok(Map.of("success", true, "win", false, "message", "패배..."));
        }

        // 보상 계산
        int baseGold = 200 + (act * 150) + (stageNum * 50);
        long baseExp = 50L + (act * 30L) + (stageNum * 15L);
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

        // 스토리 진행 체크 (해당 막의 마지막 스테이지 클리어 시)
        Map<String, Object> stageData = buildStageData(act, stageNum);
        boolean isBoss = "boss".equals(stageData.get("type"));
        if (isBoss && user.getStoryChapter() < act) {
            try {
                user.advanceStoryChapter();
                log.info("스토리 챕터 진행! 유저: {}, {} → {}막", user.getNickname(), act - 1, act);
            } catch (Exception ignored) {}
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

        List<UserCharacter> userChars = userCharacterRepository.findByUserIdOrderByLevelDesc(user.getId());
        
        // 최대 4명까지
        List<Map<String, Object>> partyList = userChars.stream()
                .limit(4)
                .map(uc -> {
                    GameCharacter gc = uc.getCharacter();
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", "party-" + gc.getId());
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
                    return m;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "party", partyList,
                "nickname", user.getNickname(),
                "gender", user.getGender() != null ? user.getGender().name() : "MALE"
        ));
    }

    // ─────────────── 스테이지 데이터 빌더 (추후 DB 이관 예정) ───────────────

    private Map<String, Object> buildStageData(int act, int stage) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("act", act);
        data.put("stage", stage);

        // 보스 판정 (각 막의 마지막 스테이지)
        int[] bossStages = {9, 8, 8, 9, 8}; // 1~5막 보스 스테이지 번호
        boolean isBoss = act >= 1 && act <= 5 && stage == bossStages[act - 1];
        data.put("type", isBoss ? "boss" : "normal");

        // 적 수 / 레벨 스케일링
        int enemyCount = isBoss ? 1 : Math.min(3, 1 + (stage / 3));
        int enemyLevel = (act - 1) * 10 + stage * 2;

        List<Map<String, Object>> enemies = new ArrayList<>();
        
        // 스테이지별 적 이름/스탯 생성
        String[] normalNames = {"혈교 하급무사", "혈교 수련생", "혈교 도적", "산적 낭인", "현상금 사냥꾼", "무림맹 포졸"};
        String[] bossNames = {"혈교 선봉장", "석수(石獸)", "현상금 사냥꾼 수장", "무림맹 호법", "혈교 부교주"};

        if (isBoss) {
            String bossName = act <= bossNames.length ? bossNames[act - 1] : "혈교 교주";
            Map<String, Object> boss = new LinkedHashMap<>();
            boss.put("id", "enemy-1");
            boss.put("name", bossName);
            boss.put("level", enemyLevel + 5);
            boss.put("hp", 500 + (act * 400) + (stage * 100));
            boss.put("atk", 30 + (act * 15) + (stage * 5));
            boss.put("def", 20 + (act * 10));
            boss.put("spd", 85 + (act * 5));
            boss.put("portrait", "/images/enemy_demon_cult_pursuer.png");
            enemies.add(boss);
        } else {
            for (int i = 0; i < enemyCount; i++) {
                Map<String, Object> enemy = new LinkedHashMap<>();
                enemy.put("id", "enemy-" + (i + 1));
                enemy.put("name", normalNames[(act + stage + i) % normalNames.length]);
                enemy.put("level", enemyLevel);
                enemy.put("hp", 150 + (act * 80) + (stage * 30));
                enemy.put("atk", 15 + (act * 8) + (stage * 3));
                enemy.put("def", 10 + (act * 5));
                enemy.put("spd", 80 + (stage * 2));
                enemy.put("portrait", "/images/enemy_demon_cult_pursuer.png");
                enemies.add(enemy);
            }
        }

        data.put("enemies", enemies);
        data.put("recommendedLevel", enemyLevel);
        data.put("bgImage", getBgImage(act));

        return data;
    }

    private String getBgImage(int act) {
        return switch (act) {
            case 1 -> "/images/bg_estate_fire.png";
            case 2 -> "/images/bg_cliff.png";
            case 3 -> "/images/bg_estate_peace.png";
            case 4 -> "/images/bg_main.png";
            case 5 -> "/images/bg_estate_fire.png";
            default -> "/images/bg_main.png";
        };
    }
}
