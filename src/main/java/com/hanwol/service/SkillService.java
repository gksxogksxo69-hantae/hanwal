package com.hanwol.service;

import com.hanwol.domain.character.CharacterSkill;
import com.hanwol.domain.character.UserCharacter;
import com.hanwol.domain.skill.ComboSkill;
import com.hanwol.domain.skill.ComboSkillRepository;
import com.hanwol.domain.skill.Skill;
import com.hanwol.domain.skill.SkillEvolution;
import com.hanwol.domain.skill.SkillEvolutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SkillService {

    private final SkillEvolutionRepository skillEvolutionRepository;
    private final ComboSkillRepository comboSkillRepository;

    /**
     * 유저 캐릭터의 현재 스토리에 맞는 '실제 사용 가능한 스킬 목록' 반환
     * (진화 로직 동적 적용)
     */
    @Transactional(readOnly = true)
    public List<Skill> getEffectiveSkills(UserCharacter uc) {
        int currentChapter = uc.getUser().getStoryChapter();
        
        List<Skill> effectiveSkills = new ArrayList<>();
        List<CharacterSkill> baseSkills = uc.getCharacter().getCharacterSkills();

        for (CharacterSkill cs : baseSkills) {
            // 경지 조건 확인 (예: 궁극기는 초일류부터)
            if (cs.getRequiredGyeongji() != null) {
                // 현재 경지가 요구 경지보다 낮으면 스킵하는 로직 (ENUM 순서 비교)
                // 생략: 실무에서는 GyeongjiTier.valueOf(..).ordinal() 로 비교
            }

            Skill effectiveSkill = cs.getSkill();
            
            // 해당 스킬의 진화 트리를 재귀적으로 또는 순차적으로 따라감
            // 예: 1막에서 A->B, 3막에서 B->C
            boolean evolved;
            do {
                evolved = false;
                List<SkillEvolution> evolutions = skillEvolutionRepository.findByBeforeSkillId(effectiveSkill.getId());
                for (SkillEvolution evo : evolutions) {
                    if (currentChapter >= evo.getRequiredChapter() && 
                        (evo.getRouteType() == null || evo.getRouteType() == uc.getUser().getRouteType())) {
                        effectiveSkill = evo.getAfterSkill();
                        evolved = true;
                        break; // 진화 적용 후 다음 단계 확인을 위해 break
                    }
                }
            } while (evolved); // 더 이상 진화할 수 없을 때까지 반복

            effectiveSkills.add(effectiveSkill);
        }

        return effectiveSkills;
    }

    /**
     * 유저가 현재 사용할 수 있는 합벽기 목록 반환
     */
    @Transactional(readOnly = true)
    public List<ComboSkill> getUnlockedCombos(UserCharacter uc) {
        return comboSkillRepository.findUnlockedCombos(
                uc.getUser().getRouteType(), 
                uc.getUser().getStoryChapter()
        );
    }
}
