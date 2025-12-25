class MaxyFrontUserSession {
    constructor(props) {
        // =====================================================
        // 기본 속성 설정
        // =====================================================
        this.id = props.id;                          // Canvas 요소 ID
        this.canvas = null;                          // Canvas DOM 요소
        this.ctx = null;                            // Canvas 2D 렌더링 컨텍스트
        this.animationId = null;                    // requestAnimationFrame ID (애니메이션 중단용)
        this.autoDropTimeoutId = null;              // 자동 공 생성 타이머 ID
        this.lastTime = 0;                          // 이전 프레임 시간 (시간 기반 애니메이션용)


        // =====================================================
        // 애니메이션 요소들을 담을 배열 초기화
        // =====================================================
        this.balls = [];                            // 떨어지는 공들의 배열
        this.stackedBalls = [];                     // 바닥에 쌓인 공들의 배열
        this.particles = [];                        // 폭발 시 생성되는 파티클들의 배열
        this.ballImages = {};                       // feeldex 값별 이미지 객체들의 맵
        this.defaultImageIndex = null;              // 기본(feeldex-default) 이미지 인덱스
        this.activeSessions = new Map();            // 활성 세션 관리용 Map (sessionId -> session data)

        // =====================================================
        // 컬럼별 높이 추적을 위한 배열 추가
        // =====================================================
        this.columnHeights = [];                    // 각 컬럼의 현재 높이 정보
        this.borderY = 0;                           // 85% 위치의 경계선 Y 좌표

        // =====================================================
        // 성능 최적화를 위한 제한값 설정
        // =====================================================
        this.maxBalls = 300;                        // 최대 공 개수 제한 (기본값)
        this.resizeListenerAdded = false            // 리사이즈 리스너 중복 등록 방지

        // =====================================================
        // 초기 로딩 플래그
        // =====================================================
        this.isInitialLoad = true;                  // 처음 로딩인지 확인하는 플래그

        // =====================================================
        // 개선된 분산 시스템을 위한 속성들
        // =====================================================
        this.dropQueue = [];                        // 드롭 대기열
        this.isProcessingQueue = false;             // 대기열 처리 중인지 확인
        this.recentDrops = [];                      // 최근에 떨어뜨린 공들의 정보
        this.globalDropSpacing = 35;               // 전역 공간 최소 간격
        this.maxSimultaneousDrop = 8;              // 동시에 떨어뜨릴 최대 개수

        // =====================================================
        // 이미지 캐싱을 위한 새로운 속성 추가
        // =====================================================
        this.imageCache = new Map();                // 이미지 캐시 맵
        this.imageLoadPromises = new Map();         // 이미지 로딩 상태 추적
        this.iconCache = new Map();                 // 툴팁 아이콘 캐시 맵
        this.cachedTooltipIcons = {};               // 캐시된 툴팁 아이콘 HTML
        this.flipAnimationDuration = 450;           // 이미지 플립 애니메이션 시간 (ms)
        this.imagesLoaded = false;                  // 볼 이미지 선로드 완료 여부
        this.loadingImagesPromise = null;           // 볼 이미지 로딩 Promise

        this.init()

        const comment = trl('dashboard.component.desc.frontlivesessionview')
        tippy('#liveSessionView .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })
    }

    /**
     * =====================================================
     * 이미지 전환 애니메이션 시작
     * 상태 변경 시 기존 이미지를 회전시키며 교체합니다
     * =====================================================
     */
    startImageFlip(ball, nextImage) {
        try {
            if (!ball || !nextImage) {
                return;
            }

            if (!ball.flipAnimation && ball.image === nextImage) {
                return;
            }

            const duration = this.flipAnimationDuration || 450;

            ball.flipAnimation = {
                duration,
                elapsed: 0,
                progress: 0,
                swapped: false,
                nextImage,
                direction: 1
            };
        } catch (error) {
            console.error('이미지 플립 애니메이션 시작 오류:', error);
        }
    }

    /**
     * =====================================================
     * 이미지 플립 애니메이션 상태 업데이트
     * 경과 시간을 누적해 교체 지점을 제어합니다
     * =====================================================
     */
    updateFlipAnimationState(ball, deltaTime) {
        try {
            if (!ball || !ball.flipAnimation) {
                return;
            }

            const animation = ball.flipAnimation;
            const safeDelta = typeof deltaTime === 'number' ? deltaTime : 16;
            animation.elapsed += safeDelta;
            animation.progress = Math.min(animation.elapsed / animation.duration, 1);

            if (!animation.swapped && animation.progress >= 0.5) {
                ball.image = animation.nextImage;
                animation.swapped = true;
            }

            if (animation.progress >= 1) {
                ball.flipAnimation = null;
            }
        } catch (error) {
            console.error('이미지 플립 애니메이션 업데이트 오류:', error);
        }
    }

    /**
     * =====================================================
     * 이미지 플립 렌더 상태 계산
     * 스케일과 좌우 오프셋을 반환해 회전 효과를 구현합니다
     * =====================================================
     */
    getFlipRenderState(ball) {
        try {
            if (!ball || !ball.flipAnimation) {
                return null;
            }

            const progress = ball.flipAnimation.progress ?? 0;
            const rawScale = Math.cos(progress * Math.PI);
            const scaleX = Math.max(0.12, Math.abs(rawScale));
            const direction = ball.flipAnimation.direction || 1;
            const offsetX = direction * (1 - scaleX) * ball.radius * 0.7;

            return {
                scaleX,
                offsetX
            };
        } catch (error) {
            console.error('이미지 플립 렌더 상태 계산 오류:', error);
            return null;
        }
    }

    /**
     * =====================================================
     * 초기화 메서드 - Canvas 설정 및 이미지 로드
     * Canvas 요소를 찾고 2D 컨텍스트를 설정한 후 이미지를 로드합니다
     * =====================================================
     */
    init() {
        try {
            // Canvas 찾기 - sessionChart ID 사용
            const $canvas = $('#sessionChart');

            // Canvas 요소가 존재하지 않으면 DOM 로드 대기 후 재시도
            if ($canvas.length === 0) {
                console.warn('Canvas element with id "sessionChart" not found');
                // DOM이 준비되지 않았을 수 있으므로 잠시 후 재시도
                setTimeout(() => {
                    this.init();
                }, 100);
                return;
            }

            // Canvas 요소와 2D 렌더링 컨텍스트 설정
            this.canvas = $canvas[0];
            if (!this.canvas) {
                throw new Error('Canvas element를 찾을 수 없습니다.');
            }

            this.ctx = this.canvas.getContext('2d'); // 2D 그리기를 위한 컨텍스트 획득
            if (!this.ctx) {
                throw new Error('Canvas 2D context를 가져올 수 없습니다.');
            }

            // Canvas 크기를 실제 DOM 크기에 맞춰 설정 (CSS 크기와 내부 해상도 동기화)
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width;     // 내부 너비 설정
            this.canvas.height = rect.height;   // 내부 높이 설정

            // 화면 크기에 따른 최대 공 개수 설정
            this.setMaxBallsByScreenSize();

            // =====================================================
            // 애니메이션 관련 상수 정의
            // =====================================================
            this.ballRadius = 10;               // 공의 반지름 (픽셀)
            this.gravity = 0.0003;              // 중력 가속도 (픽셀/ms²) - 시간 기반
            this.floorY = this.canvas.height;   // 바닥 Y 좌표 (Canvas 하단)
            this.columnCount = 16;              // 한 줄에 배치할 컬럼 수
            this.columnWidth = this.canvas.width / this.columnCount;

            // 경계선 Y 좌표 설정 (Canvas 높이의 15% 위치)
            this.borderY = this.canvas.height * 0.15;

            // 컬럼 높이 배열 초기화
            this.columnHeights = new Array(this.columnCount).fill(0);

            // 리사이즈 이벤트 리스너 등록 (중복 방지)
            if (!this.resizeListenerAdded) {
                window.addEventListener('resize', this.resizeCanvas.bind(this));
                this.resizeCanvas();
                this.resizeListenerAdded = true;
            }

            // Canvas 클릭 이벤트 리스너 추가
            this.addCanvasClickListener();

            // 이미지 로드
            this.loadImages();
        } catch (error) {
            console.error('Canvas 초기화 오류:', error);
        }
    }

    /**
     * =====================================================
     * 전체 캔버스에서 사용 가능한 드롭 위치들을 생성하는 메서드
     * 각 컬럼별로 여러 위치 후보를 생성하여 우선순위 순으로 정렬합니다
     * @returns {Array} 사용 가능한 X 위치들의 배열 (우선순위 순으로 정렬)
     * =====================================================
     */
    generateGlobalDropPositions() {
        try {
            const positions = [];

            // 각 컬럼에서 여러 위치 후보 생성
            for (let col = 0; col < this.columnCount; col++) {
                const columnCenter = this.getColumnX(col);
                const maxOffset = this.columnWidth * 0.45; // 컬럼 너비의 45%까지 확장

                // 컬럼별로 5개의 위치 후보 생성 (중심, 좌우 각 2개씩)
                const columnPositions = [
                    { x: columnCenter, column: col, priority: this.columnHeights[col] }, // 중심 (최고 우선순위)
                    { x: columnCenter - maxOffset * 0.5, column: col, priority: this.columnHeights[col] + 0.1 },
                    { x: columnCenter + maxOffset * 0.5, column: col, priority: this.columnHeights[col] + 0.1 },
                    { x: columnCenter - maxOffset, column: col, priority: this.columnHeights[col] + 0.2 },
                    { x: columnCenter + maxOffset, column: col, priority: this.columnHeights[col] + 0.2 }
                ];

                // Canvas 범위를 벗어나지 않는 위치만 추가
                columnPositions.forEach(pos => {
                    if (pos.x >= this.ballRadius && pos.x <= this.canvas.width - this.ballRadius) {
                        positions.push(pos);
                    }
                });
            }

            // 우선순위(컬럼 높이) 순으로 정렬 - 낮은 컬럼이 우선
            return positions.sort((a, b) => a.priority - b.priority);
        } catch (error) {
            console.error('드롭 위치 생성 오류:', error);
            return [];
        }
    }

    /**
     * =====================================================
     * 최근 드롭된 공들과 충돌하지 않는 최적의 위치를 찾는 메서드
     * 시간과 거리를 고려하여 최적의 드롭 위치와 지연시간을 반환합니다
     * @returns {Object|null} { x: 위치, column: 컬럼, delay: 지연시간 } 또는 null
     * =====================================================
     */
    findBestDropPosition() {
        try {
            const now = Date.now();

            // 최근 2초간의 드롭 기록만 유지 (더 긴 시간으로 확장)
            this.recentDrops = this.recentDrops.filter(drop =>
                now - drop.timestamp < 2000
            );

            const availablePositions = this.generateGlobalDropPositions();
            if (availablePositions.length === 0) {
                console.warn('사용 가능한 드롭 위치가 없습니다.');
                return null;
            }

            for (const position of availablePositions) {
                let isGoodPosition = true;
                let requiredDelay = 0;

                // 최근 드롭들과의 거리 체크
                for (const recentDrop of this.recentDrops) {
                    const distance = Math.abs(position.x - recentDrop.x);

                    if (distance < this.globalDropSpacing) {
                        const timeSinceLastDrop = now - recentDrop.timestamp;

                        // 시간이 충분히 지났다면 사용 가능
                        if (timeSinceLastDrop > 800) {
                            continue;
                        }

                        // 거리에 따른 지연 시간 계산
                        const distanceRatio = distance / this.globalDropSpacing;
                        const timeRatio = timeSinceLastDrop / 800;

                        if (distanceRatio < 0.3) {
                            // 너무 가까우면 이 위치는 포기
                            isGoodPosition = false;
                            break;
                        } else {
                            // 적당한 지연 시간 계산
                            const baseDelay = 800 - timeSinceLastDrop;
                            const adjustedDelay = baseDelay * (1 - distanceRatio);
                            requiredDelay = Math.max(requiredDelay, adjustedDelay);
                        }
                    }
                }

                if (isGoodPosition) {
                    return {
                        x: position.x,
                        column: position.column,
                        delay: Math.min(requiredDelay, 1000) // 최대 1초 지연
                    };
                }
            }

            // 적절한 위치를 찾지 못한 경우, 강제로 위치 할당
            if (availablePositions.length > 0) {
                const randomPos = availablePositions[Math.floor(Math.random() * Math.min(5, availablePositions.length))];
                return {
                    x: randomPos.x + (Math.random() - 0.5) * 20, // ±10px 랜덤
                    column: randomPos.column,
                    delay: Math.random() * 500 + 200 // 200-700ms 지연
                };
            }

            return null;
        } catch (error) {
            console.error('최적 드롭 위치 찾기 오류:', error);
            return null;
        }
    }

    /**
     * =====================================================
     * 드롭 대기열을 처리하는 메서드
     * 대기열에 있는 공들을 배치 단위로 처리하여 자연스러운 애니메이션을 구현합니다
     * =====================================================
     */
    async processDropQueue() {
        if (this.isProcessingQueue || this.dropQueue.length === 0) {
            return;
        }

        try {
            this.isProcessingQueue = true;

            // ===== 모든 데이터를 배치 단위로 처리 =====
            while (this.dropQueue.length > 0) { // 대기열이 빌 때까지 계속 처리
                const batchSize = Math.min(this.maxSimultaneousDrop, this.dropQueue.length);
                // 한 번에 최대 10개씩 처리 (동시 드롭 제한)
                const batch = this.dropQueue.splice(0, batchSize); //  대기열에서 제거하며 처리

                // 배치 내 공들에 대해 위치 할당
                const dropPromises = batch.map(async (sessionData, index) => {
                    try {
                        const position = this.findBestDropPosition();

                        if (position) {
                            // 배치 내에서도 약간의 시간차 두기
                            const additionalDelay = index * (Math.random() * 100 + 50);
                            const totalDelay = position.delay + additionalDelay;

                            // 드롭 기록에 추가
                            this.recentDrops.push({
                                x: position.x,
                                timestamp: Date.now() + totalDelay,
                                column: position.column
                            });

                            // 지연 후 실제 드롭 실행
                            setTimeout(() => {
                                this.executeDrop(sessionData, position);
                            }, totalDelay);
                        } else {
                            // 위치를 찾지 못한 경우 기본 로직으로 처리
                            this.insertSessionDirectly(sessionData);
                        }
                    } catch (error) {
                        console.error('개별 드롭 처리 오류:', error);
                        // 오류 발생 시 기본 로직으로 처리
                        this.insertSessionDirectly(sessionData);
                    }
                });

                // 다음 배치 처리 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
            }
        } catch (error) {
            console.error('드롭 대기열 처리 오류:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * =====================================================
     * 실제 공을 떨어뜨리는 메서드
     * 위치 정보를 바탕으로 실제 공 객체를 생성하고 애니메이션에 추가합니다
     * @param {Array} sessionData - 세션 데이터
     * @param {Object} position - 드롭 위치 정보
     * =====================================================
     */
    executeDrop(sessionData, position) {
        try {
            if (!Array.isArray(sessionData) || sessionData.length === 0) {
                console.warn('잘못된 세션 데이터:', sessionData);
                return;
            }

            const selectedImage = this.getImageByPerformance(sessionData);
            const yOffset = Math.random() * 50; // 시작 높이 다양화

            this.balls.push({
                x: position.x,
                y: -20 - yOffset,
                vx: 0,
                vy: 0,
                column: position.column,
                radius: this.ballRadius,
                targetX: this.getColumnX(position.column),
                angle: 0,
                rotationSpeed: Math.random() * 0.003 - 0.0015,
                image: selectedImage,
                sessionData: [...sessionData],
                deviceId: sessionData[0],
                flipAnimation: null
            });
        } catch (error) {
            console.error('공 드롭 실행 오류:', error);
        }
    }

    /**
     * =====================================================
     * 대기열 없이 직접 처리하는 메서드 (백업용)
     * 일반적인 드롭 로직이 실패했을 때 사용하는 안전장치입니다
     * @param {Array} sessionData - 세션 데이터
     * =====================================================
     */
    insertSessionDirectly(sessionData) {
        try {
            if (!Array.isArray(sessionData) || sessionData.length === 0) {
                console.warn('잘못된 세션 데이터:', sessionData);
                return;
            }

            const col = this.selectBestColumn();
            const targetX = this.getColumnX(col);
            const selectedImage = this.getImageByPerformance(sessionData);

            this.balls.push({
                x: targetX + (Math.random() - 0.5) * this.columnWidth * 0.6,
                y: -20 - Math.random() * 40,
                vx: 0,
                vy: 0,
                column: col,
                radius: this.ballRadius,
                targetX: targetX,
                angle: 0,
                rotationSpeed: Math.random() * 0.002 - 0.001,
                image: selectedImage,
                sessionData: [...sessionData],
                deviceId: sessionData[0],
                flipAnimation: null
            });
        } catch (error) {
            console.error('직접 세션 삽입 오류:', error);
        }
    }


    /**
     * =====================================================
     * 화면 세로 크기에 따라 최대 공 개수를 설정하는 메서드
     * 성능 최적화를 위해 화면 크기에 따라 공 개수를 동적으로 조정합니다
     * =====================================================
     */
    setMaxBallsByScreenSize() {
        try {
            const screenHeight = window.innerHeight;

            if (screenHeight < 800) {
                this.maxBalls = 300;
            } else {
                this.maxBalls = 400;
            }
        } catch (error) {
            console.error('최대 공 개수 설정 오류:', error);
            this.maxBalls = 300; // 기본값으로 설정
        }
    }

    /**
     * =====================================================
     * 가장 낮은 높이의 컬럼을 선택하는 메서드
     * 균등한 분배를 위해 가장 낮은 컬럼들 중에서 랜덤하게 선택합니다
     * @returns {number} 선택된 컬럼 인덱스
     * =====================================================
     */
    selectBestColumn() {
        try {
            if (!this.columnHeights || this.columnHeights.length === 0) {
                console.warn('컬럼 높이 배열이 초기화되지 않았습니다.');
                return 0;
            }

            // 가장 낮은 높이 찾기
            const minHeight = Math.min(...this.columnHeights);

            // 가장 낮은 높이를 가진 컬럼들 중에서 랜덤 선택
            const candidateColumns = [];
            for (let i = 0; i < this.columnHeights.length; i++) {
                if (this.columnHeights[i] === minHeight) {
                    candidateColumns.push(i);
                }
            }

            if (candidateColumns.length === 0) {
                console.warn('후보 컬럼을 찾을 수 없습니다.');
                return 0;
            }

            // 후보 컬럼들 중 랜덤 선택 (같은 높이일 때 균등 분배)
            const randomIndex = Math.floor(Math.random() * candidateColumns.length);
            return candidateColumns[randomIndex];
        } catch (error) {
            console.error('최적 컬럼 선택 오류:', error);
            return 0;
        }
    }

    /**
     * =====================================================
     * 캔버스 크기 조정 메서드
     * 브라우저 창 크기가 변경될 때 캔버스와 기존 공들의 위치를 조정합니다
     * =====================================================
     */
    resizeCanvas() {
        try {
            if (!this.canvas) {
                console.warn('Canvas 객체가 없어 리사이즈를 진행할 수 없습니다.');
                return;
            }

            // 이전 Canvas 크기 저장 (스케일링 계산용)
            const prevWidth = this.canvas.width;
            const prevHeight = this.canvas.height;
            const prevBorderY = this.borderY;

            const div = this.canvas.parentElement; // canvas가 속한 div를 가져옴
            if (!div) {
                console.error('Canvas의 부모 요소를 찾을 수 없습니다.');
                return;
            }

            this.canvas.width = div.clientWidth;
            this.canvas.height = div.clientHeight;

            // 경계선 Y 좌표 재설정 (올바른 15% 위치로)
            this.borderY = this.canvas.height * 0.15;

            // 컬럼 관련 속성 재계산
            this.columnWidth = this.canvas.width / this.columnCount;
            this.floorY = this.canvas.height;

            // 기존 공들의 위치를 새로운 화면 크기에 맞게 조정
            if (prevWidth > 0 && prevHeight > 0) {
                this.rescaleExistingBalls(prevWidth, prevHeight, prevBorderY);
            }
        } catch (error) {
            console.error('Canvas 리사이즈 오류:', error);
        }
    }

    /**
     * =====================================================
     * 화면 크기 변경 시 기존 공들의 위치를 새로운 좌표계에 맞게 조정하는 메서드
     * 비례적 스케일링을 통해 기존 공들의 상대적 위치를 유지합니다
     * @param {number} prevWidth - 이전 Canvas 너비
     * @param {number} prevHeight - 이전 Canvas 높이
     * @param {number} prevBorderY - 이전 경계선 Y 좌표
     * =====================================================
     */
    rescaleExistingBalls(prevWidth, prevHeight, prevBorderY) {
        try {
            if (prevWidth <= 0 || prevHeight <= 0) {
                console.warn('잘못된 이전 Canvas 크기 값입니다.');
                return;
            }

            const widthScale = this.canvas.width / prevWidth;
            const heightScale = this.canvas.height / prevHeight;

            // 떨어지는 공들 위치 조정
            this.balls.forEach(ball => {
                try {
                    // X 좌표: 컬럼 기준으로 재계산 (더 정확함)
                    ball.x = this.getColumnX(ball.column);
                    ball.targetX = ball.x;

                    // Y 좌표: 비례적으로 스케일링
                    ball.y = ball.y * heightScale;
                } catch (error) {
                    console.error('개별 공 위치 조정 오류:', error);
                }
            });

            // 쌓인 공들을 완전히 재정렬하여 빈 공간 제거
            this.restackAllBalls();
        } catch (error) {
            console.error('기존 공 위치 조정 오류:', error);
        }
    }

    /**
     * =====================================================
     * 모든 쌓인 공들을 다시 정렬하여 올바른 위치에 배치하는 메서드
     * 화면 크기 변경 후 공 사이의 빈 공간을 제거하고 정확한 배열을 만듭니다
     * =====================================================
     */
    restackAllBalls() {
        try {
            if (!this.stackedBalls || this.stackedBalls.length === 0) {
                return;
            }

            console.log('Restacking all balls for screen resize');

            // 기존 쌓인 공들을 컬럼별로 그룹화하고 Y 좌표 순으로 정렬
            const ballsByColumn = {};

            // 컬럼별로 공들 분류 (Y 좌표 내림차순 - 바닥부터)
            this.stackedBalls.forEach(ball => {
                if (!ballsByColumn[ball.column]) {
                    ballsByColumn[ball.column] = [];
                }
                ballsByColumn[ball.column].push(ball);
            });

            // 각 컬럼별로 Y 좌표 기준 정렬 (바닥부터 위로)
            for (let col in ballsByColumn) {
                ballsByColumn[col].sort((a, b) => b.y - a.y);
            }

            // 컬럼 높이 배열 초기화
            if (this.columnHeights) {
                this.columnHeights.fill(0);
            }

            // 각 컬럼별로 공들을 바닥부터 차례대로 재배치
            for (let col in ballsByColumn) {
                const colNum = parseInt(col);
                const colBalls = ballsByColumn[col];

                if (isNaN(colNum) || !Array.isArray(colBalls)) {
                    console.warn(`잘못된 컬럼 데이터: ${col}`);
                    continue;
                }

                colBalls.forEach((ball, index) => {
                    try {
                        // 새로운 X 좌표: 컬럼 중심
                        ball.x = this.getColumnX(colNum);

                        // 새로운 Y 좌표: 바닥부터 차례대로 쌓기
                        ball.y = this.floorY - this.ballRadius - (index * this.ballRadius * 2);

                        // 컬럼 정보 업데이트
                        ball.column = colNum;
                    } catch (error) {
                        console.error('개별 공 재배치 오류:', error);
                    }
                });

                // 해당 컬럼의 높이 업데이트
                if (this.columnHeights && colNum < this.columnHeights.length) {
                    this.columnHeights[colNum] = colBalls.length;
                }
            }

            // 경계선을 넘는 공들 체크 (재배치 후 경계선 위반 가능)
            this.checkAndExplodeBorderBalls();
        } catch (error) {
            console.error('모든 공 재정렬 오류:', error);
        }
    }


    /**
     * =====================================================
     * Canvas 클릭 시 열릴 팝업 객체 초기화
     * 선택된 공의 정보를 보여주는 팝업을 생성합니다
     * @param {string} deviceId - 디바이스 ID
     * @param {string} level - FeelDx 레벨
     * =====================================================
     */
    initPopup(deviceId, level) {
        try {
            if (!deviceId || !level) {
                throw new Error('팝업 초기화에 필요한 파라미터가 없습니다.');
            }

            this.popup = new MaxyFrontPopupUserSession({
                id: 'userSessionPopup',
                appendId: 'maxyPopupWrap',
                deviceId: deviceId,
                feeldex: level,
                topChartId: 'webVital',
                botChartId: 'waterfall'
            });
        } catch (error) {
            console.error('팝업 초기화 오류:', error);
            throw error;
        }
    }

    /**
     * =====================================================
     * Canvas 클릭 이벤트 리스너 추가
     * 공 클릭, 마우스 호버 이벤트를 처리합니다
     * =====================================================
     */
    addCanvasClickListener() {
        try {
            if (!this.canvas) {
                console.warn('Canvas가 없어 이벤트 리스너를 추가할 수 없습니다.');
                return;
            }

            // 기존 이벤트 리스너 제거 (중복 방지)
            this.canvas.removeEventListener('click', this.boundHandleCanvasClick);
            this.canvas.removeEventListener('mousemove', this.boundHandleCanvasMouseMove);
            this.canvas.removeEventListener('mouseleave', this.boundHideTooltip);

            // 바인딩된 함수들을 인스턴스 변수로 저장 (제거 시 사용)
            this.boundHandleCanvasClick = this.handleCanvasClick.bind(this);
            this.boundHandleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
            this.boundHideTooltip = this.hideTooltip.bind(this);

            // 이벤트 리스너 등록
            this.canvas.addEventListener('click', this.boundHandleCanvasClick);
            this.canvas.addEventListener('mousemove', this.boundHandleCanvasMouseMove);
            this.canvas.addEventListener('mouseleave', this.boundHideTooltip);

            // 마우스 커서 스타일 변경 (클릭 가능함을 표시)
            this.canvas.style.cursor = 'pointer';

            // 툴팁 인스턴스 저장용
            this.tooltipInstance = null;
            this.currentHoveredBall = null;
        } catch (error) {
            console.error('Canvas 이벤트 리스너 추가 오류:', error);
        }
    }

    /**
     * =====================================================
     * Canvas 마우스 이동 이벤트 핸들러
     * 마우스 위치의 공을 감지하여 툴팁을 표시합니다
     * @param {MouseEvent} event - 마우스 이동 이벤트
     * =====================================================
     */
    handleCanvasMouseMove(event) {
        try {
            if (!this.canvas || !event) {
                return;
            }

            // Canvas 상대 좌표 계산
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Canvas 스케일링 보정
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const adjustedX = mouseX * scaleX;
            const adjustedY = mouseY * scaleY;

            // 마우스 위치의 공 찾기
            const hoveredBall = this.findBallAtPosition(adjustedX, adjustedY);

            if (hoveredBall && hoveredBall !== this.currentHoveredBall) {
                // 새로운 공에 마우스가 올라간 경우
                this.currentHoveredBall = hoveredBall;
                this.showTooltip(event, hoveredBall);
            } else if (!hoveredBall && this.currentHoveredBall) {
                // 공에서 마우스가 벗어난 경우
                this.currentHoveredBall = null;
                this.hideTooltip();
            } else if (hoveredBall && hoveredBall === this.currentHoveredBall) {
                // 같은 공 위에서 마우스가 움직이는 경우 - 툴팁 위치 업데이트
                this.updateTooltipPosition(event);
            }
        } catch (error) {
            console.error('마우스 이동 처리 오류:', error);
        }
    }


    /**
     * =====================================================
     * 툴팁 위치 업데이트
     * 마우스 움직임에 따라 툴팁 위치를 실시간으로 조정합니다
     * @param {MouseEvent} event - 마우스 이벤트
     * =====================================================
     */
    updateTooltipPosition(event) {
        try {
            if (this.tooltipReference && this.tooltipInstance && event) {
                this.tooltipReference.style.left = event.clientX + 'px';
                this.tooltipReference.style.top = event.clientY + 'px';
                this.tooltipInstance.setProps({
                    getReferenceClientRect: () => ({
                        width: 0,
                        height: 0,
                        left: event.clientX,
                        right: event.clientX,
                        top: event.clientY,
                        bottom: event.clientY
                    })
                });
            }
        } catch (error) {
            console.error('툴팁 위치 업데이트 오류:', error);
        }
    }

    /**
     * =====================================================
     * 성능 데이터를 기반으로 FeelDx 레벨을 반환하는 메서드
     * CLS, FCP, INP, LCP, TTFB 값을 종합하여 성능 점수를 계산합니다
     * @param {Array} sessionData - 세션 데이터
     * @returns {Object} FeelDx 정보 (level, name, icon, imageIndex)
     * =====================================================
     */
    getFeelDexInfo(sessionData) {
        try {
            if (!Array.isArray(sessionData) || sessionData.length < 6) {
                console.warn('잘못된 세션 데이터:', sessionData);
                return {
                    level: 'normal',
                    name: 'Normal',
                    icon: this.cachedTooltipIcons['normal'] || '',
                    imageIndex: 2
                };
            }

            if (!this.ballImages || this.ballImages.length === 0) {
                return {
                    level: 'normal',
                    name: 'Normal',
                    icon: this.cachedTooltipIcons['normal'] || '',
                    imageIndex: 2
                };
            }

            // CLS, INP, LCP 값을 기반으로 성능 점수 계산
            const rawLcp = sessionData[1];
            const rawInp = sessionData[3];
            const rawCls = sessionData[4];
            const isMetricMissing = (value) =>
                value == null || value === '' || Number.isNaN(Number(value));

            if (isMetricMissing(rawLcp) || isMetricMissing(rawInp) || isMetricMissing(rawCls)) {
                const defaultImageIndex = typeof this.defaultImageIndex === 'number' ? this.defaultImageIndex : 2;

                return {
                    level: 'feeldex-default',
                    name: 'No Data',
                    icon: this.cachedTooltipIcons['feeldex-default'] || '',
                    imageIndex: defaultImageIndex
                };
            }

            const lcp = rawLcp ?? 0;   // null/undefined → 0
            const inp = rawInp ?? 0;
            const cls = rawCls ?? 0;

            // 선형 스케일링 함수 (좋음=100, 보통≈60, 나쁨=20)
            const linearScale = (value, good, meh, bad) => {
                // null, undefined, NaN → 0
                if (value == null || isNaN(value)) value = 0;

                if (value <= good) return 100;
                if (value >= bad) return 20;

                // good~meh 구간: 100 → 60
                if (value <= meh) {
                    return 100 - ((value - good) / (meh - good)) * 40;
                }

                // meh~bad 구간: 60 → 20
                return 60 - ((value - meh) / (bad - meh)) * 40;
            };

            // 각 지표별 점수 계산
            const lcpScore = linearScale(lcp, 2500, 4000, 6000);
            const inpScore = linearScale(inp, 200, 500, 800);
            const clsScore = linearScale(cls, 0.1, 0.25, 0.5);

            // 총점 = LCP*0.4 + INP*0.3 + CLS*0.3
            const totalScore = (lcpScore * 0.4) + (inpScore * 0.3) + (clsScore * 0.3);

            // 점수에 따른 레벨 결정 및 캐시된 아이콘 사용
            let level, name, iconKey, imageIndex;
            if (totalScore >= 90) {
                level = 'very-good';
                name = 'Very Good';
                iconKey = 'very-good';
                imageIndex = 4;
            } else if (totalScore >= 75) {
                level = 'good';
                name = 'Good';
                iconKey = 'good';
                imageIndex = 1;
            } else if (totalScore >= 50) {
                level = 'normal';
                name = 'Normal';
                iconKey = 'normal';
                imageIndex = 2;
            } else if (totalScore >= 30) {
                level = 'bad';
                name = 'Bad';
                iconKey = 'bad';
                imageIndex = 0;
            } else {
                level = 'very-bad';
                name = 'Very Bad';
                iconKey = 'very-bad';
                imageIndex = 3;
            }

            return {
                level,
                name,
                imageIndex,
                icon: this.cachedTooltipIcons[iconKey] || '' // 캐시된 아이콘 HTML 사용
            };
        } catch (error) {
            console.error('FeelDx 정보 계산 오류:', error);
            return {
                level: 'normal',
                name: 'Normal',
                icon: this.cachedTooltipIcons['normal'] || '',
                imageIndex: 2
            };
        }
    }

    /**
     * =====================================================
     * 툴팁 표시
     * 공에 마우스가 올라갔을 때 성능 정보를 툴팁으로 표시합니다
     * @param {MouseEvent} event - 마우스 이벤트
     * @param {Object} ball - 공 객체
     * =====================================================
     */
    showTooltip(event, ball) {
        try {
            if (!ball || !ball.sessionData || !Array.isArray(ball.sessionData)) {
                console.warn('툴팁 표시할 데이터가 없습니다:', ball);
                return;
            }

            const fcp  = ball.sessionData[2] == null ? "-" : ball.sessionData[2];
            const lcp  = ball.sessionData[1] == null ? "-" : ball.sessionData[1];
            const inp  = ball.sessionData[3] == null ? "-" : ball.sessionData[3];
            const cls  = ball.sessionData[4] == null ? "-" : ball.sessionData[4];
            const ttfb = ball.sessionData[5] == null ? "-" : ball.sessionData[5];

            // 표시용 포맷 함수
            const fmt = (v) => v === "-" ? "-" : util.comma(v) + "ms";

            // FeelDx 정보 가져오기
            const feelDxInfo = this.getFeelDexInfo(ball.sessionData);
            const feelDexClass = feelDxInfo.name ? feelDxInfo.name.replace(/\s+/g, '-').toLowerCase() : 'normal';

            // 툴팁 생성
            const tooltipContent = `
                <div class="feeldex_tooltip">
                    <div class="feeldex_content">
                        <span>FeelDex: </span> <span class="status ${feelDexClass}">${feelDxInfo.name}</span> 
                    </div>
                    <div style="margin-bottom: 2px;">LCP: ${fmt(lcp)}</div>
                    <div style="margin-bottom: 2px;">FCP: ${fmt(fcp)}</div>
                    <div style="margin-bottom: 2px;">INP: ${fmt(inp)}</div>
                    <div style="margin-bottom: 2px;">CLS: ${cls}</div>
                    <div>TTFB: ${fmt(ttfb)}</div>
                </div>
            `;

            // 기존 툴팁 제거
            this.hideTooltip();

            // 가상의 DOM 요소 생성 (툴팁의 기준점)
            if (!this.tooltipReference) {
                this.tooltipReference = document.createElement('div');
                this.tooltipReference.style.position = 'absolute';
                this.tooltipReference.style.visibility = 'hidden';
                this.tooltipReference.style.pointerEvents = 'none';
                this.tooltipReference.style.zIndex = '-9999';
                document.body.appendChild(this.tooltipReference);
            }

            // 가상 요소의 위치를 마우스 위치로 설정
            this.tooltipReference.style.left = event.clientX + 'px';
            this.tooltipReference.style.top = event.clientY + 'px';

            // tippy 툴팁 생성
            if (typeof tippy === 'function') {
                this.tooltipInstance = tippy(this.tooltipReference, {
                    content: tooltipContent,
                    allowHTML: true,
                    placement: 'top',
                    theme: 'maxy-tooltip',
                    arrow: true,
                    showOnCreate: true,
                    hideOnClick: false,
                    trigger: 'manual',
                    offset: [0, 10],
                    zIndex: 99999
                });
            }
        } catch (error) {
            console.error('툴팁 표시 오류:', error);
        }
    }

    /**
     * =====================================================
     * 툴팁 숨기기
     * 현재 표시중인 툴팁을 제거합니다
     * =====================================================
     */
    hideTooltip() {
        try {
            if (this.tooltipInstance) {
                this.tooltipInstance.destroy();
                this.tooltipInstance = null;
            }
        } catch (error) {
            console.error('툴팁 숨기기 오류:', error);
        }
    }

    /**
     * =====================================================
     * Canvas 클릭 이벤트 핸들러
     * 클릭된 위치의 공을 찾아서 팝업을 표시합니다
     * @param {MouseEvent} event - 마우스 클릭 이벤트
     * =====================================================
     */
    handleCanvasClick(event) {
        try {
            if (!this.canvas || !event) {
                return;
            }

            // Canvas 상대 좌표 계산
            const rect = this.canvas.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;

            // Canvas 스케일링 보정 (CSS 크기와 내부 해상도가 다를 경우)
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const adjustedX = clickX * scaleX;
            const adjustedY = clickY * scaleY;

            // 클릭된 위치의 공 찾기
            const clickedBall = this.findBallAtPosition(adjustedX, adjustedY);

            if (clickedBall) {
                this.handleBallClick(clickedBall);
            }
        } catch (error) {
            console.error('Canvas 클릭 처리 오류:', error);
        }
    }

    /**
     * =====================================================
     * 특정 위치에 있는 공 찾기
     * 주어진 좌표에서 가장 가까운 공을 반환합니다
     * @param {number} x - X 좌표
     * @param {number} y - Y 좌표
     * @returns {Object|null} 해당 위치의 공 객체 또는 null
     * =====================================================
     */
    findBallAtPosition(x, y) {
        try {
            if (typeof x !== 'number' || typeof y !== 'number') {
                console.warn('잘못된 좌표 타입:', x, y);
                return null;
            }

            // 먼저 쌓인 공들에서 찾기 (위에 있는 공들이 우선)
            if (this.stackedBalls && Array.isArray(this.stackedBalls)) {
                for (let i = this.stackedBalls.length - 1; i >= 0; i--) {
                    const ball = this.stackedBalls[i];
                    if (ball && typeof ball.x === 'number' && typeof ball.y === 'number') {
                        const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
                        if (distance <= (ball.radius || this.ballRadius)) {
                            return ball;
                        }
                    }
                }
            }

            // 떨어지는 공들에서 찾기
            if (this.balls && Array.isArray(this.balls)) {
                for (let i = this.balls.length - 1; i >= 0; i--) {
                    const ball = this.balls[i];
                    if (ball && typeof ball.x === 'number' && typeof ball.y === 'number') {
                        const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
                        if (distance <= (ball.radius || this.ballRadius)) {
                            return ball;
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('공 찾기 오류:', error);
            return null;
        }
    }


    /**
     * =====================================================
     * 공 클릭 처리
     * 클릭된 공의 정보를 바탕으로 팝업을 표시합니다
     * @param {Object} ball - 클릭된 공 객체
     * =====================================================
     */
    handleBallClick(ball) {
        try {
            if (!ball || !ball.sessionData || !Array.isArray(ball.sessionData)) {
                console.warn('잘못된 세션 데이터가 포함된 공:', ball);
                return;
            }

            // sessionData에서 feeldx 정보 계산
            const feeldxInfo = this.getFeelDexInfo(ball.sessionData);
            const level = feeldxInfo.level;

            // sessionData 배열에서 정보 추출
            // [deviceId, lcp, fcp, inp, cls, ttfb]
            const deviceId = ball.sessionData[0] || 'N/A';

            if (!deviceId || deviceId === 'N/A') {
                console.warn('유효하지 않은 deviceId:', deviceId);
                return;
            }

            // 팝업 초기화 및 표시
            this.initPopup(deviceId, level);
        } catch (error) {
            console.error('공 클릭 처리 오류:', error);

            // 특정 오류에 대한 추가 처리
            if (error.message && error.message.includes("can't find #maxyPopupWrap")) {
                console.error('maxyPopupWrap 요소를 찾을 수 없습니다. HTML에 해당 요소를 추가해주세요.');
            }
        }
    }

    /**
     * =====================================================
     * 이미지 로드 메서드
     * FeelDx 레벨별 이미지를 로드하고 애니메이션을 시작합니다
     * =====================================================
     */
    loadImages() {
        try {
            // 이미 선로드됐다면 그대로 재사용
            if (this.imagesLoaded && this.ballImages && this.ballImages.length > 0) {
                return Promise.resolve(this.ballImages);
            }

            // 진행 중인 로딩이 있으면 동일 Promise 재사용
            if (this.loadingImagesPromise) {
                return this.loadingImagesPromise;
            }

            // 이미지 배열 초기화
            this.ballImages = [];

            const maxyDarkYn = sessionStorage.getItem('maxyDarkYn')

            let imageFiles = []
            let defaultImageFile = '/images/maxy/feeldex-default.svg'
            if (maxyDarkYn === 'Y') {
                imageFiles = [
                    '/images/maxy/dark-feeldex-bad.svg',
                    '/images/maxy/dark-feeldex-good.svg',
                    '/images/maxy/dark-feeldex-normal.svg',
                    '/images/maxy/dark-feeldex-very-bad.svg',
                    '/images/maxy/dark-feeldex-very-good.svg'

                ];
                defaultImageFile = '/images/maxy/feeldex-default.svg';
            } else {
                imageFiles = [
                    '/images/maxy/feeldex-bad.svg',
                    '/images/maxy/feeldex-good.svg',
                    '/images/maxy/feeldex-normal.svg',
                    '/images/maxy/feeldex-very-bad.svg',
                    '/images/maxy/feeldex-very-good.svg'
                ];
            }

            imageFiles.push(defaultImageFile);

            this.defaultImageIndex = imageFiles.length - 1;

            const totalImages = imageFiles.length;

            if (totalImages === 0) {
                console.warn('로드할 이미지가 없습니다.');
                this.startAnimation();
                return null;
            }

            // 한번만 네트워크 요청을 보내도록 Promise로 묶어둠
            this.loadingImagesPromise = this.preloadBallImages(imageFiles)
                .then(images => {
                    const fallback = images[this.defaultImageIndex] || null;
                    this.ballImages = images.map(img => img || fallback);
                    this.imagesLoaded = true;
                    this.startAnimation();
                    return this.ballImages;
                })
                .catch(error => {
                    console.error('이미지 선로드 중 오류:', error);
                    this.startAnimation();
                    return this.ballImages;
                })
                .finally(() => {
                    this.loadingImagesPromise = null;
                });

            return this.loadingImagesPromise;
        } catch (error) {
            console.error('이미지 로드 초기화 오류:', error);
            // 오류 발생 시에도 애니메이션을 시작
            this.startAnimation();
            return null;
        }
    }

    /**
     * =====================================================
     * 볼 이미지 배열을 순회하며 모두 선로드
     * =====================================================
     */
    preloadBallImages(imageFiles = []) {
        try {
            return Promise.all(imageFiles.map(src => this.preloadImage(src)));
        } catch (error) {
            console.error('볼 이미지 선로드 오류:', error);
            return Promise.resolve([]);
        }
    }

    /**
     * =====================================================
     * 단일 이미지에 대한 캐시/로딩 Promise 반환
     * 이미 요청한 이미지는 동일 Promise 재사용
     * =====================================================
     */
    preloadImage(src) {
        try {
            if (!src) {
                return Promise.resolve(null);
            }

            // 캐시에 있으면 바로 반환
            if (this.imageCache.has(src)) {
                return Promise.resolve(this.imageCache.get(src));
            }

            // 이미 로딩 중이면 기존 Promise 재사용
            if (this.imageLoadPromises.has(src)) {
                return this.imageLoadPromises.get(src);
            }

            const loadPromise = new Promise(resolve => {
                try {
                    const img = new Image();
                    img.onload = () => {
                        this.imageCache.set(src, img);
                        resolve(img);
                    };
                    img.onerror = (error) => {
                        console.warn(`이미지 로드 실패: ${src}`, error);
                        resolve(null);
                    };
                    img.src = src;
                } catch (error) {
                    console.error(`이미지 로딩 중 오류: ${src}`, error);
                    resolve(null);
                }
            });

            this.imageLoadPromises.set(src, loadPromise);
            return loadPromise;
        } catch (error) {
            console.error('이미지 프리로드 오류:', error);
            return Promise.resolve(null);
        }
    }

    /**
     * =====================================================
     * 웹소켓 데이터 처리 메서드
     * 웹소켓으로부터 받은 데이터를 파싱하여 적절한 처리를 수행합니다
     * @param {Object} wsData - 웹소켓 데이터 { fs: { D: [...], I: [...], U: [...] } }
     * =====================================================
     */
    setData(wsData) {
        try {
            if (!wsData) {
                console.warn('잘못된 웹소켓 데이터 형식');
                return;
            }

            const { D = [], I = [], U = [] } = wsData;

            // 데이터 유효성 검사
            if (!Array.isArray(D) || !Array.isArray(I) || !Array.isArray(U)) {
                console.warn('웹소켓 데이터의 배열 형식이 올바르지 않습니다:', wsData);
                return;
            }

            // Insert 데이터 처리 - 새로운 세션들을 위에서 아래로 떨어뜨림
            I.forEach((sessionData, index) => {
                try {
                    this.insertSession(sessionData);
                } catch (error) {
                    console.error(`Insert 데이터 처리 오류 (${index}번째):`, error, sessionData);
                }
            });

            // Delete 데이터 처리 - 기존 세션을 찾아서 폭발효과와 함께 제거
            D.forEach((deviceId, index) => {
                try {
                    if (deviceId) {
                        this.deleteSession(deviceId);
                    }
                } catch (error) {
                    console.error(`Delete 데이터 처리 오류 (${index}번째):`, error, deviceId);
                }
            });

            // Update 데이터 처리 - 기존 세션의 값들을 업데이트
            U.forEach((sessionData, index) => {
                try {
                    this.updateSession(sessionData);
                } catch (error) {
                    console.error(`Update 데이터 처리 오류 (${index}번째):`, error, sessionData);
                }
            });

            // 초기 로딩이 완료되었음을 표시 (첫 번째 데이터 처리 후)
            if (this.isInitialLoad && (I.length > 0 || D.length > 0 || U.length > 0)) {
                // 초기 데이터 로딩이 완료된 후 잠시 대기한 다음 플래그 변경
                setTimeout(() => {
                    this.isInitialLoad = false;
                }, 1000); // 1초 후에 애니메이션 효과 활성화
            }
        } catch (error) {
            console.error('웹소켓 데이터 처리 중 전체 오류:', error);
        }
    }

    /**
     * =====================================================
     * 새로운 세션 삽입 (I 데이터 처리)
     * 새로운 세션을 받아서 적절한 방식으로 화면에 표시합니다
     * @param {Array} sessionData - 세션 데이터
     * =====================================================
     */
    insertSession(sessionData) {
        try {
            // 배열 형태 검증
            if (!Array.isArray(sessionData) || sessionData.length < 6) {
                console.warn('잘못된 세션 데이터 형식:', sessionData);
                return;
            }

            const deviceId = sessionData[0];
            if (!deviceId) {
                console.warn('세션 데이터에 deviceId가 없습니다:', sessionData);
                return;
            }

            // 세션을 활성 세션 맵에 추가
            this.activeSessions.set(deviceId, sessionData);

            // 초기 로딩 시에는 떨어지는 효과 없이 바로 쌓기
            if (this.isInitialLoad) {
                const col = this.selectBestColumn();
                const targetX = this.getColumnX(col);
                const selectedImage = this.getImageByPerformance(sessionData);

                const newBall = {
                    x: targetX,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    column: col,
                    radius: this.ballRadius,
                    targetX: targetX,
                    angle: 0,
                    rotationSpeed: 0,
                    image: selectedImage,
                    sessionData: [...sessionData],
                    deviceId: deviceId,
                    flipAnimation: null
                };

                this.stackBall(newBall);
            } else {
                // 새로운 시스템: 대기열에 추가
                this.dropQueue.push(sessionData);

                // 대기열 처리 시작 (이미 처리 중이 아닌 경우에만)
                this.processDropQueue();
            }
        } catch (error) {
            console.error('세션 삽입 오류:', error);
        }
    }

    /**
     * =====================================================
     * 기존 세션 삭제 (D 데이터 처리)
     * 지정된 deviceId의 세션을 찾아서 폭발 효과와 함께 제거합니다
     * @param {string} deviceId - 삭제할 디바이스 ID
     * =====================================================
     */
    deleteSession(deviceId) {
        try {
            if (!deviceId) {
                console.warn('삭제 작업에 deviceId가 없습니다');
                return;
            }

            // 활성 세션에서 제거
            this.activeSessions.delete(deviceId);

            // 쌓인 공들 중에서 해당 deviceId를 가진 공 찾아서 제거
            if (this.stackedBalls && Array.isArray(this.stackedBalls)) {
                const ballToRemove = this.stackedBalls.find(ball => ball.deviceId === deviceId);

                if (ballToRemove) {
                    // 폭발 효과 생성
                    this.createExplosionParticles(ballToRemove.x, ballToRemove.y);

                    // 해당 공을 쌓인 공 배열에서 제거
                    const index = this.stackedBalls.indexOf(ballToRemove);
                    this.stackedBalls.splice(index, 1);

                    // 해당 컬럼의 높이 감소
                    if (this.columnHeights && ballToRemove.column < this.columnHeights.length) {
                        this.columnHeights[ballToRemove.column] = Math.max(0, this.columnHeights[ballToRemove.column] - 1);
                    }

                    // 같은 컬럼의 위쪽 공들을 아래로 이동 (중력 효과)
                    this.stackedBalls.forEach(b => {
                        if (b.column === ballToRemove.column && b.y < ballToRemove.y) {
                            b.y += this.ballRadius * 2;
                        }
                    });
                }
            }

            // 떨어지는 공들 중에서도 확인
            if (this.balls && Array.isArray(this.balls)) {
                const fallingBallIndex = this.balls.findIndex(ball => ball.deviceId === deviceId);
                if (fallingBallIndex !== -1) {
                    const fallingBall = this.balls[fallingBallIndex];
                    this.createExplosionParticles(fallingBall.x, fallingBall.y);
                    this.balls.splice(fallingBallIndex, 1);
                }
            }
        } catch (error) {
            console.error('세션 삭제 오류:', error);
        }
    }

    /**
     * =====================================================
     * 기존 세션 업데이트 (U 데이터 처리)
     * 기존 세션의 성능 데이터를 업데이트하고 이미지를 변경합니다
     * @param {Array} sessionData - 업데이트할 세션 데이터
     * =====================================================
     */
    updateSession(sessionData) {
        try {
            // 배열 형태 검증
            if (!Array.isArray(sessionData) || sessionData.length < 6) {
                console.warn('업데이트용 잘못된 세션 데이터 형식:', sessionData);
                return;
            }

            const deviceId = sessionData[0];
            if (!deviceId) {
                console.warn('업데이트 작업에 deviceId가 없습니다:', sessionData);
                return;
            }

            // 활성 세션 맵에서 업데이트
            this.activeSessions.set(deviceId, sessionData);

            // 쌓인 공들 중에서 해당 deviceId를 가진 공 찾아서 업데이트
            if (this.stackedBalls && Array.isArray(this.stackedBalls)) {
                const ballToUpdate = this.stackedBalls.find(ball => ball.deviceId === deviceId);

                if (ballToUpdate) {
                    // 세션 데이터 업데이트
                    ballToUpdate.sessionData = [...sessionData];

                    // 성능 데이터가 변경되었으므로 이미지도 재선택
                    const newImage = this.getImageByPerformance(sessionData);
                    if (newImage && ballToUpdate.image !== newImage) {
                        this.startImageFlip(ballToUpdate, newImage);
                    }
                }
            }

            // 떨어지는 공들 중에서도 확인
            if (this.balls && Array.isArray(this.balls)) {
                const fallingBall = this.balls.find(ball => ball.deviceId === deviceId);
                if (fallingBall) {
                    fallingBall.sessionData = [...sessionData];
                    const newImage = this.getImageByPerformance(sessionData);
                    if (newImage && fallingBall.image !== newImage) {
                        this.startImageFlip(fallingBall, newImage);
                    }
                }
            }
        } catch (error) {
            console.error('세션 업데이트 오류:', error);
        }
    }

    /**
     * =====================================================
     * 성능 데이터를 기반으로 적절한 이미지를 선택하는 메서드
     * FeelDx 점수 계산을 통해 해당하는 이미지를 반환합니다
     * @param {Array} sessionData - 세션 데이터 (cls, fcp, inp, lcp, ttfb 포함)
     * @returns {Image|null} 캐시된 이미지 객체
     * =====================================================
     */
    getImageByPerformance(sessionData) {
        try {
            if (!this.ballImages || this.ballImages.length === 0) {
                console.warn('로드된 이미지가 없습니다.');
                return null;
            }

            if (!Array.isArray(sessionData)) {
                console.warn('잘못된 세션 데이터:', sessionData);
                return this.ballImages[2]; // 기본값: normal
            }

            // getFeelDxInfo를 사용하여 일관된 로직 적용
            const feelDxInfo = this.getFeelDexInfo(sessionData);

            // 캐시된 이미지 반환 (이미 메모리에 로드된 상태)
            const cachedImage = this.ballImages[feelDxInfo.imageIndex];

            if (cachedImage && cachedImage.complete) {
                return cachedImage;
            }

            // 캐시된 이미지가 없거나 로드되지 않은 경우 기본값 반환
            return this.ballImages[2] || null;
        } catch (error) {
            console.error('성능별 이미지 선택 오류:', error);
            return this.ballImages[2] || null; // 기본값 반환
        }
    }

    /**
     * =====================================================
     * 경계선을 넘는 공들을 찾아서 폭발시키는 메서드
     * 화면 상단 15% 영역을 넘어선 공들을 자동으로 제거합니다
     * =====================================================
     */
    checkAndExplodeBorderBalls() {
        try {
            if (!this.stackedBalls || !Array.isArray(this.stackedBalls)) {
                return;
            }

            const ballsToExplode = [];

            // 쌓인 공들 중에서 경계선을 넘는 공들 찾기
            this.stackedBalls.forEach(ball => {
                try {
                    if (ball && typeof ball.y === 'number' && typeof ball.radius === 'number') {
                        if (ball.y - ball.radius <= this.borderY) {
                            ballsToExplode.push(ball);
                        }
                    }
                } catch (error) {
                    console.error('개별 공 경계선 체크 오류:', error);
                }
            });

            // 찾은 공들을 폭발시키기
            ballsToExplode.forEach(ball => {
                try {
                    this.explodeBallAtBorder(ball);
                } catch (error) {
                    console.error('경계선 공 폭발 오류:', error);
                }
            });
        } catch (error) {
            console.error('경계선 공 체크 전체 오류:', error);
        }
    }

    /**
     * =====================================================
     * 경계선에서 공을 폭발시키는 메서드
     * 경계선을 넘어선 개별 공을 폭발 효과와 함께 제거합니다
     * @param {Object} ball - 폭발시킬 공 객체
     * =====================================================
     */
    explodeBallAtBorder(ball) {
        try {
            if (!ball) {
                console.warn('폭발시킬 공 객체가 없습니다.');
                return;
            }

            // 폭발 효과 생성
            this.createExplosionParticles(ball.x, ball.y);

            // 해당 공을 쌓인 공 배열에서 제거
            const index = this.stackedBalls.indexOf(ball);
            if (index !== -1) {
                this.stackedBalls.splice(index, 1);

                // 해당 컬럼의 높이 감소
                if (this.columnHeights && ball.column < this.columnHeights.length) {
                    this.columnHeights[ball.column] = Math.max(0, this.columnHeights[ball.column] - 1);
                }

                // 활성 세션에서도 제거
                if (ball.deviceId) {
                    this.activeSessions.delete(ball.deviceId);
                }

                // 같은 컬럼의 위쪽 공들을 아래로 이동 (중력 효과)
                this.stackedBalls.forEach(b => {
                    try {
                        if (b && b.column === ball.column && b.y < ball.y) {
                            b.y += this.ballRadius * 2;
                        }
                    } catch (error) {
                        console.error('공 위치 조정 오류:', error);
                    }
                });
            }
        } catch (error) {
            console.error('경계선 공 폭발 처리 오류:', error);
        }
    }

    /**
     * =====================================================
     * 경계선 그리기 메서드
     * Canvas 상단 15% 위치에 경계선을 그립니다
     * =====================================================
     */
    drawBorderLine() {
        try {
            if (!this.ctx) {
                return;
            }

            const maxyDarkYn = sessionStorage.getItem('maxyDarkYn');

            this.ctx.save();
            this.ctx.strokeStyle = maxyDarkYn === 'Y' ? '#484848' : '#e3e5e8' // 회색 경계선
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.borderY);
            this.ctx.lineTo(this.canvas.width, this.borderY);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // 점선 해제
            this.ctx.restore();
        } catch (error) {
            console.error('경계선 그리기 오류:', error);
        }
    }

    /**
     * =====================================================
     * 애니메이션 시작 메서드
     * 시간 기반 애니메이션 루프를 초기화하고 시작합니다
     * =====================================================
     */
    startAnimation() {
        try {
            if (!this.canvas || !this.ctx) {
                console.error('애니메이션 시작 불가: Canvas 또는 Context가 없습니다');
                return;
            }

            // 이전 애니메이션이 실행 중이면 중단
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }

            // 시간 기반 애니메이션을 위한 초기화
            this.lastTime = performance.now();  // 고정밀 시간 측정
            this.update(this.lastTime);         // 첫 번째 프레임 실행
        } catch (error) {
            console.error('애니메이션 시작 오류:', error);
        }
    }

    /**
     * =====================================================
     * 애니메이션 중단 메서드
     * 실행 중인 애니메이션과 타이머들을 모두 정리합니다
     * =====================================================
     */
    stopAnimation() {
        try {
            // 메인 애니메이션 루프 중단
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
                console.log('애니메이션이 중단되었습니다.');
            }

            // 자동 공 생성 타이머 중단
            if (this.autoDropTimeoutId) {
                clearTimeout(this.autoDropTimeoutId);
                this.autoDropTimeoutId = null;
            }
        } catch (error) {
            console.error('애니메이션 중단 오류:', error);
        }
    }

    /**
     * =====================================================
     * 컬럼의 X 좌표를 계산하는 메서드
     * 주어진 컬럼 인덱스에 대한 중심 X 좌표를 반환합니다
     * @param {number} col - 컬럼 인덱스
     * @returns {number} 컬럼의 중심 X 좌표
     * =====================================================
     */
    getColumnX(col) {
        try {
            if (typeof col !== 'number' || col < 0 || col >= this.columnCount) {
                console.warn('잘못된 컬럼 인덱스:', col);
                return this.columnWidth / 2; // 기본값으로 첫 번째 컬럼 중심 반환
            }
            return col * this.columnWidth + this.columnWidth / 2;
        } catch (error) {
            console.error('컬럼 X 좌표 계산 오류:', error);
            return 0;
        }
    }


    /**
     * =====================================================
     * 떨어지는 공을 바닥에 쌓는 메서드
     * 물리법칙에 따라 공을 적절한 위치에 배치합니다
     * @param {Object} ball - 쌓을 공 객체
     * =====================================================
     */
    stackBall(ball) {
        try {
            if (!ball) {
                console.warn('쌓을 공 객체가 없습니다.');
                return;
            }

            // 같은 컬럼에 있는 쌓인 공들을 Y 좌표 순으로 정렬 (위쪽부터)
            const colBalls = this.stackedBalls
                .filter(b => b && b.column === ball.column)
                .sort((a, b) => a.y - b.y);

            // 기본 위치는 바닥에서 공의 반지름만큼 위
            let targetY = this.floorY - this.ballRadius;

            // 이미 쌓인 공이 있으면 그 위에 배치
            if (colBalls.length > 0) {
                const topBall = colBalls[0];
                if (topBall && typeof topBall.y === 'number') {
                    targetY = topBall.y - this.ballRadius * 2;
                }
            }

            // 공의 최종 위치 설정
            ball.x = this.getColumnX(ball.column);
            ball.y = targetY;

            // 쌓인 공 배열에 추가
            this.stackedBalls.push(ball);

            // 해당 컬럼의 높이 증가
            if (this.columnHeights && ball.column < this.columnHeights.length) {
                this.columnHeights[ball.column]++;
            }
        } catch (error) {
            console.error('공 쌓기 오류:', error);
        }
    }


    /**
     * =====================================================
     * 폭발 파티클 생성 메서드
     * 공이 제거될 때 시각적 효과를 위한 파티클을 생성합니다
     * @param {number} x - 폭발 중심 X 좌표
     * @param {number} y - 폭발 중심 Y 좌표
     * =====================================================
     */
    createExplosionParticles(x, y) {
        try {
            if (typeof x !== 'number' || typeof y !== 'number') {
                console.warn('잘못된 폭발 좌표:', x, y);
                return;
            }

            const count = 15;   // 생성할 파티클 수

            // 지정된 수만큼 파티클 생성
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;  // 랜덤 방향 (0~2π)
                const speed = 2 + Math.random() * 3;        // 랜덤 속도 (2~5)

                this.particles.push({
                    x,                              // 시작 X 좌표
                    y,                              // 시작 Y 좌표
                    vx: Math.cos(angle) * speed,    // X 방향 속도
                    vy: Math.sin(angle) * speed,    // Y 방향 속도
                    radius: 2 + Math.random() * 2,  // 파티클 크기 (2~4)
                    alpha: 1,                        // 투명도 (1에서 시작해서 점점 감소)
                });
            }
        } catch (error) {
            console.error('폭발 파티클 생성 오류:', error);
        }
    }


    /**
     * =====================================================
     * 메인 애니메이션 루프 - 매 프레임마다 호출
     * 모든 애니메이션 요소들을 업데이트하고 화면에 그립니다
     * @param {number} currentTime - 현재 시간 (performance.now() 값)
     * =====================================================
     */
    update(currentTime) {
        try {
            // Canvas와 컨텍스트가 유효한지 확인
            if (!this.canvas || !this.ctx) {
                console.warn('애니메이션 업데이트 중 Canvas 또는 Context가 없습니다');
                return;
            }

            // ===== 시간 기반 애니메이션 계산 =====
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            // deltaTime이 너무 클 경우 (예: 탭 비활성화 후 복귀) 제한
            const clampedDeltaTime = Math.min(deltaTime, 33); // 최대 33ms (약 30fps)

            // ===== Canvas 초기화 =====
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 경계선 그리기 (먼저 그려서 공들 뒤에 위치)
            this.drawBorderLine();

            // ===== 떨어지는 공들 처리 =====
            // 뒤에서부터 순회 (배열에서 제거할 수 있도록)
            for (let i = this.balls.length - 1; i >= 0; i--) {
                try {
                    const b = this.balls[i];
                    if (!b) continue;

                    // 시간 기반 물리 계산
                    b.vy += this.gravity * clampedDeltaTime;    // 중력으로 Y 속도 증가
                    b.y += b.vy * clampedDeltaTime;             // Y 위치 업데이트
                    b.angle += b.rotationSpeed * clampedDeltaTime * 0.001; // 회전 속도도 시간 기반으로

                    // 떨어지는 동안 원래 컬럼 중심으로 서서히 이동
                    this.updateFlipAnimationState(b, clampedDeltaTime);
                    const xDiff = b.targetX - b.x;
                    if (Math.abs(xDiff) > 1) {
                        b.x += xDiff * 0.02; // 목표 X 위치로 서서히 이동 (2%씩)
                    }

                    // 해당 컬럼에 쌓인 공들 중 가장 위에 있는 공의 Y 좌표 찾기
                    const colStack = this.stackedBalls
                        .filter(s => s && s.column === b.column)
                        .sort((a, b) => a.y - b.y);

                    // 바닥 또는 쌓인 공의 맨 위 위치 계산
                    let topY = this.floorY;
                    if (colStack.length > 0 && colStack[0] && typeof colStack[0].y === 'number') {
                        topY = colStack[0].y;
                    }

                    // 공이 바닥이나 다른 공에 닿았는지 검사
                    if (b.y + this.ballRadius >= topY) {
                        this.balls.splice(i, 1);    // 떨어지는 공 배열에서 제거
                        this.stackBall(b);           // 쌓인 공 배열에 추가
                        continue;
                    }

                    // 공 이미지 그리기 (회전 포함)
                    if (b.image && b.image.complete) {
                        const flipState = this.getFlipRenderState(b);
                        this.ctx.save();                 // 현재 변환 상태 저장

                        this.ctx.translate(b.x, b.y);    // 회전 중심을 공의 중심으로 이동
                        if (flipState) {
                            this.ctx.translate(flipState.offsetX, 0);
                            this.ctx.scale(flipState.scaleX, 1);
                        }
                        this.ctx.rotate(b.angle);
                        this.ctx.drawImage(b.image, -b.radius, -b.radius, b.radius * 2, b.radius * 2);
                        this.ctx.restore();
                    }
                } catch (error) {
                    console.error(`떨어지는 공 처리 오류 (${i}번째):`, error);
                }
            }

            // ===== 쌓인 공들 그리기 =====
            this.stackedBalls.forEach((b, index) => {
                try {
                    if (!b) {
                        return;
                    }

                    this.updateFlipAnimationState(b, clampedDeltaTime);

                    if (b.image && b.image.complete) {
                        const flipState = this.getFlipRenderState(b);
                        if (flipState) {
                            this.ctx.save();
                            this.ctx.translate(b.x, b.y);
                            this.ctx.translate(flipState.offsetX, 0);
                            this.ctx.scale(flipState.scaleX, 1);
                            this.ctx.drawImage(b.image, -b.radius, -b.radius, b.radius * 2, b.radius * 2);
                            this.ctx.restore();
                        } else {
                            this.ctx.drawImage(b.image, b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2);
                        }
                    }
                } catch (error) {
                    console.error(`쌓인 공 그리기 오류 (${index}번째):`, error);
                }
            });

            // 경계선을 넘는 공들 체크 및 폭발
            this.checkAndExplodeBorderBalls();

            // ===== 폭발 파티클 처리 =====
            for (let i = this.particles.length - 1; i >= 0; i--) {
                try {
                    const p = this.particles[i];
                    if (!p) continue;

                    p.x += p.vx * clampedDeltaTime * 0.1;   // x 위치 업데이트
                    p.y += p.vy * clampedDeltaTime * 0.1;   // y 위치 업데이트
                    p.vy += 0.00005 * clampedDeltaTime;     // 중력도 시간 기반
                    p.alpha -= 0.002 * clampedDeltaTime;    // 페이드아웃도 시간 기반

                    // 파티클 그리기
                    this.ctx.beginPath();
                    this.ctx.fillStyle = `rgba(255, 150, 0, ${Math.max(0, p.alpha)})`;
                    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    this.ctx.fill();

                    // 완전히 투명해진 파티클 제거
                    if (p.alpha <= 0) {
                        this.particles.splice(i, 1);
                    }
                } catch (error) {
                    console.error(`파티클 처리 오류 (${i}번째):`, error);
                }
            }

            // this 컨텍스트를 유지하여 애니메이션 계속
            this.animationId = requestAnimationFrame((time) => this.update(time));
        } catch (error) {
            console.error('애니메이션 업데이트 전체 오류:', error);
            // 오류가 발생해도 애니메이션을 계속 시도
            this.animationId = requestAnimationFrame((time) => this.update(time));
        }
    }


    /**
     * =====================================================
     * 정리 메서드 - 메모리 누수 방지를 위한 리소스 정리
     * 컴포넌트가 제거될 때 모든 리소스를 적절히 해제합니다
     * =====================================================
     */
    destroy() {
        try {
            console.log('MaxyFrontUserSession 정리 시작');

            // 애니메이션 중지
            this.stopAnimation();

            // 툴팁 정리
            this.hideTooltip();
            if (this.tooltipReference) {
                document.body.removeChild(this.tooltipReference);
                this.tooltipReference = null;
            }

            // 이미지 캐시 정리
            if (this.imageCache) {
                this.imageCache.clear();
            }
            if (this.imageLoadPromises) {
                this.imageLoadPromises.clear();
            }
            if (this.iconCache) {
                this.iconCache.clear();
            }

            // 캐시된 툴팁 아이콘 정리
            this.cachedTooltipIcons = {};


            // 이벤트 리스너 제거
            if (this.canvas) {
                this.canvas.removeEventListener('click', this.boundHandleCanvasClick);
                this.canvas.removeEventListener('mousemove', this.boundHandleCanvasMouseMove);
                this.canvas.removeEventListener('mouseleave', this.boundHideTooltip);
            }

            // 리사이즈 이벤트 리스너 제거
            if (this.resizeListenerAdded) {
                window.removeEventListener('resize', this.resizeCanvas.bind(this));
                this.resizeListenerAdded = false;
            }

            // 배열들 정리
            this.balls = [];
            this.stackedBalls = [];
            this.particles = [];
            this.ballImages = [];
            this.columnHeights = [];
            this.dropQueue = [];
            this.recentDrops = [];

            // Map 정리
            if (this.activeSessions) {
                this.activeSessions.clear();
            }

            // 객체 참조 해제
            this.canvas = null;
            this.ctx = null;
            this.currentHoveredBall = null;
            this.popup = null;

            console.log('MaxyFrontUserSession 정리 완료');
        } catch (error) {
            console.error('리소스 정리 중 오류:', error);
        }
    }

    reset() {
        this.balls = []
        this.stackedBalls = []
        this.particles = []

        if (this.activeSessions) {
            this.activeSessions.clear()
        }

        // 컬럼 높이 초기화
        if (this.columnHeights) {
            this.columnHeights.fill(0)
        }

        // 드롭 큐 및 관련 상태 초기화
        this.dropQueue = []
        this.recentDrops = []
        this.isProcessingQueue = false

        // 초기 로딩 플래그 재설정
        this.isInitialLoad = true

        // Canvas 클리어
        if (this.ctx) {
            this.ctx.clearRect(0, 0,this.canvas.width, this.canvas.height)
        }
    }
}
