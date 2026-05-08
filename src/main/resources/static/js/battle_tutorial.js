document.addEventListener('alpine:init', () => {
    Alpine.data('battleApp', () => ({
        
        playerGender: 'MALE',
        playerNickname: '모험가',

        // 파티 최대 4인 배열 (튜토리얼은 1명만 할당하고 나머지는 null)
        party: [null, null, null, null],
        
        // 적군 배열
        enemies: [],

        turnQueue: [],      // 화면 상단 타임라인 렌더링 및 턴 순서용 큐 [Entity, Entity...]
        logs: [],           // 전투 로그
        
        // 현재 조작 중인(턴이 온) 엔티티
        currentActor: null,
        // 타겟팅 시스템 (기사 스킬 등)
        selectedTarget: null,

        gameState: 'START', // START, WAITING_INPUT, ANIMATING, WIN, LOSE
        isPlayerTurn: false,

        async init() {
            await this.loadPlayerInfo();
            this.setupEntities();
            this.startBattle();
        },

        async loadPlayerInfo() {
            try {
                const res = await fetch('/api/map/player-info');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.gender || 'MALE';
                    this.playerNickname = data.nickname || '모험가';
                }
            } catch (e) {
                // Ignore API error in static testing
            }
        },

        setupEntities() {
            // [1] 주인공(플레이어) 세팅
            const hero = {
                id: 'party-1',
                type: 'PARTY',
                name: this.playerNickname,
                hp: 1200, maxHp: 1200,
                mp: 100, maxMp: 100,
                speed: 120, // 선턴
                isActive: false,
                isDead: false,
                standing: this.playerGender === 'MALE' ? '/images/char_sprite.png' : '/images/char_sprite_female.png', // 추후 전신 일러스트로 교체 가능
                portrait: this.playerGender === 'MALE' ? '/images/portrait_male.png' : '/images/portrait_female.png',
                skills: [
                    { id: 'attack', name: '기본 공격', cost: 0 },
                    { id: 'defend', name: '방어', cost: 0 },
                    { id: 'locked', name: '잠김', cost: 0 },
                    { id: 'ult', name: this.playerGender === 'MALE' ? '제황검형 (궁극)' : '빙백신검 (궁극)', cost: 100 }
                ]
            };
            this.party[0] = hero;

            // [2] 튜토리얼 보스(적군) 세팅
            const boss = {
                id: 'enemy-1',
                type: 'ENEMY',
                name: '천마신교 추격자',
                hp: 99999, maxHp: 99999,
                speed: 80,
                isActive: false,
                isDead: false,
                standing: '/images/portrait_guard.png',
                portrait: '/images/portrait_guard.png'
            };
            this.enemies.push(boss);
            this.selectedTarget = boss.id;

            // 턴 큐 병합 및 정렬 (Speed 내림차순)
            this.turnQueue = [hero, boss].sort((a, b) => b.speed - a.speed);
            
            this.addLog(`야생의 [${boss.name}] 가 길을 막아섰습니다!`, 'system');
            if(this.playerGender === 'FEMALE') {
                this.addLog('✨ [패시브] 빙백신공이 발동되어 온도가 급격히 낮아집니다.', 'skill');
            } else {
                this.addLog('✨ [패시브] 창궁대연신공이 단전을 돌며 검기를 증폭시킵니다.', 'skill');
            }
        },

        startBattle() {
            setTimeout(() => {
                this.nextTurn();
            }, 1000);
        },

        addLog(message, type = 'system') {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            this.logs.push({ time: timeStr, message, type });
            
            setTimeout(() => {
                const container = document.getElementById('log-container');
                if(container) container.scrollTop = container.scrollHeight;
            }, 50);
        },

        selectTarget(enemy) {
            if(!enemy.isDead) {
                this.selectedTarget = enemy.id;
            }
        },

        nextTurn() {
            // 생존 적이 없으면 승리
            if (this.enemies.every(e => e.isDead)) return this.handleWin();

            // 턴 큐의 첫 번째 엔티티 가져오기
            const current = this.turnQueue[0];
            this.currentActor = current;

            // 모든 엔티티의 빛남(장판) 끄고, 현재 엔티티만 활성화
            this.party.forEach(p => p && (p.isActive = false));
            this.enemies.forEach(e => e.isActive = false);
            current.isActive = true;

            if (current.isDead) {
                // 죽어있으면 쿨하게 패스
                this.endTurn();
                return;
            }

            if (current.type === 'PARTY') {
                this.gameState = 'WAITING_INPUT';
                this.isPlayerTurn = true;
                this.addLog(`[${current.name}] 의 턴! 명령을 대기합니다.`, 'system');
            } else {
                this.gameState = 'ENEMY_TURN';
                this.isPlayerTurn = false;
                this.executeEnemyTurn(current);
            }
        },

        async executeAction(skillIndex) {
            this.gameState = 'ANIMATING';
            this.isPlayerTurn = false;
            
            const actor = this.currentActor;
            const target = this.enemies.find(e => e.id === this.selectedTarget) || this.enemies[0];

            if (skillIndex === 0) { // 기본 공격
                this.addLog(`[${actor.name}] 의 기본 공격!`, 'player');
                await this.playHitAnimation(target, 125, false);
                this.endTurn();
            } 
            else if (skillIndex === 1) { // 방어
                this.addLog(`[${actor.name}] 과(와) 방어 태세를 취했다.`, 'player');
                await new Promise(r => setTimeout(r, 600));
                this.endTurn();
            }
            else if (skillIndex === 3) { // 궁극기
                this.addLog(`[${actor.name}] 이 궁극기 [${actor.skills[3].name}] 를 해방합니다!!`, 'skill');
                
                await this.playUltimateAnimation();
                await this.playHitAnimation(target, 99999, true); 
                this.endTurn();
            }
        },

        executeEnemyTurn(actor) {
            this.addLog(`[${actor.name}] 의 매서운 공격!`, 'enemy');
            
            setTimeout(async () => {
                // 랜덤한 살아있는 아군 타겟
                const aliveParty = this.party.filter(p => p && !p.isDead);
                const target = aliveParty[0];

                document.body.classList.add('hit-shake');
                this.addLog(`[${target.name}] 는 0의 데미지를 입었다...! (튜토리얼 보정)`, 'system');
                target.hp -= 0; 
                
                setTimeout(() => {
                    document.body.classList.remove('hit-shake');
                    this.endTurn();
                }, 500);

            }, 1000);
        },

        endTurn() {
            // 현재 엔티티 맨 뒤로 보내서 타임라인 순환
            const current = this.turnQueue.shift();
            current.isActive = false;
            this.turnQueue.push(current);
            
            this.currentActor = null; // 대기 모드 UI 처리 위해 제거

            setTimeout(() => {
                this.nextTurn();
            }, 600);
        },

        playHitAnimation(target, damage, isCritical = false) {
            return new Promise((resolve) => {
                const targetEl = document.getElementById(`enemy-${target.id}`);
                const damageLayer = document.getElementById(`damage-layer-${target.id}`);
                
                const dmgEl = document.createElement('div');
                dmgEl.className = 'dmg-text ' + (isCritical ? 'critical' : '');
                dmgEl.innerText = damage;
                dmgEl.style.left = `50%`;
                dmgEl.style.top = `20%`;
                
                damageLayer.appendChild(dmgEl);
                if(targetEl) targetEl.classList.add('hit-shake');

                target.hp -= damage;
                if(target.hp <= 0) {
                    target.hp = 0;
                    target.isDead = true;
                    this.addLog(`치명타! [${target.name}] 가 쓰러졌습니다!`, 'system');
                }

                setTimeout(() => {
                    if(targetEl) targetEl.classList.remove('hit-shake');
                    dmgEl.remove();
                    resolve();
                }, 800);
            });
        },

        playUltimateAnimation() {
            return new Promise((resolve) => {
                // 궁극기 이펙트는 화면 중앙 적군 영역 전체에서 발생하도록 조치
                const targetId = this.selectedTarget || this.enemies[0].id;
                const layer = document.getElementById(`effect-layer-${targetId}`);
                if (!layer) return resolve();

                const effectEl = document.createElement('div');
                if (this.playerGender === 'MALE') {
                    effectEl.className = 'slash-effect'; // 제황검형
                } else {
                    effectEl.className = 'ice-explosion'; // 빙백신검
                }

                layer.appendChild(effectEl);
                setTimeout(() => {
                    effectEl.remove();
                    resolve();
                }, 700);
            });
        },

        handleWin() {
            this.gameState = 'WIN';
            this.currentActor = null;
            this.addLog(`👑 전투에서 승리했습니다! 무림맹 본산으로 귀환합니다.`, 'system');
            
            setTimeout(() => {
                document.getElementById('whiteOut').classList.add('active');
                
                setTimeout(() => {
                    window.location.href = '/town';
                }, 2000);
            }, 1000);
        }

    }));
});
