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
     * 하드코딩 제거용 핵심 API.
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

        // 유저 캐릭터가 아직 없는 경우(튜토리얼 미완료 등) → 빈 배열 반환
        if (userChars.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", true, "characters", List.of()));
        }

        List<Map<String, Object>> charList = userChars.stream().map(uc -> {
            GameCharacter gc = uc.getCharacter();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", gc.getId());
            m.put("name", gc.getName());
            m.put("title", gc.getTitle());
            m.put("role", gc.getRole());
            m.put("element", gc.getElement().name());
            m.put("level", uc.getLevel());
            m.put("imagePath", gc.getImagePath() != null ? gc.getImagePath() : "/images/portrait_male.png");
            m.put("gyeongji", uc.getCurrentGyeongji());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("success", true, "characters", charList));
    }
}
