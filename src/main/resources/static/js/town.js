document.addEventListener('alpine:init', () => {
    Alpine.data('townApp', () => ({
        showInteractPrompt: false,
        currentModal: null,
        activeTrigger: null,
        debugMode: false,

        canvas: null,
        ctx: null,
        lastTime: 0,
        syncTimer: 0,

        mapImg: new Image(),
        charImg: new Image(),
        minimapCanvas: null,
        minimapCtx: null,
        resourcesLoaded: 0,

        camera: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },

        player: {
            x: 0, y: 0,
            width: 16, height: 16,
            speed: 100,
            frameX: 0, frameY: 0,
            isMoving: false,
            animTimer: 0
        },

        keys: { w: false, a: false, s: false, d: false },

        // ── 플레이어 정보 (서버에서 로드) ──
        playerGender: 'MALE',
        playerNickname: '모험가',
        playerLevel: 1,
        playerGold: 0,
        playerGems: 0,

        // ── 성별별 스프라이트 설정 ──
        // MALE 스프라이트: 4열4행 | row 순서: 하(0), 상(1), 좌(2), 우(3)
        // FEMALE 스프라이트: 6열4행 | row 순서: 하(0), 상(1), 우(2), 좌(3)
        spriteConfigs: {
            MALE:   { src: '/images/char_sprite.png',        cols: 4, rows: 4, down: 0, up: 1, left: 2, right: 3 },
            FEMALE: { src: '/images/char_sprite_female.png', cols: 6, rows: 4, down: 0, up: 1, right: 2, left: 3 }
        },
        currentConfig: null,

        // ── 맵 스케일링 ──
        // 충돌 박스는 2048 기준으로 설계되어 있고, 실제 맵 크기에 맞춰 런타임 스케일링
        DESIGN_SIZE: 2048,
        mapScale: 1,

        // ── 마을 센터 좌표 (2048 기준) ──
        TOWN_CENTER: { x: 1000, y: 1300 },

        // ── 충돌 박스 원본 (2048 기준 설계) ──
        designCollisions: [
            { x: -100, y: -100, width: 2248, height: 100 },
            { x: -100, y: 2048, width: 2248, height: 100 },
            { x: -100, y: 0, width: 100, height: 2048 },
            { x: 2048, y: 0, width: 100, height: 2048 },
            { x: 0, y: 0, width: 2048, height: 420 },
            { x: 0, y: 420, width: 330, height: 1628 },
            { x: 1400, y: 420, width: 648, height: 750 },
            { x: 1250, y: 1170, width: 798, height: 450 },
            { x: 0, y: 1850, width: 850, height: 198 },
            { x: 1150, y: 1850, width: 898, height: 198 },
            { x: 860, y: 880, width: 250, height: 250 },
            { x: 420, y: 1150, width: 180, height: 120 },
            { x: 450, y: 650, width: 180, height: 120 }
        ],
        collisions: [],

        designTriggers: [
            { id: 'STORE', x: 200, y: 200, width: 80, height: 80 },
            { id: 'GACHA', x: 600, y: 300, width: 80, height: 80 }
        ],
        triggers: [],

        // ──────────── 초기화 ────────────
        async init() {
            await this.loadPlayerInfo();
            this.setupCanvas();
            this.loadResources();
            this.setupInput();
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
            }
        },

        closeModal() { this.currentModal = null; },

        setupCanvas() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.minimapCanvas = document.getElementById('minimapCanvas');
            this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
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
            this.currentConfig = this.spriteConfigs[this.playerGender] || this.spriteConfigs.MALE;

            this.mapImg.onload = () => this.onResourceLoad();
            this.mapImg.src = '/images/map_bg.png';

            this.charImg.onload = () => this.onResourceLoad();
            this.charImg.src = this.currentConfig.src;
        },

        onResourceLoad() {
            this.resourcesLoaded++;
            if (this.resourcesLoaded < 2) return;

            // 맵 스케일 = 실제 이미지 크기 / 설계 기준 2048
            this.mapScale = this.mapImg.naturalWidth / this.DESIGN_SIZE;

            // 충돌 박스 & 트리거를 실제 맵 크기에 맞춰 스케일링
            const s = this.mapScale;
            this.collisions = this.designCollisions.map(c => ({
                x: c.x * s, y: c.y * s, width: c.width * s, height: c.height * s
            }));
            this.triggers = this.designTriggers.map(t => ({
                id: t.id, x: t.x * s, y: t.y * s, width: t.width * s, height: t.height * s
            }));

            // ★ 핵심 규칙: town 진입 시 무조건 마을 센터로 스폰
            this.player.x = this.TOWN_CENTER.x * s;
            this.player.y = this.TOWN_CENTER.y * s;
            this.player.speed = 200 * s;
            this.player.width = 16;
            this.player.height = 16;

            requestAnimationFrame((ts) => this.gameLoop(ts));
        },

        // ──────────── 입력 ────────────
        setupInput() {
            window.addEventListener('keydown', (e) => {
                if (this.currentModal) return;
                const key = e.key.toLowerCase();
                if (['w','a','s','d'].includes(key)) this.keys[key] = true;
                if (e.code === 'Space' && this.activeTrigger && !this.currentModal) {
                    this.currentModal = this.activeTrigger;
                }
            });
            window.addEventListener('keyup', (e) => {
                const key = e.key.toLowerCase();
                if (['w','a','s','d'].includes(key)) this.keys[key] = false;
            });
        },

        // ──────────── 업데이트 ────────────
        updatePlayer(dt) {
            if (this.currentModal) { this.player.isMoving = false; return; }

            let dx = 0, dy = 0;
            if (this.keys.w) dy -= 1;
            if (this.keys.s) dy += 1;
            if (this.keys.a) dx -= 1;
            if (this.keys.d) dx += 1;

            this.player.isMoving = (dx !== 0 || dy !== 0);

            if (this.player.isMoving) {
                const len = Math.sqrt(dx * dx + dy * dy);
                dx = (dx / len) * this.player.speed * dt;
                dy = (dy / len) * this.player.speed * dt;

                // 방향 설정 — 성별별 row 매핑 사용
                const cfg = this.currentConfig;
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.player.frameY = dx > 0 ? cfg.right : cfg.left;
                } else {
                    this.player.frameY = dy > 0 ? cfg.down : cfg.up;
                }

                let nextX = this.player.x + dx;
                let nextY = this.player.y + dy;

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
                if (p.x < b.x + b.width && p.x + p.w > b.x &&
                    p.y < b.y + b.height && p.y + p.h > b.y) return true;
            }
            return false;
        },

        checkTriggers() {
            const p = { x: this.player.x, y: this.player.y, w: this.player.width, h: this.player.height };
            let found = null;
            for (let t of this.triggers) {
                if (p.x < t.x + t.width && p.x + p.w > t.x &&
                    p.y < t.y + t.height && p.y + p.h > t.y) { found = t.id; break; }
            }
            if (found !== this.activeTrigger) {
                this.activeTrigger = found;
                this.showInteractPrompt = (found !== null);
            }
        },

        syncPositionWithServer() {
            fetch('/api/map/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: Math.round(this.player.x), y: Math.round(this.player.y), timestamp: Date.now() })
            }).catch(err => console.warn('Sync failed:', err));
        },

        // ──────────── 렌더링 ────────────
        drawMap() {
            const mapW = this.mapImg.naturalWidth;
            const mapH = this.mapImg.naturalHeight;

            // 카메라 = 캐릭터 중심
            this.camera.x = this.player.x - this.camera.width / 2;
            this.camera.y = this.player.y - this.camera.height / 2;

            // 맵이 화면보다 작으면 센터링, 크면 클램핑
            if (mapW <= this.camera.width) {
                this.camera.x = -(this.camera.width - mapW) / 2;
            } else {
                this.camera.x = Math.max(0, Math.min(this.camera.x, mapW - this.camera.width));
            }
            if (mapH <= this.camera.height) {
                this.camera.y = -(this.camera.height - mapH) / 2;
            } else {
                this.camera.y = Math.max(0, Math.min(this.camera.y, mapH - this.camera.height));
            }

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.save();
            this.ctx.translate(-this.camera.x, -this.camera.y);

            // 1. 맵 배경 — 원본 크기 그대로 렌더링
            this.ctx.drawImage(this.mapImg, 0, 0, mapW, mapH);

            // (디버그) 충돌/트리거 박스
            if (this.debugMode) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                this.collisions.forEach(c => this.ctx.fillRect(c.x, c.y, c.width, c.height));
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
                this.triggers.forEach(t => this.ctx.fillRect(t.x, t.y, t.width, t.height));
            }

            // 2. 캐릭터 — 성별별 스프라이트 설정 사용
            const cfg = this.currentConfig;
            const frameW = this.charImg.naturalWidth / cfg.cols;
            const frameH = this.charImg.naturalHeight / cfg.rows;
            const renderSize = 48;

            this.ctx.drawImage(
                this.charImg,
                this.player.frameX * frameW, this.player.frameY * frameH, frameW, frameH,
                this.player.x - (renderSize - this.player.width) / 2,
                this.player.y - (renderSize - this.player.height),
                renderSize, renderSize
            );

            this.ctx.restore();
        },

        // ──────────── 미니맵 렌더링 ────────────
        drawMinimap() {
            if (!this.minimapCtx) return;
            const mc = this.minimapCtx;
            const mw = this.minimapCanvas.width;
            const mh = this.minimapCanvas.height;
            const mapW = this.mapImg.naturalWidth;
            const mapH = this.mapImg.naturalHeight;

            // 전체 맵을 미니맵 크기로 축소 렌더링
            mc.clearRect(0, 0, mw, mh);
            mc.drawImage(this.mapImg, 0, 0, mw, mh);

            // 반투명 어둡게 오버레이
            mc.fillStyle = 'rgba(15, 23, 42, 0.25)';
            mc.fillRect(0, 0, mw, mh);

            // 현재 카메라 뷰포트 영역 표시 (흰색 테두리)
            const vpX = (this.camera.x / mapW) * mw;
            const vpY = (this.camera.y / mapH) * mh;
            const vpW = (this.camera.width / mapW) * mw;
            const vpH = (this.camera.height / mapH) * mh;
            mc.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            mc.lineWidth = 1;
            mc.strokeRect(
                Math.max(0, vpX), Math.max(0, vpY),
                Math.min(vpW, mw), Math.min(vpH, mh)
            );

            // 플레이어 위치 — 빛나는 점
            const px = (this.player.x / mapW) * mw;
            const py = (this.player.y / mapH) * mh;

            // 글로우 효과
            mc.shadowColor = '#f59e0b';
            mc.shadowBlur = 6;
            mc.fillStyle = '#fbbf24';
            mc.beginPath();
            mc.arc(px, py, 3.5, 0, Math.PI * 2);
            mc.fill();

            // 중심 밝은 점
            mc.shadowBlur = 0;
            mc.fillStyle = '#ffffff';
            mc.beginPath();
            mc.arc(px, py, 1.5, 0, Math.PI * 2);
            mc.fill();
        },

        // ──────────── 게임 루프 ────────────
        gameLoop(timestamp) {
            if (!this.lastTime) this.lastTime = timestamp;
            const dt = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;

            this.updatePlayer(dt);

            this.syncTimer += dt;
            if (this.syncTimer >= 1.0) {
                this.syncPositionWithServer();
                this.syncTimer = 0;
            }

            this.drawMap();
            this.drawMinimap();
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }));
});
