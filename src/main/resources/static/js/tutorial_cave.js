document.addEventListener('alpine:init', () => {
    Alpine.data('caveApp', () => ({
        currentSceneIndex: 0,
        displayedText: '',
        history: [],
        isTyping: false,
        typingTimer: null,
        isTransitioning: false,
        currentBg: '/images/prologue_bg_cave.png',
        bgEffect: '',
        screenEffect: '',
        isCompleted: false,
        transitionText: '',

        playerGender: 'MALE',
        playerNickname: '모험가',

        get scenes() {
            const pName = this.playerGender === 'MALE' ? '남궁천' : '남궁설화';
            return [
                { speaker: '지문', text: '절벽 아래, 빛조차 닿지 않는 어둠의 심연. 차가운 지하수가 흐르는 비경의 동굴 속에서 당신은 정신을 차렸다.', effect: 'fade-in-dark' },
                { speaker: pName, text: '...으윽. 살아... 있는 건가? 형님들, 저를 버리지 않으셨군요.', effect: 'shake' },
                { speaker: '지문', text: '주변을 살피던 중, 억겁의 세월 동안 닫혀 있던 석문이 열려 있는 것을 발견했다. 그 안에는 먼지 쌓인 해골 하나와 낡은 비급이 놓여 있었다.', effect: 'flash-white' },
                { speaker: '지문', text: '비급의 이름은 [제황검공(帝皇劍功)]. 남궁세가의 시조가 잃어버렸다고 전해지는 전설의 구결이었다. 당신은 홀린 듯 검을 잡았다.', effect: 'bg-dim-effect' },
                
                { speaker: '지문', text: '첫날. 상처 입은 몸을 이끌고 비급의 첫 장을 넘겼다. 내력이 비틀리고 기혈이 뒤틀리는 고통이 전신을 엄습했다.', effect: 'red-flash' },
                { speaker: '지문', text: '백일째. 동굴 속의 냉기를 내력으로 승화시키기 시작했다. 이제 검기는 바위를 가르고, 검의 끝은 허공을 꿰뚫었다.', effect: 'screen-shake-heavy' },
                
                { speaker: '지문', text: '그렇게 1년. 당신의 눈빛은 더 이상 슬픔에 젖어 있지 않았다. 복수의 일념으로 벼려진 검은, 이제 천마의 목을 베기 위한 진검(眞劍)이 되었다.', transitionText: '1년의 세월이 흐르고...', isTransition: true },
                
                { speaker: pName, text: '이제 충분하다. 형님들이 남긴 의지, 그리고 가문의 원수... 내 손으로 반드시 끝내리라.', effect: 'flash-white' },
                { speaker: '지문', text: '당신은 동굴 밖으로 발을 내디뎠다. 눈부신 햇살 너머로, 가문의 원수 중 하나인 천마의 수하들이 근처 마을을 쑥대밭으로 만들고 있다는 비보가 들려온다.', effect: 'blackout' },
                { speaker: '지문', text: '복수를 위한 첫 번째 혈전이 시작된다.', effect: 'title-drop' }
            ];
        },

        get currentScene() {
            return this.scenes[this.currentSceneIndex] || { speaker: '', text: '' };
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

            if (scene.isTransition) {
                this.isTransitioning = true;
                this.transitionText = scene.transitionText;
                setTimeout(() => {
                    this.isTransitioning = false;
                    this.currentSceneIndex++;
                    this.startScene();
                }, 3000);
                return;
            }

            if (scene.effect) {
                if (scene.effect === 'title-drop') {
                    this.completeTutorial();
                    return;
                }
                this.screenEffect = scene.effect;
                if (['shake', 'screen-shake-heavy', 'flash-white'].includes(scene.effect)) {
                    setTimeout(() => { if(this.screenEffect === scene.effect) this.screenEffect = ''; }, 1000);
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
                if (container) container.scrollTop = container.scrollHeight;
            });
        },

        handleClick() {
            if (this.isTransitioning || this.isCompleted) return;

            if (this.isTyping) {
                clearInterval(this.typingTimer);
                this.typingTimer = null;
                this.displayedText = this.currentScene.text;
                this.isTyping = false;
                this.scrollToBottom();
                return;
            }

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
            try {
                // 튜토리얼 스텝 업데이트 (선택 사항)
                await fetch('/api/tutorial/complete-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: 3 })
                });
            } catch (e) {}
            // 전투 튜토리얼로 이동
            window.location.href = '/battle/tutorial';
        }
    }));
});
