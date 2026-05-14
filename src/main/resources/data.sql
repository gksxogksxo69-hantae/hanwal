-- ====================================================================
-- [기존 마스터 데이터 완전 초기화]
-- 연관 관계 자식 테이블부터 순서대로 싹 밀어버려야 외래키(FK) 에러 안 터진다!
-- ====================================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE combo_skills;
TRUNCATE TABLE skill_evolutions;
TRUNCATE TABLE character_skills;
TRUNCATE TABLE skills;
TRUNCATE TABLE characters;
TRUNCATE TABLE mst_main_quest;
TRUNCATE TABLE mst_stage;
SET FOREIGN_KEY_CHECKS = 1;


-- ====================================================================
-- 1. 신규 스킬 마스터 삽입 (skills 테이블)
-- ====================================================================
INSERT INTO skills (id, name, description, skill_type, target_type, element, scaling_stat, damage_multiplier, energy_cost, spirit_gain, spirit_cost) VALUES
(1, '36계 줄랑랑', '행동 게이지를 30% 당기고 2턴 방어력 증가', 'BATTLE', 'SELF', 'VOID', 'ATK', 0.00, 1, 2, 0),
(2, '흙 뿌리기', '적 단일 소량 피해 + 2턴 실명(명중률 50% 감소)', 'NORMAL', 'SINGLE_ENEMY', 'EARTH', 'ATK', 0.50, -1, 1, 0),
(10, '창궁대연보', '행동 게이지 40% 상승 + 3턴 회피율 급증', 'BATTLE', 'SELF', 'VOID', 'ATK', 0.00, 1, 2, 0),
(11, '창궁일송', '단일 DEF비례 대미지 + 2턴 무력화', 'NORMAL', 'SINGLE_ENEMY', 'EARTH', 'DEF', 1.00, -1, 1, 0),
(12, '제황검형 - 일검서해', 'DEF 비례 광역 대미지 + 방어력 파쇄', 'ULTIMATE', 'ALL_ENEMY', 'METAL', 'DEF', 3.50, 0, 0, 6),

(20, '꺄악! 비명지르기', '적 전체 행동 게이지 15% 감소', 'BATTLE', 'ALL_ENEMY', 'VOID', 'ATK', 0.00, 1, 2, 0),
(21, '짱돌 투척', '적 단일 피해 + 30% 확률 기절(1턴)', 'NORMAL', 'SINGLE_ENEMY', 'EARTH', 'ATK', 0.50, -1, 1, 0),
(30, '빙백한풍', '적 전체 속도 감소 + 빙결 유도(50% 확률)', 'BATTLE', 'ALL_ENEMY', 'WATER', 'ATK', 1.50, 1, 2, 0),
(31, '빙백투창', '단일 극딜 + 확정 빙결 1턴', 'NORMAL', 'SINGLE_ENEMY', 'WATER', 'ATK', 1.20, -1, 1, 0),
(32, '빙백신검 - 천년빙봉', '단일 대상 확정 빙결 + 극딜', 'ULTIMATE', 'SINGLE_ENEMY', 'WATER', 'ATK', 4.00, 0, 0, 6),

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
(59, '기본 공격', '단일 기본 피해', 'NORMAL', 'SINGLE_ENEMY', 'VOID', 'ATK', 1.00, -1, 1, 0),

(60, '적련분쇄', '적 단일에게 강력한 화염 피해', 'NORMAL', 'SINGLE_ENEMY', 'FIRE', 'ATK', 1.20, -1, 1, 0),
(61, '홍련지화', '적 전체에게 화염 피해 및 2턴 화상', 'BATTLE', 'ALL_ENEMY', 'FIRE', 'ATK', 1.50, 2, 1, 0),
(62, '적련참 - 염왕강림', '적 단일 방어력 무시 극딜 + 치명타', 'ULTIMATE', 'SINGLE_ENEMY', 'FIRE', 'ATK', 3.80, 0, 0, 6),

