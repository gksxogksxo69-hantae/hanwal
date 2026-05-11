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

        // ── 보유 캐릭터 리스트 (임시 데이터) ──
        myCharacters: [
            { id: 'namgung_cheon', name: '남궁천', src: '/images/namgung_cheon.png', desc: '가문의 수치, 막내아들', role: '전사', color: 'bg-amber-600', textColor: 'text-amber-500' },
            { id: 'zhuge_ryeong', name: '제갈령', src: '/images/zhuge_ryeong.png', desc: '천재 기관술사', role: '서포터', color: 'bg-green-500', textColor: 'text-green-400' },
            { id: 'dang_soso', name: '당소소', src: '/images/dang_soso.png', desc: '독련화 (독과 암기의 극의)', role: '암살자', color: 'bg-purple-600', textColor: 'text-purple-500' }
        ],
        currentCharIndex: 0,
        
        // ── 편성 창(Party) 데이터 ──
        currentParty: [null, null, null, null],

        // ── 초기화 ──
        init() {
            this.loadPlayerInfo();
            // 기본 파티 세팅
            this.currentParty[0] = this.myCharacters[0];
            this.currentParty[1] = this.myCharacters[1];
            this.currentParty[2] = this.myCharacters[2];
            // 4번 슬롯은 비어둠
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
                // 모의 데이터
                this.playerNickname = '테스트유저';
                this.playerGold = 50000;
                this.playerGems = 1200;
            }
        },

        get playerPortrait() {
            return this.playerGender === 'FEMALE' ? '/images/portrait_female.png' : '/images/portrait_male.png';
        },

        get currentLobbyCharacter() {
            return this.myCharacters[this.currentCharIndex];
        },

        nextCharacter() {
            this.currentCharIndex = (this.currentCharIndex + 1) % this.myCharacters.length;
        },

        // ── 액션 ──
        openModal(type) {
            const titles = {
                'GACHA': '객잔 (영입)',
                'PARTY': '편성 (출진)',
                'INVENTORY': '보따리 (인벤토리)',
                'GUILD': '문파 (길드)',
                'DUNGEON': '수련의 탑 (던전)'
            };
            this.modalTitle = titles[type] || '시스템';
            this.currentModal = type;
        },

        closeModal() {
            this.currentModal = null;
        },

        goToStory() {
            // 스토리(스테이지 선택) 뷰로 이동 (stage_select.html)
            window.location.href = '/stage-select';
        }
    }));
});
