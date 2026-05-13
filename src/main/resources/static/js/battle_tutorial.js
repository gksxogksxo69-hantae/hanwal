document.addEventListener('alpine:init', () => {
    Alpine.data('battleApp', () => ({

        // ───────── 유저 정보 ─────────
        playerGender: 'MALE',
        playerNickname: '모험가',

        // ───────── 전투 엔티티 ─────────
        party: [null, null, null, null],
        enemies: [],
        turnQueue: [],
        logs: [],
        currentActor: null,
        selectedTarget: null,

        // ───────── 상태 머신 ─────────
        // STORY_INTRO → PHASE1_BATTLE → SCRIPTED_DEFEAT → STORY_RESCUE → AWAKENING → PHASE3_BATTLE → WIN
        gameState: 'STORY_INTRO',
        isPlayerTurn: false,
        phase: 1,            // 1: 삼류 전투, 3: 각성 전투
        playerTurnCount: 0,  // Phase1에서 플레이어가 행동한 횟수

        // ───────── 비주얼노벨 ─────────
        storyLines: [],
        currentStoryLine: '',
        storyIndex: 0,
        isTyping: false,
        typeInterval: null,

        // ───────── 오버레이 ─────────
        showDefeatOverlay: false,
        showAwakeningOverlay: false,
        awakeningText: '',
        awakeningSkillName: '',

        // ───────── 상수 (매직넘버 제거) ─────────
        DAMAGE_BASE_DIVISOR: 1000,
        FLUCTUATION_MIN: 0.95,
        FLUCTUATION_MAX: 1.05,
        PHASE1_MAX_TURNS: 2,      // Phase1에서 플레이어 최대 행동 횟수
        BOSS_LETHAL_DAMAGE: 99999, // 흑혈마장 확정 킬 데미지
        PHASE3_ENEMY_HP: 800,

        // ─────────────────────────────
        //  이닛
        // ─────────────────────────────
        async init() {
            await this.loadPlayerInfo();
            this.setupPhase1();
            this.startIntroStory();
        },

        async loadPlayerInfo() {
            try {
                const res = await fetch('/api/map/player-info');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.gender || 'MALE';
                    this.playerNickname = data.nickname || '모험가';
                }
            } catch (e) { console.warn('player-info 로딩 실패'); }
        },

        // ─────────────────────────────
        //  Phase 1: 삼류 전투 셋업
        // ─────────────────────────────
        setupPhase1() {
            const isMale = this.playerGender === 'MALE';
            const heroName = isMale ? '남궁천' : '남궁설화';

            // 성별 분기 삼류 스킬
            const weakSkills = isMale
                ? [
                    { id: 'dirt', name: '흙 뿌리기', description: '바닥의 흙을 쥐어 상대에게 뿌린다. 치졸하지만 살기 위해선 어쩔 수 없다.', type: 'DAMAGE', target: 'SINGLE', isUltimate: false, multiplier: 0.3, energyCost: 0, spiritCost: 0, isLock: false },
                    { id: 'flee', name: '36계 줄랑랑', description: '도망치려 했지만... 도망칠 곳이 없다!', type: 'BUFF', target: 'SELF', isUltimate: false, multiplier: 0, energyCost: 0, spiritCost: 0, isLock: false },
                    { id: 'lock1', name: '잠긴 스킬', energyCost: 0, spiritCost: 0, isLock: true },
                    { id: 'lock2', name: '잠긴 스킬', energyCost: 0, spiritCost: 0, isLock: true }
                ]
                : [
                    { id: 'scream', name: '꺄악! 비명지르기', description: '공포에 질린 비명을 지른다. 적의 사기를 미세하게 떨어뜨린다... 고 믿고 싶다.', type: 'DAMAGE', target: 'SINGLE', isUltimate: false, multiplier: 0.15, energyCost: 0, spiritCost: 0, isLock: false },
                    { id: 'cry', name: '울면서 도망가기', description: '눈물을 흘리며 뒷걸음질 친다. 그러나 퇴로는 없다.', type: 'BUFF', target: 'SELF', isUltimate: false, multiplier: 0, energyCost: 0, spiritCost: 0, isLock: false },
                    { id: 'lock1', name: '잠긴 스킬', energyCost: 0, spiritCost: 0, isLock: true },
                    { id: 'lock2', name: '잠긴 스킬', energyCost: 0, spiritCost: 0, isLock: true }
                ];

            const hero = {
                id: 'party-1', type: 'PARTY',
                name: `${this.playerNickname}(${heroName})`,
                hp: 500, maxHp: 500,
                energy: 0, maxEnergy: 5,
                spirit: 0, maxSpirit: 6,
                atk: isMale ? 45 : 25,
                def: isMale ? 30 : 5,
                speed: 100,
                isActive: false, isDead: false,
                standing: isMale ? '/images/char_sprite.png' : '/images/char_sprite_female.png',
                portrait: isMale ? '/images/portrait_male.png' : '/images/portrait_female.png',
                skills: weakSkills
            };
            this.party = [hero, null, null, null];

            const boss = {
                id: 'enemy-1', type: 'ENEMY',
                name: '흑혈마장(黑血魔將)',
                hp: 99999, maxHp: 99999,
                atk: 9999, def: 500, speed: 120,
                isActive: false, isDead: false,
                standing: '/images/enemy_demon_cult_pursuer.png',
                portrait: '/images/enemy_demon_cult_pursuer.png'
            };
            this.enemies = [boss];
            this.selectedTarget = boss.id;
            this.turnQueue = [hero, boss].sort((a, b) => b.speed - a.speed);
            this.phase = 1;
            this.playerTurnCount = 0;
        },

        // ─────────────────────────────
        //  Phase 3: 각성 전투 셋업
        // ─────────────────────────────
        setupPhase3() {
            const isMale = this.playerGender === 'MALE';
            const heroName = isMale ? '남궁천' : '남궁설화';

            // 각성 스킬
            const awakenedSkills = isMale
                ? [
                    { id: 'basic_awaken', name: '창궁검기', description: '창궁대연신공의 기본 검초. 묵직한 검기가 적을 찢는다.', type: 'DAMAGE', target: 'SINGLE', isUltimate: false, multiplier: 1.2, energyCost: -1, spiritCost: 0, isLock: false },
                    { id: 'guard', name: '천검수', description: '검기로 몸을 감싸 방어 태세를 취한다.', type: 'BUFF', target: 'SELF', isUltimate: false, multiplier: 0, energyCost: 1, spiritCost: -1, isLock: false },
                    { id: 'lock1', name: '잠긴 스킬', energyCost: 0, spiritCost: 0, isLock: true },
                    { id: 'ult_chun', name: '창궁일송', description: '창궁대연신공의 오의. 하늘을 가르는 일격이 적의 존재를 소멸시킨다.', type: 'DAMAGE', target: 'SINGLE', isUltimate: true, multiplier: 5.0, energyCost: 0, spiritCost: 6, isLock: false }
                ]
                : [
                    { id: 'basic_awaken', name: '빙백수지', description: '빙백신장의 기본 수법. 차가운 기운이 적을 할퀸다.', type: 'DAMAGE', target: 'SINGLE', isUltimate: false, multiplier: 1.0, energyCost: -1, spiritCost: 0, isLock: false },
                    { id: 'frost', name: '한서린', description: '냉기를 방출하여 적의 속도를 늦춘다.', type: 'BUFF', target: 'SELF', isUltimate: false, multiplier: 0, energyCost: 1, spiritCost: -1, isLock: false },
                    { id: 'lock1', name: '잠긴 스킬', energyCost: 0, spiritCost: 0, isLock: true },
                    { id: 'ult_sulhwa', name: '빙백한풍', description: '빙백신장의 오의. 만년서리의 한기가 만물을 얼려 부순다.', type: 'DAMAGE', target: 'ALL_ENEMY', isUltimate: true, multiplier: 6.0, energyCost: 0, spiritCost: 6, isLock: false }
                ];

            const hero = this.party[0];
            hero.hp = 1200; hero.maxHp = 1200;
            hero.atk = isMale ? 180 : 150;
            hero.def = isMale ? 80 : 40;
            hero.energy = 3; hero.maxEnergy = 5;
            hero.spirit = 6; hero.maxSpirit = 6;
            hero.isDead = false; hero.isActive = false;
            hero.skills = awakenedSkills;

            const minion = {
                id: 'enemy-2', type: 'ENEMY',
                name: '마교 잔당',
                hp: this.PHASE3_ENEMY_HP, maxHp: this.PHASE3_ENEMY_HP,
                atk: 40, def: 30, speed: 60,
                isActive: false, isDead: false,
                standing: '/images/enemy_demon_cult_pursuer.png',
                portrait: '/images/enemy_demon_cult_pursuer.png'
            };
            this.enemies = [minion];
            this.selectedTarget = minion.id;
            this.turnQueue = [hero, minion].sort((a, b) => b.speed - a.speed);
            this.phase = 3;
        },

        // ─────────────────────────────
        //  데미지 공식
        // ─────────────────────────────
        calcDamage(atk, multiplier, targetDef) {
            const defReduction = this.DAMAGE_BASE_DIVISOR / (this.DAMAGE_BASE_DIVISOR + targetDef);
            const fluctuation = this.FLUCTUATION_MIN + Math.random() * (this.FLUCTUATION_MAX - this.FLUCTUATION_MIN);
            return Math.max(1, Math.floor(atk * multiplier * defReduction * fluctuation));
        },

        // ─────────────────────────────
        //  스토리 엔진
        // ─────────────────────────────
        startIntroStory() {
            const heroName = this.playerGender === 'MALE' ? '남궁천' : '남궁설화';
            const isMale = this.playerGender === 'MALE';
            this.storyLines = [
                `(비경의 동굴을 빠져나온 ${heroName}. 그러나 자유의 하늘은 피비린내로 가득했다.)`,
                `"큭... 여기까지 찾아온 건가. 천마의 개들이..."`,
                isMale
                    ? `(수련으로 갈고닦은 검을 쥐었지만... 아직 창궁대연신공은 미완성이다. 지금으로선 삼류 잡기술에 의지할 수밖에 없다.)`
                    : `(빙백신장의 기운이 몸 안에서 요동치지만... 아직 제대로 다스릴 수 없다. 겁에 질린 비명밖에 나오지 않는다.)`,
                `(발밑을 흔드는 거대한 마기(魔氣)... 흑혈마장이 안개 속에서 모습을 드러냈다!)`,
                `[흑혈마장]: "남궁세가의 잔당이 여기에 숨어 있었더냐. 오늘이 네 제삿날이다."`,
                isMale
                    ? `"빌어먹을... 상대가 안 되는 건 알지만, 여기서 죽을 순 없다!"`
                    : `"으으... 무서워... 하지만 도망칠 곳이 없어...!"`
            ];
            this.storyIndex = 0;
            this.gameState = 'STORY_INTRO';
            this.typeNextStoryLine();
        },

        startRescueStory() {
            const heroName = this.playerGender === 'MALE' ? '남궁천' : '남궁설화';
            const isMale = this.playerGender === 'MALE';
            this.storyLines = [
                `(의식이 아득해져 간다... 이대로 끝인 건가...)`,
                `???: "...쯧. 숨이 붙어있구나. 재미있는 녀석이로다."`,
                `(눈을 떠보니 낯선 동굴. 백발의 노인이 무심한 눈으로 내려다보고 있다.)`,
                `[백운거사]: "네 단전에 잠들어 있는 힘의 씨앗... 흥미롭군. 내가 피워주마."`,
                isMale
                    ? `[백운거사]: "이것은... '창궁대연신공(蒼穹大演神功)'의 구결이다. 네 남궁세가 시조의 잃어버린 검결이지."`
                    : `[백운거사]: "이것은... '빙백신장(氷白神掌)'의 비급이다. 만년서리의 정수가 네 혈맥에 스며들 것이야."`,
                isMale
                    ? `(뜨거운 검기(劍氣)가 전신의 경맥을 관통한다! 단전에서 폭풍 같은 내력이 용솟음친다!)`
                    : `(극한의 냉기가 전신의 혈맥을 얼리고 녹인다! 빙백(氷白)의 힘이 피부 아래에서 꿈틀거린다!)`,
                `[백운거사]: "자, 다시 나가거라. 바깥에서 마교 잔당이 설치고 있다. 네 새 힘을 시험할 때다."`,
                isMale
                    ? `"...이 힘이라면. 형님들, 지켜보십시오. 남궁천의 검이 비로소 시작됩니다!"`
                    : `"...이 차가운 힘... 내 것이야. 더 이상 울지 않을 거야. 오빠들의 원수, 내가 반드시 갚아줄게!"`
            ];
            this.storyIndex = 0;
            this.gameState = 'STORY_RESCUE';
            this.typeNextStoryLine();
        },

        typeNextStoryLine() {
            if (this.storyIndex >= this.storyLines.length) {
                this.endCurrentStory();
                return;
            }
            this.isTyping = true;
            const fullText = this.storyLines[this.storyIndex];
            this.currentStoryLine = '';
            let charIdx = 0;
            clearInterval(this.typeInterval);
            this.typeInterval = setInterval(() => {
                this.currentStoryLine += fullText.charAt(charIdx);
                charIdx++;
                if (charIdx >= fullText.length) {
                    clearInterval(this.typeInterval);
                    this.isTyping = false;
                }
            }, 40);
        },

        nextStory() {
            if (this.isTyping) {
                clearInterval(this.typeInterval);
                this.currentStoryLine = this.storyLines[this.storyIndex];
                this.isTyping = false;
            } else {
                this.storyIndex++;
                this.typeNextStoryLine();
            }
        },

        endCurrentStory() {
            if (this.gameState === 'STORY_INTRO') {
                this.gameState = 'PHASE1_BATTLE';
                this.addLog('전투가 시작되었습니다! (삼류 기술로 생존하라!)', 'system');
                setTimeout(() => this.nextTurn(), 800);
            } else if (this.gameState === 'STORY_RESCUE') {
                this.triggerAwakening();
            } else if (this.gameState === 'STORY_PHASE3') {
                this.gameState = 'PHASE3_BATTLE';
                this.addLog('각성한 무공으로 마교 잔당을 처치하라!', 'system');
                setTimeout(() => this.nextTurn(), 800);
            }
        },

        // ─────────────────────────────
        //  강제 패배 연출
        // ─────────────────────────────
        async triggerScriptedDefeat() {
            this.gameState = 'SCRIPTED_DEFEAT';
            this.isPlayerTurn = false;

            this.addLog('[흑혈마장] 의 파멸적인 일격!', 'enemy');
            await this.sleep(600);

            // 화면 흔들기
            document.body.classList.add('hit-shake');
            const hero = this.party[0];
            hero.hp = 0;
            hero.isDead = true;
            this.addLog(`[${hero.name}]은 의식을 잃었다...`, 'system');

            await this.sleep(800);
            document.body.classList.remove('hit-shake');

            // 패배 오버레이
            this.showDefeatOverlay = true;
            await this.sleep(3500);
            this.showDefeatOverlay = false;

            // 구출 스토리 시작
            this.startRescueStory();
        },

        // ─────────────────────────────
        //  각성 연출
        // ─────────────────────────────
        async triggerAwakening() {
            this.gameState = 'AWAKENING';
            const isMale = this.playerGender === 'MALE';

            this.awakeningSkillName = isMale ? '창궁일송(蒼穹一松)' : '빙백한풍(氷白寒風)';
            this.awakeningText = isMale
                ? '삼류 잡기술 [흙 뿌리기]가 창궁대연신공의 오의 [창궁일송]으로 진화했다!'
                : '삼류 잡기술 [꺄악! 비명지르기]가 빙백신장의 오의 [빙백한풍]으로 진화했다!';

            this.showAwakeningOverlay = true;
            this.addLog(`✨ 스킬이 각성했습니다! [${this.awakeningSkillName}]`, 'skill');

            await this.sleep(4000);
            this.showAwakeningOverlay = false;

            // Phase 3 셋업
            this.setupPhase3();

            // Phase 3 스토리
            const heroName = isMale ? '남궁천' : '남궁설화';
            this.storyLines = [
                `(동굴 밖으로 나서자, 마교 잔당 하나가 근처 마을 사람들을 위협하고 있다.)`,
                `[마교 잔당]: "뭐야, 꼬맹이가 어디서 기어 나왔어? 꺼져, 안 그러면 목을 딴다!"`,
                isMale
                    ? `"...더 이상은 물러서지 않는다. 이 검으로 네 놈부터 베어주마!"`
                    : `"...이제 난 울지 않아. 이 한기(寒氣)로 네 뼈를 얼려버릴 거야."`
            ];
            this.storyIndex = 0;
            this.gameState = 'STORY_PHASE3';
            this.typeNextStoryLine();
        },

        // ─────────────────────────────
        //  턴 제어
        // ─────────────────────────────
        nextTurn() {
            if (this.enemies.every(e => e.isDead)) return this.handleWin();
            if (this.gameState === 'SCRIPTED_DEFEAT' || this.gameState === 'AWAKENING') return;

            const current = this.turnQueue[0];
            this.currentActor = current;

            this.party.forEach(p => p && (p.isActive = false));
            this.enemies.forEach(e => e.isActive = false);
            current.isActive = true;

            if (current.isDead) { this.endTurn(); return; }

            if (current.type === 'PARTY') {
                const validState = this.phase === 1 ? 'PHASE1_BATTLE' : 'PHASE3_BATTLE';
                this.gameState = validState === 'PHASE1_BATTLE' ? 'WAITING_INPUT' : 'WAITING_INPUT';
                this.isPlayerTurn = true;

                if (this.phase === 1) {
                    this.addLog('[가이드] 사용 가능한 기술로 저항하세요!', 'skill');
                } else if (this.phase === 3) {
                    const ultSkill = current.skills.find(s => s.isUltimate && !s.isLock);
                    if (ultSkill) {
                        this.addLog(`[가이드] 각성한 [${ultSkill.name}]으로 적을 쓰러뜨리세요!`, 'skill');
                    }
                }
            } else {
                this.gameState = 'ENEMY_TURN';
                this.isPlayerTurn = false;
                this.executeEnemyTurn(current);
            }
        },

        // ─────────────────────────────
        //  플레이어 행동
        // ─────────────────────────────
        async executeAction(skillIndex) {
            if (this.gameState !== 'WAITING_INPUT') return;

            const actor = this.currentActor;
            const skill = actor.skills[skillIndex];
            if (!skill || skill.isLock) return;

            // 리소스 체크
            if (skill.energyCost > 0 && actor.energy < skill.energyCost) {
                this.addLog(`기력이 부족합니다! [필요: ${skill.energyCost}]`, 'system');
                return;
            }
            if (skill.spiritCost > 0 && actor.spirit < skill.spiritCost) {
                this.addLog(`투기가 부족합니다! [필요: ${skill.spiritCost}]`, 'system');
                return;
            }

            this.gameState = 'ANIMATING';
            this.isPlayerTurn = false;

            // 리소스 소비/회복
            if (skill.energyCost !== 0) actor.energy = Math.max(0, Math.min(actor.maxEnergy, actor.energy - skill.energyCost));
            if (skill.spiritCost !== 0) actor.spirit = Math.max(0, Math.min(actor.maxSpirit, actor.spirit - skill.spiritCost));

            const target = this.enemies.find(e => e.id === this.selectedTarget && !e.isDead) || this.enemies.find(e => !e.isDead);

            if (skill.type === 'BUFF') {
                this.addLog(`[${actor.name}]의 [${skill.name}]! ...하지만 효과는 미미했다.`, 'player');
                await this.sleep(600);
            } else if (skill.isUltimate) {
                // 궁극기! Phase 3 전용
                this.addLog(`[${actor.name}]이(가) 각성 오의 [${skill.name}]을(를) 해방합니다!!`, 'skill');
                await this.playUltimateAnimation();
                const dmg = this.calcDamage(actor.atk, skill.multiplier, target.def);
                await this.playHitAnimation(target, Math.max(dmg, target.hp + 100), true); // 확정 처치
            } else {
                // 일반 공격
                const dmg = this.calcDamage(actor.atk, skill.multiplier, target.def);
                this.addLog(`[${actor.name}]의 [${skill.name}]! ${dmg}의 피해!`, 'player');
                await this.playHitAnimation(target, dmg, false);
            }

            // Phase 1 턴 카운팅
            if (this.phase === 1) {
                this.playerTurnCount++;
            }

            this.endTurn();
        },

        // ─────────────────────────────
        //  적 행동
        // ─────────────────────────────
        executeEnemyTurn(actor) {
            if (this.phase === 1) {
                // Phase 1: 플레이어가 충분히 행동했으면 강제 패배 트리거
                if (this.playerTurnCount >= this.PHASE1_MAX_TURNS) {
                    this.triggerScriptedDefeat();
                    return;
                }
                // 아직 행동 횟수 부족하면 가벼운 공격
                this.addLog(`[${actor.name}]의 위압적인 기파(氣波)!`, 'enemy');
                setTimeout(async () => {
                    const target = this.party.find(p => p && !p.isDead);
                    if (!target) return;
                    document.body.classList.add('hit-shake');
                    const dmg = Math.floor(target.maxHp * 0.2); // HP 20% 고정 데미지
                    target.hp = Math.max(1, target.hp - dmg); // 절대 죽지 않음
                    this.addLog(`[${target.name}]이(가) ${dmg}의 피해를 입었다!`, 'system');
                    setTimeout(() => {
                        document.body.classList.remove('hit-shake');
                        this.endTurn();
                    }, 500);
                }, 800);

            } else if (this.phase === 3) {
                // Phase 3: 약한 공격
                this.addLog(`[${actor.name}]이(가) 덤벼든다!`, 'enemy');
                setTimeout(async () => {
                    const target = this.party.find(p => p && !p.isDead);
                    if (!target) return;
                    document.body.classList.add('hit-shake');
                    const dmg = this.calcDamage(actor.atk, 1.0, target.def);
                    target.hp = Math.max(1, target.hp - dmg);
                    this.addLog(`[${target.name}]이(가) ${dmg}의 피해를 입었다.`, 'system');
                    setTimeout(() => {
                        document.body.classList.remove('hit-shake');
                        this.endTurn();
                    }, 500);
                }, 800);
            }
        },

        endTurn() {
            const current = this.turnQueue.shift();
            if (current) {
                current.isActive = false;
                this.turnQueue.push(current);
            }
            this.currentActor = null;
            setTimeout(() => this.nextTurn(), 500);
        },

        // ─────────────────────────────
        //  애니메이션
        // ─────────────────────────────
        playHitAnimation(target, damage, isCritical = false) {
            return new Promise((resolve) => {
                const targetEl = document.getElementById(`enemy-${target.id}`);
                const damageLayer = document.getElementById(`damage-layer-${target.id}`);

                if (damageLayer) {
                    const dmgEl = document.createElement('div');
                    dmgEl.className = 'dmg-text ' + (isCritical ? 'critical' : '');
                    dmgEl.innerText = damage;
                    dmgEl.style.left = '50%';
                    dmgEl.style.top = '20%';
                    damageLayer.appendChild(dmgEl);
                    setTimeout(() => dmgEl.remove(), 1200);
                }

                if (targetEl) targetEl.classList.add('hit-shake');

                target.hp = Math.max(0, target.hp - damage);
                if (target.hp <= 0) {
                    target.hp = 0;
                    target.isDead = true;
                    this.addLog(`[${target.name}]을(를) 처치했습니다!`, 'system');
                }

                setTimeout(() => {
                    if (targetEl) targetEl.classList.remove('hit-shake');
                    resolve();
                }, 800);
            });
        },

        playUltimateAnimation() {
            return new Promise((resolve) => {
                const targetId = this.selectedTarget || (this.enemies[0] && this.enemies[0].id);
                const layer = document.getElementById(`effect-layer-${targetId}`);
                if (!layer) return resolve();

                const effectEl = document.createElement('div');
                effectEl.className = this.playerGender === 'MALE' ? 'slash-effect' : 'ice-explosion';
                layer.appendChild(effectEl);
                setTimeout(() => { effectEl.remove(); resolve(); }, 700);
            });
        },

        // ─────────────────────────────
        //  승리 처리
        // ─────────────────────────────
        async handleWin() {
            this.gameState = 'WIN';
            this.currentActor = null;
            this.addLog('👑 전투에서 승리했습니다!', 'system');

            try {
                await fetch('/api/tutorial/complete-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: 5 })
                });
                this.addLog('🎁 주인공 캐릭터와 초보자 골드 5,000이 지급되었습니다!', 'skill');
            } catch (e) { console.warn('튜토리얼 완료 API 실패:', e); }

            setTimeout(() => {
                const whiteOut = document.getElementById('whiteOut');
                if (whiteOut) whiteOut.classList.add('active');
                setTimeout(() => { window.location.href = '/town'; }, 2000);
            }, 1500);
        },

        // ─────────────────────────────
        //  유틸
        // ─────────────────────────────
        addLog(message, type = 'system') {
            const now = new Date();
            const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            this.logs.push({ time: ts, message, type });
            if (this.logs.length > 50) this.logs.shift();
            setTimeout(() => {
                const el = document.getElementById('log-container');
                if (el) el.scrollTop = el.scrollHeight;
            }, 50);
        },

        selectTarget(enemy) { if (!enemy.isDead) this.selectedTarget = enemy.id; },

        sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    }));
});