(63, '유영독침', '적 단일에게 독침 투척 + 중독 2턴', 'NORMAL', 'SINGLE_ENEMY', 'METAL', 'ATK', 0.80, -1, 1, 0),
(64, '칠보추혼', '적 단일의 등 뒤를 노려 피해 (중독 시 추뎀)', 'BATTLE', 'SINGLE_ENEMY', 'METAL', 'ATK', 2.00, 1, 2, 0),
(65, '만천화우 - 흑살', '적 전체에게 치명적인 독비', 'ULTIMATE', 'ALL_ENEMY', 'METAL', 'ATK', 2.50, 0, 0, 5),

(66, '창궁무애검 - 천류(天流)', '현경의 기운을 담은 검풍으로 적 전체를 휩쓰는 광역 딜', 'NORMAL', 'ALL_ENEMY', 'VOID', 'ATK', 0.80, -1, 1, 0),
(67, '화경(化境) - 무원(無元)', '자신을 무(無)로 돌려 2턴간 어떤 공격도 받지 않는 절대 회피 상태 부여', 'BATTLE', 'SELF', 'VOID', 'DEF', 0.00, 2, 2, 0),
(68, '제황검형 오의 - 이기어검(以氣御劍)', '수많은 검기를 허공에 띄워 적 전체에게 파멸적인 피해', 'ULTIMATE', 'ALL_ENEMY', 'VOID', 'ATK', 4.00, 0, 0, 6),

(70, '천뢰강림(天雷降臨)', '검신의 벼락이 내리쳐 은빛 섬광으로 단일 극딜', 'ULTIMATE', 'SINGLE_ENEMY', 'METAL', 'ATK', 4.00, 0, 0, 6),
(71, '폭렬천도 오의 - 홍련지옥(紅蓮地獄)', '거대한 화염 폭풍으로 적 전체를 불태움', 'ULTIMATE', 'ALL_ENEMY', 'FIRE', 'ATK', 3.50, 0, 0, 6),
(72, '혼원신공 - 태산압정(泰山壓頂)', '태산과 같은 무거운 기운으로 적 단일 압살', 'ULTIMATE', 'SINGLE_ENEMY', 'EARTH', 'DEF', 3.50, 0, 0, 5),
(73, '천지팔진도 - 사문개방(死門開放)', '지맥을 비틀어 적 전체 행동불가 및 대량의 피해', 'ULTIMATE', 'ALL_ENEMY', 'WOOD', 'ATK', 2.80, 0, 0, 6),
(74, '기문기관술 - 거대목우참', '웅이(거대목우)가 전장을 휩쓸어 적 전체 피해', 'ULTIMATE', 'ALL_ENEMY', 'METAL', 'ATK', 2.50, 0, 0, 5),
(75, '십독신공 극 - 무형맹독(無形猛毒)', '적 단일에게 해제 불가능한 죽음의 독을 주입', 'ULTIMATE', 'SINGLE_ENEMY', 'WATER', 'ATK', 3.80, 0, 0, 6),
(76, '붕천권마 - 천지진동(天地震동)', '대지를 붕괴시켜 적 전체 기절 및 파멸적 피해', 'ULTIMATE', 'ALL_ENEMY', 'METAL', 'ATK', 2.80, 0, 0, 6),
(77, '벽력권법 극 - 암석분쇄(岩石粉碎)', '바위조차 가루로 만드는 태산소권의 비기', 'ULTIMATE', 'SINGLE_ENEMY', 'EARTH', 'ATK', 3.50, 0, 0, 5);


