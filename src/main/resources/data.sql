-- 1. 메인 캐릭터 템플릿 데이터 삽입 (이미 있으면 무시)
INSERT IGNORE INTO character_template (template_id, name, role, base_hp, base_mp, base_atk, base_def, base_spd) VALUES
('CH_NAMGUNG_CHUN', '남궁천', 'WARRIOR', 150, 50, 35, 15, 95),
('CH_NAMGUNG_SEOLHA', '남궁설화', 'MAGE', 100, 100, 42, 8, 115);

-- 2. 스킬 템플릿 데이터 삽입 (이미 있으면 무시)
INSERT IGNORE INTO skill_template (skill_id, name, description, skill_type, target_type, is_ultimate, damage_multiplier, mp_cost) VALUES
('SK_HEAVEN_SLASH', '창천일격', '무거운 검으로 적을 내려쳐 강력한 물리 피해를 입힙니다.', 'DAMAGE', 'SINGLE', false, 1.50, 10),
('SK_IRON_WILL', '철벽기세', '내력을 끌어올려 자신에게 보호막을 씌웁니다. (데미지 경감)', 'BUFF', 'SELF', false, 0.00, 15),
('SK_ICE_THRUST', '빙결 한기', '차가운 기운을 뿜어 적을 타격하고 일정 확률로 행동 게이지를 감소시킵니다.', 'DAMAGE', 'SINGLE', false, 1.10, 15),
('SK_SNOW_BURST', '설화폭풍', '화려한 냉기 폭풍으로 적 전체에게 강력한 마법 피해를 입힙니다.', 'DAMAGE', 'ALL', true, 1.80, 35);

-- 3. 캐릭터 - 스킬 매핑 데이터 삽입 (이미 있으면 무시)
INSERT IGNORE INTO character_skill_relation (template_id, skill_id) VALUES
('CH_NAMGUNG_CHUN', 'SK_HEAVEN_SLASH'),
('CH_NAMGUNG_CHUN', 'SK_IRON_WILL'),
('CH_NAMGUNG_SEOLHA', 'SK_ICE_THRUST'),
('CH_NAMGUNG_SEOLHA', 'SK_SNOW_BURST');
