package com.hanwol.controller;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.GameCharacterRepository;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.character.UserCharacterRepository;
import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
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

    /**
     * 로비 진입 시 유저의 보유 캐릭터 목록을 내려줌.
     * 보유 캐릭터가 없으면 마스터 데이터에서 주요 캐릭터를 내려줌(미리보기 용도).
     */
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

        // 유저 보유 캐릭터가 있으면 그걸 내려줌
        if (!userChars.isEmpty()) {
            List<Map<String, Object>> charList = userChars.stream().map(uc -> {
                GameCharacter gc = uc.getCharacter();
                return buildCharMap(gc, uc.getLevel());
            }).collect(Collectors.toList());

            List<Long> partySlots = Arrays.asList(user.getPartySlot1(), user.getPartySlot2(), user.getPartySlot3(), user.getPartySlot4());
            return ResponseEntity.ok(Map.of(
                "success", true,
                "characters", charList,
                "party", partySlots
            ));
        }

        // 보유 캐릭터 없음 → 마스터 데이터에서 이미지 있는 주요 캐릭터를 내려줌
        log.info("유저({})에게 보유 캐릭터가 없으므로 마스터 캐릭터 미리보기를 제공합니다.", user.getNickname());
        List<GameCharacter> allChars = gameCharacterRepository.findAll();
        List<Map<String, Object>> previewList = allChars.stream()
                .filter(gc -> gc.getImagePath() != null && !gc.getImagePath().contains("portrait_male"))
                .limit(5) // 로비 표시용으로 5명만
                .map(gc -> buildCharMap(gc, 1))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("success", true, "characters", previewList, "preview", true));
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

    @PostMapping("/profile-image")
    @Transactional
    public ResponseEntity<?> updateProfileImage(@AuthenticationPrincipal UserDetails userDetails,
                                                @RequestBody Map<String, String> request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }
        String imagePath = request.get("imagePath");
        if (imagePath != null && !imagePath.isEmpty()) {
            user.updateProfile(null, imagePath);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/main-character")
    @Transactional
    public ResponseEntity<?> updateMainCharacter(@AuthenticationPrincipal UserDetails userDetails,
                                                 @RequestBody Map<String, String> request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }
        Object characterIdObj = request.get("characterId");
        if (characterIdObj != null) {
            try {
                Long characterId = Long.valueOf(String.valueOf(characterIdObj));
                user.updateProfile(characterId, null);
            } catch (NumberFormatException e) {
                log.error("Invalid characterId: {}", characterIdObj);
            }
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
}
