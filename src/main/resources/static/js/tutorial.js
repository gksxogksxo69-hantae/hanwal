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
            if (this.playerGender === 'MALE') {
                const pName = '남궁천';
                const pPortrait = '/images/portrait_male.png';
                
                return [
                    // ===== ACT 1: 평화로운 남궁세가 (남자) =====
                    { bg: '/images/bg_estate_peace.png', speaker: null, text: '', isTransition: true, transitionText: '남궁세가... 오래전 그 평화롭던 날들.', effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '남궁세가. 강호 오대세가 중 하나이자, 천하제일검이라 불리는 검의 명가.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: `벚꽃이 흩날리는 이 아름다운 곳에서, 세가의 막내인 ${pName}은 여느 때와 다름없는 하루를 보내고 있었다.`, isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },
                    { bg: '/images/bg_estate_peace.png', speaker: pName, text: '하암... 오늘도 수련이라. 형님들은 벌써 일가를 이루셨는데, 나는 아직 검조차 제대로 못 잡는 꼴이라니.', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '그러나 강호에 어둠이 드리우고 있었다. 백 년 전 봉인되었던 천마가 깨어나 마기를 천하에 퍼뜨리기 시작한 것이다.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '무림맹은 곧바로 토벌대를 결성했다. 강호 최고의 고수 여덟 명이 모였으니, 그 중에는 남궁세가의 가주와 전대가주도 포함되어 있었다.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: pName, text: '아버지... 할아버지까지 가시다니. 꼭 무사히 돌아오셔야 합니다.', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '그로부터 한 달... 토벌대 전원이 전멸했다는 비보가 날아들었다. 강호는 공포에 빠졌고, 각 세가와 문파는 스스로를 지키기에 급급했다.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: pName, text: '... 더 이상 게으를 수 없다. 내가 남궁세가의 검을 이어받아야 한다. 지금 당장 수련을 시작하자.', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },

                    // ===== ACT 2: 습격과 탈출 (남자) =====
                    { bg: '/images/bg_estate_fire.png', speaker: null, text: '', isTransition: true, transitionText: '그리고 얼마 후... 재앙이 찾아왔다.', effect: 'flash-red', portraits: [] },
                    { bg: '/images/bg_estate_fire.png', speaker: '나레이션', text: '천마신교의 무리가 남궁세가를 습격했다. 가주를 잃은 세가는 제대로 된 저항조차 할 수 없었다.', isTransition: false, effect: 'shake', portraits: [], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '소공자! 이쪽으로 오십시오! 후문으로 빠져나가야 합니다!', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: pName, text: '강노 아저씨! 세가 사람들은?! 다들 무사한 겁니까?!', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'right', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '... 이미 많은 이들이 쓰러졌습니다. 하지만 소공자만큼은 반드시 지킨다 맹세했으니, 여기서 잡담할 시간이 없습니다. 어서!', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '나레이션', text: '불타는 세가를 등지고 달렸다. 그러나 천마신교의 추격은 끈질겼다. 결국 후문 앞에서 적들에게 포위당하고 말았다.', isTransition: false, effect: 'shake', portraits: [], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '소공자, 여기서 제가 막겠습니다. 뒤돌아보지 말고 절벽 아래 숲길로 내려가십시오.', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: pName, text: '안 됩니다! 아저씨 혼자 이 많은 적을...!', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'right', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '남궁세가의 검은 여기서 끊어져선 안 됩니다. 부디... 살아남아 주십시오. 가주님의 뜻을 이어주시길.', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '나레이션', text: `강노는 마지막 미소를 지으며 적들을 향해 몸을 날렸다. 그의 희생 덕분에 ${pName}은 무사히 후문 밖으로 빠져나갈 수 있었다.`, isTransition: false, effect: 'shake', portraits: [], showEmbers: true },

                    // ===== ACT 3: 절벽 (남자) 끝 =====
                    { bg: '/images/bg_cliff.png', speaker: null, text: '', isTransition: true, transitionText: '... 그리고 어둠 속에서 떨어졌다.', effect: 'blackout', portraits: [], isFinal: true }
                ];
            } else {
                const pName = '남궁설화';
                const pPortrait = '/images/portrait_female.png';
                
                return [
                    // ===== ACT 1: 평화로운 남궁세가 (여자) =====
                    { bg: '/images/bg_estate_peace.png', speaker: null, text: '', isTransition: true, transitionText: '남궁세가... 오래전 그 평화롭던 날들.', effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '남궁세가. 강호 오대세가 중 하나이자, 천하제일검이라 불리는 검의 명가.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: `벚꽃이 흩날리는 이 아름다운 곳에서, 세가의 막내인 ${pName}는 여느 때와 다름없는 하루를 보내고 있었다.`, isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },
                    { bg: '/images/bg_estate_peace.png', speaker: pName, text: '후우... 오늘도 검술 수련이네. 오라버니들은 일찍이 검의 이치를 깨달았는데, 나만 아직 제자리인 것 같아 속상해.', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '그러나 강호에 어둠이 드리우고 있었다. 백 년 전 봉인되었던 천마가 깨어나 마기를 천하에 퍼뜨리기 시작한 것이다.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '무림맹은 곧바로 토벌대를 결성했다. 강호 최고의 고수 여덟 명이 모였으니, 그 중에는 남궁세가의 가주와 전대가주도 포함되어 있었다.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: pName, text: '아버지... 할아버지까지 직접 나서시다니. 제발, 두 분 모두 무사히 돌아오셔야 해요.', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },
                    { bg: '/images/bg_estate_peace.png', speaker: '나레이션', text: '그로부터 한 달... 토벌대 전원이 전멸했다는 비보가 날아들었다. 강호는 공포에 빠졌고, 각 세가와 문파는 스스로를 지키기에 급급했다.', isTransition: false, effect: null, portraits: [] },
                    { bg: '/images/bg_estate_peace.png', speaker: pName, text: '... 더 이상 어리광 부릴 때가 아니야. 나도 남궁세가의 핏줄. 세가를 지킬 수 있는 힘을 길러야 해. 당장 연무장으로 가자.', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'center', state: 'speaking' } ] },

                    // ===== ACT 2: 습격과 탈출 (여자) =====
                    { bg: '/images/bg_estate_fire.png', speaker: null, text: '', isTransition: true, transitionText: '그리고 얼마 후... 재앙이 찾아왔다.', effect: 'flash-red', portraits: [] },
                    { bg: '/images/bg_estate_fire.png', speaker: '나레이션', text: '천마신교의 무리가 남궁세가를 습격했다. 가주를 잃은 세가는 제대로 된 저항조차 할 수 없었다.', isTransition: false, effect: 'shake', portraits: [], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '아가씨! 이쪽으로 오십시오! 후문으로 피하셔야 합니다!', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: pName, text: '강노 아저씨! 다른 식구들은요?! 다들 무사한 건가요?!', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'right', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '... 이미 많은 이들이 당했습니다. 하지만 아가씨만큼은 반드시 지킨다 약조했으니, 이송을 서둘러야 합니다!', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '나레이션', text: '불타는 세가를 등지고 달렸다. 그러나 천마신교의 추격은 끈질겼다. 결국 후문 앞에서 적들에게 포위당하고 말았다.', isTransition: false, effect: 'shake', portraits: [], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '아가씨, 여기서 제가 막겠습니다. 뒤돌아보지 말고 절벽 아래 숲길로 뛰어내려가십시오.', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: pName, text: '안 돼요! 아저씨 혼자 놔두고 갈 순 없어요...!', isTransition: false, effect: null, portraits: [ { src: pPortrait, position: 'right', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '호위무사 강노', text: '남궁세가의 핏줄은 여기서 끊어져선 안 됩니다. 부디... 살아남아 주십시오. 가주님의 뜻을 지켜주시길.', isTransition: false, effect: null, portraits: [ { src: '/images/portrait_guard.png', position: 'left', state: 'speaking' } ], showEmbers: true },
                    { bg: '/images/bg_estate_fire.png', speaker: '나레이션', text: `강노는 마지막 미소를 지으며 적들을 향해 몸을 날렸다. 그의 희생 덕분에 ${pName}는 후문 밖으로 무사히 빠져나갈 수 있었다.`, isTransition: false, effect: 'shake', portraits: [], showEmbers: true },

                    // ===== ACT 3: 절벽 (여자) 끝 =====
                    { bg: '/images/bg_cliff.png', speaker: null, text: '', isTransition: true, transitionText: '... 그리고 짙은 어둠 속으로 떨어졌다.', effect: 'blackout', portraits: [], isFinal: true }
                ];
            }
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
            // 빠른 다중 클릭 쓰로틀링 (0.2초 이내 무시)
            const now = Date.now();
            if (this.lastClickTime && now - this.lastClickTime < 200) return;
            this.lastClickTime = now;

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

            // 페이드 아웃 후 튜토리얼 동굴로 이동
            setTimeout(() => {
                window.location.href = '/tutorial-cave';
            }, 2000);
        },

        // ── 키보드 지원 ──
        handleKeydown(e) {
            // 꾹 누르기(키 리피트) 중복 실행 방지
            if (e.repeat) return;

            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.handleClick();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                // 씬 진행도에 상관없이 너무 초반에는 스킵 불가능하도록 (인덱스 > 0 일때만)
                if (this.isTransitioning || this.currentSceneIndex === 0) return;
                
                if (this.showSkipModal) {
                    this.closeSkipModal();
                } else {
                    this.openSkipModal();
                }
            }
        }
    }));
});
