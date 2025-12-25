/**
 * 세션 재생 팝업 - MaxySessionReplayPopup
 * 서버에서 세션 리플레이 데이터를 조회하여 rrweb.Replayer로 재생하는 팝업
 *
 * 주요 기능:
 * - 현재 재생 위치에서 계속 재생 (처음부터 시작하지 않음)
 * - 재생 완료 후 재생 버튼 클릭 시 처음부터 다시 시작
 * - 일시정지/재개 기능
 * - 진행 바 클릭으로 특정 시점 이동
 * - 재생 상태 추적 및 관리
 *
 * 사용 예시:
 * new MaxySessionReplayPopup({
 *     id: 'sessionReplayPopup',
 *     appendId: 'popupContainer',
 *     param: {
 *         sessionId: 'a9dcb591-1946-4b53-98e8-d43b38a2ff29', // 세션ID
 *         playStartTm: '1759365716633' // 팝업 오픈시 이동할 특정 시점 (timestamp 형식)
 *         errorLogTm: '1759365716633' // actionList에 에러가 난 액션의 핀포인트를 추가
 *     }
 * })
 */
class MaxySessionReplayPopup {
    // 상수 정의
    static CONSTANTS = {
        PROGRESS_UPDATE_INTERVAL: 100, // 100ms마다 진행 상황 업데이트
        REPLAY_FINISH_THRESHOLD: 100,  // 재생 완료 판단 임계값 (100ms)
        MOUSE_TAIL_DURATION: 500,      // 마우스 꼬리 지속 시간
        MOUSE_TAIL_WIDTH: 2,           // 마우스 꼬리 두께
        MOUSE_TAIL_COLOR: 'red'        // 마우스 꼬리 색상
    }

    constructor(options) {
        // 기본 속성 초기화
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param || {}

        // 재생 관련 상태
        this.replayer = null
        this.sessionData = null
        this.isPlaying = false
        this.isPaused = false
        this.progressUpdateInterval = null
        this.totalDuration = 0
        this.currentTime = 0
        this.replayStartTime = null
        this.sessionStartTm = 0
        this.sessionEndTm = 0

        // 액션 관련
        this.actionList = null
        this.actionListTable = null
        this.lastActionIndex = null
        this.autoScrollEnabled = false

        // 에러 필터링 관련
        this._errorFilteringActive = false
        this._originalConsoleError = null
        this._originalConsoleWarn = null
        this._originalErrorHandler = undefined
        this._unhandledRejectionHandler = null

        // 유효성 검사
        if (!this.id || !this.appendId) {
            console.error('필수 파라미터가 누락되었습니다: id, appendId')
            return false
        }

        if (!this.param.sessionId) {
            console.error('필수 파라미터가 누락되었습니다: sessionId')
            return false
        }

        // 초기화 시작
        this.init().then(() => {
            this.addEventListener()
            this.openPopup().then(() => {
                this.loadSession()
            })
        }).catch(error => {
            console.error('Initialization failed:', error)
        })
    }

    // ==================== 초기화 관련 메서드 ===================="

    /**
     * 팝업 UI 초기화 - HTML 템플릿 로드 및 렌더링
     */
    async init() {
        const {id, appendId} = this

        try {
            const source = await fetch('/components/cmm/popup-session-replay.html')
                .then(response => response.text())

            const template = Handlebars.compile(source)
            const $target = $('#' + appendId)

            if (!$target.length) {
                throw new Error(`Target element not found: #${appendId}`)
            }

            $target.empty().append(template({id}))
            this.setInitialUIState()
            updateContent() // 다국어 텍스트 적용
        } catch (error) {
            console.error('UI 초기화 실패:', error)
            throw error
        }
    }

    // ==================== 이벤트 리스너 관련 메서드 ====================

    /**
     * 팝업 내 모든 이벤트 리스너 등록 (닫기, 재생/일시정지, 진행바 클릭)
     */
    addEventListener() {
        const $popup = $('#' + this.id + '__popup')

        // 팝업 닫기 이벤트들
        $('.s_replay_dimmed, .icon_close').on('click', () => {
            this.cleanupBeforeClose()
            this.closePopup()
        })

        // replay-container 클릭 이벤트 - 재생/일시정지 토글
        $popup.find('.replay-container').on('click', () => {
            // 세션 데이터가 로드되지 않았으면 클릭 무시
            if (!this.sessionData || !this.sessionData.events || this.sessionData.events.length === 0) {
                return
            }

            // 재생 상태에 따른 토글
            if (!this.isPlaying && !this.isPaused) {
                this.startReplay()
            } else if (this.isPlaying && !this.isPaused) {
                this.pauseReplay()
            } else if (this.isPaused) {
                this.resumeReplay()
            }
        })

        // 진행 바 클릭 이벤트 - 특정 시점으로 이동
        $popup.find('.progress-bar').on('click', (e) => {
            if (!this.replayer || !this.sessionData || this.sessionData.events.length === 0) {
                return
            }

            const progressBar = e.currentTarget
            const rect = progressBar.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const progressPercent = clickX / rect.width
            const targetTime = this.totalDuration * progressPercent

            this.seekToTime(targetTime)
        })

        // 오토스크롤 버튼 클릭 이벤트
        $popup.find('#autoScrollBtn').on('click', () => {
            const $button = $popup.find('#autoScrollBtn')
            $button.toggleClass('active')
            this.autoScrollEnabled = $button.hasClass('active')
        })
    }

    // ==================== 세션 데이터 로드 관련 메서드 ====================