-- ====================================================================
-- 2. 신규 캐릭터 마스터 삽입 (characters 테이블)
-- 백엔드와 맞추기 위해 'code' 컬럼 데이터를 맨 앞에 매핑 정렬함!
-- ====================================================================
INSERT INTO characters (id, code, name, title, element, role, route_type, rarity, is_gacha_target, base_hp, base_atk, base_def, base_spd, base_crit_rate, base_crit_dmg, base_effect_hit_rate, base_effect_resist, hp_growth, atk_growth, def_growth, spd_growth_per_level, ehr_growth_per_level, spirit_bonus_condition, spirit_bonus_amount) VALUES
(1, 'CH_NAMGUNG_CHUN', '남궁천', '가문의 수치', 'EARTH', '딜탱', 'CHUN', 'S', false, 130, 14, 12, 98, 5.00, 150.00, 10.00, 15.00, 'S', 'B', 'S', 0.20, 0.10, 'ON_HIT', 1),
(2, 'CH_NAMGUNG_SEOLHWA', '남궁설화', '비명쟁이', 'WATER', '디버퍼', 'SULHWA', 'S', false, 75, 10, 4, 102, 5.00, 150.00, 30.00, 5.00, 'D', 'B', 'D', 0.30, 0.50, 'ON_DEBUFF_LAND', 1),
(3, 'CH_PAENG_ARIN', '팽아린', '하북의 적련', 'FIRE', '폭딜러', 'CHUN', 'A', true, 100, 18, 8, 105, 15.00, 180.00, 5.00, 5.00, 'B', 'S', 'C', 0.25, 0.10, 'ON_CRIT', 2),
(4, 'CH_DANG_SOSO', '당소소', '그림자 독', 'METAL', '암살자', 'SULHWA', 'A', true, 80, 16, 6, 115, 10.00, 200.00, 15.00, 5.00, 'C', 'A', 'D', 0.40, 0.20, 'ON_KILL', 3),
(5, 'CH_NAMGUNG_HYUN', '남궁현', '천검선', 'VOID', '광역딜러', NULL, 'S', true, 120, 12, 10, 95, 5.00, 150.00, 5.00, 20.00, 'A', 'C', 'A', 0.15, 0.10, 'ON_ALLY_HIT', 1),
(6, 'CH_NAMGUNG_SUN', '남궁선', '검신', 'METAL', '물리딜러', NULL, 'S', true, 110, 20, 8, 105, 10.00, 160.00, 5.00, 10.00, 'B', 'S', 'C', 0.25, 0.10, 'ON_CRIT', 2),
(7, 'CH_PAENG_MUDOK', '팽무독', '폭렬천도', 'FIRE', '광역딜러', NULL, 'S', true, 120, 18, 10, 95, 5.00, 150.00, 15.00, 5.00, 'A', 'S', 'B', 0.20, 0.20, 'ON_KILL', 2),
(8, 'CH_PAENG_BAEKHO', '팽백호', '광패도선', 'EARTH', '메인탱커', NULL, 'A', true, 150, 12, 15, 85, 5.00, 150.00, 5.00, 25.00, 'S', 'C', 'S', 0.15, 0.10, 'ON_HIT', 1),
(9, 'CH_JEGAL_HYUN', '제갈현', '신기묘산', 'WOOD', '서포터', NULL, 'S', true, 90, 10, 6, 120, 5.00, 150.00, 30.00, 15.00, 'C', 'C', 'C', 0.35, 0.50, 'ON_ALLY_HIT', 1),
(10, 'CH_JEGAL_RYEONG', '제갈령', '천기목우', 'METAL', '소환유틸', NULL, 'A', true, 85, 12, 8, 110, 5.00, 150.00, 20.00, 10.00, 'C', 'B', 'B', 0.30, 0.30, 'ON_DEBUFF_LAND', 1),
(11, 'CH_DANG_외', '당외', '천수독왕', 'WATER', '디버퍼', NULL, 'S', true, 95, 16, 7, 115, 5.00, 150.00, 40.00, 5.00, 'C', 'A', 'C', 0.35, 0.50, 'ON_DEBUFF_LAND', 2),
(12, 'CH_HWANGBO_WOONG', '황보웅', '붕천권마', 'METAL', '제어탱커', NULL, 'S', true, 140, 14, 14, 90, 5.00, 150.00, 15.00, 20.00, 'S', 'A', 'S', 0.15, 0.20, 'ON_HIT', 2),
(13, 'CH_HWANGBO_WI', '황보위', '태산소권', 'EARTH', '딜탱', NULL, 'A', true, 130, 16, 12, 95, 5.00, 150.00, 10.00, 15.00, 'A', 'A', 'A', 0.20, 0.10, 'ON_HIT', 1),
(14, 'CH_NAMGUNG_COMMON', '남궁세가 평무사', '남궁철검', 'EARTH', '서브딜러', NULL, 'C', true, 100, 10, 10, 100, 5.00, 150.00, 5.00, 5.00, 'C', 'C', 'C', 0.10, 0.00, 'ON_HIT', 1),
(15, 'CH_PAENG_COMMON', '하북팽가 예비도수', '팽가돌격대', 'FIRE', '공격탱커', NULL, 'C', true, 110, 12, 8, 90, 5.00, 150.00, 5.00, 5.00, 'B', 'C', 'C', 0.10, 0.00, 'ON_HIT', 1),
(16, 'CH_HWANGBO_COMMON', '황보세가 예비권사', '돌덩이 몸통', 'EARTH', '메인탱커', NULL, 'C', true, 120, 8, 12, 85, 5.00, 150.00, 5.00, 5.00, 'A', 'D', 'B', 0.10, 0.00, 'ON_HIT', 1),
(17, 'CH_JEGAL_COMMON', '제갈세가 학도생', '초보학도', 'WOOD', '서포터', NULL, 'C', true, 80, 8, 6, 105, 5.00, 150.00, 10.00, 5.00, 'D', 'D', 'D', 0.20, 0.10, 'ON_ALLY_HIT', 1),
(18, 'CH_DANG_COMMON', '사천당가 하급무사', '초보독술사', 'WATER', '디버퍼', NULL, 'C', true, 85, 12, 5, 110, 5.00, 150.00, 15.00, 5.00, 'D', 'C', 'D', 0.25, 0.20, 'ON_DEBUFF_LAND', 1),
(19, 'CH_SOLIM_COMMON', '소림사 예비 행자', '빡빡이 막내', 'METAL', '딜탱', NULL, 'C', true, 115, 10, 10, 95, 5.00, 150.00, 5.00, 10.00, 'B', 'C', 'B', 0.15, 0.00, 'ON_HIT', 1);


