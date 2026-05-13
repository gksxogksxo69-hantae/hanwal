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
            const pName = this.playerGender === 'MALE' ? '남궁천' : '남궁설화';
            
            return [
                { speaker: '지문', text: '신황력 342년... 무림의 역사상 가장 무겁고 잔혹한 멸망의 밤이 찾아왔다.', effect: 'fade-in-dark', bg: '/images/prologue_bg_estate_fire.png' },
                { speaker: '지문', text: '부활한 천마(天魔)의 마위 앞에 중원의 산천이 붉게 타들어 갈 때... 무림맹의 모든 명숙들은 절망했다.', effect: 'red-flash' },
                { speaker: '지문', text: '"중원의 명운을 걸고 출진했던 당대 최강의 \'무림 10대 고수\'. 그 선두에는 검의 종가, 남궁세가의 자랑이자 천재였던 장남 남궁선과 차남 남궁현이 있었다."', effect: 'fade-in' },
                { speaker: '지문', text: '"...하지만, 결과는 전멸(全滅). 참혹한 살육의 밤 끝에 그들의 부러진 검과 목이 차가운 흑풍곡의 깃대에 걸리던 날, 중원의 전설은 끝이 났다."', effect: 'screen-shake-heavy' },
                { speaker: '지문', text: `가문의 대들보를 잃은 남궁세가는 한순간에 지옥으로 변했다. 천재들의 그늘 뒤에 가려져 있던 셋째 남궁천과 막내 남궁설화는... 거대한 상실감에 검마저 놓아버린 채 1년을 죽은 듯 보냈다.`, effect: 'bg-dim' },
                { speaker: '지문', text: "그러나 운명은 가혹했다. 형들이 떠난 지 정확히 1년이 되던 날, 천마의 최측근이자 잔혹한 살인귀인 '우호법(右護法)'이 남궁의 씨를 말리기 위해 밤안개를 뚫고 가문을 기습했다!", effect: 'fire-effect-overlay' },
                { speaker: '남궁천', text: '"선이 형... 현이 형...! 내가 조금만 더 강했어도...! 우호법 이 마두 새끼!!! 내 형들을 찢어발긴 것도 모자라, 이제 가문의 숨통까지 끊으러 왔더냐!!!"', effect: 'shake' },
                { speaker: '남궁설화', text: '"오빠들... 거짓말이지? 어서 일어나서 저 괴물들 좀 쫓아내 줘... 꺄아아악!! 싫어, 무서워...! 날 만지지 마! 오빠들을 돌려내란 말이야...!!"', effect: 'flash-white' },
                { speaker: '지문', text: '"36계 줄랑랑이든, 바닥의 흙을 쥐어짜 뿌리는 짓이든 상관없다. 살아야 한다. 살아남아 저 마두들의 목을 치고, 가문의 구결을 되찾아 피의 대가를 치르게 하리라...!"', effect: 'blackout' },
                { speaker: '지문', text: '가문이 피와 불길로 멸망해 가던 그 밤, 두 남매는 눈에서 피눈물을 흘리며 후문 밖 절벽 밑, 어둠이 도사린 심연 속으로 몸을 던졌다. [한월(Hanwol) — 복수의 서막]', effect: 'title-drop', bg: '/images/prologue_bg_cave.png' }
            ];
        },

        get currentScene() {
            return this.scenes[this.currentSceneIndex] || { speaker: '', text: '' };
        },

        get progress() {
            return Math.floor(((this.currentSceneIndex + 1) / this.scenes.length) * 100);
        },

        init() {
            this.loadPlayerInfo();
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
            this.startScene();
        },

        startScene() {
            const scene = this.currentScene;
            if (!scene) return;

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
                if (scene.effect === 'fire-effect-overlay') {
                    this.showFireEmbers = true;
                } else {
                    this.showFireEmbers = false;
                }

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
            if (now - this.lastClickTime < 300) return; // 쓰로틀링 (0.3초)
            this.lastClickTime = now;

            console.log('Click detected, Index:', this.currentSceneIndex);

            if (this.isCompleted || this.showTitleDrop || this.showSkipModal) {
                console.log('Click ignored due to state:', { comp: this.isCompleted, title: this.showTitleDrop, modal: this.showSkipModal });
                return;
            }

            if (this.isTyping) {
                console.log('Skipping typing animation');
                if (this.typingTimer) clearInterval(this.typingTimer);
                this.typingTimer = null;
                this.displayedText = this.currentScene.text;
                this.isTyping = false;
                this.scrollToBottom();
                return;
            }

            // 히스토리에 현재 대사 추가
            this.history.push({ speaker: this.currentScene.speaker, text: this.currentScene.text });

            if (this.currentSceneIndex < this.scenes.length - 1) {
                this.currentSceneIndex++;
                console.log('Moving to next scene:', this.currentSceneIndex);
                this.startScene();
            } else {
                console.log('End of scenes reached');
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
            try {
                await fetch('/api/tutorial/complete-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: 1 }) 
                });
            } catch (e) {}
            window.location.href = '/town';
        },

        openSkipModal() { this.showSkipModal = true; },
        closeSkipModal() { this.showSkipModal = false; },
        confirmSkip() { this.completeTutorial(); }
    }));
});
