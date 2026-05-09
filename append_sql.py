import os

sql_content = """
-- 6. 추가 캐릭터 마스터 삽입 (A~S급 및 잡졸)
INSERT IGNORE INTO characters (id, name, title, element, role, route_type, base_hp, base_atk, base_def, base_spd, base_crit_rate, base_crit_dmg, base_effect_hit_rate, base_effect_resist, hp_growth, atk_growth, def_growth, spd_growth_per_level, ehr_growth_per_level, spirit_bonus_condition, spirit_bonus_amount) VALUES
(6, '남궁선', '검신', 'METAL', '물리딜러', NULL, 110, 20, 8, 105, 10.00, 160.00, 5.00, 10.00, 'B', 'S', 'C', 0.25, 0.10, 'ON_CRIT', 2),
(7, '팽무독', '폭렬천도', 'FIRE', '광역딜러', NULL, 120, 18, 10, 95, 5.00, 150.00, 15.00, 5.00, 'A', 'S', 'B', 0.20, 0.20, 'ON_KILL', 2),
(8, '팽백호', '광패도선', 'EARTH', '메인탱커', NULL, 150, 12, 15, 85, 5.00, 150.00, 5.00, 25.00, 'S', 'C', 'S', 0.15, 0.10, 'ON_HIT', 1),
(9, '제갈현', '신기묘산', 'WOOD', '서포터', NULL, 90, 10, 6, 120, 5.00, 150.00, 30.00, 15.00, 'C', 'C', 'C', 0.35, 0.50, 'ON_ALLY_HIT', 1),
(10, '제갈령', '천기목우', 'METAL', '소환유틸', NULL, 85, 12, 8, 110, 5.00, 150.00, 20.00, 10.00, 'C', 'B', 'B', 0.30, 0.30, 'ON_DEBUFF_LAND', 1),
(11, '당외', '천수독왕', 'WATER', '디버퍼', NULL, 95, 16, 7, 115, 5.00, 150.00, 40.00, 5.00, 'C', 'A', 'C', 0.35, 0.50, 'ON_DEBUFF_LAND', 2),
(12, '황보웅', '붕천권마', 'METAL', '제어탱커', NULL, 140, 14, 14, 90, 5.00, 150.00, 15.00, 20.00, 'S', 'A', 'S', 0.15, 0.20, 'ON_HIT', 2),
(13, '황보위', '태산소권', 'EARTH', '딜탱', NULL, 130, 16, 12, 95, 5.00, 150.00, 10.00, 15.00, 'A', 'A', 'A', 0.20, 0.10, 'ON_HIT', 1),
(14, '남궁세가 평무사', '남궁철검', 'EARTH', '서브딜러', NULL, 100, 10, 10, 100, 5.00, 150.00, 5.00, 5.00, 'C', 'C', 'C', 0.10, 0.00, 'ON_HIT', 1),
(15, '하북팽가 예비도수', '팽가돌격대', 'FIRE', '공격탱커', NULL, 110, 12, 8, 90, 5.00, 150.00, 5.00, 5.00, 'B', 'C', 'C', 0.10, 0.00, 'ON_HIT', 1),
(16, '황보세가 예비권사', '돌덩이 몸통', 'EARTH', '메인탱커', NULL, 120, 8, 12, 85, 5.00, 150.00, 5.00, 5.00, 'A', 'D', 'B', 0.10, 0.00, 'ON_HIT', 1),
(17, '제갈세가 학도생', '초보학도', 'WOOD', '서포터', NULL, 80, 8, 6, 105, 5.00, 150.00, 10.00, 5.00, 'D', 'D', 'D', 0.20, 0.10, 'ON_ALLY_HIT', 1),
(18, '사천당가 하급무사', '초보독술사', 'WATER', '디버퍼', NULL, 85, 12, 5, 110, 5.00, 150.00, 15.00, 5.00, 'D', 'C', 'D', 0.25, 0.20, 'ON_DEBUFF_LAND', 1),
(19, '소림사 예비 행자', '빡빡이 막내', 'METAL', '딜탱', NULL, 115, 10, 10, 95, 5.00, 150.00, 5.00, 10.00, 'B', 'C', 'B', 0.15, 0.00, 'ON_HIT', 1);

-- 7. 추가 스킬 마스터 삽입
INSERT IGNORE INTO skills (id, name, description, skill_type, target_type, element, scaling_stat, damage_multiplier, energy_cost, spirit_gain, spirit_cost) VALUES
(40, '천뢰섬격', '물리 피해 + 80% 확률 감전', 'NORMAL', 'SINGLE_ENEMY', 'METAL', 'ATK', 1.20, -1, 1, 0),
(41, '제황자색검', '광역 피해 + 버프 1개 해제', 'BATTLE', 'ALL_ENEMY', 'METAL', 'ATK', 2.00, 1, 2, 0),
(42, '벽력일도', '단일 피해 (출혈 대상에게 피해 증가)', 'NORMAL', 'SINGLE_ENEMY', 'FIRE', 'ATK', 1.30, -1, 1, 0),
(43, '혼원폭렬참', '광역 피해 + 2턴 출혈', 'BATTLE', 'ALL_ENEMY', 'FIRE', 'ATK', 1.80, 1, 2, 0),
(44, '태산가르기', '도를 내려찍어 단일 피해', 'NORMAL', 'SINGLE_ENEMY', 'EARTH', 'DEF', 1.00, -1, 1, 0),
(45, '혼원벽력갑', '아군 전체 보호막 + 도발', 'BATTLE', 'SELF', 'EARTH', 'DEF', 0.00, 2, 1, 0),
(46, '기문둔갑', '단일 적 버프 해제 및 행동게이지 초기화', 'NORMAL', 'SINGLE_ENEMY', 'WOOD', 'ATK', 0.50, -1, 1, 0),
(47, '팔진서생', '아군 전체 공격력 및 치명타 확률 대폭 증가', 'BATTLE', 'ALL_ALLY', 'WOOD', 'ATK', 0.00, 2, 2, 0),
(48, '폭뢰격발', '적 전체 화상 피해', 'NORMAL', 'ALL_ENEMY', 'METAL', 'ATK', 1.00, -1, 1, 0),
(49, '철갑목우 소환', '아군 대신 맞는 철갑목우 소환', 'BATTLE', 'ALL_ALLY', 'METAL', 'HP', 0.00, 2, 1, 0),
(50, '십독살진', '중독된 적에게 강력한 단일 피해', 'NORMAL', 'SINGLE_ENEMY', 'WATER', 'ATK', 1.50, -1, 1, 0),
(51, '만천화우', '적 전체 치명독 부여 (최대체력 비례 피해)', 'BATTLE', 'ALL_ENEMY', 'WATER', 'ATK', 0.50, 2, 2, 0),
(52, '태산붕천권', '단일 피해 + 1턴 기절', 'NORMAL', 'SINGLE_ENEMY', 'METAL', 'ATK', 1.10, -1, 1, 0),
(53, '금강불괴신공', '3턴간 피해 감소 및 100% 확률 반격', 'BATTLE', 'SELF', 'METAL', 'DEF', 0.00, 2, 2, 0),
(54, '벽력권풍', '단일 피해 (잃은 체력 비례 증가)', 'NORMAL', 'SINGLE_ENEMY', 'EARTH', 'ATK', 1.20, -1, 1, 0),
(55, '금강권배', '지정 아군 보호 및 적 도발', 'BATTLE', 'SINGLE_ALLY', 'EARTH', 'DEF', 0.00, 1, 1, 0),
(56, '철검 찌르기', '단일 피해 + 20% 출혈', 'NORMAL', 'SINGLE_ENEMY', 'EARTH', 'ATK', 0.80, -1, 1, 0),
(57, '기합 넣기', '단일 적 1턴 도발', 'NORMAL', 'SINGLE_ENEMY', 'FIRE', 'ATK', 0.00, -1, 1, 0),
(58, '몸통 박치기', '단일 피해 + 30% 기절', 'NORMAL', 'SINGLE_ENEMY', 'EARTH', 'DEF', 0.70, -1, 1, 0),
(59, '기본 공격', '단일 기본 피해', 'NORMAL', 'SINGLE_ENEMY', 'VOID', 'ATK', 1.00, -1, 1, 0);

-- 8. 추가 캐릭터-스킬 매핑 삽입
INSERT IGNORE INTO character_skills (id, character_id, skill_id, skill_slot, required_gyeongji) VALUES
(7, 6, 40, 'NORMAL', NULL),
(8, 6, 41, 'BATTLE', NULL),
(9, 7, 42, 'NORMAL', NULL),
(10, 7, 43, 'BATTLE', NULL),
(11, 8, 44, 'NORMAL', NULL),
(12, 8, 45, 'BATTLE', NULL),
(13, 9, 46, 'NORMAL', NULL),
(14, 9, 47, 'BATTLE', NULL),
(15, 10, 48, 'NORMAL', NULL),
(16, 10, 49, 'BATTLE', NULL),
(17, 11, 50, 'NORMAL', NULL),
(18, 11, 51, 'BATTLE', NULL),
(19, 12, 52, 'NORMAL', NULL),
(20, 12, 53, 'BATTLE', NULL),
(21, 13, 54, 'NORMAL', NULL),
(22, 13, 55, 'BATTLE', NULL),
(23, 14, 56, 'NORMAL', NULL),
(24, 15, 57, 'NORMAL', NULL),
(25, 16, 58, 'NORMAL', NULL),
(26, 17, 59, 'NORMAL', NULL),
(27, 18, 59, 'NORMAL', NULL),
(28, 19, 59, 'NORMAL', NULL);
"""

with open('src/main/resources/data.sql', 'a', encoding='utf-8') as f:
    f.write(sql_content)