    /**
     * 서버에서 세션 리플레이 데이터를 로드하고 UI 구성 요소들을 초기화
     * 세션 리플레이 영상을 준비한 상태로 재생 준비
     */
    loadSession() {
        try {
            const param = {
                index: "sess_replay",
                packageNm: sessionStorage.getItem('packageNm'),
                serverType: sessionStorage.getItem('serverType'),
                sessionId: this.param.sessionId,
            }

            cursor.show(false, '#' + this.id + '__popup')

            // 액션 리스트 먼저 조회 (JSON 형식으로 전송)
            fetch('/mf/0000/sessionReplay/actionList.maxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(param)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`)
                    }
                    return response.json()
                })
                .then(response => {
                    this.actionList = response.actionList || []
                    this.sessionStartTm = response.sessionStartTm ? parseInt(response.sessionStartTm) : 0
                    this.sessionEndTm = response.sessionEndTm ? parseInt(response.sessionEndTm) : 0
                    this.totalDuration = this.sessionEndTm - this.sessionStartTm

                    // 액션 리스트 테이블 생성
                    this.createActionListTable(this.actionList)

                    // 액션 마크 생성
                    //this.createActionMarks(this.actionList)

                    // 스트림 데이터 조회 시작
                    return this.loadSessionStream(param)
                })
                .catch(error => {
                    console.error('서버 요청 실패:', error)
                    this.showError(`서버에서 데이터를 가져오는 중 오류가 발생했습니다: ${error.message || error}`)
                    this.disableReplayControls()
                    return false
                })
                .finally(() => {
                    cursor.hide('#' + this.id + '__popup')
                })

        } catch (error) {
            console.error('세션 데이터 로드 오류:', error)
            this.showError(`세션 데이터 로드 중 오류가 발생했습니다: ${error.msg}`)
            this.disableReplayControls()
            return false
        }
    }

    /**
     * 스트림 방식으로 세션 리플레이 데이터를 로드하고 점진적으로 재생 준비
     * @param {Object} param - 요청 파라미터
     */
    async loadSessionStream(param) {
        try {
            // 1. 스트림 요청 초기화
            const response = await this._fetchStreamData(param)
            
            // 2. 스트림 상태 초기화
            const streamState = this._initializeStreamState()
            
            // 3. UI 요소 준비
            const uiElements = this._prepareStreamUI()
            
            // 4. 스트림 데이터 읽기 및 처리
            await this._processStreamData(response, streamState, uiElements)
            
            // 5. 스트림 완료 후 후처리
            return await this._finalizeStreamLoading(streamState)

        } catch (error) {
            return this._handleStreamError(error)
        }
    }

    /**
     * 스트림 데이터 요청
     * @param {Object} param - 요청 파라미터
     * @returns {Response} fetch 응답 객체
     */
    async _fetchStreamData(param) {
        const response = await fetch('/mf/0000/sessionReplay/stream.maxy', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(param)
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return response
    }

    /**
     * 스트림 처리를 위한 상태 초기화
     * @returns {Object} 스트림 상태 객체
     */
    _initializeStreamState() {
        const replayDataArray = []
        this.sessionData = {events: replayDataArray}

        return {
            decoder: new TextDecoder(),
            buffer: '',
            replayDataArray,
            firstTimestamp: null,
            lastTimestamp: null,
            isReplayerInitialized: false,
            hasMetaEvent: false,
            playBtnEnabled: false,
            seekToExecuted: false
        }
    }

    /**
     * 스트림 진행률 표시 UI 준비
     * @returns {Object} UI 엘리먼트 객체
     */
    _prepareStreamUI() {
        const $popup = $('#' + this.id + '__popup')
        const $progressBar = $popup.find('.progress-bar')
        
        if ($progressBar.find('.stream-progress-text').length === 0) {
            $progressBar.append('<div class="stream-progress-text"></div>')
        }
        
        return {
            $popup,
            $progressBar,
            $streamProgressText: $progressBar.find('.stream-progress-text')
        }
    }

    /**
     * 스트림 데이터를 읽고 처리
     * @param {Response} response - fetch 응답 객체
     * @param {Object} streamState - 스트림 상태
     * @param {Object} uiElements - UI 엘리먼트
     */
    async _processStreamData(response, streamState, uiElements) {
        const reader = response.body.getReader()

        while (true) {
            const {done, value} = await reader.read()
            if (done) break

            // 청크 데이터를 문자열로 디코딩
            streamState.buffer += streamState.decoder.decode(value, {stream: true})

            // JSON 객체 단위로 파싱 및 처리
            this._parseAndProcessBuffer(streamState, uiElements)
        }

        // 남은 버퍼 처리
        this._processRemainingBuffer(streamState)
    }

    /**
     * 버퍼에서 JSON 객체를 파싱하고 처리
     * @param {Object} streamState - 스트림 상태
     * @param {Object} uiElements - UI 엘리먼트
     */
    _parseAndProcessBuffer(streamState, uiElements) {
        let braceCount = 0
        let startIndex = 0
        let inString = false
        let escaped = false

        for (let i = 0; i < streamState.buffer.length; i++) {
            const char = streamState.buffer[i]

            // 이스케이프 문자 처리
            if (escaped) {
                escaped = false
                continue
            }
            if (char === '\\') {
                escaped = true
                continue
            }

            // 문자열 내부 여부 추적
            if (char === '"') {
                inString = !inString
                continue
            }

            // 문자열 외부에서 중괄호 카운팅
            if (!inString) {
                if (char === '{') {
                    if (braceCount === 0) startIndex = i
                    braceCount++
                } else if (char === '}') {
                    braceCount--
                    if (braceCount === 0) {
                        // 완전한 JSON 객체 추출 및 처리
                        const jsonStr = streamState.buffer.substring(startIndex, i + 1)
                        this._processJsonObject(jsonStr, streamState, uiElements)

                        // 처리된 부분 제거
                        streamState.buffer = streamState.buffer.substring(i + 1)
                        i = -1
                        startIndex = 0
                    }
                }
            }
        }
    }

    /**
     * JSON 문자열을 파싱하고 이벤트 데이터 처리
     * @param {string} jsonStr - JSON 문자열
     * @param {Object} streamState - 스트림 상태
     * @param {Object} uiElements - UI 엘리먼트
     */
    _processJsonObject(jsonStr, streamState, uiElements) {
        try {
            const jsonObj = JSON.parse(jsonStr)

            Object.entries(jsonObj).forEach(([key, value]) => {
                if (key.includes('#')) {
                    const parsedData = this._parseEventData(value)
                    this._handleEventData(parsedData, streamState, uiElements)
                }
            })
        } catch (e) {
            console.warn('JSON 파싱 실패:', e)
        }
    }

    /**
     * 이벤트 데이터 파싱 (문자열인 경우 JSON 파싱)
     * @param {*} value - 원본 값
     * @returns {Object} 파싱된 데이터
     */
    _parseEventData(value) {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value)
            } catch (e) {
                return value
            }
        }
        return value
    }

    /**
     * 이벤트 데이터 처리 (타임스탬프 추적, Replayer 초기화, 이벤트 추가)
     * @param {Object} parsedData - 파싱된 이벤트 데이터
     * @param {Object} streamState - 스트림 상태
     * @param {Object} uiElements - UI 엘리먼트
     */
    _handleEventData(parsedData, streamState, uiElements) {
        // 타임스탬프 추적
        this._trackTimestamp(parsedData, streamState)

        // Meta 이벤트 확인 (type: 4)
        if (parsedData && parsedData.type === 4) {
            streamState.hasMetaEvent = true
        }

        // 이벤트 배열에 추가
        streamState.replayDataArray.push(parsedData)

        // Replayer 초기화 또는 이벤트 추가
        if (!streamState.isReplayerInitialized) {
            this._tryInitializeReplayer(streamState)
        } else {
            this._addEventToReplayer(parsedData, streamState, uiElements)
        }
    }

    /**
     * 타임스탬프 추적
     * @param {Object} parsedData - 파싱된 이벤트 데이터
     * @param {Object} streamState - 스트림 상태
     */
    _trackTimestamp(parsedData, streamState) {
        if (parsedData && parsedData.timestamp) {
            if (streamState.firstTimestamp === null) {
                streamState.firstTimestamp = parsedData.timestamp
            }
            streamState.lastTimestamp = parsedData.timestamp
        }
    }

    /**
     * Replayer 초기화 시도 (충분한 이벤트가 모였을 때)
     * @param {Object} streamState - 스트림 상태
     */
    _tryInitializeReplayer(streamState) {
        if (streamState.hasMetaEvent && streamState.replayDataArray.length >= 5) {
            this.initializeProgressiveReplayer()
            streamState.isReplayerInitialized = true
        }
    }

    /**
     * Replayer에 이벤트 추가 및 UI 업데이트
     * @param {Object} parsedData - 파싱된 이벤트 데이터
     * @param {Object} streamState - 스트림 상태
     * @param {Object} uiElements - UI 엘리먼트
     */
    _addEventToReplayer(parsedData, streamState, uiElements) {
        if (!this.replayer || typeof this.replayer.addEvent !== 'function') {
            return
        }

        this.replayer.addEvent(parsedData)

        // 스트림 진행률 업데이트
        this._updateStreamProgress(parsedData, uiElements.$streamProgressText)

        // 재생 컨트롤 활성화 (최초 1회)
        if (!streamState.playBtnEnabled) {
            streamState.playBtnEnabled = true
            this.enableReplayControls()
            this.showPlayIcon()
        }

        // 특정 시점으로 이동 (최초 1회)
        this._seekToPlayStartTime(parsedData, streamState, uiElements.$popup)
    }

    /**
     * 스트림 진행률 업데이트
     * @param {Object} parsedData - 파싱된 이벤트 데이터
     * @param {jQuery} $streamProgressText - 진행률 텍스트 엘리먼트
     */
    _updateStreamProgress(parsedData, $streamProgressText) {
        if (this.totalDuration > 0 && parsedData.timestamp) {
            const currentProgress = parsedData.timestamp - this.sessionStartTm
            const progressPercent = Math.min(Math.round((currentProgress / this.totalDuration) * 100), 100)
            
            $streamProgressText.text(progressPercent + '%')
            
            if (progressPercent >= 100) {
                $streamProgressText.hide()
            }
        }
    }

    /**
     * playStartTm 파라미터가 있을 경우 해당 시점으로 이동
     * @param {Object} parsedData - 파싱된 이벤트 데이터
     * @param {Object} streamState - 스트림 상태
     * @param {jQuery} $popup - 팝업 엘리먼트
     */
    _seekToPlayStartTime(parsedData, streamState, $popup) {
        if (this.param.playStartTm && 
            !streamState.seekToExecuted && 
            Number(this.param.playStartTm) < Number(parsedData.timestamp)) {

            streamState.seekToExecuted = true
            this.seekToTargetTime()
            cursor.hide('#' + this.id + '__popup')
        }
    }

    /**
     * 남은 버퍼 데이터 처리
     * @param {Object} streamState - 스트림 상태
     */
    _processRemainingBuffer(streamState) {
        if (streamState.buffer.trim().length === 0) {
            return
        }

        try {
            const jsonObj = JSON.parse(streamState.buffer)
            
            Object.entries(jsonObj).forEach(([key, value]) => {
                if (key.includes('#')) {
                    const parsedData = this._parseEventData(value)
                    streamState.replayDataArray.push(parsedData)

                    // Replayer가 초기화된 경우 이벤트 추가
                    if (streamState.isReplayerInitialized && 
                        this.replayer && 
                        typeof this.replayer.addEvent === 'function') {
                        this.replayer.addEvent(parsedData)
                    }
                }
            })
        } catch (e) {
            console.warn('[CLIENT-STREAM-PARSE] 남은 버퍼 파싱 실패:', e)
        }
    }

    /**
     * 스트림 로딩 완료 후 후처리
     * @param {Object} streamState - 스트림 상태
     * @returns {boolean} 성공 여부
     */
    async _finalizeStreamLoading(streamState) {
        // 데이터 검증
        if (streamState.replayDataArray.length === 0) {
            console.error('[CLIENT-STREAM-ERROR] No events found in stream data')
            $('#replayContainer').hide()
            $('.progress-bar').hide()
            toast(trl('alert.noSessionData2'))
            return false
        }

        // 타임스탬프 순으로 정렬
        streamState.replayDataArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

        // 시간 범위 표시
        if (streamState.firstTimestamp && streamState.lastTimestamp) {
            $('#sessionPlayTimeRange').text(
                `${util.timestampToDateTime(streamState.firstTimestamp)} ~ ${util.timestampToDateTime(streamState.lastTimestamp)}`
            )
        }

        // Replayer가 아직 초기화되지 않았다면 지금 초기화
        if (!streamState.isReplayerInitialized) {
            await this.prepareReplay()
        }

        this.updateProgressBar()

        // 액션 마크 생성
        this.createActionMarks(this.actionList)

        // 오토스크롤 버튼 표시 및 툴팁 설정
        this._setupAutoScrollButton()

        return true
    }

    /**
     * 오토스크롤 버튼 설정
     */
    _setupAutoScrollButton() {
        $('#autoScrollBtn').show()

        tippy('#autoScrollBtn', {
            content: i18next.tns('common.msg.sReplayAutoScroll'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })
    }

    /**
     * 스트림 에러 처리
     * @param {Error} error - 에러 객체
     * @returns {boolean} 항상 false 반환
     */
    _handleStreamError(error) {
        console.error('========== [CLIENT STREAM ERROR] ==========')
        console.error('[CLIENT-STREAM-ERROR] Stream loading failed:', error)
        console.error('[CLIENT-STREAM-ERROR] Error message:', error.message)
        console.error('[CLIENT-STREAM-ERROR] Error stack:', error.stack)
        console.error('========== [CLIENT STREAM ERROR END] ==========')
        
        this.showError(`스트림 데이터 로드 중 오류가 발생했습니다: ${error.message}`)
        this.disableReplayControls()
        
        return false
    }

    /**
     * 점진적 재생을 위한 Replayer 초기화
     * 스트림 데이터를 받는 중에 호출되어 즉시 재생 가능하도록 함
     */
    async initializeProgressiveReplayer() {
        try {
            if (!this.sessionData || !this.sessionData.events || this.sessionData.events.length === 0) {
                return
            }

            const $popup = $('#' + this.id + '__popup')
            const $replayContainer = $popup.find('.replay-container')
            const $replayWrapper = $replayContainer.find('.replay-wrapper')

            if ($replayContainer.length === 0) {
                return
            }

            // 기존 재생기가 있다면 제거
            this.destroyReplayer()

            const metaEvent = this.sessionData.events.find(e => e.type === 4)
            const origW = metaEvent?.data?.width
            const origH = metaEvent?.data?.height

            // 세션 리플레이 관련 CORS 및 sandbox 에러 필터링
            this._setupErrorFiltering()

            // rrweb.Replayer 인스턴스 생성
            this.replayer = new rrweb.Replayer(this.sessionData.events, {
                root: $replayWrapper[0],
                target: $replayWrapper[0],
                mouseTail: {
                    duration: MaxySessionReplayPopup.CONSTANTS.MOUSE_TAIL_DURATION,
                    lineCap: 'round',
                    lineWidth: MaxySessionReplayPopup.CONSTANTS.MOUSE_TAIL_WIDTH,
                    strokeStyle: MaxySessionReplayPopup.CONSTANTS.MOUSE_TAIL_COLOR
                },
                showMouseInteraction: true,
                speed: 1,
                skipInactive: false,
                blockClass: 'rr-block',
                ignoreClass: 'rr-ignore',
                maskTextClass: 'rr-mask',
                maskTextSelector: '*',
                insertStyleRules: [
                    `* { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; 
                    }`,
                    `@font-face { font-display: swap; }`,
                    `.rr-block { display: none !important; }`
                ],
                liveMode: true
            })

            // 재생 완료 이벤트 리스너 등록
            this.replayer.on('finish', () => {
                this.onReplayFinished()
            })

            // 화면 크기 조정 함수
            const fitWrapperToContainer = () => {
                const container = document.querySelector('.replay-container')
                const wrapper = container?.querySelector('.replay-wrapper')

                if (container && wrapper && origW && origH) {
                    const scale = Math.min(
                        container.clientWidth / origW,
                        container.clientHeight / origH
                    )

                    wrapper.style.width = origW + 'px'
                    wrapper.style.height = origH + 'px'
                    wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`
                }
            }

            fitWrapperToContainer()
            window.addEventListener('resize', fitWrapperToContainer)
            this._windowResizeHandler = fitWrapperToContainer

            // 재생 준비 완료
            this.isPlaying = false
            this.isPaused = false
            this.currentTime = 0
            this.replayStartTime = null

            return true
        } catch (error) {
            console.error('점진적 재생기 초기화 오류:', error)
            throw error
        }
    }

    // ==================== 액션 마크 관련 메서드 ====================

    /**
     * 프로그레스 바에 액션 마크를 생성합니다
     * @param {Array} actionList - 액션 리스트 데이터
     */
    createActionMarks(actionList) {
        if (!actionList?.length || this.totalDuration === 0) return

        const $progressBar = $('#' + this.id + '__popup').find('.progress-bar')
        $progressBar.find('.action-mark').remove()

        actionList.forEach((action, index) => {
            if (!action.actionTm) return

            const actionTime = typeof action.actionTm === 'string' ? parseInt(action.actionTm) : action.actionTm
            const position = Math.max(0, Math.min(100, (actionTime / this.totalDuration) * 100))

            // 액션 타입 결정
            const logTypeDetail = getLogTypeDetail(action.logType)
            let actionType = 'other'
            if (logTypeDetail) {
                const lowerType = logTypeDetail.toLowerCase()
                if (lowerType.includes('error')) actionType = 'error'
                else if (lowerType === 'click') actionType = 'click'
            }

            // 액션 마크 엘리먼트 생성
            const $actionMark = $(`<div class="action-mark ${actionType}" data-action-index="${index}" data-action-time="${actionTime}"></div>`)
            $actionMark.css('left', position + '%')

            // 프로그레스 바에 추가
            $progressBar.append($actionMark)
        })
    }

    /**
     * 액션 리스트 행 클릭 이벤트 처리
     * @param {Object} row - 클릭된 Tabulator 행 객체
     */
    onActionRowClick(row) {
        const rowData = row.getData()
        if (!rowData || (!rowData.actionTm && rowData.actionTm !== 0)) return

        // actionTm은 이미 세션 시작 시간 기준의 상대적 시간 (밀리초)
        const actionTime = typeof rowData.actionTm === 'string' ? parseInt(rowData.actionTm) : rowData.actionTm
        // 해당 액션 시간으로 시점 이동
        this.seekToTime(actionTime)
    }

    // ==================== 액션 테이블 관련 메서드 ====================

    /**
     * 액션 리스트 테이블을 생성합니다
     * @param {Array} actionList - 액션 리스트 데이터
     */
    createActionListTable(actionList) {
        try {
            if (!actionList || !Array.isArray(actionList)) {
                console.warn('액션 리스트 데이터가 없습니다.')
                return
            }

            // Tabulator 테이블 생성
            const v = this
            const table = new Tabulator("#actionListTable", {
                data: actionList,
                layout: "fitColumns",
                height: "100%",
                resizableColumns: true,
                movableColumns: true,
                selectable: 1,
                rowFormatter: function (row) {
                    const data = row.getData()
                    const logTypeDetail = getLogTypeDetail(data.logType)

                    if (logTypeDetail && logTypeDetail.toLowerCase().includes('error')) {
                        row.getElement().style.color = "red"
                    }
                },
                columns: [
                    {
                        width: "2%",
                        headerSort: false,
                        formatter: function (cell) {
                            if (typeof v.param.errorLogTm === 'undefined') return ''

                            const data = cell.getRow().getData()
                            if (v.param.errorLogTm === data.logTm) {
                                return `<img class="img_icon_pinpoint_red" alt="">`
                            }
                        }
                    },
                    {
                        title: "Time",
                        field: "actionTm",
                        width: "9%",
                        hozAlign: "left",
                        formatter: function (cell) {
                            return util.convertTime(cell.getValue(), false, false, true)
                        }
                    },
                    {
                        title: "Action",
                        field: "logType",
                        width: "15%",
                        vertAlign: "middle",
                        formatter: function (cell) {
                            const logTypeDetail = getLogTypeDetail(cell.getValue())
                            if (logTypeDetail.toLowerCase().includes('error')) {
                                return `<img class="img_icon_action_error" style="padding-right: 0.5em" alt="">${logTypeDetail}`
                            } else if (logTypeDetail.toLowerCase() === 'click') {
                                return `<img class="img_icon_action_click" style="padding-right: 0.5em" alt="">${logTypeDetail}`
                            } else {
                                return `<img class="img_icon_action_view_load" style="padding-right: 0.5em" alt="">${logTypeDetail}`
                            }
                        }
                    },
                    {
                        title: "Response Time",
                        field: "intervaltime",
                        width: "8%",
                        formatter: function (cell) {
                            if (!cell.getValue()) return '-'
                            return util.convertTime(cell.getValue(), false, false, true)
                        }
                    },
                    {
                        title: "Loading Time",
                        field: "loadingTime",
                        width: "8%",
                        formatter: function (cell) {
                            if (!cell.getValue()) return '-'
                            return util.convertTime(cell.getValue(), false, false, true)
                        }
                    },
                    {
                        title: "Event",
                        width: "58%",
                        headerSort: false,
                        formatter: function (cell) {
                            const data = cell.getRow().getData()
                            const logTypeDetail = getLogTypeDetail(data.logType)

                            if (logTypeDetail.toLowerCase().includes('error')) {
                                return `${logTypeDetail} [${data.resMsg}]`
                            } else if (logTypeDetail.toLowerCase() === 'click') {
                                return `${logTypeDetail} [${data.clickInfo.text}] on ${data.reqUrl}`
                            } else {
                                return `Load page [${data.reqUrl}]`
                            }
                        }
                    }
                ]
            })

            // 테이블 참조 저장 (나중에 정리할 때 사용)
            this.actionListTable = table

            // 행 클릭 이벤트 추가
            table.on("rowClick", function (e, row) {
                v.onActionRowClick(row)
            })

        } catch (error) {
            console.error('액션 리스트 테이블 생성 오류:', error)
        }
    }

    // ==================== 재생 제어 관련 메서드 ====================

    /**
     * 세션 리플레이 영상을 준비한 상태로 만들기 (rrweb.Replayer 인스턴스 생성)
     * loadSession에서 호출되어 재생 준비 완료 상태로 만듦
     */
    async prepareReplay() {
        try {
            if (!this.sessionData || !this.sessionData.events || this.sessionData.events.length === 0) {
                throw new Error('재생할 세션 데이터가 없습니다.')
            }

            const $popup = $('#' + this.id + '__popup')
            const $replayContainer = $popup.find('.replay-container')
            const $replayWrapper = $replayContainer.find('.replay-wrapper')

            if ($replayContainer.length === 0) {
                throw new Error('재생 컨테이너를 찾을 수 없습니다.')
            }

            // 기존 재생기가 있다면 제거
            this.destroyReplayer()

            const metaEvent = this.sessionData.events.find(e => e.type === 4)
            const origW = metaEvent?.data?.width
            const origH = metaEvent?.data?.height

            // 세션 리플레이 관련 CORS 및 sandbox 에러 필터링
            this._setupErrorFiltering()

            // rrweb.Replayer 인스턴스 생성 (재생 준비 상태)
            this.replayer = new rrweb.Replayer(this.sessionData.events, {
                root: $replayWrapper[0],
                target: $replayWrapper[0],
                mouseTail: {
                    duration: MaxySessionReplayPopup.CONSTANTS.MOUSE_TAIL_DURATION,
                    lineCap: 'round',
                    lineWidth: MaxySessionReplayPopup.CONSTANTS.MOUSE_TAIL_WIDTH,
                    strokeStyle: MaxySessionReplayPopup.CONSTANTS.MOUSE_TAIL_COLOR
                },
                showMouseInteraction: true,
                speed: 1,
                skipInactive: false,
                // CORS 및 보안 관련 설정 추가
                blockClass: 'rr-block',
                ignoreClass: 'rr-ignore',
                maskTextClass: 'rr-mask',
                maskTextSelector: '*',
                // 외부 리소스 로딩 시 에러 무시
                insertStyleRules: [
                    // 폰트 로딩 실패 시 fallback 설정
                    `* { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; 
                    }`,
                    // CORS 에러가 발생하는 외부 리소스 숨김
                    `@font-face { font-display: swap; }`,
                    // 스크립트 에러 관련 요소 숨김
                    `.rr-block { display: none !important; }`
                ]
            })

            // 재생 완료 이벤트 리스너 등록
            this.replayer.on('finish', () => {
                this.onReplayFinished()
            })

            // 화면 크기에 맞게 조정하는 함수
            function fitWrapperToContainer() {
                const container = document.querySelector('.replay-container')
                const wrapper = container?.querySelector('.replay-wrapper')

                if (container && wrapper && origW && origH) {
                    const scale = Math.min(
                        container.clientWidth / origW,
                        container.clientHeight / origH
                    )

                    wrapper.style.width = origW + 'px'
                    wrapper.style.height = origH + 'px'
                    wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`
                }
            }

            // canvas와 iframe 크기 변경에 따른 동적 조정 함수
            function adjustWrapperToContentSize() {
                const container = document.querySelector('.replay-container')
                const wrapper = container?.querySelector('.replay-wrapper')
                const replayerWrapper = wrapper?.querySelector('.replayer-wrapper')

                if (!container || !wrapper || !replayerWrapper) {
                    return
                }

                // .replayer-wrapper 내부의 canvas 또는 iframe 요소 찾기
                const canvas = replayerWrapper.querySelector('canvas')
                const iframe = replayerWrapper.querySelector('iframe')
                const contentElement = canvas || iframe

                if (!contentElement) {
                    return
                }

                // 실제 콘텐츠 크기 가져오기
                const contentWidth = contentElement.offsetWidth || contentElement.width
                const contentHeight = contentElement.offsetHeight || contentElement.height

                if (contentWidth && contentHeight) {
                    // 컨테이너 크기에 맞는 스케일 계산
                    const scale = Math.min(
                        container.clientWidth / contentWidth,
                        container.clientHeight / contentHeight
                    )

                    // wrapper 크기를 콘텐츠 크기로 설정
                    wrapper.style.width = contentWidth + 'px'
                    wrapper.style.height = contentHeight + 'px'

                    // 중앙 정렬과 스케일 적용
                    wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`
                }
            }

            // ResizeObserver로 canvas/iframe 크기 변경 감지
            let resizeObserver = null

            function setupContentResizeObserver() {
                const wrapper = document.querySelector('.replay-wrapper')
                const replayerWrapper = wrapper?.querySelector('.replayer-wrapper')

                if (!replayerWrapper) {
                    // .replayer-wrapper가 아직 생성되지 않았다면 잠시 후 다시 시도
                    setTimeout(setupContentResizeObserver, 100)
                    return
                }

                // 기존 observer 정리
                if (resizeObserver) {
                    resizeObserver.disconnect()
                }

                // ResizeObserver 생성
                resizeObserver = new ResizeObserver((entries) => {
                    for (let entry of entries) {
                        // canvas 또는 iframe 요소의 크기가 변경되었을 때
                        if (entry.target.tagName === 'CANVAS' || entry.target.tagName === 'IFRAME') {
                            adjustWrapperToContentSize()
                        }
                    }
                })

                // canvas와 iframe 요소 감지 및 관찰 시작
                function observeContentElements() {
                    const canvas = replayerWrapper.querySelector('canvas')
                    const iframe = replayerWrapper.querySelector('iframe')

                    if (canvas) {
                        resizeObserver.observe(canvas)
                    }
                    if (iframe) {
                        resizeObserver.observe(iframe)
                    }

                    // 요소가 아직 없다면 잠시 후 다시 시도
                    if (!canvas && !iframe) {
                        setTimeout(observeContentElements, 100)
                    }
                }

                observeContentElements()
            }

            // 초기 실행 + 리사이즈 대응
            fitWrapperToContainer()
            window.addEventListener('resize', fitWrapperToContainer)

            // 콘텐츠 크기 변경 감지 시작
            setupContentResizeObserver()

            // 정리 함수를 인스턴스에 저장 (나중에 cleanup에서 사용)
            this._resizeObserver = resizeObserver
            this._windowResizeHandler = fitWrapperToContainer

            // 재생 준비 완료 상태로 설정
            this.isPlaying = false
            this.isPaused = false
            this.currentTime = 0
            this.replayStartTime = null

            return true
        } catch (error) {
            console.error('세션 리플레이 준비 오류:', error)
            this.destroyReplayer()
            throw error
        }
    }

    /**
     * 세션리플레이 재생
     */
    startReplay() {
        try {
            if (!this.replayer) {
                this.showError('세션 리플레이가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.')
                return false
            }

            // 재생이 완료된 상태인지 확인 (현재 시간이 총 길이와 같거나 거의 같은 경우)
            const isFinished = this.currentTime >= this.totalDuration - MaxySessionReplayPopup.CONSTANTS.REPLAY_FINISH_THRESHOLD

            if (isFinished) {
                // 재생 완료 후 재생 버튼을 누르면 처음부터 다시 시작
                return this.restartReplay()
            }

            // 이미 재생기가 있고 일시정지 상태라면 재개
            if (this.replayer && this.isPaused && !isFinished) {
                return this.resumeReplay()
            }

            const $popup = $('#' + this.id + '__popup')
            const $replayContainer = $popup.find('.replay-container')

            this.hidePlayIcon()

            // 현재 위치에서 재생 시작 (이미 준비된 replayer 사용)
            if (this.currentTime > 0) {
                this.replayer.play(this.currentTime)
            } else {
                this.replayer.play()
            }

            this.isPlaying = true
            this.isPaused = false
            $replayContainer.addClass('playing')

            // 재생 시작 시간 기록 (현재 위치 고려)
            this.replayStartTime = Date.now() - this.currentTime

            // 진행 상황 업데이트 시작
            this.startProgressTracking()

            return true

        } catch (error) {
            console.error('재생 시작 오류:', error)
            this.showError(`재생 중 오류가 발생했습니다: ${error.msg}`)
            return false
        }
    }

    /**
     * 세션리플레이 처음부터 다시 재생 (재생 완료 후 재생 버튼 클릭 시)
     */
    restartReplay() {
        try {
            if (!this.replayer) {
                this.showError('세션 리플레이가 준비되지 않았습니다.')
                return false
            }

            const $popup = $('#' + this.id + '__popup')
            const $replayContainer = $popup.find('.replay-container')

            this.hidePlayIcon()

            // 처음부터 재생 시작
            this.currentTime = 0
            this.replayer.play(0)

            this.isPlaying = true
            this.isPaused = false
            $replayContainer.addClass('playing')

            // 재생 시작 시간 기록
            this.replayStartTime = Date.now()

            // 진행 상황 업데이트 시작
            this.startProgressTracking()

            return true

        } catch (error) {
            console.error('재생 재시작 오류:', error)
            this.showError(`재생 재시작 중 오류가 발생했습니다: ${error.msg}`)
            return false
        }
    }

    /**
     * 세션리플레이 일시정지 재생시작
     */
    resumeReplay() {
        if (this.replayer && this.isPaused) {
            try {
                // 현재 위치에서 재생 재개
                if (this.currentTime > 0) {
                    this.replayer.play(this.currentTime)
                } else {
                    this.replayer.play()
                }

                this.isPlaying = true
                this.isPaused = false

                const $popup = $('#' + this.id + '__popup')
                const $replayContainer = $popup.find('.replay-container')
                $replayContainer.addClass('playing')
                this.hidePlayIcon()

                // 일시정지 상태에서 재개할 때 시간 조정
                this.replayStartTime = Date.now() - this.currentTime

                // 진행 상황 추적 재시작
                this.startProgressTracking()

                return true
            } catch (error) {
                console.error('재생 재개 오류:', error)
                this.showError('재생 재개 중 오류가 발생했습니다.')
                return false
            }
        }
        return false
    }

    /**
     * 세션리플레이 일시정지
     */
    pauseReplay() {
        if (this.replayer && this.isPlaying && !this.isPaused) {
            try {
                this.replayer.pause()
                this.isPlaying = false
                this.isPaused = true

                const $popup = $('#' + this.id + '__popup')
                const $replayContainer = $popup.find('.replay-container')
                $replayContainer.removeClass('playing')
                this.showPlayIcon()

                // 진행 상황 추적 중지
                this.stopProgressTracking()
            } catch (error) {
                console.error('일시정지 오류:', error)
                this.showError('일시정지 중 오류가 발생했습니다.')
            }
        }
    }

    // ==================== 진행 상황 추적 관련 메서드 ====================



    /**
     * 진행 상황 추적 인터벌 시작 (100ms마다 진행바 업데이트)
     */
    startProgressTracking() {
        this.stopProgressTracking() // 기존 인터벌 정리

        if (!this.replayer || this.totalDuration === 0) {
            return
        }

        this.progressUpdateInterval = setInterval(() => {
            if (this.replayer && this.isPlaying && !this.isPaused) {
                this.updateProgressBar()
            }
        }, MaxySessionReplayPopup.CONSTANTS.PROGRESS_UPDATE_INTERVAL)
    }

    /**
     * 진행 상황 추적 인터벌 중지
     */
    stopProgressTracking() {
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval)
            this.progressUpdateInterval = null
        }
    }

    /**
     * 현재 재생 시간을 기반으로 진행바와 액션 상태 업데이트
     */
    updateProgressBar() {
        if (!this.replayer || this.totalDuration === 0) return

        // 현재 시간 계산
        let currentTime = typeof this.replayer.getCurrentTime === 'function' 
            ? this.replayer.getCurrentTime()
            : Date.now() - (this.replayStartTime || Date.now())

        this.currentTime = currentTime
        const progressPercent = Math.min((currentTime / this.totalDuration) * 100, 100)

        const $popup = $('#' + this.id + '__popup')
        $popup.find('#progressFill').css('width', progressPercent + '%')

        this.updateActionProgress(currentTime)
    }

    /**
     * 현재 진행 시간에 따라 액션 리스트의 진행 상태를 업데이트합니다
     * @param {number} currentTime - 현재 재생 시간 (밀리초)
     */
    updateActionProgress(currentTime) {
        if (!this.actionListTable || !this.actionList?.length) return

        let currentActionIndex = -1
        const rows = this.actionListTable.getRows()

        // 각 액션의 진행 상태 확인 및 업데이트
        this.actionList.forEach((action, index) => {
            if (!action.actionTm && action.actionTm !== 0) return

            // actionTm은 세션 시작 시간 기준의 상대적 시간 (밀리초)
            const actionTime = typeof action.actionTm === 'string' ? parseInt(action.actionTm) : action.actionTm

            // 테이블에서 해당 행 찾기
            const rowElement = rows[index]?.getElement()
            if (!rowElement) return

            // 현재 시간이 액션 시간을 지났는지 확인 (둘 다 상대적 시간으로 비교)
            const isCompleted = currentTime >= actionTime
            // 완료된 액션으로 표시
            rowElement.classList.toggle('action-completed', isCompleted)

            // 가장 최근에 완료된 액션 인덱스 저장
            if (isCompleted) currentActionIndex = index
        })

        // 오토스크롤
        if (currentActionIndex !== this.lastActionIndex && this.autoScrollEnabled) {
            this.lastActionIndex = currentActionIndex
            this.scrollToActionRow(currentActionIndex)
        }
    }

    /**
     * 액션 리스트 테이블을 특정 행으로 스크롤합니다
     * @param {number} rowIndex - 스크롤할 행의 인덱스
     */
    scrollToActionRow(rowIndex) {
        const row = this.actionListTable?.getRows()[rowIndex]
        if (row) this.actionListTable.scrollToRow(row, 'center', true)
    }

    // ==================== 시점 이동 및 재생 완료 관련 메서드 ====================

    /**
     * param.playStartTm 값을 기준으로 해당 시점으로 이동
     */
    seekToTargetTime() {
        if (!this.param.playStartTm || !this.replayer || this.totalDuration === 0) return

        const targetTimestamp = typeof this.param.playStartTm === 'string' 
            ? parseInt(this.param.playStartTm) 
            : this.param.playStartTm
        const sessionStartTimestamp = typeof this.sessionStartTm === 'string' 
            ? parseInt(this.sessionStartTm) 
            : this.sessionStartTm

        // playStartTm이 sessionStartTm보다 이전이면 처음부터 시작
        if (targetTimestamp <= sessionStartTimestamp) return

        // 상대적 시간 계산 (밀리초)
        const relativeTime = targetTimestamp - sessionStartTimestamp
        // 총 재생 시간을 초과하지 않도록 제한
        const targetTime = Math.min(relativeTime, this.totalDuration)

        // 해당 시점으로 이동
        this.seekToTime(targetTime)
    }

    /**
     * 특정 시점으로 재생 위치 이동 (진행바 클릭 또는 액션 클릭 시 호출)
     * @param {number} targetTime - 이동할 목표 시간 (밀리초)
     */
    seekToTime(targetTime) {
        if (!this.replayer || this.totalDuration === 0) return

        // 현재 재생 상태 저장
        const wasPlaying = this.isPlaying && !this.isPaused
        const $popup = $('#' + this.id + '__popup')

        // 목표 시간으로 이동
        this.replayer.play(targetTime)
        this.currentTime = targetTime
        this.replayStartTime = Date.now() - targetTime

        // UI 업데이트
        const progressPercent = Math.min((targetTime / this.totalDuration) * 100, 100)
        $popup.find('#progressFill').css('width', progressPercent + '%')
        this.updateActionProgress(targetTime)

        // 일시정지 상태였다면 다시 일시정지
        if (!wasPlaying) {
            this.replayer.pause()
            this.isPlaying = false
            this.isPaused = true
            $popup.find('.replay-container').removeClass('playing')
            this.showPlayIcon()
            this.stopProgressTracking()
        }
    }

    /**
     * 재생 완료 시 호출되는 콜백 함수 - UI 상태를 완료 상태로 변경
     */
    onReplayFinished() {
        this.isPlaying = false
        this.isPaused = false
        this.stopProgressTracking()

        // 재생 완료 시 현재 시간을 총 길이로 설정
        this.currentTime = this.totalDuration

        const $popup = $('#' + this.id + '__popup')
        const $replayContainer = $popup.find('.replay-container')
        const $progressFill = $popup.find('#progressFill')

        $replayContainer.removeClass('playing')
        $progressFill.css('width', '100%')
        this.showPlayIcon()
    }

    // ==================== UI 상태 관리 관련 메서드 ====================

    /**
     * 재생 컨트롤 활성화/비활성화
     */
    enableReplayControls() {
        $('#' + this.id + '__popup').find('.replay-container')
            .addClass('clickable').removeClass('not-clickable')
    }

    disableReplayControls() {
        $('#' + this.id + '__popup').find('.replay-container')
            .addClass('not-clickable').removeClass('clickable')
        this.hidePlayIcon()
    }

    /**
     * 재생 아이콘 표시/숨김
     */
    showPlayIcon() {
        $('#' + this.id + '__popup').find('.replay-container .play-icon').show()
    }

    hidePlayIcon() {
        $('#' + this.id + '__popup').find('.replay-container .play-icon').hide()
    }

    /**
     * 팝업 초기 UI 상태 설정 (진행바 0%, 컨트롤 비활성화 등)
     */
    setInitialUIState() {
        const $popup = $('#' + this.id + '__popup')
        $popup.find('#progressFill').css('width', '0%')
        // 기존 액션 마크 제거
        $popup.find('.progress-bar .action-mark').remove()
        // 액션 진행 상태 초기화
        this.resetActionProgress()
        // 초기 상태에서는 replayContainer 클릭 비활성화
        $popup.find('.replay-container').addClass('not-clickable').removeClass('clickable')
        this.hidePlayIcon()
    }

    // ==================== 정리 및 메모리 관리 관련 메서드 ====================

    /**
     * rrweb 재생기 인스턴스 정리 및 관련 UI 상태 초기화
     */
    destroyReplayer() {
        if (this.replayer) {
            try {
                if (typeof this.replayer.destroy === 'function') {
                    this.replayer.destroy()
                } else if (typeof this.replayer.pause === 'function') {
                    this.replayer.pause()
                }
            } catch (error) {
                console.warn('Error destroying replayer:', error)
            } finally {
                this.replayer = null
                // 재생기 정리 시 UI 상태 초기화
                const $popup = $('#' + this.id + '__popup')
                const $replayContainer = $popup.find('.replay-container')
                $replayContainer.removeClass('playing')
                this.hidePlayIcon()
            }
        }
    }

    /**
     * 액션 리스트의 진행 상태를 초기화합니다
     */
    resetActionProgress() {
        if (!this.actionListTable) {
            return
        }

        try {
            // 모든 행에서 완료 상태 클래스 제거
            const rows = this.actionListTable.getRows()
            rows.forEach(row => {
                const rowElement = row.getElement()
                if (rowElement.classList.contains('action-completed')) {
                    rowElement.classList.remove('action-completed')
                }
            })
        } catch (error) {
            console.warn('Action progress reset error:', error)
        }
    }

    /**
     * 팝업 닫기 전 모든 리소스 정리 (재생기, 테이블, 이벤트 리스너, 상태 등)
     */
    cleanupBeforeClose() {
        try {
            this.stopProgressTracking()
            this.destroyReplayer()

            // 액션 리스트 테이블 정리
            if (this.actionListTable) {
                this.actionListTable.destroy()
                this.actionListTable = null
            }

            // 액션 마크 정리
            const $popup = $('#' + this.id + '__popup')
            $popup.find('.progress-bar .action-mark').remove()

            // ResizeObserver 정리
            if (this._resizeObserver) {
                this._resizeObserver.disconnect()
                this._resizeObserver = null
            }

            // window resize 이벤트 리스너 정리
            if (this._windowResizeHandler) {
                window.removeEventListener('resize', this._windowResizeHandler)
                this._windowResizeHandler = null
            }

            // 에러 필터링 해제
            this._restoreOriginalConsoleMethods()

            $(document).off('keydown.sessionReplayPopup')
            this.isPlaying = false
            this.isPaused = false
            this.sessionData = null
            this.actionList = null
            this.totalDuration = 0
            this.currentTime = 0
            this.replayStartTime = null

        } catch (error) {
            console.error('정리 작업 중 오류 발생:', error)
        }
    }

    /**
     * 에러 메시지를 모달로 표시하고 팝업 닫기 옵션 제공
     * @param {string} message - 표시할 에러 메시지
     */
    showError(message) {
        console.error('ERROR:', message)

        modal.show({
            id: 'sessionReplayError',
            msg: message,
            fn: () => {
                this.closePopup()
            }
        })
    }

    /**
     * 세션 리플레이 관련 불필요한 콘솔 에러 필터링 설정
     * 고객사에서 세션 재생 시 발생하는 CORS, sandbox 관련 에러들을 숨김
     */
    _setupErrorFiltering() {
        // 이미 필터링이 설정되어 있으면 중복 설정 방지
        if (this._errorFilteringActive) {
            return
        }

        // 기존 console 메서드들 백업
        this._originalConsoleError = console.error
        this._originalConsoleWarn = console.warn

        // 필터링할 에러 패턴들 (세션 리플레이 관련)
        const errorPatternsToFilter = [
            // Sandbox 관련 에러
            /Blocked script execution.*sandboxed.*allow-scripts/i,
            /document's frame is sandboxed/i,

            // CORS 관련 에러
            /Access to .* has been blocked by CORS policy/i,
            /No 'Access-Control-Allow-Origin' header/i,
            /CORS policy: Cross origin requests/i,

            // 폰트 로딩 관련 에러
            /GET.*\.(woff2?|ttf|eot).*net::ERR_FAILED/i,
            /Failed to load resource.*\.(woff2?|ttf|eot)/i,

            // 기타 외부 리소스 관련 에러
            /Mixed Content.*was loaded over HTTPS/i,
            /Refused to load.*because it violates.*Content Security Policy/i,

            // rrweb 관련 알려진 에러들
            /rrweb.*cross-origin/i,
            /replayer.*blocked/i
        ]

        // console.error 오버라이드
        console.error = (...args) => {
            const errorMessage = args.join(' ')

            // 필터링 대상 에러인지 확인
            const shouldFilter = errorPatternsToFilter.some(pattern =>
                pattern.test(errorMessage)
            )

            // 필터링 대상이 아닌 경우에만 원본 console.error 호출
            if (!shouldFilter) {
                this._originalConsoleError.apply(console, args)
            }
        }

        // console.warn도 동일하게 필터링 (일부 브라우저에서 warn으로 출력되는 경우)
        console.warn = (...args) => {
            const warnMessage = args.join(' ')

            const shouldFilter = errorPatternsToFilter.some(pattern =>
                pattern.test(warnMessage)
            )

            if (!shouldFilter) {
                this._originalConsoleWarn.apply(console, args)
            }
        }

        // 필터링 활성화 플래그 설정
        this._errorFilteringActive = true

        // 전역 에러 이벤트도 필터링
        this._setupGlobalErrorFiltering(errorPatternsToFilter)
    }

    /**
     * 전역 에러 이벤트 필터링 설정
     * @param {Array} errorPatternsToFilter - 필터링할 에러 패턴 배열
     */
    _setupGlobalErrorFiltering(errorPatternsToFilter) {
        // 기존 error 이벤트 리스너 백업
        this._originalErrorHandler = window.onerror

        // 전역 error 이벤트 필터링
        const filteredErrorHandler = (message, source, lineno, colno, error) => {
            const errorString = `${message} ${source || ''}`

            const shouldFilter = errorPatternsToFilter.some(pattern =>
                pattern.test(errorString)
            )

            // 필터링 대상이 아닌 경우에만 원본 핸들러 호출
            if (!shouldFilter && this._originalErrorHandler) {
                return this._originalErrorHandler(message, source, lineno, colno, error)
            }

            // 필터링된 에러는 처리된 것으로 간주
            return shouldFilter
        }

        window.onerror = filteredErrorHandler

        // unhandledrejection 이벤트도 필터링
        this._unhandledRejectionHandler = (event) => {
            const errorString = event.reason ? event.reason.toString() : ''

            const shouldFilter = errorPatternsToFilter.some(pattern =>
                pattern.test(errorString)
            )

            if (shouldFilter) {
                event.preventDefault() // 필터링된 에러는 기본 처리 방지
            }
        }

        window.addEventListener('unhandledrejection', this._unhandledRejectionHandler)
    }

    /**
     * 원본 console 메서드들과 전역 에러 핸들러 복원
     */
    _restoreOriginalConsoleMethods() {
        if (!this._errorFilteringActive) {
            return
        }

        try {
            // console 메서드들 복원
            if (this._originalConsoleError) {
                console.error = this._originalConsoleError
                this._originalConsoleError = null
            }

            if (this._originalConsoleWarn) {
                console.warn = this._originalConsoleWarn
                this._originalConsoleWarn = null
            }

            // 전역 에러 핸들러 복원
            if (this._originalErrorHandler !== undefined) {
                window.onerror = this._originalErrorHandler
                this._originalErrorHandler = undefined
            }

            // unhandledrejection 이벤트 리스너 제거
            if (this._unhandledRejectionHandler) {
                window.removeEventListener('unhandledrejection', this._unhandledRejectionHandler)
                this._unhandledRejectionHandler = null
            }

            // 필터링 비활성화
            this._errorFilteringActive = false

        } catch (error) {
            // 복원 중 에러가 발생해도 원본 console.error로 로그 (무한 루프 방지)
            if (this._originalConsoleError) {
                this._originalConsoleError('에러 필터링 복원 중 오류:', error)
            }
        }
    }

    /**
     * 세션 재생 팝업 열기 - dimmed 배경과 팝업 표시
     */
    async openPopup() {
        // 세션 재생 전용 dimmed 표시
        $('.s_replay_dimmed').show()

        const $target = $('#' + this.id + '__popup')
        $target.show()
    }

    /**
     * 세션 재생 팝업 닫기 - 모든 리소스 정리 후 팝업 및 dimmed 숨김
     */
    closePopup() {
        const popup = '#' + this.id + '__popup'
        const span = popup + ' span'
        const $sessionReplayDimmed = $('.s_replay_dimmed')
        const $popup = $(popup)

        // 세션 리스트 테이블 정리
        if (this.actionListTable) {
            this.actionListTable.destroy()
            this.actionListTable = null
        }

        // 재생기 정리
        this.cleanupBeforeClose()

        $(span).text('')
        $sessionReplayDimmed.off('click')
        $sessionReplayDimmed.hide()
        $popup.hide()

        // 팝업 닫을 때 커서가 보이면 없애주도록
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    }
}
