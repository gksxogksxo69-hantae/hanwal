document.addEventListener('alpine:init', () => {
    Alpine.data('tutorialApp', () => ({
        // ── 상태 ──
        currentSceneIndex: 0,
        displayedText: '',
        history: [], 
        isTyping: false,
        typingTimer: null,
        isTransitioning: false,
        showSkipModal: false,
        currentBg: '/images/prologue_bg_estate_fire.png', 
        bgEffect: '',
        screenEffect: '',
        showTitleDrop: false,
        isCompleted: false,
        showFireEmbers: false,
        showQiParticles: false,
        transitionText: '',

        playerGender: 'MALE',
        playerNickname: '모험가',
        lastClickTime: 0,

        // ── 10단계 시나리오 ──
        get scenes() {
            const allScenes = [
                { speaker: '지문', text: '신황력 342년... 무림의 역사상 가장 무겁고 잔혹한 멸망의 밤이 찾아왔다.', effect: 'fade-in-dark', bg: '/images/prologue_bg_estate_fire.png' },
                { speaker: '지문', text: '부활한 천마(天魔)의 마위 앞에 중원의 산천이 붉게 타들어 갈 때... 무림맹의 모든 명숙들은 절망했다.', effect: 'red-flash' },
                { speaker: '지문', text: '"중원의 명운을 걸고 출진했던 당대 최강의 \'무림 10대 고수\'. 그 선두에는 검의 종가, 남궁세가의 가주 남궁선과 전대 가주 남궁현이 있었다."', effect: 'fade-in' },
                { speaker: '지문', text: '"...하지만, 결과는 전멸(全滅). 참혹한 살육의 밤 끝에 그들의 부러진 검과 목이 차가운 흑풍곡의 깃대에 걸리던 날, 중원의 전설은 끝이 났다."', effect: 'screen-shake-heavy' },
                { speaker: '지문', text: '가문의 대들보를 잃은 남궁세가는 한순간에 지옥으로 변했다. 가문의 유망주였던 당신들은... 거대한 상실감에 검마저 놓아버린 채 1년을 죽은 듯 보냈다.', effect: 'bg-dim' },
                { speaker: '지문', text: "그러나 운명은 가혹했다. 형들이 떠난 지 정확히 1년이 되던 날, 천마의 최측근이자 잔혹한 살인귀인 '우호법(右護法)'이 남궁의 씨를 말리기 위해 밤안개를 뚫고 가문을 기습했다!", effect: 'fire-effect-overlay' },
                
                // 남궁천(남캐) 전용 대사
                { speaker: '남궁천', text: '"가주님... 전대 가주님...! 내가 조금만 더 강했어도...! 우호법 이 마두 새끼!!! 내 어른들을 찢어발긴 것도 모자라, 이제 가문의 숨통까지 끊으러 왔더냐!!!"', effect: 'shake', gender: 'MALE' },
                
                // 남궁설화(여캐) 전용 대사
                { speaker: '남궁설화', text: '"아버지... 할아버지... 거짓말이지? 어서 일어나서 저 괴물들 좀 쫓아내 줘... 꺄아아악!! 싫어, 무서워...! 날 만지지 마! 우리 가족들을 돌려내란 말이야...!!"', effect: 'flash-white', gender: 'FEMALE' },
                
                { speaker: '지문', text: '"36계 줄랑랑이든, 바닥의 흙을 쥐어짜 뿌리는 짓이든 상관없다. 살아야 한다. 살아남아 저 마두들의 목을 치고, 가문의 구결을 되찾아 피의 대가를 치르게 하리라...!"', effect: 'blackout' },
                { speaker: '지문', text: '가문이 피와 불길로 멸망해 가던 그 밤, 당신은 눈에서 피눈물을 흘리며 후문 밖 절벽 밑, 어둠이 도사린 심연 속으로 몸을 던졌다. [한월(Hanwol) — 복수의 서막]', effect: 'title-drop', bg: '/images/prologue_bg_cave.png' }
            ];

            return allScenes.filter(s => !s.gender || s.gender === this.playerGender);
        },

        get currentScene() {
            if (this.currentSceneIndex >= 0 && this.currentSceneIndex < this.scenes.length) {
                return this.scenes[this.currentSceneIndex];
            }
            return { speaker: '', text: '', effect: '' };
        },

        get progress() {
            if (!this.scenes || this.scenes.length === 0) return 0;
            return Math.floor(((this.currentSceneIndex + 1) / this.scenes.length) * 100);
        },

        init() {
            console.log('[Tutorial] Alpine init started');
            this.loadPlayerInfo();
        },

        async loadPlayerInfo() {
            try {
                const res = await fetch('/api/map/player-info');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.gender || 'MALE';
                    this.playerNickname = data.nickname || '모험가';
                    console.log('[Tutorial] Player loaded:', this.playerGender, this.playerNickname);
                }
            } catch (e) {
                console.warn('[Tutorial] player-info API failed, using defaults');
            }
            // API 성공 여부 무관하게 시작
            this.startScene();
        },

        startScene() {
            const scene = this.currentScene;
            if (!scene || !scene.text) {
                console.warn('[Tutorial] No scene found at index:', this.currentSceneIndex);
                return;
            }

            console.log('[Tutorial] Starting scene', this.currentSceneIndex, ':', scene.text.substring(0, 30) + '...');

            // 배경 전환
            if (scene.bg) {
                this.currentBg = scene.bg;
            }

            // 효과 트리거
            if (scene.effect) {
                if (scene.effect === 'title-drop') {
                    this.showTitleDrop = true;
                    this.screenEffect = '';
                    setTimeout(() => { this.completeTutorial(); }, 5000);
                    return;
                }
                
                // 불꽃 연출 트리거
                this.showFireEmbers = (scene.effect === 'fire-effect-overlay');

                if (scene.effect === 'bg-dim') {
                    this.bgEffect = 'bg-dim-effect';
                } else if (scene.effect === 'fade-in-dark') {
                    this.screenEffect = 'fade-in-dark';
                } else {
                    this.screenEffect = scene.effect;
                    if (['shake', 'screen-shake-heavy', 'flash-white', 'red-flash', 'blackout'].includes(scene.effect)) {
                         setTimeout(() => { if(this.screenEffect === scene.effect) this.screenEffect = ''; }, 1000);
                    }
                }
            }

            this.typeText(scene.text);
        },

        typeText(text) {
            this.displayedText = '';
            this.isTyping = true;
            let i = 0;
            if (this.typingTimer) clearInterval(this.typingTimer);

            this.typingTimer = setInterval(() => {
                if (i < text.length) {
                    this.displayedText += text[i];
                    i++;
                    this.scrollToBottom();
                } else {
                    clearInterval(this.typingTimer);
                    this.typingTimer = null;
                    this.isTyping = false;
                }
            }, 40);
        },

        scrollToBottom() {
            this.$nextTick(() => {
                const container = document.getElementById('narrativeContainer');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        },

        handleClick() {
            const now = Date.now();
            if (now - this.lastClickTime < 250) return;
            this.lastClickTime = now;

            console.log('[Tutorial] Click! Index:', this.currentSceneIndex, 'States:', {
                typing: this.isTyping, completed: this.isCompleted, 
                titleDrop: this.showTitleDrop, skipModal: this.showSkipModal
            });

            // 블로킹 조건
            if (this.isCompleted || this.showTitleDrop || this.showSkipModal) return;

            // 타이핑 중이면 즉시 완료
            if (this.isTyping) {
                if (this.typingTimer) clearInterval(this.typingTimer);
                this.typingTimer = null;
                this.displayedText = this.currentScene.text;
                this.isTyping = false;
                this.scrollToBottom();
                return;
            }

            // 히스토리에 현재 대사 추가 후 다음으로
            this.history.push({ speaker: this.currentScene.speaker, text: this.currentScene.text });

            if (this.currentSceneIndex < this.scenes.length - 1) {
                this.currentSceneIndex++;
                this.startScene();
            }
        },

        handleKeydown(e) {
            if (e.repeat) return;
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.handleClick();
            }
        },

        async completeTutorial() {
            if (this.isCompleted) return;
            this.isCompleted = true;
            console.log('[Tutorial] Completing storyboard, setting step to 2 and redirecting...');
            try {
                // 프롤로그/시토리보드 종료 시 step 2로 업데이트 (이후 로비 진입 허용)
                await fetch('/api/tutorial/complete-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: 2 }) 
                });
            } catch (e) {
                console.warn('[Tutorial] complete-step API failed:', e);
            }
            setTimeout(() => { window.location.href = '/town'; }, 2000);
        },

        openSkipModal() { 
            console.log('[Tutorial] Opening skip modal');
            this.showSkipModal = true; 
        },
        closeSkipModal() { 
            console.log('[Tutorial] Closing skip modal');
            this.showSkipModal = false; 
        },
        async confirmSkip() { 
            console.log('[Tutorial] Skip confirmed');
            this.showSkipModal = false;
            if (this.isCompleted) return;
            this.isCompleted = true;
            
            try {
                await fetch('/api/tutorial/skip', { method: 'POST' });
            } catch (e) {
                console.warn('[Tutorial] skip API failed:', e);
            }
            window.location.href = '/town';
        }
    }));
});
