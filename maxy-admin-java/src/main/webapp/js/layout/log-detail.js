/**
 * 로그 상세 정보를 처리하고 표시하는 LogDetail 클래스
 * 다양한 유형의 로그(오류, 충돌 등)를 처리하고 UI에 표시합니다
 */
class LogDetail {
    /**
     * LogDetail 생성자
     * @param {Object} props - LogDetail의 속성
     * @param {string} props.id - 컨테이너 요소의 ID
     * @param {string|number} props.logType - 로그 유형
     * @param {string} props.osType - OS 유형 (iOS, Android 등)
     * @param {string|Object} props.content - 로그 내용
     * @param {Object} props.mappedErrorStack - 소스맵 매핑 스택
     */
    constructor(props) {
        this.$wrap = $('#' + props.id);
        this.logType = props.logType;
        this.osType = props.osType;
        this.content = props.content;
        this.mappedErrorStack = props.mappedErrorStack;

        // SourceMapHandler 인스턴스 생성
        this.sourceMapHandler = new SourceMapHandler();

        this.init().then(() => {
            this.setData();
        });
    }

    /**
     * 로그 유형에 따라 UI 초기화
     * @returns {Promise<void>}
     */
    async init() {
        const {$wrap} = this;
        const isErrorOrCrash = this.isErrorOrCrash();

        if (!isErrorOrCrash) {
            // 오류/충돌이 아닌 로그의 경우, 상세 래퍼를 숨기고 메시지 래퍼를 표시
            $wrap.find('.popup_log_type_detail_wrap').hide();
            $wrap.find('.log_res_msg_wrap').show();
        } else {
            // 오류/충돌 로그의 경우, 상세 래퍼를 표시하고 메시지 래퍼를 숨김
            $wrap.find('.popup_log_type_detail_wrap').css('display', 'flex');
            $wrap.find('.log_res_msg_wrap').hide();
        }
    }

    /**
     * 로그 유형이 오류 또는 충돌인지 확인
     * @returns {boolean} 로그 유형이 오류 또는 충돌이면 true
     */
    isErrorOrCrash() {
        return util.isError(this.logType) || util.isCrash(this.logType);
    }

    /**
     * 로그 유형 및 내용에 따라 UI에 데이터 설정
     */
    setData() {
        const {$wrap} = this;
        $wrap.removeClass('no_data');

        if (!this.isErrorOrCrash()) {
            this.setNormalLogData();
        } else {
            this.setErrorOrCrashLogData();
        }
    }

    /**
     * 일반(오류/충돌이 아닌) 로그에 대한 데이터 설정
     */
    setNormalLogData() {
        const {$wrap, content} = this;
        const $txtarea = $wrap.find('#pResMsg');

        // 내용이 비어 있으면 no_data로 표시하고 반환
        if (util.isEmpty(content)) {
            $wrap.addClass('no_data');
            $txtarea.val('');
            return
        }

        // 유형(JSON 또는 일반 텍스트)에 따라 내용 형식 지정
        if (util.isJSONString(content)) {
            $txtarea.val(util.beautifyJson(content));
        } else {
            $txtarea.val(util.convertToNewlines(content));
        }
    }

    /**
     * 오류 또는 충돌 로그에 대한 데이터 설정
     */
    setErrorOrCrashLogData() {
        const {osType, logType, content, mappedErrorStack} = this;

        // 오류/충돌 로그에 대한 카테고리 설정
        this.setCategory();

        const $logDetailFullText = $('#logDetailFullText');
        const $logDetailSourceMap = $('#logDetailSourceMap')
        $logDetailFullText.val('');
        $logDetailFullText.closest('.log_type_details').show()
        $logDetailSourceMap.closest('.log_type_details').hide()

        if (util.isCrash(logType)) {
            if (typeof content === 'string') {
                const formattedMsg = util.convertToNewlines(content);
                $logDetailFullText.val(formattedMsg);
                this.setExceptionType(osType, logType, formattedMsg);
            } else {
                this.handleObjectContent(content, $logDetailFullText);
            }
        } else {
            const formattedMsg = util.convertToNewlines(content);
            $logDetailFullText.val(formattedMsg);
            this.setExceptionType(osType, logType, formattedMsg);

            // source map 매핑 데이터가 있으면 (fulltext 부분 숨기고 매핑데이터 보여주기)
            if(!util.isEmpty(mappedErrorStack)) {
                $logDetailFullText.closest('.log_type_details').hide()
                $logDetailSourceMap.closest('.log_type_details').show()
                this.handleSourceMapContent(mappedErrorStack, $logDetailSourceMap);
            }
        }
    }

    /**
     * 오류/충돌 로그에 대한 객체 내용 처리
     * @param {Object} content - 내용 객체
     * @param {jQuery} $logDetailFullText - 로그 상세 텍스트를 위한 jQuery 요소
     */
    handleObjectContent(content, $logDetailFullText) {
        const {osType, logType} = this;

        if (!content) {
            console.log('content is null');
            this.setExceptionType(osType, logType, null);
            return;
        }

        const {prime} = content;
        this.setExceptionType(osType, logType, prime);

        if (!prime) {
            console.log('not allowed data', content);
            return;
        }

        $logDetailFullText.val(prime);
    }

    /**
     * 오류 로그에 대한 소스맵 로그 내용 처리
     * @param {Object} mappedErrorStack - 내용 객체
     */
    handleSourceMapContent(mappedErrorStack, $logDetailFullText) {
        // SourceMapHandler를 사용하여 처리
        this.sourceMapHandler.handle(
            mappedErrorStack,
            $logDetailFullText,
            () => {},
            (error) => {
                // 에러 콜백
                console.error('Failed to render stack trace:', error);
            }
        );
    }

