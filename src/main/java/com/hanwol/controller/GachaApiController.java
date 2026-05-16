package com.hanwol.controller;

import com.hanwol.domain.character.GameCharacter;
import com.hanwol.domain.character.GameCharacterRepository;
import com.hanwol.domain.enums.Rarity;
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

    private final com.hanwol.service.QuestService questService;

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

        // 퀘스트 체크: 가챠 완료 (ID: 6)
        questService.completeQuestById(user.getId(), 6);

        List<GameCharacter> pool = gameCharacterRepository.findAll();
        if (pool.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Gacha pool is empty"));
        }

        Random random = new Random();
        List<Map<String, Object>> results = new ArrayList<>();
        
        // 미리 등급별로 캐릭터를 분류해두되, 가챠 대상인 캐릭터만 포함
        Map<Rarity, List<GameCharacter>> rarityGroups = new EnumMap<>(Rarity.class);
        for (GameCharacter gc : pool) {
            if (gc.isGachaTarget()) {
                rarityGroups.computeIfAbsent(gc.getRarity(), k -> new ArrayList<>()).add(gc);
            }
        }

        for (int i = 0; i < count; i++) {
            // 1. 등급 결정 (S: 0.2%, A: 5%, B: 30%, C: 64.8%)
            Rarity rarity = Rarity.getRandomRarity(random.nextDouble());
            
            // 2. 해당 등급 내에서 랜덤 선택 (만약 해당 등급에 캐릭터가 없다면 다른 등급 시도)
            List<GameCharacter> subPool = rarityGroups.get(rarity);
            if (subPool == null || subPool.isEmpty()) {
                // 폴백: 해당 등급에 캐릭터가 없으면 C등급에서 뽑거나 전체에서 뽑기
                subPool = rarityGroups.get(Rarity.C);
                if (subPool == null || subPool.isEmpty()) subPool = pool;
            }
            
            GameCharacter drawn = subPool.get(random.nextInt(subPool.size()));
            
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
