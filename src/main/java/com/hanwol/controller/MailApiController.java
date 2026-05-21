package com.hanwol.controller;

import com.hanwol.domain.user.GameMail;
import com.hanwol.domain.user.GameMailRepository;
import com.hanwol.domain.user.User;
import com.hanwol.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
public class MailApiController {

    private final UserRepository userRepository;
    private final GameMailRepository gameMailRepository;

    @GetMapping("/list")
    public ResponseEntity<?> getMailList(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        List<GameMail> mails = gameMailRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        List<Map<String, Object>> mailDtos = new ArrayList<>();
        
        for (GameMail mail : mails) {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", mail.getId());
            dto.put("title", mail.getTitle());
            dto.put("content", mail.getContent());
            dto.put("rewardGold", mail.getRewardGold());
            dto.put("rewardGems", mail.getRewardGems());
            dto.put("isRead", mail.isRead());
            dto.put("isClaimed", mail.isClaimed());
            dto.put("createdAt", mail.getCreatedAt().toString());
            mailDtos.add(dto);
        }

        return ResponseEntity.ok(Map.of("success", true, "mails", mailDtos, "unreadCount", gameMailRepository.countByUserIdAndIsReadFalse(user.getId())));
    }

    @PostMapping("/claim/{id}")
    @Transactional
    public ResponseEntity<?> claimMail(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long id) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        Optional<GameMail> mailOpt = gameMailRepository.findById(id);
        if (mailOpt.isEmpty() || !mailOpt.get().getUser().getId().equals(user.getId())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid mail"));
        }

        GameMail mail = mailOpt.get();
        if (mail.isClaimed()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Already claimed"));
        }

        user.gainGold(mail.getRewardGold());
        user.gainGems(mail.getRewardGems());
        userRepository.save(user);

        mail.setClaimed(true);
        mail.setRead(true);
        gameMailRepository.save(mail);

        return ResponseEntity.ok(Map.of("success", true, "message", "보상을 수령했습니다."));
    }

    @PostMapping("/claim-all")
    @Transactional
    public ResponseEntity<?> claimAllMail(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) return ResponseEntity.status(401).build();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        List<GameMail> mails = gameMailRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        int totalGold = 0;
        int totalGems = 0;
        int count = 0;

        for (GameMail mail : mails) {
            if (!mail.isClaimed()) {
                totalGold += mail.getRewardGold();
                totalGems += mail.getRewardGems();
                mail.setClaimed(true);
                mail.setRead(true);
                gameMailRepository.save(mail);
                count++;
            }
        }

        if (count > 0) {
            user.gainGold(totalGold);
            user.gainGems(totalGems);
            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", count + "개의 우편을 수령했습니다."));
    }
}
