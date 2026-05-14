document.addEventListener('alpine:init', () => {
    Alpine.data('lobbyApp', () => ({
        // ── 유저 정보 ──
        playerGender: 'MALE',
        playerNickname: '모험가',
        playerLevel: 1,
        playerExp: 0,
        playerNextLevelExp: 100,
        playerGold: 0,
        playerGems: 0,
        claimedLevelRewards: "",

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

        // ── 상세 프로필 수치 ──
        combatPower: 0,
        partyCombatPower: 0,
        serverRank: '--',
        towerFloor: 1,
        hallStage: 1,
        raidStage: 1,
        maxClearedStageId: 0,
        claimedActRewards: "",

        // ── 퀘스트 & 던전 상태 ──
        currentQuest: { 
            id: 0, 
            title: '로딩 중...', 
            goalDesc: '데이터 동기화 중...', 
            status: 'IN_PROGRESS',
            rewardGold: 0,
            rewardGems: 0
        },
        stages: [],
        currentChapter: 1,

        selectedPartySlot: 0,

        // ── 가이드라인 엔진 ──
        guideStep: 0,
        guideActive: false,
        guideMonologueText: '',
        guideTyping: false,
        guideMonologueLines: [],
        guideMonologueIndex: 0,
        guideTypeInterval: null,

        async init() {
            await this.loadPlayerInfo();
            await this.loadMyCharacters();
            if (typeof this.fetchQuestInfo === 'function') {
                await this.fetchQuestInfo();
            }

            // 대표 캐릭터 이미지(일러스트)가 브라우저에 캐싱될 때까지 로딩 스크린 유지 (FOUC 방지)
            const mainCharSrc = this.currentLobbyCharacter.src;
            if (mainCharSrc) {
                await new Promise(resolve => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = resolve;
                    img.src = mainCharSrc;
                });
            }

            this.isLoading = false;
            this.checkGuideStart();
        },

        async loadPlayerInfo() {
            try {
                const res = await fetch('/api/map/player-info');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.gender || 'MALE';
                    this.playerNickname = data.nickname || '모험가';
                    this.playerLevel = data.level || 1;
                    this.playerExp = data.exp || 0;
                    this.playerNextLevelExp = data.nextLevelExp || 100;
                    this.playerGold = data.gold || 0;
                    this.playerGems = data.premiumCurrency || 0;
                    this.claimedLevelRewards = data.claimedLevelRewards || "";
                    
                    // 신규 필드 매핑
                    this.combatPower = data.totalPower || 0;
                    this.partyCombatPower = data.partyPower || 0; 
                    this.serverRank = data.serverRank || '--';
                    this.towerFloor = data.towerFloor || 1;
                    this.hallStage = data.hallStage || 1;
                    this.raidStage = data.raidStage || 1;
                    this.maxClearedStageId = data.maxClearedStageId || 0;
                    this.claimedActRewards = data.claimedActRewards || "";

                    if (data.mainCharacterId !== null && data.mainCharacterId !== undefined) {
                        this.serverMainCharacterId = data.mainCharacterId;
                    }
                    if (data.profileImagePath) {
                        this.customPortrait = data.profileImagePath;
                    }
                }
            } catch (e) {
                console.warn('플레이어 정보 로딩 실패:', e);
            }
        },

        async fetchQuestInfo() {
            try {
                const res = await fetch('/api/quest/current');
                if (res.ok) this.currentQuest = await res.json();
            } catch (e) { console.error("Quest fetch error:", e); }
        },

        async fetchStages() {
            try {
                const res = await fetch(`/api/dungeon/stages/${this.currentChapter}`);
                if (res.ok) {
                    this.stages = await res.json();
                    this.$nextTick(() => lucide.createIcons());
                }
            } catch (e) { console.error("Stages fetch error:", e); }
        },

        async handleQuestClick() {
            if (this.currentQuest.status === 'COMPLETED') {
                // 수령 모달을 띄우도록 바꿈
                this.openModal('QUEST_REWARD');
            } else {
                this.goToStory();
            }
        },

        async claimQuestReward() {
            try {
                const res = await fetch('/api/quest/claim', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    // 성공 시 모달 닫고 정보 갱신
                    this.closeModal();
                    await this.fetchQuestInfo();
                    await this.loadPlayerInfo();
                } else {
                    alert('보상 수령 실패: ' + (data.error || '알 수 없는 오류'));
                }
            } catch (e) { alert('보상 수령 실패: ' + e.message); }
        },

        async claimEventReward() {
            try {
                const res = await fetch('/api/map/claim-event-reward', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    alert(`이벤트 보상으로 보석 ${data.gems}개를 수령했습니다!`);
                    await this.loadPlayerInfo();
                } else {
                    alert('이벤트 보상 수령 실패: ' + (data.error || '알 수 없는 오류'));
                }
            } catch (e) { alert('오류가 발생했습니다: ' + e.message); }
        },

        async enterStage(stage) {
            try {
                const res = await fetch(`/api/dungeon/check-story/${stage.id}`);
                const data = await res.json();
                // TODO: '스토리 재생창(story.html)' 페이지가 아직 없어서 발생하는 404 에러 방지용 임시 우회
                // 나중에 스토리 재생 페이지를 만들 때 주석을 풀면 됩니다!
                // if (data.hasStory) {
                //     window.location.href = `/story?id=${data.storyId}&nextStage=${stage.id}`;
                // } else {
                //     window.location.href = `/battle?stageId=${stage.id}`;
                // }
                window.location.href = `/battle?stageId=${stage.id}`;
            } catch (e) { window.location.href = `/battle?stageId=${stage.id}`; }
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
                        rarity: c.rarity || 'C',
                        level: c.level,
                        color: this.roleColor(c.role),
                        rarityColor: this.rarityColor(c.rarity || 'C')
                    }));

                    // 등급 순 정렬 (S -> A -> B -> C)
                    const rankOrder = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
                    this.myCharacters.sort((a, b) => rankOrder[b.rarity] - rankOrder[a.rarity]);

                    // 서버가 보내준 파티 데이터가 정상적으로 존재할 때만 대입
                    if (data.party) {
                        savedSlots = data.party;
                    }

                    // 서버에 저장된 메인 캐릭터 반영
                    if (this.serverMainCharacterId) {
                        const mIdx = this.myCharacters.findIndex(c => Number(c.id) === Number(this.serverMainCharacterId));
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
                color: 'bg-amber-600',
                rarity: 'S',
                rarityColor: 'border-amber-500 text-amber-400'
            };
        },

        rarityColor(rarity) {
            const map = {
                'S': 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)] text-amber-400',
                'A': 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)] text-purple-400',
                'B': 'border-blue-500 text-blue-400',
                'C': 'border-slate-600 text-slate-400'
            };
            return map[rarity] || 'border-slate-600 text-slate-400';
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
                'DAILY_HALL': '기억의 전당 (던전)',
                'STORY_SELECT': '제1막: 남궁의 잔화 (殘花)',
                'TOWER': '무한의 탑',
                'RAID': '주간 레이드 (토벌)',
                'MY_PROFILE': '종합 상태창',
                'PROFILE_EDIT': '유저 프로필 설정'
            };

            // 스토리 선택 모달 열 때 스테이지 데이터 로드
            if (type === 'STORY_SELECT') {
                this.fetchStages();
            }

            this.modalTitle = titles[type] || '시스템';
            this.currentModal = type;
        },

        // 캐릭터 편성 토글 logic
        selectPartySlot(idx) {
            this.selectedPartySlot = idx;
        },

        togglePartyMember(char) {
            // 이미 다른 슬롯에 편성되어 있는지 확인
            const existingIdx = this.currentParty.findIndex(p => p && p.id === char.id);
            
            if (existingIdx !== -1) {
                // 이미 있으면 해당 슬롯 비우기 (토글)
                this.currentParty[existingIdx] = null;
            } else {
                // 없으면 현재 선택된 슬롯에 넣기
                this.currentParty[this.selectedPartySlot] = char;
                // 다음 빈 슬롯이나 다음 번호 슬롯으로 자동 이동 (편의성)
                this.selectedPartySlot = (this.selectedPartySlot + 1) % 4;
            }
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

        async claimActReward(act) {
            try {
                const res = await fetch(`/api/map/claim-act-reward?act=${act}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.success) {
                    alert(`${act}막 보상 1,500 보석 수령 완료!`);
                    this.claimedActRewards = data.claimedActRewards;
                    await this.loadPlayerInfo();
                } else {
                    alert(data.error || "수령 실패");
                }
            } catch (e) {
                console.error(e);
            }
        },

        isActClaimed(act) {
            if (!this.claimedActRewards) return false;
            return this.claimedActRewards.split(',').includes(act.toString());
        },

        canClaimAct(act) {
            return this.maxClearedStageId >= (act * 5);
        },

        async claimLevelReward(lv) {
            if (this.playerLevel < lv || this.isLevelRewardClaimed(lv)) return;
            try {
                const res = await fetch(`/api/map/claim-level-reward?targetLevel=${lv}`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    this.playerGems = data.totalGems;
                    this.claimedLevelRewards = data.claimedLevelRewards;
                    // Lucide 아이콘 재로드 (모달 내 아이콘 갱신용)
                    this.$nextTick(() => lucide.createIcons());
                } else {
                    alert(data.error || "수령 실패");
                }
            } catch (e) {
                console.error(e);
            }
        },

        isLevelRewardClaimed(lv) {
            if (!this.claimedLevelRewards) return false;
            return this.claimedLevelRewards.split(',').includes(lv.toString());
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
        },

        // ═══════════════════════════════════
        //  가이드라인 엔진 (3단계)
        // ═══════════════════════════════════
        checkGuideStart() {
            // localStorage 방어: 이미 완료했으면 실행 안 함
            if (localStorage.getItem('hanwol_lobby_guide_done') === 'true') return;
            // 레벨 2 이상 = 튜토리얼 배틀을 클리어한 유저에게만 가이드 표시
            if (this.playerLevel < 2) return;

            this.guideActive = true;
            this.guideStep = 1;
            this.startGuideMonologue();
        },

        startGuideMonologue() {
            const isMale = this.playerGender === 'MALE';
            this.guideMonologueLines = isMale
                ? [
                    '"...결국 살아남았군."',
                    '"허나 아직 아무것도 끝나지 않았다."',
                    '"천마의 수하들은 중원 곳곳에서 설치고 있고... 형님들의 원수는 아직 살아 숨 쉬고 있다."',
                    '"이 검을 갈고, 동료를 모으고, 반드시... 피의 대가를 치르게 하리라."'
                ]
                : [
                    '"...살았어. 나... 정말 살아남은 거야."',
                    '"무서웠어. 죽을 뻔했어. 하지만... 이제 더 이상 도망치지 않을 거야."',
                    '"오빠들이 지켜주지 못한 이 세상, 이번엔 내가 지켜야 해."',
                    '"이 차가운 힘으로... 반드시 원수를 갚을 거야."'
                ];
            this.guideMonologueIndex = 0;
            this.typeGuideMonologue();
        },

        typeGuideMonologue() {
            if (this.guideMonologueIndex >= this.guideMonologueLines.length) {
                // 독백 끝 → Step 2로 진행
                this.guideStep = 2;
                return;
            }
            this.guideTyping = true;
            const fullText = this.guideMonologueLines[this.guideMonologueIndex];
            this.guideMonologueText = '';
            let i = 0;
            clearInterval(this.guideTypeInterval);
            this.guideTypeInterval = setInterval(() => {
                this.guideMonologueText += fullText.charAt(i);
                i++;
                if (i >= fullText.length) {
                    clearInterval(this.guideTypeInterval);
                    this.guideTyping = false;
                }
            }, 50);
        },

        advanceGuideMonologue() {
            if (this.guideTyping) {
                clearInterval(this.guideTypeInterval);
                this.guideMonologueText = this.guideMonologueLines[this.guideMonologueIndex];
                this.guideTyping = false;
            } else {
                this.guideMonologueIndex++;
                if (this.guideMonologueIndex >= this.guideMonologueLines.length) {
                    this.guideStep = 2; // 독백 끝 → 편성 강조
                } else {
                    this.typeGuideMonologue();
                }
            }
        },

        skipGuide() {
            this.guideStep = 0;
            this.guideActive = false;
            localStorage.setItem('hanwol_lobby_guide_done', 'true');
        },

        guideOpenParty() {
            this.openModal('PARTY');
            // 편성 모달을 열면 Step 3으로 진행 대기
        },

        guideCompletePartyStep() {
            if (this.guideStep === 2) {
                this.guideStep = 3;
            }
        },

        guideCompleteMissionStep() {
            if (this.guideStep === 3) {
                this.guideStep = 0;
                this.guideActive = false;
                localStorage.setItem('hanwol_lobby_guide_done', 'true');
            }
        },

        closeModal() {
            if (this.guideStep === 2 && this.currentModal === 'PARTY') {
                this.guideCompletePartyStep();
            }
            this.currentModal = null;
        }
    }));
});
