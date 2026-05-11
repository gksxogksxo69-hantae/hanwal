document.addEventListener('alpine:init', () => {
    Alpine.data('battleApp', () => ({
        playerGender: 'MALE',
        playerNickname: '모험가',

        party: [null, null, null, null],
        enemies: [],
        turnQueue: [],      
        logs: [],           
        currentActor: null,
        selectedTarget: null,
        heroTemplate: null, 

        gameState: 'STORY', // STORY, WAITING_INPUT, ANIMATING, ENEMY_TURN, WIN, LOSE
        tutorialStep: 0,
        isPlayerTurn: false,

        // Story State
        storyLines: [],
        currentStoryLine: "",
        storyIndex: 0,
        isTyping: false,
        typeInterval: null,

        async init() {
            await this.loadPlayerInfo();
            await this.loadHeroTemplate(); 
            this.setupEntities();
            this.startStory();
        },

        async loadPlayerInfo() {
            try {
                const res = await fetch('/api/map/player-info');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.gender || 'MALE';
                    this.playerNickname = data.nickname || '모험가';
                }
            } catch (e) {}
        },

        async loadHeroTemplate() {
            const templateId = this.playerGender === 'MALE' ? 'CH_NAMGUNG_CHUN' : 'CH_NAMGUNG_SEOLHA';
            try {
                const res = await fetch('/api/battle/character/' + templateId);
                if (res.ok) {
                    this.heroTemplate = await res.json();
                }
            } catch (e) {
                console.error("Failed to load hero template", e);
            }
        },

        setupEntities() {
            if (!this.heroTemplate) {
                this.heroTemplate = {
                    name: this.playerNickname, role: 'WARRIOR', baseHp: 120, baseAtk: 30, baseDef: 15, baseSpd: 100,
                    skills: [
                        { skillId: 's1', name: '기본 공격', description: '적을 공격하고 기력을 1 회복합니다.', skillType: 'DAMAGE', targetType: 'SINGLE', isUltimate: false, damageMultiplier: 1.0, energyCost: -1, spiritCost: 0 },
                        { skillId: 's2', name: '강타', description: '기력을 소모하여 강한 피해를 줍니다.', skillType: 'DAMAGE', targetType: 'SINGLE', isUltimate: false, damageMultiplier: 1.5, energyCost: 2, spiritCost: 0 },
                        { skillId: 's3', name: '기운 집중', description: '투기를 1 회복합니다.', skillType: 'BUFF', targetType: 'SELF', isUltimate: false, damageMultiplier: 0, energyCost: 1, spiritCost: -1 },
                        { skillId: 's4', name: '절대기검', description: '투기를 소모하는 강력한 궁극기.', skillType: 'DAMAGE', targetType: 'SINGLE', isUltimate: true, damageMultiplier: 3.0, energyCost: 0, spiritCost: 6 }
                    ]
                };
            }

            let preparedSkills = Array(4).fill(null).map(() => ({ id: 'locked', name: '잠긴 스킬', energyCost: 0, spiritCost: 0, isLock: true }));
            
            let normalIdx = 0;
            this.heroTemplate.skills.forEach(s => {
                const sd = {
                    id: s.skillId, name: s.name, description: s.description,
                    type: s.skillType, target: s.targetType, isUltimate: s.isUltimate, 
                    multiplier: s.damageMultiplier, energyCost: s.energyCost, spiritCost: s.spiritCost, isLock: false
                };
                if (s.isUltimate) {
                    preparedSkills[3] = sd; 
                } else if (normalIdx < 3) {
                    preparedSkills[normalIdx] = sd;
                    normalIdx++;
                }
            });

            const hero = {
                id: 'party-1',
                type: 'PARTY',
                name: this.playerNickname + `(${this.heroTemplate.name})`, 
                hp: this.heroTemplate.baseHp * 10, maxHp: this.heroTemplate.baseHp * 10, 
                energy: 0, maxEnergy: 5,
                spirit: 0, maxSpirit: 6,
                atk: this.heroTemplate.baseAtk * 5, 
                def: this.heroTemplate.baseDef * 5,
                speed: this.heroTemplate.baseSpd,
                isActive: false,  isDead: false,
                standing: this.playerGender === 'MALE' ? '/images/char_sprite.png' : '/images/char_sprite_female.png', 
                portrait: this.playerGender === 'MALE' ? '/images/portrait_male.png' : '/images/portrait_female.png',
                skills: preparedSkills
            };
            this.party[0] = hero;

            const boss = {
                id: 'enemy-1',
                type: 'ENEMY',
                name: '천마신교 추격자',
                hp: 99999, maxHp: 99999,
                speed: 80,
                isActive: false,
                isDead: false,
                standing: '/images/enemy_demon_cult_pursuer.png',
                portrait: '/images/enemy_demon_cult_pursuer.png'
            };
            this.enemies.push(boss);
            this.selectedTarget = boss.id;

            this.turnQueue = [hero, boss].sort((a, b) => b.speed - a.speed);
        },

        startStory() {
            const heroName = this.playerGender === 'MALE' ? '남궁천' : '남궁설화';
            this.storyLines = [
                `(${heroName}은 거친 숨을 몰아쉬며 숲을 빠져나왔다.)`,
                `"큭... 여기까지 쫓아올 줄이야..."`,
                `(그때, 발밑에서 기이한 빛을 뿜어내는 영약, [기연]을 발견했다!)`,
                `"이것은... 전설로만 듣던 만년한철의 정수?!"`,
                `(영약을 품으려는 찰나, 등 뒤에서 서늘한 살기가 느껴졌다.)`,
                `[천마신교 추격자]: "어리석은 놈. 도망칠 수 있을 줄 알았더냐."`,
                `"빌어먹을... 싸울 수밖에 없겠군!"`
            ];
            this.storyIndex = 0;
            this.typeNextStoryLine();
        },

        typeNextStoryLine() {
            if (this.storyIndex >= this.storyLines.length) {
                this.endStory();
                return;
            }
            this.isTyping = true;
            const fullText = this.storyLines[this.storyIndex];
            this.currentStoryLine = "";
            let charIdx = 0;
            
            clearInterval(this.typeInterval);
            this.typeInterval = setInterval(() => {
                this.currentStoryLine += fullText.charAt(charIdx);
                charIdx++;
                if (charIdx >= fullText.length) {
                    clearInterval(this.typeInterval);
                    this.isTyping = false;
                }
            }, 50);
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

        endStory() {
            this.gameState = 'START';
            this.addLog(`전투가 시작되었습니다!`, 'system');
            
            // Tutorial Step 1
            this.tutorialStep = 1;
            
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
            if(!enemy.isDead) this.selectedTarget = enemy.id;
        },

        nextTurn() {
            if (this.enemies.every(e => e.isDead)) return this.handleWin();

            const current = this.turnQueue[0];
            this.currentActor = current;

            this.party.forEach(p => p && (p.isActive = false));
            this.enemies.forEach(e => e.isActive = false);
            current.isActive = true;

            if (current.isDead) {
                this.endTurn();
                return;
            }

            if (current.type === 'PARTY') {
                this.gameState = 'WAITING_INPUT';
                this.isPlayerTurn = true;
                
                if (this.tutorialStep === 1) {
                    this.addLog(`[가이드] '행동 후퇴(첫 번째 스킬)'을 사용하여 적의 공격을 유도하세요.`, 'skill');
                } else if (this.tutorialStep === 3) {
                    // 궁극기 슬롯이 잠겨있으면 강제로 해제
                    this.unlockUltimate();
                    const ultSkill = current.skills.find(s => s.isUltimate && !s.isLock);
                    const ultName = ultSkill ? ultSkill.name : '궁극기';
                    this.addLog(`[가이드] 기연의 힘이 발동했습니다! [${ultName}]을 사용하여 적을 쓰러뜨리세요!`, 'skill');
                }
            } else {
                this.gameState = 'ENEMY_TURN';
                this.isPlayerTurn = false;
                this.executeEnemyTurn(current);
            }
        },

        async executeAction(skillIndex) {
            if (this.gameState !== 'WAITING_INPUT') return;

            const actor = this.currentActor;
            const skill = actor.skills[skillIndex];
            
            if(skill.isLock) return;

            // Tutorial Validation
            if (this.tutorialStep === 1 && skillIndex !== 0) {
                this.addLog(`[가이드] 지금은 '기본 공격(첫 번째 스킬)'만 사용할 수 있습니다.`, 'system');
                return;
            }
            if (this.tutorialStep === 3 && !skill.isUltimate) {
                const ultSkill = actor.skills.find(s => s.isUltimate && !s.isLock);
                const ultIdx = actor.skills.findIndex(s => s.isUltimate && !s.isLock);
                if (ultSkill) {
                    this.addLog(`[가이드] 투기가 가득 찼습니다! [${ultSkill.name}] (${ultIdx+1}번째 스킬)을 사용하세요.`, 'system');
                } else {
                    // 궁극기가 잠겨있으면 즉시 해제 시도
                    this.unlockUltimate();
                    this.addLog(`[가이드] 궁극기가 해금되었습니다! 다시 시도해 주세요.`, 'system');
                }
                return;
            }

            // Resource Check
            if (skill.energyCost > 0 && actor.energy < skill.energyCost) {
                this.addLog(`기력(Energy)이 부족합니다! [필요: ${skill.energyCost}]`, 'system');
                return;
            }
            if (skill.spiritCost > 0 && actor.spirit < skill.spiritCost) {
                this.addLog(`투기(Spirit)가 부족합니다! [필요: ${skill.spiritCost}]`, 'system');
                return;
            }

            this.gameState = 'ANIMATING';
            this.isPlayerTurn = false;

            if (skill.energyCost !== 0) actor.energy = Math.max(0, Math.min(actor.maxEnergy, actor.energy - skill.energyCost));
            if (skill.spiritCost !== 0) actor.spirit = Math.max(0, Math.min(actor.maxSpirit, actor.spirit - skill.spiritCost));

            const target = this.enemies.find(e => e.id === this.selectedTarget) || this.enemies[0];
            const dmgAmt = Math.floor(actor.atk * skill.multiplier);

            if (skill.type === 'BUFF') {
                this.addLog(`[${actor.name}] 의 [${skill.name}]!`, 'player');
                await new Promise(r => setTimeout(r, 600));
                this.endTurn();
            } 
            else if (skill.isUltimate) {
                this.addLog(`[${actor.name}] 이 궁극기 [${skill.name}] 를 해방합니다!!`, 'skill');
                await this.playUltimateAnimation();
                await this.playHitAnimation(target, Math.max(9999, dmgAmt) , true); 
                this.endTurn();
            }
            else {
                this.addLog(`[${actor.name}] 의 [${skill.name}]!`, 'player');
                await this.playHitAnimation(target, dmgAmt, false);
                
                if (this.tutorialStep === 1) {
                    this.tutorialStep = 2; // Move to enemy turn step
                }
                
                this.endTurn();
            }
        },

        executeEnemyTurn(actor) {
            this.addLog(`[${actor.name}] 의 매서운 공격!`, 'enemy');
            
            setTimeout(async () => {
                const aliveParty = this.party.filter(p => p && !p.isDead);
                const target = aliveParty[0];

                document.body.classList.add('hit-shake');
                this.addLog(`[${target.name}] 는 0의 데미지를 입었다...! (튜토리얼 보정)`, 'system');
                
                setTimeout(() => {
                    document.body.classList.remove('hit-shake');
                    
                    if (this.tutorialStep === 2) {
                        this.tutorialStep = 3;
                        target.spirit = 6;
                        // 궁극기 슬롯 강제 해금
                        this.unlockUltimate();
                        this.addLog(`✨ 품고 있던 [기연]이 붉은 빛을 내뿜으며 단전의 투기가 가득 찼습니다! (투기: 6)`, 'skill');
                    }
                    
                    this.endTurn();
                }, 500);

            }, 1000);
        },

        endTurn() {
            const current = this.turnQueue.shift();
            current.isActive = false;
            this.turnQueue.push(current);
            this.currentActor = null; 

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
                const targetId = this.selectedTarget || this.enemies[0].id;
                const layer = document.getElementById(`effect-layer-${targetId}`);
                if (!layer) return resolve();

                const effectEl = document.createElement('div');
                if (this.playerGender === 'MALE') {
                    effectEl.className = 'slash-effect'; 
                } else {
                    effectEl.className = 'ice-explosion'; 
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
            this.addLog(`👑 전투에서 승리했습니다! 1막으로 이동합니다...`, 'system');
            
            setTimeout(() => {
                document.getElementById('whiteOut').classList.add('active');
                setTimeout(() => {
                    window.location.href = '/town';
                }, 2000);
            }, 1000);
        },

        // 궁극기 슬롯 강제 해금 (튜토리얼용)
        unlockUltimate() {
            const hero = this.party[0];
            if (!hero) return;

            // 이미 해금된 궁극기가 있으면 스킵
            if (hero.skills.some(s => s.isUltimate && !s.isLock)) return;

            // 잠긴 슬롯 중 하나를 궁극기로 교체 (마지막 슬롯 우선)
            const heroName = this.playerGender === 'MALE' ? '제황검형 - 일검서해' : '빙백신검 - 천년빙봉';
            const ultSkillData = this.playerGender === 'MALE'
                ? { id: 'ult_chun', name: heroName, description: 'DEF 비례 광역 극딜. 적을 소멸시킨다.', type: 'DAMAGE', target: 'ALL_ENEMY', isUltimate: true, multiplier: 3.5, energyCost: 0, spiritCost: 6, isLock: false }
                : { id: 'ult_sulhwa', name: heroName, description: '확정 빙결 + 극딜. 만물을 얼려버린다.', type: 'DAMAGE', target: 'SINGLE_ENEMY', isUltimate: true, multiplier: 4.0, energyCost: 0, spiritCost: 6, isLock: false };

            // 마지막 슬롯(3번 인덱스)에 궁극기 배치 시도, 잠겨있으면 그 칸에
            for (let i = hero.skills.length - 1; i >= 0; i--) {
                if (hero.skills[i].isLock) {
                    hero.skills[i] = ultSkillData;
                    this.addLog(`🔓 [${heroName}] 궁극기가 해금되었습니다!`, 'skill');
                    return;
                }
            }
        }

    }));
});
