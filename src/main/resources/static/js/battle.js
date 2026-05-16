/**
 * battle.js — 범용 메인 스토리 전투 엔진
 * URL 파라미터: ?act=1&stage=3
 * 서버에서 스테이지 적 데이터 + 유저 파티 데이터를 로딩하여 CTB 전투 수행
 */
document.addEventListener('alpine:init', () => {
    Alpine.data('battleApp', () => ({
        // URL 파라미터
        stageId: 1,
        actNum: 1,
        stageNum: 1,
        bgImage: '/images/bg_estate_fire.png',

        // 엔티티
        party: [],
        enemies: [],
        turnQueue: [],
        logs: [],
        currentActor: null,
        selectedTarget: null,

        // 상태
        gameState: 'LOADING', // LOADING, WAITING_INPUT, ANIMATING, ENEMY_TURN, WIN, LOSE
        isPlayerTurn: false,
        turnCount: 0,
        teamEnergy: 3,        // 팀 공용 스킬 포인트 (기력) 시작값 3
        teamMaxEnergy: 5,     // 팀 공용 스킬 포인트 최대값 5


        // 보상
        battleStars: 0,
        rewardGold: 0,
        rewardExp: 0,

        async init() {
            // URL에서 파라미터 파싱
            const params = new URLSearchParams(window.location.search);
            this.stageId = parseInt(params.get('stageId') || '1');
            this.actNum = parseInt(params.get('act') || '1');
            this.stageNum = parseInt(params.get('stage') || '1');

            await this.loadBattleData();
        },

        async loadBattleData() {
            try {
                // 스테이지 데이터 + 파티 데이터 동시 로딩
                const [stageRes, partyRes] = await Promise.all([
                    fetch(`/api/stage/data?stageId=${this.stageId}`),
                    fetch('/api/stage/party')
                ]);

                const stageData = await stageRes.json();
                const partyData = await partyRes.json();

                if (!stageData.success || !partyData.success) {
                    this.addLog('데이터 로딩 실패. 스테이지 선택으로 돌아갑니다.', 'system');
                    setTimeout(() => window.location.href = '/stage-select', 2000);
                    return;
                }

                this.bgImage = stageData.stage.bgImage || '/images/bg_main.png';
                this.actNum = stageData.stage.act || this.actNum;
                this.stageNum = stageData.stage.stage || this.stageNum;
                
                this.setupEnemies(stageData.stage.enemies);
                this.setupParty(partyData.party, partyData.nickname, partyData.gender);
                this.buildTurnQueue();

                this.addLog(stageData.stage.title ? `${stageData.stage.title} — 전투 개시!` : `${this.actNum}막 ${this.stageNum}관문 — 전투 개시!`, 'system');
                this.gameState = 'START';

                setTimeout(() => this.nextTurn(), 1000);

            } catch (e) {
                console.error('전투 데이터 로딩 실패:', e);
                this.addLog('서버 연결 실패. 잠시 후 다시 시도해 주세요.', 'system');
            }
        },

        setupEnemies(enemiesData) {
            this.enemies = enemiesData.map(e => ({
                id: e.id,
                type: 'ENEMY',
                name: e.name,
                hp: e.hp,
                maxHp: e.hp,
                atk: e.atk,
                def: e.def || 10,
                speed: e.spd || 90,
                isActive: false,
                isDead: false,
                portrait: e.portrait || '/images/enemy_demon_cult_pursuer.png',
                element: e.element || 'NONE' // 밸런싱용 속성 데이터 바인딩 추가
            }));
        },

        setupParty(partyData, nickname, gender) {
            if (!partyData || partyData.length === 0) {
                // 파티 데이터가 없으면 폴백 (기본 캐릭터)
                const fallback = {
                    id: 'party-1', type: 'PARTY', name: nickname || '모험가',
                    hp: 1200, maxHp: 1200, spirit: 0, maxSpirit: 6,
                    atk: 150, def: 75, speed: 100, isActive: false, isDead: false,
                    standing: gender === 'FEMALE' ? '/images/char_sprite_female.png' : '/images/char_sprite.png',
                    portrait: gender === 'FEMALE' ? '/images/portrait_female.png' : '/images/portrait_male.png',
                    skills: [
                        { id: 's1', name: '기본 공격', type: 'DAMAGE', target: 'SINGLE', isUltimate: false, multiplier: 1.0, energyCost: -1, spiritCost: 0, isLock: false },
                        { id: 's2', name: '강타', type: 'DAMAGE', target: 'SINGLE', isUltimate: false, multiplier: 1.5, energyCost: 2, spiritCost: 0, isLock: false },
                        { id: 's3', name: '기합', type: 'BUFF', target: 'SELF', isUltimate: false, multiplier: 0, energyCost: 1, spiritCost: -2, isLock: false },
                        { id: 'locked', name: '잠김', isLock: true, energyCost: 0, spiritCost: 0 }
                    ]
                };
                this.party = [fallback, null, null, null];
                return;
            }

            this.party = Array(4).fill(null);
            partyData.forEach((charData, idx) => {
                if (idx >= 4) return;

                // 스킬 슬롯 구성 (4칸 고정)
                let preparedSkills = Array(4).fill(null).map(() => ({ id: 'locked', name: '잠김', isLock: true, energyCost: 0, spiritCost: 0 }));
                let normalIdx = 0;
                (charData.skills || []).forEach(s => {
                    const sd = {
                        id: s.id, name: s.name, description: s.description,
                        type: s.type || 'DAMAGE', target: s.target || 'SINGLE_ENEMY',
                        isUltimate: s.isUltimate || false,
                        multiplier: s.multiplier || 1.0,
                        energyCost: s.energyCost || 0,
                        spiritCost: s.spiritCost || 0,
                        isLock: false
                    };
                    if (s.isUltimate) {
                        preparedSkills[3] = sd;
                    } else if (normalIdx < 3) {
                        preparedSkills[normalIdx] = sd;
                        normalIdx++;
                    }
                });

                this.party[idx] = {
                    id: charData.id || `party-${idx + 1}`,
                    type: 'PARTY',
                    name: charData.name,
                    hp: (charData.hp || 100) * 10,
                    maxHp: (charData.hp || 100) * 10,
                    spirit: 0, maxSpirit: 6,
                    atk: (charData.atk || 15) * 5,
                    def: (charData.def || 10) * 5,
                    speed: charData.spd || 100,
                    isActive: false,
                    isDead: false,
                    standing: charData.imagePath || '/images/portrait_male.png',
                    portrait: charData.imagePath || '/images/portrait_male.png',
                    skills: preparedSkills
                };
            });
        },

        buildTurnQueue() {
            const allEntities = [
                ...this.party.filter(p => p !== null),
                ...this.enemies
            ];
            this.turnQueue = allEntities.sort((a, b) => b.speed - a.speed);
        },

        nextTurn() {
            // 승패 체크
            if (this.enemies.every(e => e.isDead)) return this.handleWin();
            if (this.party.filter(p => p !== null).every(p => p.isDead)) return this.handleLose();

            // 턴 큐에서 다음 살아있는 유닛
            let attempts = 0;
            while (attempts < this.turnQueue.length) {
                const current = this.turnQueue[0];
                if (current.isDead) {
                    this.turnQueue.push(this.turnQueue.shift());
                    attempts++;
                    continue;
                }

                this.currentActor = current;
                this.party.forEach(p => p && (p.isActive = false));
                this.enemies.forEach(e => e.isActive = false);
                current.isActive = true;

                if (current.type === 'PARTY') {
                    this.gameState = 'WAITING_INPUT';
                    this.isPlayerTurn = true;
                    this.turnCount++;
                } else {
                    this.gameState = 'ENEMY_TURN';
                    this.isPlayerTurn = false;
                    this.executeEnemyTurn(current);
                }
                return;
            }
        },

        addLog(message, type = 'system') {
            this.logs.push({ message, type });
            if (this.logs.length > 30) this.logs.shift();
            setTimeout(() => {
                const c = document.getElementById('log-container');
                if (c) c.scrollTop = c.scrollHeight;
            }, 30);
        },

        selectTarget(enemy) {
            if (!enemy.isDead) this.selectedTarget = enemy.id;
        },

        /**
         * [형이 리팩토링한 공격 핵심 실행 로직]
         * 무지성 수식 계산 제거 -> 백엔드 컨트롤러 비동기 통신 연동 완료
         */
        async executeAction(skillIndex) {
            if (this.gameState !== 'WAITING_INPUT') return;

            const actor = this.currentActor;
            const skill = actor.skills[skillIndex];
            if (skill.isLock) return;

            // 자원 체크
            if (skill.energyCost > 0 && this.teamEnergy < skill.energyCost) {
                this.addLog(`팀 기력 불충분! (필요: ${skill.energyCost}, 현재: ${this.teamEnergy})`, 'system');
                return;
            }
            if (skill.spiritCost > 0 && actor.spirit < skill.spiritCost) {
                this.addLog(`투기 부족! (필요: ${skill.spiritCost})`, 'system');
                return;
            }

            // 타겟 선정 (선택된 타겟이 없거나 죽었으면 살아있는 첫 번째 적 분기)
            const target = this.enemies.find(e => e.id === this.selectedTarget && !e.isDead)
                || this.enemies.find(e => !e.isDead);

            if (!target) { this.endTurn(); return; }

            this.gameState = 'ANIMATING';
            this.isPlayerTurn = false;

            const preEnergy = this.teamEnergy;
            const preSpirit = actor.spirit;

            // 자원 소모/회복
            if (skill.energyCost !== 0) this.teamEnergy = Math.max(0, Math.min(this.teamMaxEnergy, this.teamEnergy - skill.energyCost));
            if (skill.spiritCost !== 0) actor.spirit = Math.max(0, Math.min(actor.maxSpirit, actor.spirit - skill.spiritCost));

            // 투기 자동 회복 (공격 시 1 회복)
            if (skill.type === 'DAMAGE' || skill.type === 'NORMAL') {
                actor.spirit = Math.min(actor.maxSpirit, actor.spirit + 1);
            }

            // 버프 스킬일 경우 바로 로그 찍고 패스
            if (skill.type === 'BUFF' || skill.type === 'BATTLE') {
                this.addLog(`[${actor.name}] ${skill.name}!`, 'player');
                await this.delay(500);
                this.endTurn();
                return;
            }

            // ★ [시니어 디렉터 연동 부분]: 백엔드로 공격 연산 비동기 패치 찌르기
            let finalDamage = 0;
            let isCritical = false;
            let elementEffect = 1.0;

            try {
                const response = await fetch('/api/battle/attack', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        attackerId: actor.id,                       // 시전 캐릭터 고유 ID
                        skillId: skill.id,                          // 시전 무공 고유 ID
                        defenderElement: target.element || 'NONE',  // 피격 몬스터 속성 이넘
                        defenderDef: target.def,                    // 피격 몬스터 방어력
                        currentEnergy: preEnergy,                   // 소모 전 기준 파티 기력
                        currentSpirit: preSpirit                    // 소모 전 기준 개인 투기
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText);
                }

                // 백엔드의 BattleDamageResult 자바 객체가 JSON으로 수신됨
                const resultData = await response.json();
                finalDamage = resultData.finalDamage;
                isCritical = resultData.isCritical;
                elementEffect = resultData.elementEffect;

            } catch (err) {
                console.error("서버 공격 연산 실패, 클라이언트 폴백 가동:", err);
                // 서버 터졌을 때 전투가 굳어버리는 걸 막기 위한 시니어의 최소 방어선(폴백) 로직
                finalDamage = Math.floor(actor.atk * (skill.multiplier || 1.0));
                isCritical = false;
            }

            // 무공 종류에 따른 화면 이펙트 및 대미지 레이어 노출 분기
            if (skill.isUltimate) {
                this.addLog(`[${actor.name}] 궁극기 [${skill.name}] 해방!`, 'skill');
                await this.playUltEffect(target);
            } else {
                this.addLog(`[${actor.name}] ${skill.name}!`, 'player');
            }

            // 상성 이펙트 메시지 로그 추가
            if (elementEffect > 1.0) {
                this.addLog(`⚡ 효과가 굉장했다! (상성 우위)`, 'system');
            } else if (elementEffect < 1.0) {
                this.addLog(`💤 효과가 미미했다... (상성 열세)`, 'system');
            }

            // 최종 계산된 데미지와 크리티컬 여부를 타격 이펙트 함수로 전달!
            await this.playHit(target, finalDamage, isCritical);

            this.endTurn();
        },

        executeEnemyTurn(actor) {
            this.addLog(`[${actor.name}]의 공격!`, 'enemy');

            setTimeout(() => {
                const aliveParty = this.party.filter(p => p && !p.isDead);
                if (aliveParty.length === 0) { this.endTurn(); return; }

                const target = aliveParty[Math.floor(Math.random() * aliveParty.length)];
                const dmg = Math.max(1, actor.atk - Math.floor(target.def * 0.3));

                target.hp -= dmg;
                this.addLog(`[${target.name}] ${dmg} 데미지! (HP: ${Math.max(0, target.hp)})`, 'enemy');

                document.body.classList.add('hit-shake');
                setTimeout(() => document.body.classList.remove('hit-shake'), 400);

                if (target.hp <= 0) {
                    target.hp = 0;
                    target.isDead = true;
                    this.addLog(`[${target.name}] 쓰러졌습니다!`, 'system');
                }

                setTimeout(() => this.endTurn(), 500);
            }, 800);
        },

        endTurn() {
            const current = this.turnQueue.shift();
            if (current) {
                current.isActive = false;
                this.turnQueue.push(current);
            }
            this.currentActor = null;
            setTimeout(() => this.nextTurn(), 400);
        },

        playHit(target, damage, isCrit) {
            return new Promise(resolve => {
                const targetEl = document.getElementById(`enemy-${target.id}`);
                const damageLayer = document.getElementById(`damage-layer-${target.id}`);

                if (damageLayer) {
                    const dmgEl = document.createElement('div');
                    dmgEl.className = 'dmg-text ' + (isCrit ? 'critical' : '');
                    dmgEl.innerText = damage;
                    dmgEl.style.left = '50%';
                    dmgEl.style.top = '15%';
                    damageLayer.appendChild(dmgEl);
                    setTimeout(() => dmgEl.remove(), 900);
                }

                // 크리티컬이 터지면 적을 더 세게 흔드는 '꼴값 연출' 가능구간
                if (targetEl) targetEl.classList.add('hit-shake');

                target.hp -= damage;
                if (target.hp <= 0) {
                    target.hp = 0;
                    target.isDead = true;
                    this.addLog(`[${target.name}] 쓰러졌습니다!`, 'system');
                }

                setTimeout(() => {
                    if (targetEl) targetEl.classList.remove('hit-shake');
                    resolve();
                }, 600);
            });
        },

        playUltEffect(target) {
            return new Promise(resolve => {
                const layer = document.getElementById(`effect-layer-${target.id}`);
                if (!layer) return resolve();
                const el = document.createElement('div');
                el.className = 'slash-effect';
                layer.appendChild(el);
                setTimeout(() => { el.remove(); resolve(); }, 550);
            });
        },

        async handleWin() {
            this.gameState = 'WIN';
            this.currentActor = null;

            // 별점 계산: 살아있는 파티원 수 기반
            const alive = this.party.filter(p => p && !p.isDead).length;
            const total = this.party.filter(p => p !== null).length;
            this.battleStars = alive === total ? 3 : alive >= Math.ceil(total / 2) ? 2 : 1;

            // 보상 API 호출
            try {
                const res = await fetch('/api/stage/result', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        stageId: this.stageId,
                        act: this.actNum,
                        stage: this.stageNum,
                        win: true,
                        stars: this.battleStars
                    })
                });
                const data = await res.json();
                if (data.success && data.rewards) {
                    this.rewardGold = data.rewards.gold || 0;
                    this.rewardExp = data.rewards.exp || 0;
                }
            } catch (e) {
                console.warn('보상 API 호출 실패:', e);
                this.rewardGold = 0;
                this.rewardExp = 0;
            }

            this.addLog(`전투 승리! ★${this.battleStars}`, 'system');
        },

        handleLose() {
            this.gameState = 'LOSE';
            this.currentActor = null;
            this.addLog(`전투 패배...`, 'system');
        },

        returnToStageSelect() {
            window.location.href = '/stage-select';
        },

        retryBattle() {
            window.location.reload();
        },

        delay(ms) {
            return new Promise(r => setTimeout(r, ms));
        }
    }));
});