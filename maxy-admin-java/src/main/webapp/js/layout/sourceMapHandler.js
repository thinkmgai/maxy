/**
 * 소스맵 관련 로직을 처리하는 재사용 가능한 클래스
 * 스택 트레이스를 파싱하고 템플릿을 렌더링합니다
 */
class SourceMapHandler {
    // 정적 변수로 이벤트 리스너 등록 여부 추적
    static isEventListenerRegistered = false;

    /**
     * SourceMapHandler 생성자
     */
    constructor() {
        this.compiledTemplate = null;
        this.addEventListener();
    }

    addEventListener() {
        // 다국어 적용
        updateContent();

        // 전역 이벤트 리스너가 아직 등록되지 않았다면 등록
        if (!SourceMapHandler.isEventListenerRegistered) {
            this.registerGlobalEventListener();
            SourceMapHandler.isEventListenerRegistered = true;
        }
    }

    /**
     * 전역 이벤트 리스너 등록
     */
    registerGlobalEventListener() {
        document.addEventListener('click', function(e) {
            // 스택 트레이스 컨테이너 내부의 클릭인지 확인
            const stackTraceContainer = e.target.closest('.stack-trace-container');
            if (!stackTraceContainer) return;

            // 스택 프레임 헤더 클릭인지 확인
            const header = e.target.closest('.stack-frame-header');
            if (header) {
                // 이벤트 전파 중단
                e.stopPropagation();
                e.preventDefault();
                
                // 클릭된 헤더의 부모 프레임만 토글
                const frame = header.closest('.stack-frame');
                if (frame) {
                    frame.classList.toggle('expanded');
                }
            }
        });
    }

    /**
     * 소스맵 데이터를 처리하고 UI에 렌더링
     * @param {Object} mappedErrorStack - 매핑된 에러 스택 객체
     * @param {jQuery} $container - 렌더링할 컨테이너 요소
     * @param {Function} onSuccess - 성공 시 콜백 함수
     * @param {Function} onError - 에러 시 콜백 함수
     * @returns {Object} prime 값과 파싱된 프레임들
     */
    handle(mappedErrorStack, $container, onSuccess, onError) {
        if (!mappedErrorStack) {
            console.error('mappedErrorStack is null or undefined');
            if (onError) onError(new Error('Invalid mappedErrorStack'));
            return null;
        }

        const {prime} = mappedErrorStack;
        const frames = this.parseStackFrames(mappedErrorStack);

        this.renderStackTrace(frames, $container, onSuccess, onError).then(() => {
            return {prime, frames};
        });
    }

    /**
     * 스택 프레임들을 파싱
     * @param {Object} mappedErrorStack - 매핑된 에러 스택 객체
     * @returns {Array} 파싱된 스택 프레임 배열
     */
    parseStackFrames(mappedErrorStack) {
        const frames = [];
        
        for (let key in mappedErrorStack) {
            if (key === 'prime') continue; // prime 키는 스킵
            
            const frame = mappedErrorStack[key];

            const parsedFrame = this.parseStackFrame(frame);
            frames.push(parsedFrame);
        }

        return frames;
    }

    /**
     * 개별 스택 프레임 데이터 파싱
     * @param {Object} frame - 스택 프레임 객체
     * @returns {Object} 파싱된 프레임 정보
     */
    parseStackFrame(frame) {
        const result = {
            file: '',
            line: '',
            column: '',
            snippet: ''
        };

        if (!frame) return result;

        // ✅ value 있는 경우
        if (frame.value) {
            result.source = '';
            const lines = frame.value.split('\n');

            for (let line of lines) {
                if (line.startsWith('source:')) {
                    result.source = line.replace('source:', '').trim();
                    result.file = result.source.split(/[/\\]/).pop();
                } else if (line.startsWith('line:')) {
                    result.line = line.replace('line:', '').trim();
                } else if (line.startsWith('column:')) {
                    result.column = line.replace('column:', '').trim();
                }
            }

            const snippetIndex = frame.value.indexOf('snippet:');
            if (snippetIndex !== -1) {
                result.snippet = frame.value.substring(snippetIndex + 8).trim();
            }

            return result;
        }

        // raw만 있는 경우
        if (!frame.value && frame.raw) {
            result.raw = frame.raw;

            const match = frame.raw.match(/\(?(.+?):(\d+):(\d+)\)?$/);
            if (match) {
                result.file = match[1].split(/[/\\]/).pop();
                result.line = match[2];
                result.column = match[3];
            }
        }

        return result;
    }

    /**
     * 스택 트레이스 템플릿을 로드하고 렌더링
     * @param {Array} frames - 파싱된 스택 프레임 배열
     * @param {jQuery} $targetElement - 대상 요소 (textarea 또는 컨테이너)
     * @param {Function} onSuccess - 성공 시 콜백 함수
     * @param {Function} onError - 에러 시 콜백 함수
     */
    async renderStackTrace(frames, $targetElement, onSuccess, onError) {
        // 이미 컴파일된 템플릿이 있으면 재사용
        if (this.compiledTemplate) {
            this._renderWithTemplate(this.compiledTemplate, frames, $targetElement, onSuccess);
            return;
        }

        const source = await fetch('/templates/stackTrace.html').then(res => res.text())
        this.compiledTemplate = Handlebars.compile(source);
        this._renderWithTemplate(this.compiledTemplate, frames, $targetElement, onSuccess);
    }

    /**
     * 컴파일된 템플릿으로 렌더링 (내부 메서드)
     * @param {Function} compiledTemplate - 컴파일된 Handlebars 템플릿
     * @param {Array} frames - 파싱된 스택 프레임 배열
     * @param {jQuery} $targetElement - 대상 요소
     * @param {Function} onSuccess - 성공 시 콜백 함수
     * @private
     */
    _renderWithTemplate(compiledTemplate, frames, $targetElement, onSuccess) {
        const html = compiledTemplate({frames});
        const $container = $targetElement.parent();

        // 기존 스택 트레이스 컨테이너 제거
        $container.find('.stack-trace-container').remove();
        $container.find('style').remove()

        // textarea 숨기기
        $targetElement.hide();

        // 새로운 스택 트레이스 HTML 추가
        $container.append(html);

        // 높이 조정
        this.adjustStackTraceHeight($container);

        if (onSuccess) onSuccess();
    }

    /**
     * 스택 트레이스 컨테이너의 높이를 동적으로 조정
     * @param {jQuery} $container - 스택 트레이스를 포함하는 컨테이너
     */
    adjustStackTraceHeight($container) {
        const $stackTraceContainer = $container.find('.stack-trace-container');
        
        if ($stackTraceContainer.length === 0) return;

        // 부모 컨테이너의 높이 계산
        const containerHeight = $container.height();
        
        // 스택 트레이스 컨테이너에 최대 높이 설정
        if (containerHeight > 0) {
            $stackTraceContainer.css('max-height', containerHeight + 'px');
        }

        // 윈도우 리사이즈 시 높이 재조정
        $(window).off('resize.stackTrace').on('resize.stackTrace', () => {
            const newHeight = $container.height();
            if (newHeight > 0) {
                $stackTraceContainer.css('max-height', newHeight + 'px');
            }
        });
    }

    /**
     * 템플릿 캐시 초기화
     */
    clearTemplateCache() {
        this.compiledTemplate = null;
    }
}
