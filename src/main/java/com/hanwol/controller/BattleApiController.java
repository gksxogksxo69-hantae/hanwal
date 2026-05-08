package com.hanwol.controller;

import com.hanwol.domain.CharacterTemplate;
import com.hanwol.repository.CharacterTemplateRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/battle")
public class BattleApiController {

    private final CharacterTemplateRepository characterTemplateRepository;

    public BattleApiController(CharacterTemplateRepository characterTemplateRepository) {
        this.characterTemplateRepository = characterTemplateRepository;
    }

    @GetMapping("/character/{templateId}")
    public ResponseEntity<CharacterTemplate> getCharacterTemplate(@PathVariable("templateId") String templateId) {
        // N+1 문제 없이 JOIN FETCH로 스킬 리스트까지 한 번에 로드 (Lazy 로딩 에러 방지)
        CharacterTemplate template = characterTemplateRepository.findWithSkillsById(templateId);
        
        if (template == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(template);
    }
}
