package com.hanwol.controller;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.GameCharacterRepository;
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
    private final GameCharacterRepository gameCharacterRepository;
    private final UserProgressRepository userProgressRepository;
    private final RewardService rewardService;

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
        List<Map<String, Object>> charList;

        if (!userChars.isEmpty()) {
            charList = userChars.stream().map(uc -> buildCharMap(uc.getCharacter(), uc.getLevel())).collect(Collectors.toList());
        } else {
            charList = gameCharacterRepository.findAll().stream()
                    .filter(gc -> gc.getImagePath() != null && !gc.getImagePath().contains("portrait_male"))
                    .limit(5)
                    .map(gc -> buildCharMap(gc, 1))
                    .collect(Collectors.toList());
        }

        List<Long> partyIds = Arrays.asList(user.getPartySlot1(), user.getPartySlot2(), user.getPartySlot3(), user.getPartySlot4());
        UserProgress progress = userProgressRepository.findById(user.getId()).orElse(new UserProgress());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "characters", charList,
            "party", partyIds,
            "gems", user.getPremiumCurrency(),
            "level", user.getLevel(),
            "exp", user.getExp(),
            "requiredExp", user.getRequiredExp(),
            "claimedLevelRewards", user.getClaimedLevelRewards() != null ? user.getClaimedLevelRewards() : "",
            "claimedActRewards", progress.getClaimedActRewards() != null ? progress.getClaimedActRewards() : "",
            "storyChapter", user.getStoryChapter()
        ));
    }

    private Map<String, Object> buildCharMap(GameCharacter gc, int level) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", gc.getId());
        m.put("name", gc.getName());
        m.put("title", gc.getTitle());
        m.put("role", gc.getRole());
        m.put("element", gc.getElement().name());
        m.put("rarity", gc.getRarity().name());
        m.put("level", level);
        m.put("imagePath", gc.getImagePath() != null ? gc.getImagePath() : "/images/portrait_male.png");
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
