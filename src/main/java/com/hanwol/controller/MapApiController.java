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
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class MapApiController {

    private final UserRepository userRepository;

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
}
