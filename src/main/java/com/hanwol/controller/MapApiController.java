package com.hanwol.controller;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import com.hanwol.dto.map.MapSyncRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class MapApiController {

    private final UserRepository userRepository;
    private final com.hanwol.domain.user.UserProgressRepository userProgressRepository;
    private final com.hanwol.domain.character.UserCharacterRepository userCharacterRepository;

    /**
     * town 진입 시 플레이어 정보(성별, 닉네임, 레벨, 재화)를 내려줌.
     * 클라이언트는 이 정보로 성별에 맞는 스프라이트를 로딩한다.
     */
    @GetMapping("/player-info")
    public ResponseEntity<?> getPlayerInfo(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }

        com.hanwol.domain.user.UserProgress progress = userProgressRepository.findById(user.getId()).orElseGet(() -> {
            com.hanwol.domain.user.UserProgress newProgress = com.hanwol.domain.user.UserProgress.builder()
                .userId(user.getId())
                .maxClearedStageId(0)
                .currentQuestId(1)
                .questStatus("IN_PROGRESS")
                .towerFloor(1)
                .hallStage(1)
                .raidStage(1)
                .build();
            return userProgressRepository.save(newProgress);
        });
        
        // 전투력 계산 로직
        List<com.hanwol.domain.character.UserCharacter> allChars = userCharacterRepository.findByUserId(user.getId());
        
        // 캐릭터가 하나도 없으면 보정 로직 (나중에 튜토리얼에서 강제 지급 보장되므로 로깅만 유지)
        if (allChars.isEmpty()) {
            log.warn("유저({})의 캐릭터가 없습니다. 편성 데이터 확인이 필요합니다.", user.getNickname());
        }

        long totalPower = 0;
        long partyPower = 0;
        
        List<Long> partySlotIds = java.util.Arrays.asList(
            user.getPartySlot1(), user.getPartySlot2(), user.getPartySlot3(), user.getPartySlot4()
        );

        for (com.hanwol.domain.character.UserCharacter uc : allChars) {
            // Stats가 0인 경우를 대비해 스탯 계산 재검증
            long p = uc.getEffectiveAtk() + (uc.getEffectiveHp() / 10) + uc.getEffectiveDef() + uc.getEffectiveSpd();
            if (p == 0) {
               // 만약 0이라면 레벨 1 기본 스탯이라도 나오게 보정 (이미 calcHpAtLevel에서 처리되지만 안전빵)
            }
            totalPower += p;
            if (partySlotIds.contains(uc.getCharacter().getId())) {
                partyPower += p;
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("gender", user.getGender() != null ? user.getGender().name() : "MALE");
        response.put("nickname", user.getNickname());
        response.put("level", user.getLevel());
        response.put("exp", user.getExp());
        response.put("nextLevelExp", user.getRequiredExp());
        response.put("gold", user.getGold());
        response.put("premiumCurrency", user.getPremiumCurrency());
        response.put("claimedLevelRewards", user.getClaimedLevelRewards());
        response.put("mainCharacterId", user.getMainCharacterId());
        response.put("profileImagePath", user.getProfileImagePath());
        
        // 진행도 및 전투력 추가
        response.put("currentQuestId", progress.getCurrentQuestId());
        response.put("questStatus", progress.getQuestStatus());
        response.put("towerFloor", progress.getTowerFloor());
        response.put("hallStage", progress.getHallStage());
        response.put("raidStage", progress.getRaidStage());
        response.put("maxClearedStageId", progress.getMaxClearedStageId());
        response.put("claimedActRewards", progress.getClaimedActRewards());
        response.put("totalPower", totalPower);
        response.put("partyPower", partyPower);
        response.put("serverRank", "--");

        return ResponseEntity.ok(response);
    }

    /**
     * 클라이언트에서 주기적으로 쏘는 위치를 DB에 동기화.
     * 핵 체크(이동 속도 롤백) 기믹은 추후 고도화 예정. 현재는 단순 저장.
     */
    @PostMapping("/sync")
    @Transactional
    public ResponseEntity<?> syncPosition(@AuthenticationPrincipal UserDetails userDetails,
                                          @RequestBody MapSyncRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }

        // 이동 위치 저장
        user.updateLocation(request.getX(), request.getY(), LocalDateTime.now());
        
        return ResponseEntity.ok(Map.of("success", true, "rollback", false));
    }

    /**
     * 유저의 파티 편성(4개 슬롯)을 저장.
     */
    @PostMapping("/party")
    @Transactional
    public ResponseEntity<?> updateParty(@AuthenticationPrincipal UserDetails userDetails,
                                         @RequestBody List<Long> characterIds) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }

        // 파티 슬롯 업데이트
        user.setPartySlot1(characterIds.size() > 0 ? characterIds.get(0) : null);
        user.setPartySlot2(characterIds.size() > 1 ? characterIds.get(1) : null);
        user.setPartySlot3(characterIds.size() > 2 ? characterIds.get(2) : null);
        user.setPartySlot4(characterIds.size() > 3 ? characterIds.get(3) : null);

        log.info("유저({})의 파티 편성이 업데이트되었습니다.: {}", user.getNickname(), characterIds);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 15스테이지 배수 도달 시 1500보석 이벤트 보상을 수령.
     */
    @PostMapping("/claim-act-reward")
    @Transactional
    public ResponseEntity<?> claimActReward(@AuthenticationPrincipal UserDetails userDetails, @RequestParam int act) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        com.hanwol.domain.user.UserProgress progress = userProgressRepository.findById(user.getId()).orElse(null);
        if (progress == null) return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Progress not found"));

        // 보상 조건: 해당 Act의 5스테이지 클리어 (예: Act 1 -> 5 stage)
        int requiredStage = act * 5;
        if (progress.getMaxClearedStageId() < requiredStage) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "아직 " + act + "막을 완료하지 않았습니다."));
        }

        if (progress.isActRewardClaimed(act)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "이미 보상을 수령했습니다."));
        }

        // 보상 지급
        user.gainGems(1500);
        progress.claimActReward(act);
        
        userRepository.save(user);
        userProgressRepository.save(progress);

        return ResponseEntity.ok(Map.of("success", true, "gems", 1500, "claimedActRewards", progress.getClaimedActRewards()));
    }

    /**
     * 계정 레벨 달성 보랑 수령
     */
    @PostMapping("/claim-level-reward")
    @Transactional
    public ResponseEntity<?> claimLevelReward(@AuthenticationPrincipal UserDetails userDetails, @RequestParam int targetLevel) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));

        if (user.getLevel() < targetLevel) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "아직 " + targetLevel + "레벨에 도달하지 않았습니다."));
        }

        if (user.isLevelRewardClaimed(targetLevel)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "이미 수령한 보상입니다."));
        }

        // 보상 계산 (기본 100, 10단위 +500, 5단위 +200)
        int gems = 100;
        if (targetLevel % 10 == 0) gems += 500;
        else if (targetLevel % 10 == 5) gems += 200;

        user.gainGems(gems);
        user.claimLevelReward(targetLevel);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
            "success", true, 
            "gems", gems, 
            "totalGems", user.getPremiumCurrency(),
            "claimedLevelRewards", user.getClaimedLevelRewards()
        ));
    }
}
