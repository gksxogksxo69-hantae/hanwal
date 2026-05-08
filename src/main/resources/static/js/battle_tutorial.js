document.addEventListener('alpine:init', () => {
    Alpine.data('battleApp', () => ({
        
        playerGender: 'MALE',
        playerNickname: '모험가',
        ultName: '제황검형 (궁극기)',

        // 엔티티 스탯
        player: {
            id: 'PLAYER',
            name: '모험가',
            hp: 500,
            maxHp: 500,
            speed: 120, // 속도 높음 (선턴)
            portrait: '/images/portrait_male.png'
        },
        enemy: {
            id: 'ENEMY',
            name: '천마신교 추격자',
            hp: 9999, // 튜토리얼 몹 체력 비정상적으로 높게 설정 
            maxHp: 9999,
            speed: 80,
            portrait: '/images/portrait_guard.png',
            isDead: false
        },

        turnQueue: [],      // 턴 큐 [Entity, Entity]
        logs: [],           // 전투 로그 { time, message, type: 'system'|'player'|'enemy'|'skill' }
        
        // 상태 머신: START -> WAITING_INPUT -> ANIMATING -> ENEMY_TURN -> WIN/LOSE
        gameState: 'START',
        isPlayerTurn: false,

        async init() {
            await this.loadPlayerInfo();
            this.setupInitialState();
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

            this.player.name = this.playerNickname;
            if (this.playerGender === 'MALE') {
                this.ultName = '제황검형 (궁극)';
                this.player.portrait = '/images/portrait_male.png';
            } else {
                this.ultName = '빙백신검 (궁극)';
                this.player.portrait = '/images/portrait_female.png';
            }
        },

        setupInitialState() {
            // 속도 기반 정렬
            this.turnQueue = [this.player, this.enemy].sort((a, b) => b.speed - a.speed);
            // 초기 액티브 설정
            this.turnQueue.forEach(e => e.isActive = false);
            
            this.addLog(`야생의 [${this.enemy.name}] 가 앞길을 가로막습니다!`, 'system');
            
            if(this.playerGender === 'FEMALE') {
                this.addLog('✨ [패시브] 빙백신공이 발동되어 주변 온도가 급격히 낮아집니다.', 'skill');
            } else {
                this.addLog('✨ [패시브] 창궁대연신공이 단전을 맴돌며 검기를 증폭시킵니다.', 'skill');
            }
        },

        startBattle() {
            // 1초 지연 후 첫 턴 시작
            setTimeout(() => {
                this.nextTurn();
            }, 1000);
        },

        addLog(message, type = 'system') {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            this.logs.push({ time: timeStr, message, type });
            
            // 자동 스크롤
            setTimeout(() => {
                const container = document.getElementById('log-container');
                if(container) container.scrollTop = container.scrollHeight;
            }, 50);
        },

        nextTurn() {
            if (this.enemy.hp <= 0) return this.handleWin();

            // 맨 앞 큐의 엔티티가 턴 획득
            const currentEntity = this.turnQueue[0];
            this.turnQueue.forEach(e => e.isActive = false);
            currentEntity.isActive = true;

            if (currentEntity.id === 'PLAYER') {
                this.gameState = 'WAITING_INPUT';
                this.isPlayerTurn = true;
                this.addLog(`${this.player.name}의 턴! 조작을 기다립니다.`, 'system');
            } else {
                this.gameState = 'ENEMY_TURN';
                this.isPlayerTurn = false;
                this.executeEnemyTurn();
            }
        },

        async executeAction(actionType) {
            this.gameState = 'ANIMATING';
            this.isPlayerTurn = false;

            if (actionType === 'ATTACK') {
                this.addLog(`[${this.player.name}] 의 기본 공격!`, 'player');
                await this.playHitAnimation(this.enemy, 50, false);
                this.endTurn();
            } 
            else if (actionType === 'SKILL') {
                this.addLog(`[${this.player.name}] 이 궁극기 [${this.ultName}] 를 시전합니다!!`, 'skill');
                
                // 튜토리얼 뽕맛 효과 - 오버 킬 데미지
                await this.playUltimateAnimation();
                await this.playHitAnimation(this.enemy, 99999, true); 
                this.endTurn();
            }
            else if (actionType === 'DEFEND') {
                this.addLog(`[${this.player.name}] 가 방어 태세를 갖춥니다. (피해량 감소)`, 'player');
                await new Promise(r => setTimeout(r, 1000));
                this.endTurn();
            }
        },

        executeEnemyTurn() {
            this.addLog(`[${this.enemy.name}] 의 매서운 공격!`, 'enemy');
            
            setTimeout(async () => {
                // 화면 전체가 가볍게 흔들리는 피격 플레이어 효과 (임시)
                document.body.classList.add('hit-shake');
                this.addLog(`[${this.player.name}] 는 0의 데미지를 입었다...! (튜토리얼 보정)`, 'system');
                this.player.hp -= 0; 
                
                setTimeout(() => {
                    document.body.classList.remove('hit-shake');
                    this.endTurn();
                }, 500);

            }, 1000);
        },

        endTurn() {
            // 현재 엔티티 맨 뒤로 보내기
            const current = this.turnQueue.shift();
            current.isActive = false;
            this.turnQueue.push(current);

            // 사망 체크
            if(this.enemy.hp <= 0) {
                this.handleWin();
            } else {
                // 다음 턴 스케줄
                setTimeout(() => {
                    this.nextTurn();
                }, 800);
            }
        },

        playHitAnimation(target, damage, isCritical = false) {
            return new Promise((resolve) => {
                const container = document.getElementById('enemy-container');
                const damageLayer = document.getElementById('damage-layer');
                
                // 데미지 텍스트 렌더링
                const dmgEl = document.createElement('div');
                dmgEl.className = 'dmg-text ' + (isCritical ? 'critical' : '');
                dmgEl.innerText = damage;
                // 약간 랜덤한 팝업 위치
                dmgEl.style.left = `${50 + (Math.random()*20 - 10)}%`;
                dmgEl.style.top = `${50 + (Math.random()*20 - 10)}%`;
                
                damageLayer.appendChild(dmgEl);
                
                // 적 스프라이트 흔들림 효과
                container.classList.add('hit-shake');

                // 체력 차감
                target.hp -= damage;
                if(target.hp <= 0) {
                    target.hp = 0;
                    target.isDead = true;
                    this.addLog(`치명타! [${target.name}] 가 쓰러졌습니다!`, 'system');
                }

                // 애니메이션 클린업
                setTimeout(() => {
                    container.classList.remove('hit-shake');
                    dmgEl.remove();
                    resolve();
                }, 800); // 흔들림/데미지 플로팅 시간 대기
            });
        },

        playUltimateAnimation() {
            return new Promise((resolve) => {
                const layer = document.getElementById('effect-layer');
                const effectEl = document.createElement('div');

                if (this.playerGender === 'MALE') {
                    // 제황검형: 화면을 완전히 가르는 황금색 참격
                    effectEl.className = 'slash-effect';
                } else {
                    // 빙백신검: 적 중심에서 퍼지는 엄청난 얼음 폭발
                    effectEl.className = 'ice-explosion';
                }

                layer.appendChild(effectEl);

                // 연출 지속시간인 약 0.7초 후 제거
                setTimeout(() => {
                    effectEl.remove();
                    resolve();
                }, 700);
            });
        },

        handleWin() {
            this.gameState = 'WIN';
            this.addLog(`👑 전투에서 승리했습니다! 무림맹 본산으로 이동합니다.`, 'system');
            
            setTimeout(() => {
                document.getElementById('whiteOut').classList.add('active');
                
                // 2.5초 후 타운으로 리다이렉션
                setTimeout(() => {
                    window.location.href = '/town';
                }, 2500);
            }, 1000);
        }

    }));
});
