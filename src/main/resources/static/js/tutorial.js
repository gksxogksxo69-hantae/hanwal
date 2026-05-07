/**
 * 한월(韓月) - 튜토리얼 프롤로그 컷신 엔진
 * Alpine.js 기반 비주얼 노벨 스타일 컷신 시스템
 */
document.addEventListener('alpine:init', () => {
    Alpine.data('tutorialApp', () => ({

        // ── 상태 ──
        currentSceneIndex: 0,
        displayedText: '',
        isTyping: false,
        typingTimer: null,
        isTransitioning: false,
        showSkipModal: false,
        currentBg: '',
        prevBg: '',
        screenEffect: '',        // 'flash-red', 'flash-white', 'shake', 'blackout'
        showQiParticles: false,
        showFireEmbers: false,
        showCenterNarration: false,
        centerNarrationText: '',
        transitionText: '',
        isCompleted: false,

        // 성별에 따른 주인공 이미지 (서버에서 주입)
        playerGender: 'MALE',    // 서버에서 세팅됨

        // ── 씬 데이터 ──
        get scenes() {
            const isMale = this.playerGender === 'MALE';
            const playerName = isMale ? '남궁천' : '남궁설화';
            const playerPortrait = isMale ? '/images/portrait_male.png' : '/images/portrait_female.png';

            return [
                // ===== ACT 1: 평화로운 남궁세가 =====
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: null,
                    text: '',
                    isTransition: true,
                    transitionText: '남궁세가... 오래전 그 평화롭던 날들.',
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: '나레이션',
                    text: '남궁세가. 강호 오대세가 중 하나이자, 천하제일검이라 불리는 검의 명가.',
                    isTransition: false,
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: '나레이션',
                    text: '벚꽃이 흩날리는 이 아름다운 곳에서, 세가의 막내인 ' + playerName + '은(는) 여느 때와 다름없는 하루를 보내고 있었다.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: playerName,
                    text: '하암... 오늘도 수련이라. 형님들은 벌써 일가를 이루셨는데, 나는 아직 검조차 제대로 못 잡는 꼴이라니.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: '나레이션',
                    text: '그러나 강호에 어둠이 드리우고 있었다. 백 년 전 봉인되었던 천마가 깨어나 마기를 천하에 퍼뜨리기 시작한 것이다.',
                    isTransition: false,
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: '나레이션',
                    text: '무림맹은 곧바로 토벌대를 결성했다. 강호 최고의 고수 여덟 명이 모였으니, 그 중에는 남궁세가의 가주와 전대가주도 포함되어 있었다.',
                    isTransition: false,
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: playerName,
                    text: '아버지... 할아버지까지 가시다니. 꼭 무사히 돌아오셔야 합니다.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: '나레이션',
                    text: '그로부터 한 달... 토벌대 전원이 전멸했다는 비보가 날아들었다. 강호는 공포에 빠졌고, 각 세가와 문파는 스스로를 지키기에 급급했다.',
                    isTransition: false,
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_estate_peace.png',
                    speaker: playerName,
                    text: '... 더 이상 게으를 수 없다. 내가 남궁세가의 검을 이어받아야 한다. 지금 당장 수련을 시작하자.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },

                // ===== ACT 2: 습격과 탈출 =====
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: null,
                    text: '',
                    isTransition: true,
                    transitionText: '그리고 얼마 후... 재앙이 찾아왔다.',
                    effect: 'flash-red',
                    portraits: []
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: '나레이션',
                    text: '천마신교의 무리가 남궁세가를 습격했다. 가주를 잃은 세가는 제대로 된 저항조차 할 수 없었다.',
                    isTransition: false,
                    effect: 'shake',
                    portraits: [],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: '호위무사 강노',
                    text: '소공자! 이쪽으로 오십시오! 후문으로 빠져나가야 합니다!',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' },
                        { src: playerPortrait, position: 'right', state: 'dimmed' }
                    ],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: playerName,
                    text: '강노 아저씨! 세가 사람들은?! 다들 무사한 겁니까?!',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: '/images/portrait_guard.png', position: 'left', state: 'dimmed' },
                        { src: playerPortrait, position: 'right', state: 'speaking' }
                    ],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: '호위무사 강노',
                    text: '... 이미 많은 이들이 쓰러졌습니다. 하지만 소공자만큼은 반드시 지킨다 맹세했으니, 여기서 잡담할 시간이 없습니다. 어서!',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' },
                        { src: playerPortrait, position: 'right', state: 'dimmed' }
                    ],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: '나레이션',
                    text: '불타는 세가를 등지고 달렸다. 그러나 천마신교의 추격은 끈질겼다. 결국 후문 앞에서 적들에게 포위당하고 말았다.',
                    isTransition: false,
                    effect: 'shake',
                    portraits: [],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: '호위무사 강노',
                    text: '소공자, 여기서 제가 막겠습니다. 뒤돌아보지 말고 절벽 아래 숲길로 내려가십시오.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' },
                        { src: playerPortrait, position: 'right', state: 'dimmed' }
                    ],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: playerName,
                    text: '안 됩니다! 아저씨 혼자 이 많은 적을...!',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: '/images/portrait_guard.png', position: 'left', state: 'dimmed' },
                        { src: playerPortrait, position: 'right', state: 'speaking' }
                    ],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: '호위무사 강노',
                    text: '남궁세가의 검은 여기서 끊어져선 안 됩니다. 부디... 살아남아 주십시오. 가주님의 뜻을 이어주시길.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' }
                    ],
                    showEmbers: true
                },
                {
                    bg: '/images/bg_estate_fire.png',
                    speaker: '나레이션',
                    text: '강노는 마지막 미소를 지으며 적들을 향해 몸을 날렸다. 그의 희생 덕분에 ' + playerName + '은(는) 간신히 후문 밖으로 빠져나갈 수 있었다.',
                    isTransition: false,
                    effect: 'shake',
                    portraits: [],
                    showEmbers: true
                },

                // ===== ACT 3: 절벽과 기연 =====
                {
                    bg: '/images/bg_cliff.png',
                    speaker: null,
                    text: '',
                    isTransition: true,
                    transitionText: '... 그리고 어둠 속에서 떨어졌다.',
                    effect: 'blackout',
                    portraits: []
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: '달빛이 비추는 절벽. ' + playerName + '은(는) 추격을 피하다 발을 헛디뎌 깊은 낭떠러지 아래로 굴러 떨어졌다.',
                    isTransition: false,
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: playerName,
                    text: '으윽... 여긴 어디지... 몸을 움직일 수가 없어...',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: '절벽 아래 동굴에서 희미한 빛이 새어 나왔다. 기어가듯 동굴 안으로 들어서자, 벽면에 새겨진 오래된 무공 비급이 눈에 들어왔다.',
                    isTransition: false,
                    effect: null,
                    portraits: [],
                    showQi: true
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: playerName,
                    text: '이건... 무공 비급? 이런 곳에 이런 게 있다니... 하늘이 아직 남궁세가를 버리지 않은 건가.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ],
                    showQi: true
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: '비급에 손을 대는 순간, 강렬한 기운이 온몸으로 밀려들었다. 경맥이 뚫리고, 단전에 새로운 힘이 깃들기 시작했다.',
                    isTransition: false,
                    effect: 'flash-white',
                    portraits: [],
                    showQi: true
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: playerName,
                    text: '이 힘... 놀랍다. 아직 미약하지만, 분명 이걸로 싸울 수 있다. 남궁세가의 검... 내가 반드시 되찾겠다!',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ],
                    showQi: true
                },

                // ===== ACT 4: 첫 전투 (텍스트 컷신) =====
                {
                    bg: '/images/bg_cliff.png',
                    speaker: null,
                    text: '',
                    isTransition: true,
                    transitionText: '... 그때, 절벽 위에서 발소리가 들려왔다.',
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: '뒤늦게 추격해온 천마신교의 잡졸 세 명이 절벽 아래까지 내려왔다. 방금 얻은 무공으로 맞서 싸울 수밖에 없었다.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: playerName,
                    text: '... 좋아. 방금 익힌 초식을 시험해볼 기회로군. 덤벼라!',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: playerName + '의 검에서 번개가 일었다. 비급에서 얻은 기본 초식이 적들을 정확히 꿰뚫었다!',
                    isTransition: false,
                    effect: 'flash-white',
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: '쓰러지는 적들. ' + playerName + '은(는) 태어나서 처음으로 실전에서 승리를 거두었다. 미약하지만, 이것이 전설의 시작이었다.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: '전투에서 얻은 경험으로 기본 전투 기술을 습득했다.\n\n⚔️ [기본 검술] 스킬 획득!\n⚡ [번개 베기] 스킬 획득!',
                    isTransition: false,
                    effect: 'flash-white',
                    portraits: [],
                    showQi: true
                },

                // ===== ACT 5: 에필로그 =====
                {
                    bg: '/images/bg_cliff.png',
                    speaker: null,
                    text: '',
                    isTransition: true,
                    transitionText: '새벽이 밝아온다...',
                    effect: null,
                    portraits: []
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: playerName,
                    text: '... 아직 갈 길이 멀다. 무림맹이 있다는 곳으로 가야 해. 거기서 동료를 찾고, 더 강해져야 한다.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: '나레이션',
                    text: '남궁세가의 마지막 후계자는 칼을 쥐고 일어섰다. 폐허가 된 고향을 뒤로 한 채, 무림맹 본산을 향해 첫 걸음을 내딛었다.',
                    isTransition: false,
                    effect: null,
                    portraits: [
                        { src: playerPortrait, position: 'center', state: 'speaking' }
                    ]
                },
                {
                    bg: '/images/bg_cliff.png',
                    speaker: null,
                    text: '',
                    isTransition: true,
                    transitionText: '그리하여... 전설이 시작되었다.',
                    effect: null,
                    portraits: [],
                    isFinal: true
                }
            ];
        },

        get totalScenes() {
            return this.scenes.length;
        },

        get progress() {
            return ((this.currentSceneIndex + 1) / this.totalScenes) * 100;
        },

        get currentScene() {
            return this.scenes[this.currentSceneIndex] || {};
        },

        // ── 초기화 ──
        init() {
            // 서버에서 성별 정보 가져오기
            this.loadTutorialStatus();
        },

        async loadTutorialStatus() {
            try {
                const res = await fetch('/api/tutorial/status');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.data.gender || 'MALE';
                    // 이미 완료된 경우 마을로
                    if (data.data.tutorialCompleted) {
                        window.location.href = '/town';
                        return;
                    }
                }
            } catch (e) {
                console.error('튜토리얼 상태 로드 실패:', e);
            }
            // 첫 씬 시작
            this.startScene();
        },

        // ── 씬 시작 ──
        startScene() {
            const scene = this.currentScene;
            if (!scene) return;

            // 배경 전환
            if (scene.bg && scene.bg !== this.currentBg) {
                this.prevBg = this.currentBg;
                this.currentBg = scene.bg;
            }

            // 파티클 효과
            this.showQiParticles = !!scene.showQi;
            this.showFireEmbers = !!scene.showEmbers;

            // 전환 씬인 경우
            if (scene.isTransition) {
                this.isTransitioning = true;
                this.transitionText = scene.transitionText || '';
                this.displayedText = '';

                // 화면 효과
                if (scene.effect) {
                    this.triggerEffect(scene.effect);
                }

                // 마지막 전환 씬이면 완료 처리
                if (scene.isFinal) {
                    setTimeout(() => {
                        this.completeTutorial();
                    }, 3000);
                    return;
                }

                // 자동으로 다음 씬으로
                setTimeout(() => {
                    this.isTransitioning = false;
                    this.currentSceneIndex++;
                    this.startScene();
                }, 2500);
                return;
            }

            // 화면 효과
            if (scene.effect) {
                this.triggerEffect(scene.effect);
            }

            // 텍스트 타이핑 시작
            this.typeText(scene.text);
        },

        // ── 타이핑 효과 ──
        typeText(text) {
            this.displayedText = '';
            this.isTyping = true;
            let i = 0;

            if (this.typingTimer) {
                clearInterval(this.typingTimer);
            }

            this.typingTimer = setInterval(() => {
                if (i < text.length) {
                    this.displayedText += text[i];
                    i++;
                } else {
                    clearInterval(this.typingTimer);
                    this.typingTimer = null;
                    this.isTyping = false;
                }
            }, 35); // 타이핑 속도
        },

        // ── 클릭 처리 (다음 대사) ──
        handleClick() {
            if (this.isTransitioning || this.showSkipModal || this.isCompleted) return;

            // 타이핑 중이면 즉시 전체 표시
            if (this.isTyping) {
                clearInterval(this.typingTimer);
                this.typingTimer = null;
                this.displayedText = this.currentScene.text;
                this.isTyping = false;
                return;
            }

            // 다음 씬으로
            if (this.currentSceneIndex < this.totalScenes - 1) {
                this.currentSceneIndex++;
                this.startScene();
            }
        },

        // ── 화면 효과 ──
        triggerEffect(effect) {
            this.screenEffect = effect;
            setTimeout(() => {
                this.screenEffect = '';
            }, effect === 'blackout' ? 2000 : 800);
        },

        // ── 스킵 ──
        openSkipModal() {
            this.showSkipModal = true;
        },

        closeSkipModal() {
            this.showSkipModal = false;
        },

        async confirmSkip() {
            this.showSkipModal = false;
            await this.completeTutorial();
        },

        // ── 튜토리얼 완료 ──
        async completeTutorial() {
            this.isCompleted = true;
            try {
                await fetch('/api/tutorial/complete-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: 2 }) // 프롤로그 완료
                });
            } catch (e) {
                console.error('튜토리얼 완료 처리 실패:', e);
            }

            // 페이드 아웃 후 마을로 이동
            setTimeout(() => {
                window.location.href = '/town';
            }, 2000);
        },

        // ── 키보드 지원 ──
        handleKeydown(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.handleClick();
            } else if (e.key === 'Escape') {
                if (this.showSkipModal) {
                    this.closeSkipModal();
                } else {
                    this.openSkipModal();
                }
            }
        }
    }));
});
