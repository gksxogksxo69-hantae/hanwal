document.addEventListener('alpine:init', () => {
    Alpine.data('townApp', () => ({
        showInteractPrompt: false,
        currentModal: null,
        activeTrigger: null, // "STORE", "GACHA" 

        // 캔버스 및 게임 상태 관련 변수들
        canvas: null,
        ctx: null,
        lastTime: 0,
        syncTimer: 0,
        
        // 이미지 자산
        mapImg: new Image(),
        charImg: new Image(),
        resourcesLoaded: 0,

        // 카메라(뷰포트) 정보
        camera: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },

        // 플레이어 상태
        player: {
            x: 400, // 시작 위치
            y: 300,
            width: 32, // 충돌 박스 너비
            height: 32, // 충돌 박스 높이
            speed: 200, // 픽셀/초
            frameX: 0,  // 스프라이트 열
            frameY: 0,  // 스프라이트 행 (방향) 0:남, 1:북, 2:동, 3:서 (가정)
            isMoving: false,
            animTimer: 0
        },

        // 입력 상태
        keys: {
            w: false, a: false, s: false, d: false, space: false
        },

        // 장애물(충돌박스) 맵 (하드코딩) => 지도 이미지에 맞춰 나중에 수치 튜닝 필요
        collisions: [
            { x: -500, y: -500, width: 2000, height: 500 }, // 위쪽 맵 경계선 등
            // 필요에 따라 사각형 채워넣기 (x, y, w, h)
        ],

        // 상호작용 트리거 구역 (하드코딩)
        triggers: [
            { id: 'STORE', x: 200, y: 200, width: 80, height: 80 },
            { id: 'GACHA', x: 600, y: 300, width: 80, height: 80 }
        ],

        init() {
            this.setupCanvas();
            this.loadResources();
            this.setupInput();
        },

        closeModal() {
            this.currentModal = null;
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
            
            // 픽셀 아트 선명하게
            this.ctx.imageSmoothingEnabled = false;
        },

        loadResources() {
            this.mapImg.onload = () => this.onResourceLoad();
            this.mapImg.src = '/images/map_bg.png';

            this.charImg.crossOrigin = "Anonymous";
            this.charImg.onload = () => {
                // 크로마키 (오프스크린 캔버스 이용해 흰색/밝은회색 배경 제거)
                const offCanvas = document.createElement('canvas');
                offCanvas.width = this.charImg.width;
                offCanvas.height = this.charImg.height;
                const offCtx = offCanvas.getContext('2d');
                offCtx.drawImage(this.charImg, 0, 0);
                
                try {
                    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
                    const data = imgData.data;
                    
                    // 첫 픽셀의 색상을 배경색으로 가정 (AI 생성물의 특징)
                    const bgR = data[0], bgG = data[1], bgB = data[2];
                    
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i+1], b = data[i+2];
                        // 만약 픽셀이 흰색 계열이거나 배경색과 유사하다면 투명화
                        if ((r > 240 && g > 240 && b > 240) ||
                            (Math.abs(r - bgR) < 15 && Math.abs(g - bgG) < 15 && Math.abs(b - bgB) < 15)) {
                            data[i+3] = 0; // Alpha = 0 (투명)
                        }
                    }
                    offCtx.putImageData(imgData, 0, 0);
                    
                    // 크로마키 처리된 캔버스를 이미지소스로 대체
                    const cleanImg = new Image();
                    cleanImg.onload = () => {
                        this.charImg = cleanImg;
                        this.onResourceLoad();
                    };
                    cleanImg.src = offCanvas.toDataURL();
                } catch (e) {
                    console.warn("로컬 환경이라 크로마키(Canvas getImageData) 차단됨. 원본 사용:", e);
                    this.onResourceLoad();
                }
            };
            this.charImg.src = '/images/char_sprite.png'; // 처음 뽑았던 4방향 시트를 다시 활용!
        },

        onResourceLoad() {
            this.resourcesLoaded++;
            if (this.resourcesLoaded === 2) {
                // 게임 루프 시작
                requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
            }
        },

        setupInput() {
            window.addEventListener('keydown', (e) => {
                if (this.currentModal) return; // 모달 열려있으면 이동 막음
                const key = e.key.toLowerCase();
                if (key === 'w' || key === 'a' || key === 's' || key === 'd') this.keys[key] = true;
                if (e.code === 'Space') {
                    // 스페이스키는 단발성 체크용
                    if (this.activeTrigger && !this.currentModal) {
                        this.currentModal = this.activeTrigger;
                    }
                }
            });

            window.addEventListener('keyup', (e) => {
                const key = e.key.toLowerCase();
                if (key === 'w' || key === 'a' || key === 's' || key === 'd') this.keys[key] = false;
            });
        },

        updatePlayer(dt) {
            if (this.currentModal) {
                this.player.isMoving = false;
                return;
            }

            let dx = 0;
            let dy = 0;

            if (this.keys.w) dy -= 1;
            if (this.keys.s) dy += 1;
            if (this.keys.a) dx -= 1;
            if (this.keys.d) dx += 1;

            this.player.isMoving = (dx !== 0 || dy !== 0);

            if (this.player.isMoving) {
                // 대각선 이동 시 속도 정규화
                const length = Math.sqrt(dx * dx + dy * dy);
                dx = (dx / length) * this.player.speed * dt;
                dy = (dy / length) * this.player.speed * dt;

                // 방향 설정 (간단히 4방향 맵핑: 0=하, 1=상, 2=좌, 3=우 -> 스프라이트 시트 배열에 따라 조절 필요)
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.player.frameY = dx > 0 ? 2 : 1; // 우, 좌
                } else {
                    this.player.frameY = dy > 0 ? 0 : 3; // 하, 상
                }

                // 이동 예상 위치 (임시 계산)
                let nextX = this.player.x + dx;
                let nextY = this.player.y + dy;

                // 충돌 검사 (벽)
                if (!this.checkCollision(nextX, nextY)) {
                    this.player.x = nextX;
                    this.player.y = nextY;
                } else if (!this.checkCollision(this.player.x, nextY)) {
                    // 미끄러짐 처리 (Y축만 이동 가능할때)
                    this.player.y = nextY;
                } else if (!this.checkCollision(nextX, this.player.y)) {
                    // 미끄러짐 처리 (X축만 이동 가능할때)
                    this.player.x = nextX;
                }

                // 애니메이션 프레임 업데이트
                this.player.animTimer += dt;
                if (this.player.animTimer > 0.15) {
                    this.player.frameX = (this.player.frameX + 1) % 4; // 보통 4프레임
                    this.player.animTimer = 0;
                }
            } else {
                this.player.frameX = 0; // 정지 프레임
            }

            // 트리거 검사
            this.checkTriggers();
        },

        checkCollision(nx, ny) {
            // 캐릭터 바운딩 박스
            const pRect = { x: nx, y: ny, w: this.player.width, h: this.player.height };
            
            for (let b of this.collisions) {
                if (pRect.x < b.x + b.width &&
                    pRect.x + pRect.w > b.x &&
                    pRect.y < b.y + b.height &&
                    pRect.y + pRect.h > b.y) {
                    return true; // 충돌!
                }
            }
            return false;
        },

        checkTriggers() {
            const pRect = { x: this.player.x, y: this.player.y, w: this.player.width, h: this.player.height };
            let foundTrigger = null;

            for (let t of this.triggers) {
                if (pRect.x < t.x + t.width &&
                    pRect.x + pRect.w > t.x &&
                    pRect.y < t.y + t.height &&
                    pRect.y + pRect.h > t.y) {
                    foundTrigger = t.id;
                    break;
                }
            }

            if (foundTrigger !== this.activeTrigger) {
                this.activeTrigger = foundTrigger;
                this.showInteractPrompt = (this.activeTrigger !== null);
            }
        },

        syncPositionWithServer() {
            // 1초 단위로 서버 API 호출하여 현재 위치 DB 기록
            fetch('/api/map/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    x: Math.round(this.player.x),
                    y: Math.round(this.player.y),
                    timestamp: Date.now()
                })
            }).catch(err => console.warn('Sync failed:', err));
        },

        drawMap() {
            // 카메라를 캐릭터 중심에 위치
            this.camera.x = this.player.x - this.camera.width / 2;
            this.camera.y = this.player.y - this.camera.height / 2;

            // 맵 경계 클램핑 방지 (카메라가 맵 밖으로 안나가게) 추가 가능하지만 일단 스킵
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.save();
            // 화면을 카메라 위치만큼 반대로 이동
            this.ctx.translate(-this.camera.x, -this.camera.y);

            // 1. 맵 배경 그리기 (크기는 이미지 원본 크기에 맞춤, 혹은 픽셀 아트 배율 키움)
            this.ctx.drawImage(this.mapImg, 0, 0, 1024, 1024); // 임시 1024 스케일

            // (디버그용) 트리거 박스 그리기
            /*
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.triggers.forEach(t => {
                this.ctx.fillRect(t.x, t.y, t.width, t.height);
            });
            */

            // 2. 캐릭터 그리기 (정석 4x4 스프라이트 시트 로직)
            // 가로 세로 4등분으로 프레임을 정확히 쪼갭니다.
            const spriteSizeX = this.charImg.width / 4; 
            const spriteSizeY = this.charImg.height / 4;
            
            // 그릴 때 크기 조절 (화면에 맞게 스케일링)
            const renderWidth = 80;
            const renderHeight = 80 * (spriteSizeY / spriteSizeX); 
            
            this.ctx.drawImage(
                this.charImg,
                this.player.frameX * spriteSizeX, this.player.frameY * spriteSizeY, spriteSizeX, spriteSizeY, // 원본 자르기 옵션 추가
                this.player.x - (renderWidth - this.player.width)/2, 
                this.player.y - (renderHeight - this.player.height), 
                renderWidth, renderHeight
            );

            this.ctx.restore();
        },

        gameLoop(timestamp) {
            if (!this.lastTime) this.lastTime = timestamp;
            const dt = (timestamp - this.lastTime) / 1000; // 초 단위 deltaTime
            this.lastTime = timestamp;

            // 로직 업데이트
            this.updatePlayer(dt);
            
            // 1초 단위 위치 동기화
            this.syncTimer += dt;
            if (this.syncTimer >= 1.0) {
                this.syncPositionWithServer();
                this.syncTimer = 0;
            }

            // 화면 그리기
            this.drawMap();

            // 다음 프레임 요청
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }));
});
