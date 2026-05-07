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
        // 남녀 모두 4열4행 | row 순서: 하(0), 상(1), 좌(2), 우(3)
        spriteConfigs: {
            MALE:   { src: '/images/char_sprite.png',        cols: 4, rows: 4, down: 0, up: 1, left: 2, right: 3 },
            FEMALE: { src: '/images/char_sprite_female.png', cols: 4, rows: 4, down: 0, up: 1, left: 2, right: 3 }
        },
        currentConfig: null,

        // ── 맵 스케일링 ──
        // 새 맵은 1024x1024 기준으로 설계
        DESIGN_SIZE: 1024,
        mapScale: 1,

        // ── 마을 센터 좌표 (1024 기준) ──
        // 중앙 돌길 중간 지점 (대문과 상단 전각 사이)
        TOWN_CENTER: { x: 500, y: 580 },

        // ── 충돌 박스 (1024 기준 — 새 무협 마을 맵) ──
        designCollisions: [
            // ─ 외곽 경계 ─
            { x: -50, y: -50, width: 1124, height: 50 },   // 북
            { x: -50, y: 1024, width: 1124, height: 50 },  // 남
            { x: -50, y: 0, width: 50, height: 1024 },     // 서
            { x: 1024, y: 0, width: 50, height: 1024 },    // 동

            // ─ 상단 영역: 무공 전각 + 대나무숲 ─
            { x: 0, y: 0, width: 200, height: 200 },       // 좌상 대나무숲
            { x: 220, y: 0, width: 580, height: 240 },     // 상단 무공 전각 (큰 건물)
            { x: 820, y: 0, width: 204, height: 220 },     // 우상 대나무/건물

            // ─ 좌측 건물들 (객잔/상점 거리) ─
            { x: 0, y: 220, width: 220, height: 200 },     // 좌측 상단 건물 (객잔)
            { x: 0, y: 490, width: 230, height: 190 },     // 좌측 중단 건물 
            { x: 0, y: 720, width: 200, height: 170 },     // 좌측 하단 건물

            // ─ 우측 건물들 (대장간/서고) ─
            { x: 740, y: 240, width: 284, height: 200 },   // 우측 상단 건물 (대장간)
            { x: 780, y: 470, width: 244, height: 150 },   // 우측 정자/건물

            // ─ 우측 하단 연못 ─
            { x: 600, y: 650, width: 350, height: 230 },   // 연못 + 다리 영역

            // ─ 하단 성벽 + 대문 (중앙에 입구 갭) ─
            { x: 0, y: 900, width: 380, height: 124 },     // 좌측 성벽
            { x: 640, y: 900, width: 384, height: 124 },   // 우측 성벽 
            // 대문 통로: x 380~640 은 걸을 수 있는 입구

            // ─ 좌하 대나무숲 ─
            { x: 0, y: 870, width: 120, height: 30 },      // 좌하 대나무
        ],
        collisions: [],

        // ── 상호작용 트리거 구역 (1024 기준) ──
        designTriggers: [
            { id: 'STORE', x: 50, y: 310, width: 120, height: 80 },   // 객잔 (좌측 상단 건물 앞)
            { id: 'GACHA', x: 350, y: 250, width: 100, height: 60 },  // 무공 전수관 (상단 전각 앞)
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
