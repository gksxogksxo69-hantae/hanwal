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

@Slf4j
@RestController
@RequestMapping("/api/gacha")
@RequiredArgsConstructor
public class GachaApiController {

    private final UserRepository userRepository;
    private final GameCharacterRepository gameCharacterRepository;
    private final UserCharacterRepository userCharacterRepository;

    private static final int COST_SINGLE = 150;
    private static final int COST_MULTI = 1500;
    private static final int REWARD_GEM_LIMIT_BREAK = 15; // 6돌 이상 시 보상

    @PostMapping("/draw")
    @Transactional
    public ResponseEntity<?> drawGacha(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "1") int count) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }

        int cost = count == 10 ? COST_MULTI : COST_SINGLE;
        if (user.getPremiumCurrency() < cost) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Not enough gems"));
        }

        user.spendGems(cost);

        List<GameCharacter> pool = gameCharacterRepository.findAll();
        if (pool.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Gacha pool is empty"));
        }

        Random random = new Random();
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            GameCharacter drawn = pool.get(random.nextInt(pool.size()));
            
            // 기존 획득 여부 검사
            Optional<UserCharacter> existingOpt = userCharacterRepository.findByUserIdAndCharacterId(user.getId(), drawn.getId());
            boolean isNew = false;
            boolean isOverflow = false;
            int breakthroughBefore = 0;
            int breakthroughAfter = 0;

            if (existingOpt.isEmpty()) {
                // 신규 획득
                UserCharacter newChar = UserCharacter.builder()
                        .user(user)
                        .character(drawn)
                        .build();
                userCharacterRepository.save(newChar);
                isNew = true;
            } else {
                // 중복 획득
                UserCharacter existing = existingOpt.get();
                breakthroughBefore = existing.getBreakthrough();
                
                boolean canBreakthrough = existing.addBreakthrough();
                if (!canBreakthrough) {
                    // 6돌 초과
                    isOverflow = true;
                    user.gainGems(REWARD_GEM_LIMIT_BREAK);
                }
                breakthroughAfter = existing.getBreakthrough();
            }

            Map<String, Object> resMap = new LinkedHashMap<>();
            resMap.put("id", drawn.getId());
            resMap.put("name", drawn.getName());
            resMap.put("title", drawn.getTitle());
            resMap.put("imagePath", drawn.getImagePath());
            resMap.put("element", drawn.getElement().name());
            resMap.put("isNew", isNew);
            resMap.put("isOverflow", isOverflow);
            resMap.put("breakthroughBefore", breakthroughBefore);
            resMap.put("breakthroughAfter", breakthroughAfter);

            results.add(resMap);
        }

        return ResponseEntity.ok(Map.of(
            "success", true,
            "results", results,
            "remainingGems", user.getPremiumCurrency()
        ));
    }
}
