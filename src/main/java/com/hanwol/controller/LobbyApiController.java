package com.hanwol.controller;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import com.hanwol.domain.user.UserProgress;
import com.hanwol.domain.user.UserProgressRepository;
import com.hanwol.service.RewardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/lobby")
@RequiredArgsConstructor
public class LobbyApiController {

    private final UserRepository userRepository;
    private final UserCharacterRepository userCharacterRepository;

    private final UserProgressRepository userProgressRepository;
    private final RewardService rewardService;
    private final com.hanwol.service.CombatPowerService combatPowerService;
    private final com.hanwol.service.TutorialService tutorialService;

    @GetMapping("/my-characters")
    public ResponseEntity<?> getMyCharacters(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }

        List<UserCharacter> userChars = userCharacterRepository.findByUserIdOrderByLevelDesc(user.getId());
        
        // 보유 캐릭터가 0명이면 튜토리얼 지급이 꼬인/스킵된 계정이므로 즉시 주인공 지급
        if (userChars.isEmpty()) {
            tutorialService.grantStarterCharacter(user);
            userChars = userCharacterRepository.findByUserIdOrderByLevelDesc(user.getId());
        }

        // 보따리에는 실제 보유(UserCharacter) 캐릭터만 표시 — 미보유 시 빈 리스트
        List<Map<String, Object>> charList = userChars.stream()
                .map(uc -> buildCharMap(uc))
                .collect(Collectors.toList());

        user.getCurrentStamina(); // 지령서 갱신
        userRepository.save(user); // 갱신된 시간 저장

        List<Long> partyIds = Arrays.asList(user.getPartySlot1(), user.getPartySlot2(), user.getPartySlot3(), user.getPartySlot4());
        UserProgress progress = userProgressRepository.findById(user.getId()).orElse(new UserProgress());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("characters", charList);
        response.put("party", partyIds);
        response.put("gems", user.getPremiumCurrency());
        response.put("level", user.getLevel());
        response.put("exp", user.getExp());
        response.put("requiredExp", user.getRequiredExp());
        response.put("stamina", user.getStamina());
        response.put("maxStamina", 200);
        response.put("claimedLevelRewards", user.getClaimedLevelRewards() != null ? user.getClaimedLevelRewards() : "");
        response.put("claimedActRewards", progress.getClaimedActRewards() != null ? progress.getClaimedActRewards() : "");
        response.put("storyChapter", user.getStoryChapter());

        return ResponseEntity.ok(response);
    }


    private Map<String, Object> buildCharMap(UserCharacter uc) {
        GameCharacter gc = uc.getCharacter();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", gc.getId());
        m.put("name", gc.getName());
        m.put("title", gc.getTitle());
        m.put("role", gc.getRole());
        m.put("element", gc.getElement().name());
        m.put("rarity", uc.getEffectiveRarity().name());
        m.put("level", uc.getLevel());
        m.put("imagePath", gc.getImagePath() != null ? gc.getImagePath() : "/images/portrait_male.png");

        // 실제 계산된 스탯
        m.put("hp", uc.getEffectiveHp());
        m.put("atk", uc.getEffectiveAtk());
        m.put("def", uc.getEffectiveDef());
        m.put("spd", uc.getEffectiveSpd());
        m.put("power", combatPowerService.calculateCharacterPower(uc));
        m.put("exp", uc.getCurrentExp());
        m.put("requiredExp", uc.getRequiredExp());

        // 배경 정보
        m.put("faction", gc.getFaction());
        m.put("gender", gc.getGender());
        m.put("age", gc.getAge());
        m.put("realm", gc.getRealm());
        m.put("alignment", gc.getAlignment());
        m.put("relationships", gc.getRelationships());
        m.put("lore", gc.getLore());

        return m;
    }

    @PostMapping("/save-party")
    @Transactional
    public ResponseEntity<?> saveParty(@AuthenticationPrincipal UserDetails userDetails,
                                       @RequestBody Map<String, List<Long>> request) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        List<Long> ids = request.get("partyIds");
        if (ids != null && ids.size() >= 4) {
            user.updateParty(ids.get(0), ids.get(1), ids.get(2), ids.get(3));
            userRepository.save(user);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/claim-level-reward")
    public ResponseEntity<?> claimLevelReward(@AuthenticationPrincipal UserDetails userDetails,
                                              @RequestBody Map<String, Integer> request) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        Integer targetLevel = request.get("level");
        var result = rewardService.claimLevelReward(user.getId(), targetLevel);
        return ResponseEntity.ok(Map.of("success", result.success(), "message", result.message(), "amount", result.amount()));
    }

    @PostMapping("/claim-act-reward")
    public ResponseEntity<?> claimActReward(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestBody Map<String, Integer> request) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        Integer act = request.get("act");
        var result = rewardService.claimActReward(user.getId(), act);
        return ResponseEntity.ok(Map.of("success", result.success(), "message", result.message(), "amount", result.amount()));
    }

    @PostMapping("/profile-image")
    @Transactional
    public ResponseEntity<?> updateProfileImage(@AuthenticationPrincipal UserDetails userDetails,
                                                @RequestBody Map<String, String> request) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();
        String imagePath = request.get("imagePath");
        if (imagePath != null && !imagePath.isEmpty()) {
            user.updateProfile(null, imagePath);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/main-character")
    @Transactional
    public ResponseEntity<?> updateMainCharacter(@AuthenticationPrincipal UserDetails userDetails,
                                                 @RequestBody Map<String, Object> request) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();
        Object characterIdObj = request.get("characterId");
        if (characterIdObj != null) {
            Long characterId = Long.valueOf(String.valueOf(characterIdObj));
            user.updateProfile(characterId, null);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
}
