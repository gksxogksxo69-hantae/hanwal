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
                }
            } catch (e) {
                console.warn('플레이어 정보 로딩 실패:', e);
                this.playerNickname = '테스트유저';
                this.playerGold = 50000;
                this.playerGems = 1200;
            }
        },

        async loadMyCharacters() {
            try {
                const res = await fetch('/api/lobby/my-characters');
                const data = await res.json();
                if (data.success && data.characters.length > 0) {
                    this.myCharacters = data.characters.map(c => ({
                        id: c.id,
                        name: c.name,
                        src: c.imagePath,
                        desc: c.title || c.role,
                        role: c.role,
                        level: c.level,
                        color: this.roleColor(c.role)
                    }));
                } else {
                    // DB에 캐릭터가 없으면 폴백(주인공 초상화)
                    this.myCharacters = [this.fallbackCharacter()];
                }
            } catch (e) {
                console.warn('캐릭터 목록 로딩 실패, 폴백 사용:', e);
                this.myCharacters = [this.fallbackCharacter()];
            }
            // 파티 초기화: 보유 캐릭터 순서대로 최대 4명 배치
            // 파티 설정
            let savedSlots = data.party || [null, null, null, null];
            for (let i = 0; i < 4; i++) {
                if (savedSlots[i]) {
                    this.currentParty[i] = this.myCharacters.find(c => c.id === savedSlots[i]) || null;
                } else {
                    this.currentParty[i] = i < this.myCharacters.length && savedSlots.every(s => !s) ? this.myCharacters[i] : null;
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

        setMainCharacter(index) {
            this.currentCharIndex = index;
            // 모달을 유지하고 싶다면 closeModal 호출 안함. 피드백을 위해 닫음.
            this.closeModal();
            // TODO: 필요한 경우 서버에 대표 캐릭터 상태 저장 API 호출 (차후 구현)
        },

        setProfileImage(src) {
            this.customPortrait = src;
            this.closeModal();
            // TODO: 필요한 경우 서버에 프로필 이미지 저장 API 호출 (차후 구현)
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
        }
    }));
});
