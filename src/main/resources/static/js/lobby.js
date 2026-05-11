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

        // ── 초기화 ──
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

        get playerFullPortrait() {
            // 임시로 초상화 이미지를 로비 스탠딩 일러스트로 씁니다. 추후 고해상도 L2D 이미지로 교체 가능.
            return this.playerGender === 'FEMALE' ? '/images/portrait_female.png' : '/images/portrait_male.png';
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
