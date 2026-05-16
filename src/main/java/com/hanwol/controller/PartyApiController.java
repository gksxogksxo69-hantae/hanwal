package com.hanwol.controller;

import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/party")
@RequiredArgsConstructor
public class PartyApiController {

    private final UserRepository userRepository;

    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveParty(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Long[]> request) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Unauthorized"));
        }

        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found"));
        }

        Long[] slots = request.get("slots");
        if (slots == null || slots.length != 4) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid slots"));
        }

        user.updateParty(slots[0], slots[1], slots[2], slots[3]);
        
        return ResponseEntity.ok(Map.of("success", true));
    }
}
