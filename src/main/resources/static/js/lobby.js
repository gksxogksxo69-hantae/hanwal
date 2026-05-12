document.addEventListener('alpine:init', () => {
    Alpine.data('lobbyApp', () => ({
        // ── 유저 정보 ──
        playerGender: 'MALE',
        playerNickname: '모험가',
        playerLevel: 1,
        playerGold: 0,
        playerGems: 0,

        // ── 로비 상태 ──
        currentModal: null,
        modalTitle: '',
        isLoading: true,
        customPortrait: null,

        // 가챠 상태
        gachaResults: [],
        isGachaAnimating: false,

        // ── 캐릭터 (서버에서 로딩) ──
        myCharacters: [],
        currentCharIndex: 0,
        currentParty: [null, null, null, null],

        // ── 초기화 ──
        async init() {
            await this.loadPlayerInfo();
            await this.loadMyCharacters();
            this.isLoading = false;
        },

        async loadPlayerInfo() {
            try {
                const res = await fetch('/api/map/player-info');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.gender || 'MALE';
                    this.playerNickname = data.nickname || '모험가';
                    this.playerLevel = data.level || 1;
                    this.playerGold = data.gold || 0;
                    this.playerGems = data.premiumCurrency || 0;
                    if (data.profileImagePath) {
                        this.customPortrait = data.profileImagePath;
                    }
                    if (data.mainCharacterId) {
                        this.serverMainCharacterId = data.mainCharacterId;
                    }
                }
            } catch (e) {
                console.warn('플레이어 정보 로딩 실패:', e);
                this.playerNickname = '테스트유저';
                this.playerGold = 50000;
                this.playerGems = 1200;
            }
        },

        async loadMyCharacters() {
            // 1. 에러 발생 시 안전하게 기본값을 쓸 수 있도록 함수 최상단에 선언
            let savedSlots = [null, null, null, null];

            try {
                const res = await fetch('/api/lobby/my-characters');
                const data = await res.json();

                if (data.success && data.characters && data.characters.length > 0) {
                    this.myCharacters = data.characters.map(c => ({
                        id: c.id,
                        name: c.name,
                        src: c.imagePath,
                        desc: c.title || c.role,
                        role: c.role,
                        level: c.level,
                        color: this.roleColor(c.role)
                    }));

                    // 서버가 보내준 파티 데이터가 정상적으로 존재할 때만 대입
                    if (data.party) {
                        savedSlots = data.party;
                    }

                    // 서버에 저장된 메인 캐릭터 반영
                    if (this.serverMainCharacterId) {
                        const mIdx = this.myCharacters.findIndex(c => c.id === this.serverMainCharacterId);
                        if (mIdx !== -1) {
                            this.currentCharIndex = mIdx;
                        }
                    }
                } else {
                    // DB에 캐릭터가 없으면 폴백(주인공 초상화)
                    this.myCharacters = [this.fallbackCharacter()];
                }
            } catch (e) {
                console.warn('캐릭터 목록 로딩 실패, 폴백 사용:', e);
                this.myCharacters = [this.fallbackCharacter()];
            }

            // 2. 파티 설정 로직 (try 블록 외부에서도 savedSlots를 안전하게 참조할 수 있음)
            for (let i = 0; i < 4; i++) {
                if (savedSlots[i]) {
                    this.currentParty[i] = this.myCharacters.find(c => c.id === savedSlots[i]) || null;
                } else {
                    this.currentParty[i] = (i < this.myCharacters.length && savedSlots.every(s => !s))
                        ? this.myCharacters[i]
                        : null;
                }
            }
        },

        fallbackCharacter() {
            return {
                id: 'protagonist',
                name: this.playerNickname,
                src: this.playerGender === 'FEMALE' ? '/images/portrait_female.png' : '/images/portrait_male.png',
                desc: '여행자',
                role: '주인공',
                level: this.playerLevel,
                color: 'bg-amber-600'
            };
        },

        roleColor(role) {
            const map = {
                '딜탱': 'bg-red-600', '속도딜러': 'bg-amber-600', '디버퍼': 'bg-purple-600',
                '전사': 'bg-amber-600', '서포터': 'bg-green-500', '암살자': 'bg-purple-600',
                '주인공': 'bg-amber-600'
            };
            return map[role] || 'bg-slate-600';
        },

        get playerPortrait() {
            if (this.customPortrait) return this.customPortrait;
            return this.playerGender === 'FEMALE' ? '/images/portrait_female.png' : '/images/portrait_male.png';
        },

        get currentLobbyCharacter() {
            if (this.myCharacters.length === 0) return this.fallbackCharacter();
            return this.myCharacters[this.currentCharIndex % this.myCharacters.length];
        },

        nextCharacter() {
            if (this.myCharacters.length <= 1) return;
            this.currentCharIndex = (this.currentCharIndex + 1) % this.myCharacters.length;
        },

        async setMainCharacter(index) {
            this.currentCharIndex = index;
            this.closeModal();
            try {
                const charId = this.myCharacters[index].id;
                await fetch('/api/lobby/main-character', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ characterId: charId })
                });
            } catch (e) {
                console.error(e);
            }
        },

        async setProfileImage(src) {
            this.customPortrait = src;
            this.closeModal();
            try {
                await fetch('/api/lobby/profile-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imagePath: src })
                });
            } catch (e) {
                console.error(e);
            }
        },

        // ── 액션 ──
        openModal(type) {
            const titles = {
                'GACHA': '객잔 (영입)',
                'PARTY': '편성 (출진)',
                'INVENTORY': '보따리 (인벤토리)',
                'GUILD': '문파 (길드)',
                'DUNGEON': '수련의 탑 (던전)',
                'PROFILE': '유저 프로필 설정'
            };
            this.modalTitle = titles[type] || '시스템';
            this.currentModal = type;
        },

        closeModal() {
            this.currentModal = null;
        },

        async saveParty() {
            const slots = this.currentParty.map(c => c ? c.id : null);
            try {
                const res = await fetch('/api/party/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slots })
                });
                const data = await res.json();
                if (data.success) {
                    this.closeModal();
                } else {
                    alert('편성 저장에 실패했습니다.');
                }
            } catch (e) {
                console.error(e);
            }
        },

        async drawGacha(count) {
            const cost = count === 1 ? 150 : 1500;
            if (this.playerGems < cost) {
                alert('보석이 부족합니다!');
                return;
            }

            this.isGachaAnimating = true;
            try {
                const res = await fetch(`/api/gacha/draw?count=${count}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    this.playerGems = data.remainingGems;
                    this.gachaResults = data.results;
                    // TODO: myCharacters 목록 갱신을 위해 다시 호출하거나 로컬 상태 업데이트
                    await this.loadMyCharacters();
                } else {
                    alert(data.error);
                }
            } catch (e) {
                console.error(e);
            }
            this.isGachaAnimating = false;
        },

        goToStory() {
            window.location.href = '/stage-select';
        },

        enterDungeon() {
            alert('기억의 전당 입장 기능은 향후 전투 시스템 완성 시 연동됩니다!');
            this.closeModal();
        }
    }));
});