    /**
     * 로그 유형에 따라 카테고리 설정
     */
    setCategory() {
        const {logType} = this;
        const category = util.cleanString(util.logTypeToCategory(logType));
        $('.category_wrap span').removeClass('active');
        $('.category_wrap span[data-category="' + category + '"]').addClass('active');
    }

    /**
     * UI에 예외 유형 및 메시지 설정
     * @param {string} osType - OS 유형
     * @param {string|number} logType - 로그 유형
     * @param {string} msg - 메시지 내용
     */
    setExceptionType(osType, logType, msg) {
        const $type = $('#pTypeError');
        const $msg = $('#pMessages');

        // 메시지가 없으면 필드를 지우고 반환
        if (!msg) {
            $type.text('');
            $msg.text('');
            return;
        }

        const lines = msg.split('\n');
        const line = lines[0];

        // 로그 유형에 따라 적절한 제목 설정
        this.setLogTypeTitle(logType, line);

        // 로그 유형 및 OS에 따라 유형 및 메시지 구문 분석 및 설정
        if (util.isError(logType)) {
            this.parseErrorLog(line, $type, $msg);
        } else if (util.isCrash(logType)) {
            this.parseCrashLog(osType, lines, line, $type, $msg);
        } else {
            // 알 수 없는 로그 유형에 대한 기본 케이스
            $type.text('Unknown');
            $msg.text(line);
        }
    }

    /**
     * 적절한 로그 유형 제목 설정
     * @param {string|number} logType - 로그 유형
     * @param {string} line - 메시지의 첫 번째 줄
     */
    setLogTypeTitle(logType, line) {
        const {$wrap} = this;
        $wrap.find('.log_type_details .log_type_detail_title').hide();

        if (util.isError(logType)) {
            const codeIndex = line.indexOf('[C]:');
            if (codeIndex !== -1) {
                // 오류 코드 제목 표시
                $wrap.find('.log_type_details div[data-log-type="code"]').show();
            } else {
                // 예외 유형 제목 표시
                $wrap.find('.log_type_details div[data-log-type="error"]').show();
            }
        } else {
            // 충돌 유형 제목 표시
            $wrap.find('.log_type_details div[data-log-type="crash"]').show();
        }
    }

    /**
     * 오류 로그를 구문 분석하고 유형 및 메시지 설정
     * @param {string} line - 메시지의 첫 번째 줄
     * @param {jQuery} $type - 유형을 위한 jQuery 요소
     * @param {jQuery} $msg - 메시지를 위한 jQuery 요소
     */
    parseErrorLog(line, $type, $msg) {
        const codeIndex = line.indexOf('[C]:');

        if (codeIndex !== -1) {
            // 오류 코드 형식 처리
            const type = line.substring(codeIndex + 4, line.length);
            const msg = line.substring(0, codeIndex);
            $type.text(type.trim());
            $msg.text(msg.trim());
        } else {
            // 표준 오류 형식 처리
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
                const type = line.substring(0, colonIndex);
                const msg = line.substring(colonIndex + 1);
                $type.text(type.trim());
                $msg.text(msg.trim());
            } else {
                $type.text('Unknown');
                $msg.text(line);
            }
        }
    }

    /**
     * 충돌 로그를 구문 분석하고 OS에 따라 유형 및 메시지 설정
     * @param {string} osType - OS 유형
     * @param {string[]} lines - 메시지의 줄들
     * @param {string} line - 메시지의 첫 번째 줄
     * @param {jQuery} $type - 유형을 위한 jQuery 요소
     * @param {jQuery} $msg - 메시지를 위한 jQuery 요소
     */
    parseCrashLog(osType, lines, line, $type, $msg) {
        if (osType === 'iOS') {
            this.parseIOSCrash(lines, line, $type, $msg);
        } else if (osType === 'Android') {
            this.parseAndroidCrash(line, $type, $msg);
        } else {
            // 알 수 없는 OS 유형에 대한 기본값
            $type.text('Unknown');
            $msg.text(line);
        }
    }

    /**
     * iOS 충돌 로그 구문 분석
     * @param {string[]} lines - 메시지의 줄들
     * @param {string} line - 메시지의 첫 번째 줄
     * @param {jQuery} $type - 유형을 위한 jQuery 요소
     * @param {jQuery} $msg - 메시지를 위한 jQuery 요소
     */
    parseIOSCrash(lines, line, $type, $msg) {
        if (lines.length <= 2) {
            $type.text('');
            $msg.text('');
        } else {
            const reasonIndex = lines[1].indexOf('Reason:');
            if (reasonIndex !== -1) {
                const type = lines[1].substring(reasonIndex + 'Reason:'.length);
                $type.text(type);
                $msg.text(line);
            } else {
                $type.text('Unknown');
                $msg.text(line);
            }
        }
    }

    /**
     * Android 충돌 로그 구문 분석
     * @param {string} line - 메시지의 첫 번째 줄
     * @param {jQuery} $type - 유형을 위한 jQuery 요소
     * @param {jQuery} $msg - 메시지를 위한 jQuery 요소
     */
    parseAndroidCrash(line, $type, $msg) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const type = line.substring(0, colonIndex);
            const msg = line.substring(colonIndex + 1);
            $type.text(type);
            $msg.text(msg);
        } else {
            $type.text('Unknown');
            $msg.text(line);
        }
    }
}