-- ====================================================================
-- 3. 캐릭터-스킬 매핑 삽입 (character_skills 테이블)
-- ====================================================================
INSERT INTO character_skills (id, character_id, skill_id, skill_slot, required_gyeongji) VALUES
(1, 1, 2, 'NORMAL', NULL),
(2, 1, 1, 'BATTLE', NULL),
(3, 1, 12, 'ULTIMATE', 'CHOILRYU'),
(4, 2, 21, 'NORMAL', NULL),
(5, 2, 20, 'BATTLE', NULL),
(6, 2, 32, 'ULTIMATE', 'CHOILRYU'),
(7, 6, 40, 'NORMAL', NULL),
(8, 6, 41, 'BATTLE', NULL),
(38, 6, 70, 'ULTIMATE', 'CHOILRYU'),
(9, 7, 42, 'NORMAL', NULL),
(10, 7, 43, 'BATTLE', NULL),
(39, 7, 71, 'ULTIMATE', 'CHOILRYU'),
(11, 8, 44, 'NORMAL', NULL),
(12, 8, 45, 'BATTLE', NULL),
(40, 8, 72, 'ULTIMATE', 'CHOILRYU'),
(13, 9, 46, 'NORMAL', NULL),
(14, 9, 47, 'BATTLE', NULL),
(41, 9, 73, 'ULTIMATE', 'CHOILRYU'),
(15, 10, 48, 'NORMAL', NULL),
(16, 10, 49, 'BATTLE', NULL),
(42, 10, 74, 'ULTIMATE', 'CHOILRYU'),
(17, 11, 50, 'NORMAL', NULL),
(18, 11, 51, 'BATTLE', NULL),
(43, 11, 75, 'ULTIMATE', 'CHOILRYU'),
(19, 12, 52, 'NORMAL', NULL),
(20, 12, 53, 'BATTLE', NULL),
(44, 12, 76, 'ULTIMATE', 'CHOILRYU'),
(21, 13, 54, 'NORMAL', NULL),
(22, 13, 55, 'BATTLE', NULL),
(45, 13, 77, 'ULTIMATE', 'CHOILRYU'),
(23, 14, 56, 'NORMAL', NULL),
(24, 15, 57, 'NORMAL', NULL),
(25, 16, 58, 'NORMAL', NULL),
(26, 17, 59, 'NORMAL', NULL),
(27, 18, 59, 'NORMAL', NULL),
(28, 19, 59, 'NORMAL', NULL),
(29, 3, 60, 'NORMAL', NULL),
(30, 3, 61, 'BATTLE', NULL),
(31, 3, 62, 'ULTIMATE', 'CHOILRYU'),
(32, 4, 63, 'NORMAL', NULL),
(33, 4, 64, 'BATTLE', NULL),
(34, 4, 65, 'ULTIMATE', 'CHOILRYU'),
(35, 5, 66, 'NORMAL', NULL),
(36, 5, 67, 'BATTLE', NULL),
(37, 5, 68, 'ULTIMATE', 'CHOILRYU');


