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

        com.hanwol.domain.user.UserProgress progress = userProgressRepository.findById(user.getId()).orElse(null);
        
        // 전투력 계산 로직 (임시: ATK + HP/10 + DEF + SPD)
        List<com.hanwol.domain.character.UserCharacter> allChars = userCharacterRepository.findByUserId(user.getId());
        long totalPower = 0;
        long partyPower = 0;
        
        List<Long> partySlotIds = java.util.Arrays.asList(
            user.getPartySlot1(), user.getPartySlot2(), user.getPartySlot3(), user.getPartySlot4()
        );

        for (com.hanwol.domain.character.UserCharacter uc : allChars) {
            long p = uc.getEffectiveAtk() + (uc.getEffectiveHp() / 10) + uc.getEffectiveDef() + uc.getEffectiveSpd();
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
        response.put("gold", user.getGold());
        response.put("premiumCurrency", user.getPremiumCurrency());
        response.put("mainCharacterId", user.getMainCharacterId());
        response.put("profileImagePath", user.getProfileImagePath());
        
        // 진행도 및 전투력 추가
        response.put("currentQuestId", progress != null ? progress.getCurrentQuestId() : 1);
        response.put("questStatus", progress != null ? progress.getQuestStatus() : "IN_PROGRESS");
        response.put("towerFloor", progress != null ? progress.getTowerFloor() : 1);
        response.put("hallStage", progress != null ? progress.getHallStage() : 1);
        response.put("raidStage", progress != null ? progress.getRaidStage() : 1);
        response.put("totalPower", totalPower);
        response.put("partyPower", partyPower);
        response.put("serverRank", "--"); // 랭킹 시스템 미구현

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
    @PostMapping("/claim-event-reward")
    @Transactional
    public ResponseEntity<?> claimEventReward(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false));
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body(Map.of("success", false));

        com.hanwol.domain.user.UserProgress progress = userProgressRepository.findById(user.getId()).orElse(null);
        if (progress == null) return ResponseEntity.badRequest().body(Map.of("success", false));

        int maxCleared = progress.getMaxClearedStageId() != null ? progress.getMaxClearedStageId() : 0;
        int lastClaimed = progress.getLastEventRewardStageId() != null ? progress.getLastEventRewardStageId() : 0;

        // 15배수 스테이지 중 아직 안 받은 게 있는지 체크
        int targetStage = ((lastClaimed / 15) + 1) * 15;
        
        if (maxCleared >= targetStage) {
            user.gainGems(1500); // gainGems가 맞음
            progress.setLastEventRewardStageId(targetStage);
            userRepository.save(user);
            userProgressRepository.save(progress);
            
            return ResponseEntity.ok(Map.of("success", true, "gems", 1500, "nextTarget", targetStage + 15));
        }

        return ResponseEntity.badRequest().body(Map.of("success", false, "error", "조건 미달(스테이지 " + targetStage + " 클리어 필요)"));
    }
}
