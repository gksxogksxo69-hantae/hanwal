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

        // 성별별 스프라이트 (town.js와 동일)
        spriteConfigs: {
            MALE: { src: '/images/char_sprite.png', cols: 4, rows: 4, down: 0, up: 1, left: 2, right: 3 },
            FEMALE: { src: '/images/char_sprite_female.png', cols: 4, rows: 4, down: 0, up: 1, left: 2, right: 3 }
        },
        currentConfig: null,

        // 맵 기본 크기 (동굴은 작게 800x800)
        MAP_W: 800,
        MAP_H: 800,

        // 벽 (충돌)
        collisions: [
            { x: -50, y: -50, width: 900, height: 50 },  // 상
            { x: -50, y: 800, width: 900, height: 50 },  // 하
            { x: -50, y: 0, width: 50, height: 800 },    // 좌
            { x: 800, y: 0, width: 50, height: 800 },    // 우
            // 동굴 장애물 일부
            { x: 100, y: 300, width: 150, height: 80 },
            { x: 550, y: 200, width: 120, height: 150 },
            { x: 250, y: 550, width: 250, height: 60 },
        ],

        // 튜토리얼 적 (천마신교 잡졸)
        enemy: { x: 400, y: 200, width: 32, height: 32, label: '천마신교 추격자' },

        triggers: [
            { id: 'BATTLE', x: 350, y: 150, width: 132, height: 132 } // 적 주변 넓은 범위
        ],

        // 대화창 로직
        currentDialog: false,
        dialogSpeaker: '',
        dialogText: '',
        isBattling: false,

        async init() {
            await this.loadPlayerInfo();
            this.setupCanvas();
            this.loadResources();
            this.setupInput();

            // 가이드 메시지 타임아웃
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
                if (this.currentDialog || this.isBattling) {
                    if (e.code === 'Space' || e.code === 'Enter') this.nextDialog();
                    return;
                }
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) {
                    this.keys[key] = true;
                    this.lastPressedDir = key;
                }
                if (e.code === 'Space' && this.activeTrigger) {
                    this.startTutorialBattleEvent();
                }
            });
            window.addEventListener('keyup', (e) => {
                const key = e.key.toLowerCase();
                if (['w', 'a', 's', 'd'].includes(key)) this.keys[key] = false;
            });
            window.addEventListener('click', () => {
                if(this.currentDialog) this.nextDialog();
            });
        },

        startTutorialBattleEvent() {
            if(this.isBattling) return;
            this.keys = { w: false, a: false, s: false, d: false }; // 정지
            
            this.isBattling = true;
            this.showInteractPrompt = false;
            
            this.dialogSpeaker = '천마신교 추격자';
            this.dialogText = '크흐흐... 남궁세가의 쥐새끼가 여기까지 도망쳤군. 여기서 죽어라!';
            this.currentDialog = true;
        },

        nextDialog() {
            if(!this.isBattling) return;

            if (this.dialogSpeaker === '천마신교 추격자') {
                this.dialogSpeaker = this.playerNickname;
                this.dialogText = '...강노 아저씨의 희생을 헛되게 할 순 없어. 덤벼라!!';
            } else {
                // 전투 화면으로 진입 (플래시 효과 후 이동)
                this.currentDialog = false;
                const flash = document.getElementById('battleFlash');
                flash.classList.add('active');
                
                setTimeout(() => {
                    // TODO: 실제 서버의 전투 API나 라우팅 주소로 변경
                    window.location.href = '/battle/tutorial'; 
                }, 600);
            }
        },

        updatePlayer(dt) {
            if (this.currentDialog || this.isBattling) { 
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
            // 벽
            for (let b of this.collisions) {
                if (p.x < b.x + b.width && p.x + p.w > b.x && p.y < b.y + b.height && p.y + p.h > b.y) return true;
            }
            // 적 객체도 통과 불가
            const e = this.enemy;
            if (p.x < e.x + e.width && p.x + p.w > e.x && p.y < e.y + e.height && p.y + p.h > e.y) return true;

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
            }
        },

        drawMap() {
            // 카메라 설정
            this.camera.x = this.player.x - this.camera.width / 2;
            this.camera.y = this.player.y - this.camera.height / 2;

            // 카메라 경계 클램핑 방지 (동역학적 동굴 탐색을 위해 맵 밖은 그냥 검은색으로)
            // 화면 밖은 검은색
            this.ctx.fillStyle = '#050505';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);

            // 1. 임시 동굴 바닥 패턴 그리기 (어두운 회색 돌바닥)
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(0, 0, this.MAP_W, this.MAP_H);
            this.ctx.strokeStyle = '#1a1a1a';
            this.ctx.lineWidth = 2;
            for (let i = 0; i <= this.MAP_W; i += 40) {
                this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.MAP_H); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.MAP_W, i); this.ctx.stroke();
            }

            // 장애물(벽) 그리기
            this.ctx.fillStyle = '#0a0a0a';
            this.ctx.strokeStyle = '#222';
            this.collisions.forEach(c => {
                if(c.width < 800) { // 외곽경계 제외
                    this.ctx.fillRect(c.x, c.y, c.width, c.height);
                    this.ctx.strokeRect(c.x, c.y, c.width, c.height);
                }
            });

            // 2. 적 NPC 그리기 (붉은색 기운)
            const ex = this.enemy.x, ey = this.enemy.y, ew = this.enemy.width, eh = this.enemy.height;
            this.ctx.shadowColor = 'red';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#991b1b'; // 적색
            this.ctx.fillRect(ex, ey, ew, eh);
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.enemy.label, ex + ew/2, ey - 10);

            // 3. 주인공 그리기
            const cfg = this.currentConfig;
            const frameW = this.charImg.naturalWidth / cfg.cols;
            const frameH = this.charImg.naturalHeight / cfg.rows;
            const renderSize = 48; // town과 동일 스케일

            // 캐릭터 빛 효과 연동을 위해 화면상 좌표 갱신 (Alpine div)
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