-- ====================================================================
-- 4. 스킬 진화 매핑 삽입 (skill_evolutions 테이블)
-- ====================================================================
INSERT INTO skill_evolutions (id, before_skill_id, after_skill_id, required_chapter, route_type, event_description) VALUES
(1, 1, 10, 1, 'CHUN', '36계 줄랑랑 -> 창궁대연보'),
(2, 2, 11, 1, 'CHUN', '흙 뿌리기 -> 창궁일송'),
(3, 20, 30, 1, 'SULHWA', '꺄악! 비명지르기 -> 빙백한풍'),
(4, 21, 31, 1, 'SULHWA', '짱돌 투척 -> 빙백투창');


-- ====================================================================
-- 5. 합벽기 매핑 삽입 (combo_skills 테이블)
-- ====================================================================
INSERT INTO combo_skills (id, route_type, char_a_id, char_b_id, combo_name, combo_rank, spirit_cost_a, spirit_cost_b, required_chapter, element_fusion, effect_json, description) VALUES
(1, 'CHUN', 1, 3, '염토쌍무 - 폭염지진', 'MAIN', 6, 6, 3, '용암(熔岩)', '{"damage_type":"AOE","scaling":"DEF","multiplier":4.5}', '천과 아린의 합벽기'),
(2, 'SULHWA', 2, 4, '빙독쌍련 - 극한독화', 'MAIN', 6, 6, 3, '동결독(凍結毒)', '{"damage_type":"AOE","multiplier":3.8}', '설화와 소소의 합벽기'),
(3, 'SULHWA', 2, 5, '현빙무영 - 한월장막', 'SUB', 4, 4, 2, '절대영도(絕對零度)', '{"damage_type":"AOE","multiplier":4.0}', '설화와 할배의 합벽기');


