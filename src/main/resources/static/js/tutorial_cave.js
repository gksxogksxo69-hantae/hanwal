document.addEventListener('alpine:init', () => {
    Alpine.data('caveApp', () => ({
        showGuide: true,
        showInteractPrompt: false,
        activeTrigger: null,

        playerGender: 'MALE',
        playerNickname: '모험가',

        // 시점 이동(비네트, 랜턴)용 반응형 상태
        playerScreenX: window.innerWidth / 2,
        playerScreenY: window.innerHeight / 2,

        canvas: null,
        ctx: null,
        lastTime: 0,
        resourcesLoaded: 0,
        charImg: new Image(),

        camera: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },

        player: { x: 400, y: 700, width: 16, height: 16, speed: 120, frameX: 0, frameY: 0, isMoving: false, animTimer: 0 },
        keys: { w: false, a: false, s: false, d: false },
        lastPressedDir: null,

        // 성별별 스프라이트
        spriteConfigs: {
            MALE: { src: '/images/char_sprite.png', cols: 4, rows: 4, down: 0, up: 1, left: 2, right: 3 },
            FEMALE: { src: '/images/char_sprite_female.png', cols: 4, rows: 4, down: 0, up: 1, left: 2, right: 3 }
        },
        currentConfig: null,

        // 맵 사이즈
        MAP_W: 800,
        MAP_H: 800,

        // 충돌체
        collisions: [
            { x: -50, y: -50, width: 900, height: 50 },
            { x: -50, y: 800, width: 900, height: 50 },
            { x: -50, y: 0, width: 50, height: 800 },
            { x: 800, y: 0, width: 50, height: 800 },
            { x: 100, y: 300, width: 150, height: 80 },
            { x: 550, y: 200, width: 120, height: 150 },
            { x: 250, y: 550, width: 250, height: 60 },
        ],

        // 상태 머신
        gameState: 'EXPLORE',
        promptText: '조사하기',

        showTimeSkip: false,
        timeSkipText: '수개월 후...',

        // 동적 기믹 요소 (성별에 따라 init에서 세팅)
        gimmick: null,
        enemy: { x: 400, y: 450, width: 32, height: 32, label: '천마신교 추격자', active: false },
        triggers: [],

        // 대화 서브 상태 (순차 대화를 위해 배열 사용)
        dialogList: [],
        currentDialogIndex: 0,
        currentDialog: false,
        dialogSpeaker: '',
        dialogText: '',
        displayedDialogText: '',
        isTyping: false,
        typingTimer: null,

        async init() {
            await this.loadPlayerInfo();
            this.setupGimmick();
            this.setupCanvas();
            this.loadResources();
            this.setupInput();

            setTimeout(() => { this.showGuide = false; }, 4000);
        },

        async loadPlayerInfo() {
            try {
                const res = await fetch('/api/map/player-info');
                const data = await res.json();
                if (data.success) {
                    this.playerGender = data.gender || 'MALE';
                    this.playerNickname = data.nickname || '모험가';
                }
            } catch (e) {
                // Ignore API eror in static tests
            }
            this.currentConfig = this.spriteConfigs[this.playerGender] || this.spriteConfigs.MALE;
        },

        // 성별에 따른 스토리 분기 셋업
        setupGimmick() {
            if (this.playerGender === 'MALE') {
                this.gimmick = { type: 'BOX', x: 380, y: 90, width: 50, height: 50, label: '오래된 벽화와 상자' };
                this.triggers = [ { id: 'GIMMICK', x: 360, y: 100, width: 80, height: 80 } ];
            } else {
                this.gimmick = { type: 'MASTER', x: 380, y: 120, width: 40, height: 40, label: '은발의 여고수' };
                this.triggers = [ { id: 'GIMMICK', x: 360, y: 100, width: 80, height: 80 } ];
            }
        },

        setupCanvas() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        },

        resizeCanvas() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.camera.width = window.innerWidth;
            this.camera.height = window.innerHeight;
            this.ctx.imageSmoothingEnabled = false;
        },

        loadResources() {
            this.charImg.onload = () => {
                this.resourcesLoaded = true;
                requestAnimationFrame((ts) => this.gameLoop(ts));
            };
            this.charImg.src = this.currentConfig.src;
        },

        setupInput() {
            window.addEventListener('keydown', (e) => {
                if (e.repeat) return; // 반복 키 입력(꾹 누름) 완전 차단

                if (this.currentDialog) {
                    if (e.code === 'Space' || e.code === 'Enter') this.nextDialog();
                    return;
                }
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) {
                    this.keys[key] = true;
                    this.lastPressedDir = key;
                }
                if (e.code === 'Space' && this.activeTrigger && !this.showTimeSkip) {
                    this.startInteraction();
                }
            });
            window.addEventListener('keyup', (e) => {
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) this.keys[key] = false;
            });
            window.addEventListener('click', () => {
                if (this.currentDialog && !this.showTimeSkip) this.nextDialog();
            });
        },

        loadDialogs(dialogs) {
            this.dialogList = dialogs;
            this.currentDialogIndex = 0;
            this.updateCurrentDialogUI();
        },

        updateCurrentDialogUI() {
            if (this.currentDialogIndex < this.dialogList.length) {
                const d = this.dialogList[this.currentDialogIndex];
                this.dialogSpeaker = d.speaker;
                this.dialogText = d.text;
                this.currentDialog = true;
                this.typeText(this.dialogText);
            } else {
                this.currentDialog = false;
                this.onDialogFinish();
            }
        },

        startInteraction() {
            this.keys = { w: false, a: false, s: false, d: false }; // 정지
            this.showInteractPrompt = false;

            if (this.activeTrigger === 'GIMMICK' && this.gameState === 'EXPLORE') {
                if (this.playerGender === 'MALE') {
                    // 남자: 상자에서 검법/심법 획득 로직
                    this.loadDialogs([
                        { speaker: this.playerNickname, text: '이곳에 오래된 상자가 있군... 벽화 아래 숨겨져있던 기연인가.' },
                        { speaker: '시스템', text: '낡은 상자 안에는 빛이 나는 열쇠와 두 권의 무공 비급, 그리고 낡은 서신이 들어 있었다!' },
                        { speaker: '전언', text: '"남궁의 후계를 이을 자여, 나는 과거 남궁의 검을 벼렸던 전인이다. 이 상자에 전설적인 검법 [제황검형]과 극강의 심법 [창궁대연신공]을 남긴다."' },
                        { speaker: '전언', text: '"이곳은 그 누구의 방해도 받지 않는 비경. 수개월간 뼈를 깎는 폐관수련으로 이 무공을 극성으로 끌어올려, 다시 세상에 나아가 만마를 멸하라."' },
                        { speaker: this.playerNickname, text: '...제황검형과 창궁대연신공! 강노 아저씨의 희생을 결코 헛되이 하지 않겠다. 당장 여기서 수련을 시작하자.' }
                    ]);
                } else {
                    // 여자: 은발의 북해빙궁주 스승 루트
                    this.loadDialogs([
                        { speaker: this.playerNickname, text: '앗... 누구시죠? 강호의 무리와는 이질적인 한기가 느껴지는데...' },
                        { speaker: '북해빙궁주', text: '호오, 이곳 절벽 아래까지 떨어지고도 뼈가 성하다니. 네 눈빛이 매섭고 곧은 것이 마음에 드는구나.' },
                        { speaker: '북해빙궁주', text: '나는 대륙 5대 고수 중 하나, 북해빙궁주라 한다. 어쩌다 보니 이 비경에 들러 쉬고 있었는데 기특한 재목을 만났군.' },
                        { speaker: '북해빙궁주', text: '네 안에 남궁의 끈질긴 기운이 엉켜있어. 내 잠시 이곳에 수개월간 머물며, 네 골수를 파고들어 무공의 이치를 가르쳐주마.' },
                        { speaker: this.playerNickname, text: '네?! 빙궁주님께서 직접...! 감사합니다, 제자로 거두어 주십시오!' }
                    ]);
                }
            } 
            else if (this.activeTrigger === 'BATTLE' && this.gameState === 'ENEMY_SPAWNED') {
                if (this.playerGender === 'MALE') {
                    this.loadDialogs([
                        { speaker: '천마신교 추격자', text: '크흐흐... 죽은 줄 알았던 남궁의 쥐새끼가 이곳 절벽 아래 숨어있었군! 이제 네 목을 가져가마!' },
                        { speaker: this.playerNickname, text: '수개월 전의 나약했던 나와는 다르다... 제황검형의 검로를 시험해볼 차례군. 내 검을 받아라!!' }
                    ]);
                } else {
                    this.loadDialogs([
                        { speaker: '천마신교 추격자', text: '크흐흐... 오랫동안 찾아 헤맸건만, 결국 이런 비경에 숨어있었군! 여기까지다!' },
                        { speaker: '북해빙궁주', text: '...파리 떼가 시끄럽구나. 제자여, 수개월 동안 나에게 배운 빙공의 위력을 보여주거라.' },
                        { speaker: this.playerNickname, text: '명심하겠습니다, 스승님! 단숨에 얼려버리겠습니다!!' }
                    ]);
                }
            }
        },

        typeText(text) {
            this.displayedDialogText = '';
            this.isTyping = true;
            let i = 0;

            if (this.typingTimer) clearInterval(this.typingTimer);

            this.typingTimer = setInterval(() => {
                if (i < text.length) {
                    this.displayedDialogText += text[i];
                    i++;
                } else {
                    clearInterval(this.typingTimer);
                    this.typingTimer = null;
                    this.isTyping = false;
                }
            }, 35);
        },

        nextDialog() {
            // 타이핑 중일 때 클릭하면 바로 전부 완성되게
            if (this.isTyping) {
                clearInterval(this.typingTimer);
                this.typingTimer = null;
                this.displayedDialogText = this.dialogText;
                this.isTyping = false;
                return;
            }

            this.currentDialogIndex++;
            this.updateCurrentDialogUI();
        },

        onDialogFinish() {
            if (this.gameState === 'EXPLORE') {
                // 기연 씬 종료 후: 타임스킵 발동 -> 적 출현
                this.gameState = 'TIME_SKIP';
                this.triggerTimeSkip();
            } 
            else if (this.gameState === 'ENEMY_SPAWNED') {
                // 적과의 대화 종료 후: 전투 진입
                const flash = document.getElementById('battleFlash');
                if(flash) flash.classList.add('active');
                setTimeout(() => {
                    window.location.href = '/battle/tutorial'; 
                }, 600);
            }
        },

        triggerTimeSkip() {
            this.showTimeSkip = true;
            this.timeSkipText = '수개월의 시간이 흐른 후...';
            
            setTimeout(() => {
                this.showTimeSkip = false;
                this.gameState = 'ENEMY_SPAWNED';

                this.enemy.active = true;
                this.triggers = [
                    { id: 'BATTLE', x: -500, y: -500, width: 2000, height: 2000 } // 동굴 어디든 한 발자국 움직이면 전투 돌입
                ];

                setTimeout(() => {
                    this.loadDialogs([
                        { speaker: '시스템', text: '(수직의 절벽 위에서 무언가 떨어지는 소리가 들리고, 기분 나쁜 살기가 느껴집니다...!)' }
                    ]);
                }, 1000);
            }, 3000);
        },

        updatePlayer(dt) {
            if (this.currentDialog || this.showTimeSkip || this.gameState === 'TIME_SKIP') { 
                this.player.isMoving = false; 
                this.player.frameX = 0;
                return; 
            }

            let dx = 0, dy = 0;
            if (this.keys.w) dy -= 1;
            if (this.keys.s) dy += 1;
            if (this.keys.a) dx -= 1;
            if (this.keys.d) dx += 1;

            this.player.isMoving = (dx !== 0 || dy !== 0);

            if (this.player.isMoving) {
                const cfg = this.currentConfig;
                if (dx !== 0 && dy !== 0) {
                    const dirMap = { d: cfg.right, a: cfg.left, s: cfg.down, w: cfg.up };
                    if (this.lastPressedDir && dirMap[this.lastPressedDir] !== undefined) {
                        this.player.frameY = dirMap[this.lastPressedDir];
                    }
                } else if (dx > 0) this.player.frameY = cfg.right;
                else if (dx < 0) this.player.frameY = cfg.left;
                else if (dy > 0) this.player.frameY = cfg.down;
                else if (dy < 0) this.player.frameY = cfg.up;

                const len = Math.sqrt(dx * dx + dy * dy);
                const moveX = (dx / len) * this.player.speed * dt;
                const moveY = (dy / len) * this.player.speed * dt;

                let nextX = this.player.x + moveX;
                let nextY = this.player.y + moveY;

                if (!this.checkCollision(nextX, nextY)) {
                    this.player.x = nextX;
                    this.player.y = nextY;
                } else if (!this.checkCollision(this.player.x, nextY)) {
                    this.player.y = nextY;
                } else if (!this.checkCollision(nextX, this.player.y)) {
                    this.player.x = nextX;
                }

                this.player.animTimer += dt;
                if (this.player.animTimer > 0.15) {
                    this.player.frameX = (this.player.frameX + 1) % cfg.cols;
                    this.player.animTimer = 0;
                }
            } else {
                this.player.frameX = 0;
            }

            this.checkTriggers();
        },

        checkCollision(nx, ny) {
            const p = { x: nx, y: ny, w: this.player.width, h: this.player.height };
            for (let b of this.collisions) {
                if (p.x < b.x + b.width && p.x + p.w > b.x && p.y < b.y + b.height && p.y + p.h > b.y) return true;
            }
            if (this.enemy.active) {
                const e = this.enemy;
                if (p.x < e.x + e.width && p.x + p.w > e.x && p.y < e.y + e.height && p.y + p.h > e.y) return true;
            }
            // 기믹 통과 불가 처리
            if (this.gimmick && this.gimmick.active !== false) {
                const g = this.gimmick;
                if (p.x < g.x + g.width && p.x + p.w > g.x && p.y < g.y + g.height && p.y + p.h > g.y) return true;
            }

            return false;
        },

        checkTriggers() {
            const p = { x: this.player.x, y: this.player.y, w: this.player.width, h: this.player.height };
            let found = null;
            for (let t of this.triggers) {
                if (p.x < t.x + t.width && p.x + p.w > t.x && p.y < t.y + t.height && p.y + p.h > t.y) { found = t.id; break; }
            }
            if (found !== this.activeTrigger) {
                this.activeTrigger = found;
                this.showInteractPrompt = (found !== null);
                if (found === 'GIMMICK') this.promptText = this.playerGender === 'MALE' ? '상자 조사하기' : '대화하기';
                else if (found === 'BATTLE') this.promptText = '전투 돌입';
            }
        },

        drawMap() {
            this.camera.x = this.player.x - this.camera.width / 2;
            this.camera.y = this.player.y - this.camera.height / 2;

            this.ctx.fillStyle = '#050505';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);

            // 바닥
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(0, 0, this.MAP_W, this.MAP_H);
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.lineWidth = 2;
            for (let i = 0; i <= this.MAP_W; i += 40) {
                this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.MAP_H); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.MAP_W, i); this.ctx.stroke();
            }

            // 벽 장애물
            this.ctx.fillStyle = '#0a0a0a';
            this.ctx.strokeStyle = '#222';
            this.collisions.forEach(c => {
                if (c.width < 800) { 
                    this.ctx.fillRect(c.x, c.y, c.width, c.height);
                    this.ctx.strokeRect(c.x, c.y, c.width, c.height);
                }
            });

            // 기믹(벽화+상자 or 북해빙궁주) 렌더링
            if (this.gimmick && this.gimmick.active !== false) {
                const gx = this.gimmick.x, gy = this.gimmick.y, gw = this.gimmick.width, gh = this.gimmick.height;
                
                if (this.gimmick.type === 'BOX') { // 남자 루트
                    // 뒤쪽 벽화 석판
                    this.ctx.fillStyle = '#1e293b';
                    this.ctx.fillRect(gx - 20, gy - 20, gw + 40, gh + 20);
                    // 앞쪽 낡은 상자
                    this.ctx.fillStyle = '#78350f';
                    this.ctx.fillRect(gx, gy + 10, gw, gh - 10);
                    this.ctx.strokeStyle = '#fcd34d';
                    this.ctx.strokeRect(gx, gy + 10, gw, gh - 10);
                    
                    if (this.gameState === 'EXPLORE') {
                        this.ctx.fillStyle = '#fcd34d';
                        this.ctx.font = '14px sans-serif';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText("📦", gx + gw/2, gy + 25);
                        this.ctx.fillText("✨", gx + 10, gy);
                    }
                } 
                else if (this.gimmick.type === 'MASTER') { // 여자 루트
                    // 은발 빙궁주 NPC
                    this.ctx.shadowColor = '#38bdf8';
                    this.ctx.shadowBlur = 20;
                    this.ctx.fillStyle = '#e0f2fe'; // 은백색+푸른빛 옷
                    this.ctx.fillRect(gx, gy, gw, gh);
                    this.ctx.shadowBlur = 0;
                    
                    // 은발 머리카락 포인트
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillRect(gx, gy - 5, gw, 15);

                    // 스승 렌더링은 타임스킵 후에도 (전투 전까지) 계속 유지되도록 기획 반영
                    if (this.gameState === 'EXPLORE') {
                        this.ctx.fillStyle = '#38bdf8';
                        this.ctx.font = '14px sans-serif';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText("💬", gx + gw/2, gy - 15);
                    }
                }
            }

            // 적 NPC 렌더링
            if (this.enemy.active) {
                const ex = this.enemy.x, ey = this.enemy.y, ew = this.enemy.width, eh = this.enemy.height;
                this.ctx.shadowColor = 'red';
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = '#991b1b'; // 적색
                this.ctx.fillRect(ex, ey, ew, eh);
                this.ctx.shadowBlur = 0;
            }

            // 플레이어 그리기
            const cfg = this.currentConfig;
            const frameW = this.charImg.naturalWidth / cfg.cols;
            const frameH = this.charImg.naturalHeight / cfg.rows;
            const renderSize = 48;

            this.playerScreenX = this.player.x - this.camera.x;
            this.playerScreenY = this.player.y - this.camera.y;

            this.ctx.drawImage(
                this.charImg,
                this.player.frameX * frameW, this.player.frameY * frameH, frameW, frameH,
                this.player.x - (renderSize - this.player.width) / 2,
                this.player.y - Math.max(0, renderSize - this.player.height),
                renderSize, renderSize
            );

            this.ctx.restore();
        },

        gameLoop(timestamp) {
            if (!this.lastTime) this.lastTime = timestamp;
            const dt = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;

            this.updatePlayer(dt);
            this.drawMap();

            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }));
});
