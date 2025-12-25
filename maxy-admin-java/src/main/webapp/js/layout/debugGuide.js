class MaxyDebugGuide {
    constructor(options) {
        this.id = options.id
        this.logDetail = null

        if (!this.id) {
            console.log('check parameter', this)
            return false
        }

        this.init().then(() => {
            this.addEventListener()
        })
    }

    async init() {
        const {id} = this

        const source = await fetch('/templates/debugGuide.html').then(res => res.text())
        const template = Handlebars.compile(source)

        const $target = $('#' + id)
        if (!$target.length) {
            console.warn('Missing element for id:', id)
            return
        }

        $target.empty().append(template({id}))
    }

    addEventListener() {
        const v = this
        const {id} = this

        // 다국어 적용
        updateContent()

        // 팝업 상단 subtitle tippy 세팅
        popup.tooltip.subTitle($('#' + id + ' .sub_title'))

        // 사용자 행동분석 tippy
        tippy('#' + id + ' .btn_page_flow', {
            content: trl('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })

        // 사용자 행동분석 click 이벤트
        $('#' + id + ' .btn_page_flow').on('click', function () {
            v.getUserFlow()
        })
    }

    getUserFlow() {
        const {logDetail} = this

        const params = {
            deviceId: logDetail.deviceId,
            packageNm: logDetail.packageNm,
            serverType: logDetail.serverType,
            logTm: logDetail.logTm
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))
        // 사용자 행동분석 버튼을 눌러 사용자 분석 화면으로 이동할 떄는 새창으로 열도록 변경
        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    }

    async setData(data) {
        const v = this
        const {id} = this
        const {hasPageLog, logDetail} = data

        const {osType, resMsg} = logDetail
        let {logName} = logDetail

        // opensearch index에 따라서 logName이 없을수 있음
        if (typeof logName === 'undefined') {
            logName = resMsg
        }
        
        // logName이 없거나 빈값일때
        if (!logName || logName.trim() === '') {
            const $imgDebugOff = $('.img_debug_off')
            $imgDebugOff.addClass('gray')
            $imgDebugOff.prop('disabled', true)
            return
        }

        const param = {
            osType: osType,
            logName: logName,
            type: "CRASH"
        }

        v.logDetail = data.logDetail

        ajaxCall('/db/0100/getCrashDebuggingGuide.maxy', param, {disableDimmed: true}).then(data => {
            const $container = $('#' + id)
            const $imgDebugOff = $('.img_debug_off')
            if (data.datas.length === 0) {
                $imgDebugOff.addClass('gray')
                $imgDebugOff.prop('disabled', true)
                return
            } else {
                $imgDebugOff.removeClass('gray')
                $imgDebugOff.prop('disabled', false)
            }

            // userFlow 버튼
            if (hasPageLog) {
                $container.find('.btn_page_flow').show()
            } else {
                $container.find('.btn_page_flow').hide()
            }

            const {
                deviceModel,
                appVer,
                osType,
                osVer,
                comType,
                simOperatorNm,
                timezone,
                birthDay,
                userId,
                userNm,
                clientNm,
                deviceId,
                logType,
                pageUrl,
                packageNm,
                serverType,
                ip
            } = logDetail

            // App 버전
            $container.find('[data-subtitle="appVer"] > span').text(appVer)
            // Network Type
            $container.find('[data-subtitle="comType"] > span').text(util.convertComType(comType))
            // Carrier
            $container.find('[data-subtitle="simOperator"] > span').text(util.isEmpty(simOperatorNm) ? '-' : util.simOperatorNmFormat(simOperatorNm))
            // Location
            $container.find('[data-subtitle="location"] > span').text(timezone)
            // ip
            $container.find('[data-subtitle="ip"] > span').text(ip)

            // Device Name
            const $deviceName = $container.find('[data-subtitle="deviceName"]')
            $deviceName.off('click')
            $deviceName.on('click', () => {
                util.copy(deviceId)
            })
            $deviceName.find('span').text(getDeviceModel(deviceModel))

            // OS 버전
            $container.find('[data-subtitle="osVer"] > span').text(osVer)
            const $iconOs = $container.find('[data-subtitle="osVer"] > .icon_os')
            $iconOs.removeClass('ios')
            $iconOs.removeClass('android')
            if (osType === 'iOS') {
                $iconOs.addClass('ios')
            } else {
                $iconOs.addClass('android')
            }

            // Log Type
            const $iconLogType = $container.find('[data-subtitle="logType"] > .icon_log_type')
            const $logTypeNm = $container.find('[data-subtitle="logType"] > span')

            if ($iconLogType.hasClass('native')) {
                $iconLogType.removeClass('native')
            } else if ($iconLogType.hasClass('webview')) {
                $iconLogType.removeClass('webview')
            }

            let pageType
            if (logType) {
                pageType = util.logTypeToPageType(logType)
                $iconLogType.addClass(pageType[0])
                $logTypeNm.text(pageType[1])
            } else {
                pageType = 'Web View'
                $iconLogType.addClass('webview')
                $logTypeNm.text(pageType)
            }

            // userId 있는 경우만 툴팁 표시
            if (!util.isEmpty(userId) && userId !== '-') {
                const $userId = $container.find('[data-subtitle="userId"]')
                $userId.css('display', 'flex')
                $container.find('[data-subtitle="userId"] > span').text(userId)

                const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                    ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                    ' / ' + (util.isEmpty(userId) ? '-' : userId) +
                    ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                if (v.userInfoTooltip) {
                    v.userInfoTooltip.setContent(userInfo)
                } else {
                    v.userInfoTooltip = tippy($userId[0], {
                        content: userInfo,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                }
            } else {
                $container.find('[data-subtitle="userId"] > span').text('')
                $container.find('[data-subtitle="userId"]').hide()
            }

            const aliasUrl = getPageList(packageNm, serverType, pageUrl)
            if (aliasUrl !== pageUrl) {
                $container.find('.desc').text(aliasUrl)
            }
            $container.find('.url').text(pageUrl)

            $container.find('.enable_scrollbar.red').text(logName)

            v.draw(data.datas)
            $('.debug_guide_dimmed').show()
        }).catch(error => {
            console.log(error)
        })
    }

    draw(data) {
        const v = this
        const {id} = this
        const lang = localStorage.getItem('lang') || 'ko'
        const $debugGuideWrap = $('#' + id + ' .debug_guide_wrap')

        if (!data || !data.length) {
            const msgTitle = trl('common.msg.noDebugDataTitle')
            const msgContent = trl('common.msg.noDebugDataContent')

            const noDataMessage = `
                <div class="markdown-body">
                    <div class="no-data-container">
                        <h3>${msgTitle}</h3>
                        <p>${msgContent}</p>
                    </div>
                </div>
                `

            $debugGuideWrap.empty()
            $debugGuideWrap.append(noDataMessage)
            return
        }

        v.convertStringToMarkdown(data)

        // 마크다운 옵션 설정 (breaks: true로 설정하여 줄바꿈 처리 개선)
        const md = window.markdownit({
            breaks: true,  // 줄바꿈을 <br>로 변환
            html: true     // HTML 태그 허용
        });

        $debugGuideWrap.empty()

        // 디버그 가이드 목록을 위한 컨테이너 만들기
        const debugGuideList = document.createElement('div')
        debugGuideList.className = 'debug-guide-list'

        for (let i = 0; i < data.length; i++) {
            const item = data[i]

            /**
             * 목록 항목 컨테이너 만들기
             * 각 디버그 가이드 항목은 접었다 펼칠 수 있는 아코디언 형태로 구성됩니다.
             * 기본적으로 접혀있는 상태로 시작하며, 헤더를 클릭하면 내용이 펼쳐집니다.
             */
            const debugGuideItem = document.createElement('div')
            debugGuideItem.className = 'debug-guide-item'
            // 기본적으로 접혀있는 상태로 시작
            debugGuideItem.classList.add('collapsed')

            /**
             * 헤더 섹션 생성 (항상 보이는 부분)
             * 헤더는 항목 번호, 제목, 토글 아이콘으로 구성됩니다.
             * 사용자가 이 부분을 클릭하여 내용을 접거나 펼칠 수 있습니다.
             */
            const itemHeader = document.createElement('div')
            itemHeader.className = 'item-header'

            // 항목 번호 표시 추가 (원형 숫자 표시)
            const itemNumber = document.createElement('div')
            itemNumber.className = 'item-number'
            itemNumber.textContent = (i + 1).toString()
            itemHeader.appendChild(itemNumber)

            /**
             * 항목 제목 추가
             * 제목은 요약 섹션의 첫 문장을 추출하여 표시합니다.
             * 적절한 내용이 없는 경우 기본 제목을 사용합니다.
             */
            const itemTitle = document.createElement('div')
            itemTitle.className = 'item-title'

            // 제목 텍스트 추출 (요약 섹션의 첫 문장 또는 첫 번째 헤더)
            let titleText = '디버깅 가이드 #' + (i + 1)
            const content = lang === 'ko' ? item.solutionKo : item.solutionEn

            // 요약 섹션 내용 찾기
            if (content) {
                // 요약 섹션 찾기
                const summaryRegex = lang === 'ko'
                    ? /#### 1\. 요약([\s\S]*?)(?=####|$)/
                    : /#### 1\. Summary([\s\S]*?)(?=####|$)/;

                const summaryMatch = content.match(summaryRegex);

                if (summaryMatch && summaryMatch[1]) {
                    // 요약 섹션의 첫 문장 추출 (최대 50자)
                    const firstSentence = summaryMatch[1].trim().split(/[.!?][\s\n]/)[0];
                    if (firstSentence && firstSentence.length > 5) {
                        // 마크다운 기호 제거하고 길이 제한
                        const cleanSentence = firstSentence
                            .replace(/[*_`#]/g, '')
                            .trim();

                        /*titleText = cleanSentence.length > 70
                            ? cleanSentence.substring(0, 67) + '...'
                            : cleanSentence;*/
                        titleText = cleanSentence;
                    } else {
                        // 요약 섹션 제목 사용
                        titleText = lang === 'ko' ? '1. 요약' : '1. Summary';
                    }
                }
            }

            itemTitle.textContent = titleText
            itemHeader.appendChild(itemTitle)

            /**
             * 토글 아이콘 추가
             * 플러스/마이너스 형태의 아이콘으로, 항목의 접힘/펼침 상태를 시각적으로 표시합니다.
             * 항목이 접혀있을 때는 플러스(+) 모양, 펼쳐져 있을 때는 마이너스(-) 모양으로 표시됩니다.
             */
            const toggleIcon = document.createElement('div')
            toggleIcon.className = 'toggle-icon'
            itemHeader.appendChild(toggleIcon)

            /**
             * 콘텐츠 섹션 생성 (접었다 펼칠 수 있는 부분)
             * 이 부분은 마크다운 내용을 포함하며, 헤더를 클릭하면 슬라이딩 애니메이션과 함께
             * 접히거나 펼쳐집니다. CSS transition을 통해 부드러운 애니메이션 효과를 제공합니다.
             */
            const itemContent = document.createElement('div')
            itemContent.className = 'item-content'

            /**
             * 마크다운 내용 컨테이너
             * 실제 디버깅 가이드 내용이 마크다운 형식으로 렌더링되어 표시됩니다.
             */
            const markdownBody = document.createElement('div')
            markdownBody.className = 'markdown-body'

            // 마크다운 렌더링 (언어에 따라 한국어 또는 영어 내용 표시)
            if (lang === 'ko') {
                markdownBody.innerHTML = md.render(item.solutionKo)
            } else {
                markdownBody.innerHTML = md.render(item.solutionEn)
            }

            /**
             * 구조 조립
             * 생성한 요소들을 계층 구조로 조립하여 DOM에 추가합니다.
             */
            itemContent.appendChild(markdownBody)
            debugGuideItem.appendChild(itemHeader)
            debugGuideItem.appendChild(itemContent)
            debugGuideList.appendChild(debugGuideItem)

            /**
             * 클릭 이벤트 리스너 추가
             * 헤더를 클릭하면 항목의 접힘/펼침 상태를 토글합니다.
             * CSS 클래스를 통해 상태를 관리하며, 이에 따라 애니메이션이 적용됩니다.
             */
            itemHeader.addEventListener('click', function () {
                // 접힘/펼침 상태 토글
                debugGuideItem.classList.toggle('collapsed')
            })
        }

        $debugGuideWrap.append(debugGuideList)

        // code태그에 language-objectivec가 있어야 objective-c 언어로 구분
        hljs.registerAliases('objective-c', {languageName: 'objectivec'});
        // markdown안의 code문구 강조표시
        hljs.highlightAll()

        /**
         * 마크다운 목록에 1개의 내용만 있으면 자동으로 펼치기
         * 목록에 단일 항목만 있는 경우, 사용자 편의를 위해 자동으로 펼쳐서 보여줍니다.
         */
        if (data.length === 1) {
            const singleItem = debugGuideList.querySelector('.debug-guide-item');
            if (singleItem) {
                singleItem.classList.remove('collapsed');
            }
        }
    }

    /**
     * 데이터 배열의 솔루션 텍스트를 마크다운 형식으로 변환
     *
     * @param {Array} data - 변환할 솔루션 데이터 배열
     */
    convertStringToMarkdown(data) {
        if (!data || !data.length) return;

        // 한국어와 영어 헤더 매핑 정의
        const koHeadersMap = {
            '1. 요약:': '#### 1. 요약',
            '2. 발생 시나리오:': '#### 2. 발생 시나리오',
            '3. 발생 상세 원인:': '#### 3. 발생 상세 원인',
            '4. 디버깅 및 해결 방법:': '#### 4. 디버깅 및 해결 방법',
            '5. 예방방법:': '#### 5. 예방방법'
        };

        const enHeadersMap = {
            '1. Summary:': '#### 1. Summary',
            '2. Occurrence scenario:': '#### 2. Occurrence scenario',
            '3. Detailed Cause:': '#### 3. Detailed Cause',
            '4. Debugging & Solutions:': '#### 4. Debugging & Solutions',
            '5. Prevention:': '#### 5. Prevention'
        };

        // 각 데이터 항목 처리
        data.forEach(item => {
            // 한국어 솔루션 처리
            if (item.solutionKo) {
                // 첫번째 문자에 \n이 있으면 제거
                if (item.solutionKo.startsWith('\n')) {
                    item.solutionKo = item.solutionKo.substring(1);
                }
                item.solutionKo = this.formatToMarkdown(item.solutionKo, koHeadersMap);
            }

            // 영어 솔루션 처리
            if (item.solutionEn) {
                // 첫번째 문자에 \n이 있으면 제거
                if (item.solutionEn.startsWith('\n')) {
                    item.solutionEn = item.solutionEn.substring(1);
                }
                item.solutionEn = this.formatToMarkdown(item.solutionEn, enHeadersMap);
            }
        });
    }

    /**
     * 텍스트를 마크다운 형식으로 변환
     *
     * @param {string} text - 변환할 원본 텍스트
     * @param {Object} headersMap - 헤더 텍스트와 마크다운 헤더 형식의 매핑
     * @returns {string} 마크다운 형식으로 변환된 텍스트
     */
    formatToMarkdown(text, headersMap) {
        if (!text) return '';

        // 1단계: 헤더 변환 및 기본 텍스트 처리
        const processedText = this._convertHeaders(text, headersMap);

        // 2단계: 목록 및 서식 처리
        const formattedLines = this._processListsAndFormatting(processedText);

        // 3단계: 최종 텍스트 조합 및 간격 조정
        return this._combineLines(formattedLines);
    }

    /**
     * 텍스트의 헤더를 마크다운 형식으로 변환
     *
     * @param {string} text - 변환할 원본 텍스트
     * @param {Object} headersMap - 헤더 텍스트와 마크다운 헤더 형식의 매핑
     * @returns {string} 헤더가 변환된 텍스트
     * @private
     */
    _convertHeaders(text, headersMap) {
        // 중복 줄바꿈 제거
        text = text.replaceAll('\n\n', '\n');
        const inputLines = text.split('\n');
        let processedText = '';

        // 각 줄을 순회하며 헤더 패턴 찾아 교체
        for (let i = 0; i < inputLines.length; i++) {
            const line = inputLines[i];
            let isHeader = false;

            // 헤더 패턴 확인 및 교체
            Object.entries(headersMap).forEach(([original, replacement]) => {
                if (line.trim() === original) {
                    processedText += replacement + '\n';
                    isHeader = true;
                }
            });

            // 헤더가 아닌 경우 원래 줄 추가
            if (!isHeader) {
                processedText += line + '\n';
            }
        }

        return processedText;
    }

    /**
     * 텍스트의 목록 형식과 서식을 처리
     *
     * @param {string} text - 처리할 텍스트
     * @returns {Array} 서식이 적용된 줄 배열
     * @private
     */
    _processListsAndFormatting(text) {
        const lines = text.split('\n');
        let inList = false;
        let listIndentLevel = 0;

        // 4칸 들여쓰기를 2칸으로 정규화하는 함수
        const normalizeIndentation = (indentation) => {
            // 4칸 들여쓰기인 경우 2칸으로 변경
            if (indentation === 4) {
                return 2;
            }
            // 4칸의 배수인 경우 절반으로 줄임
            if (indentation > 4 && indentation % 4 === 0) {
                return indentation / 2;
            }
            // 그 외의 경우는 그대로 유지
            return indentation;
        };

        // 글머리 기호 목록 처리 함수
        const processBulletList = (line, indentation) => {
            inList = true;
            const normalizedIndentation = normalizeIndentation(indentation);
            listIndentLevel = Math.floor(normalizedIndentation / 2);
            const indent = '  '.repeat(listIndentLevel);
            return indent + '* ' + line.substring(2);
        };

        // 번호 목록 처리 함수
        const processNumberedList = (match, indentation) => {
            inList = true;
            const normalizedIndentation = normalizeIndentation(indentation);
            listIndentLevel = Math.floor(normalizedIndentation / 2);
            const indent = '  '.repeat(listIndentLevel);
            const number = match[1];
            const content = match[2];
            return indent + number + '. ' + content;
        };

        return lines.map(line => {
            // 섹션 헤더 처리
            if (line.trim().startsWith('#### ')) {
                inList = false;
                listIndentLevel = 0;
                return line.trim();
            }

            // 들여쓰기 계산
            const indentMatch = line.match(/^(\s*)/);
            const indentation = indentMatch ? indentMatch[1].length : 0;
            const trimmedLine = line.trim();

            // 빈 줄 처리
            if (!trimmedLine) {
                return '';
            }

            // 글머리 기호 목록 처리 (- 로 시작하는 줄)
            if (trimmedLine.startsWith('- ')) {
                return processBulletList(trimmedLine, indentation);
            }

            // 번호 목록 처리 (숫자와 마침표로 시작하는 줄)
            const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
            if (numberedListMatch) {
                return processNumberedList(numberedListMatch, indentation);
            }

            // 중첩된 내용 또는 목록 항목의 연속 처리
            if (inList && indentation > 0) {
                const normalizedIndentation = normalizeIndentation(indentation);
                return '  '.repeat(Math.floor(normalizedIndentation / 2)) + trimmedLine;
            }

            // 코드 블록 처리 (백틱 내의 텍스트)
            if (trimmedLine.includes('`')) {
                const codeIndent = inList ? '  '.repeat(listIndentLevel) : '';
                return codeIndent + trimmedLine.replace(/`([^`]+)`/g, '`$1`');
            }

            // 일반 텍스트 처리
            inList = false;
            listIndentLevel = 0;
            return trimmedLine;
        });
    }

    /**
     * 처리된 줄들을 결합하여 최종 마크다운 텍스트 생성
     *
     * @param {Array} formattedLines - 서식이 적용된 줄 배열
     * @returns {string} 최종 마크다운 텍스트
     * @private
     */
    _combineLines(formattedLines) {
        let result = '';
        let prevLineIsHeader = false;
        let prevLineIsEmpty = false;

        formattedLines.forEach(line => {
            const isHeader = line.startsWith('#### ');
            const isEmpty = line.length === 0;

            // 헤더 앞에 추가 줄바꿈 삽입 (첫 번째 헤더 제외)
            if (isHeader && !prevLineIsHeader && result.length > 0 && !prevLineIsEmpty) {
                result += '\n\n';
            } else if (!isEmpty && result.length > 0 && !prevLineIsEmpty) {
                // 내용 줄 사이에 단일 줄바꿈 추가
                result += '\n';
            }

            // 빈 줄이 아닌 경우에만 결과에 추가
            if (!isEmpty) {
                result += line;
            }

            prevLineIsHeader = isHeader;
            prevLineIsEmpty = isEmpty;
        });

        return result;
    }
}