-- ====================================================================
-- 6. 캐릭터 추가 업데이트 (이미지 경로 설정)
-- ====================================================================
UPDATE characters SET image_path = '/images/남궁천.png' WHERE id = 1;
UPDATE characters SET image_path = '/images/남궁설화.jpg' WHERE id = 2;
UPDATE characters SET image_path = '/images/dang_soso.png' WHERE id = 4;
UPDATE characters SET image_path = '/images/남궁현.png' WHERE id = 5;
UPDATE characters SET image_path = '/images/남궁선.png' WHERE id = 6;
UPDATE characters SET image_path = '/images/zhuge_ryeong.png' WHERE id = 10;
-- 이미지가 아직 없는 캐릭터: 캐릭터 성별/성격에 적합한 기본 초상화 매핑
-- (추후 전용 일러스트 제작 시 개별 교체)
UPDATE characters SET image_path = '/images/portrait_female.png' WHERE id = 3 AND image_path IS NULL;   -- 팽아린 (여성)
UPDATE characters SET image_path = '/images/namgung_cheon.png' WHERE id = 7 AND image_path IS NULL;    -- 팽무독 (남성)
UPDATE characters SET image_path = '/images/portrait_guard.png' WHERE id = 8 AND image_path IS NULL;   -- 팽백호 (남성/탱커)
UPDATE characters SET image_path = '/images/portrait_male.png' WHERE id = 9 AND image_path IS NULL;    -- 제갈현 (남성)
UPDATE characters SET image_path = '/images/portrait_female.png' WHERE id = 11 AND image_path IS NULL; -- 당외 (여성)
UPDATE characters SET image_path = '/images/portrait_guard.png' WHERE id = 12 AND image_path IS NULL;  -- 황보웅 (남성/탱커)
UPDATE characters SET image_path = '/images/portrait_male.png' WHERE id = 13 AND image_path IS NULL;   -- 황보위 (남성)
UPDATE characters SET image_path = '/images/portrait_guard.png' WHERE id IN (14, 15, 16, 19) AND image_path IS NULL; -- C등급 남성 무사들
UPDATE characters SET image_path = '/images/portrait_male.png' WHERE id = 17 AND image_path IS NULL;   -- 제갈세가 학도생
UPDATE characters SET image_path = '/images/portrait_female.png' WHERE id = 18 AND image_path IS NULL; -- 사천당가 하급무사



-- ====================================================================
-- 7. 가챠 등급 규칙에 따른 타겟 캐릭터 상태 업데이트
-- ====================================================================
UPDATE characters SET rarity = 'S', is_gacha_target = false WHERE id IN (1, 2);
UPDATE characters SET rarity = 'S', is_gacha_target = true WHERE id IN (6, 12);
UPDATE characters SET rarity = 'A', is_gacha_target = true WHERE id IN (3, 4, 7, 8, 10);
UPDATE characters SET rarity = 'B', is_gacha_target = true WHERE id IN (5, 9, 11, 13);
UPDATE characters SET rarity = 'C', is_gacha_target = true WHERE id IN (14, 15, 16, 17, 18, 19);


-- ====================================================================
-- 8. 퀘스트 및 스테이지 진행도 마스터 셋업
-- ====================================================================
INSERT INTO mst_main_quest (id, chapter_id, target_stage_id, title, goal_desc, reward_gold, reward_gems) VALUES
(1, 1, 1, '혈겁의 시작', '스테이지 1-1 클리어', 500, 50),
(2, 1, 2, '불타는 장저', '스테이지 1-2 클리어', 600, 50),
(3, 1, 3, '가문의 생존자', '스테이지 1-3 클리어', 700, 100),
(4, 1, 4, '포위망 돌파', '스테이지 1-4 클리어', 800, 50),
(5, 1, 5, '협객의 등장', '스테이지 1-5 클리어', 1000, 100);

INSERT INTO user_progress (user_id, max_cleared_stage_id, current_quest_id, quest_status) VALUES
(1, 0, 1, 'IN_PROGRESS');

INSERT INTO mst_stage (id, chapter_id, stage_num, title, story_before_id, story_after_id, monster_group_id, reward_gold, reward_exp) VALUES
(1, 1, 1, '타오르는 장원', 1, 0, 101, 100, 50),
(2, 1, 2, '혈교의 습격자', 0, 0, 102, 150, 60),
(3, 1, 3, '무너진 정문', 0, 2, 103, 200, 80),
(4, 1, 4, '피로 물든 길', 0, 0, 104, 250, 100),
(5, 1, 5, '혈교 선봉장', 3, 4, 105, 500, 300);