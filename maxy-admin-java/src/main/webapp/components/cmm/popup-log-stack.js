/*
    로그 분석 > Error / Crash > 팝업
 */
class MaxyPopupLogStack {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.popupId = '#' + options.id + '__popup'
        this.param = options.param
        this.stackParam = options.stackParam
        this.type = options.type
        this.logStackTable = ''
        this.nativeStackTable = ''
        this.addExceptLogType = 0
        this.logDetailData = null // #디버깅 가이드

        if (!this.appendId || !this.id || !this.param) {
            console.log('check parameter')

            return false
        }

        const v = this
        // Handlebars helper 는 init 하기 전에 등록
        v.setHandlebars()
        v.init().then(() => {
            // log stack 팝업인 경우는 type이 '없고 crash stack인 경우는 type이 'crash'임
            if (!v.type) {
                $('#logInfo__buttonWrap').hide()
                $('.type_tab_wrap').hide()
                $('.log_stack').height('calc(100% - 160px)')
            } else {
                $('.log_stack').height('calc(100% - 190px)')
                if (v.type === "crash") {
                    $('#btnExcept').hide()
                }
            }

            if (sessionStorage.getItem('ay') !== 'Y') {
                $('#btnExcept').hide()
            }

            // dimmed 클릭 시 팝업 닫기 이벤트 추가
            v.addEventListener()

            // popup 연 후 data 받아오기
            v.openPopup().then(() => {
                v.getTemplates().then(() => v.getData())
            })
        })
    }

    /**
     * Handlebars Helper 등록
     */
    setHandlebars() {
        // OS Type 을 lower case 로 변환 하여 아이콘 class 에 사용할 수 있도록 변환
        Handlebars.registerHelper('osTypeMapper', function (osType) {
            return osType.toLowerCase()
        })
        // 장치 모델번호를 모델명으로 변환
        Handlebars.registerHelper('modelMapper', function (model) {
            return getDeviceModel(model)
        })
        // Procedure 번호 부여, target 에서부터의 음수값
        Handlebars.registerHelper('minusIdx', function (idx, length) {
            return length - idx
        })
        // Procedure 번호 부여, target + 1
        Handlebars.registerHelper('plusIdx', function (idx) {
            return idx + 1
        })
        // timestamp 를 yyyy-MM-dd HH:mm:ss.sss 로 변환
        Handlebars.registerHelper('dateFormat', function (date) {
            return util.timestampToDateTimeMs(date)
        })
        // log type 에 따른 원 색상 조정
        Handlebars.registerHelper('logTypeFormatter', function (type) {
            const convertedLogType = util.convertByLogType(type)
            return 'bp ' + convertedLogType[0]
        })
        // log type detail 에 따른 원 색상 조정
        Handlebars.registerHelper('logTypeDetailFormatter', function (type) {
            const convertedLogTypeDetail = util.convertByLogType(type)
            return convertedLogTypeDetail[1]
        })
        // ms -> 0 ms / 1 sec
        Handlebars.registerHelper('timeFormatter', function (type) {
            return util.convertTime(type)
        })

        Handlebars.registerHelper('contains', function (str, substring, options) {
            if (str && str.includes(substring)) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    /**
     * popup 외곽 지역 클릭 시 팝업 닫기
     */
    addEventListener() {
        const v = this
        $('.dimmed').on('click', () => {
            // debugging guide nav bar가 펼쳐져있으면 #디버깅 가이드
            if ($('.popup_right_side_wrap').hasClass('show')) {
                $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap').removeClass('show').addClass('hidden')
                return
            }
            this.closePopup()
        })

        // 툴팁 추가
        this.setTooltip()

        $('#deviceInfo').on('click', function () {
            const id = $(this).data('tooltip')
            util.copy(id)
        })

        $('.type_tab').on('click', this.toggleTab)

        if (this.stackParam) {
            //this.downloadStackTrace()  // 2023.11.29 chlee 다운로드 방식 변경으로 주석처리            
            $('#btnDownload').on('click', this.downloadHtml);
        }

        tippy('#btnPageFlow', {
            content: i18next.tns('common.text.userBehavior'),
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        });

        $('#btnPageFlow').on('click', this.getUserFlow.bind(this))

        $('#btnExcept').on('click', () => {
            const result = this.valid()

            if (result !== false) {
                this.addExceptLogType = result.logType
                this.openExceptLogPopup(result)
            }
        })

        $('#btnSave').on('click', this.setExceptLog.bind(this))

        $('#btnCancel, .except_dimmed').on('click', this.closeConfirmPopup)

        // Crash팝업인지 확인하고 디버깅가이드 버튼 추가 #디버깅 가이드
        if (typeof this.type !== 'undefined' && this.type.toUpperCase() === 'CRASH') {
            const $imgDebugOff = $('.img_debug_off')
            $imgDebugOff.show()

            tippy('.img_debug_off', {
                content: trl('common.text.debugGuide'),
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })

            // 디버깅가이드 버튼
            $imgDebugOff.on('click', async function () {
                if ($(this).prop('disabled') !== true) {
                    $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap').removeClass('hidden').addClass('show')
                } else {
                    toast(trl('common.msg.noDebugDataContent'))
                }
            })
        }
    }

    /**
     * log stack 팝업 생성
     * @returns {Promise<void>}
     */
    async init() {
        const {appendId, id, param, type} = this
        const source = await fetch(
            '/components/cmm/popup-log-stack.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        let title = ''
        if (type) {
            title = 'Native'
        } else {
            title = 'Log'
        }

        $target.append(template({id, param, title}))

        // 디버깅 가이드 인스턴스 #디버깅 가이드
        this.debugGuide = new MaxyDebugGuide({
            id: id + '__debugGuide',
        })

        updateContent()
    }

    async getTemplates() {
        const logStackTable = await fetch('/components/la/log-stack.html')
            .then(response => response.text())
        this.logStackTable = Handlebars.compile(logStackTable)

        const nativeStackTable = await fetch('/components/la/native-stack.html')
            .then(response => response.text())
        this.nativeStackTable = Handlebars.compile(nativeStackTable)

        // 새로운 Symbolication 템플릿 추가
        const symbolicationStackTable = await fetch('/components/la/symbolication-stack.html')
            .then(response => response.text())
        this.symbolicationStackTable = Handlebars.compile(symbolicationStackTable)
    }

    /**
     * log stack 데이터 조회
     */
    getData() {
        const {type, param} = this
        ajaxCall('/ta/0000/getLogStackInfo.maxy', param).then(data => {
            const {logStackInfo, hasPageLog} = data
            this.setData(logStackInfo)
            $('.log_stack.maxy_box').removeClass('no_data')
            const $btnPageFlow = $('#btnPageFlow')
            if (hasPageLog) {
                $btnPageFlow.show()
            } else {
                $btnPageFlow.hide()
            }

            if (type === 'crash') {
                this.getStackTrace(hasPageLog)
            }
        }).catch(error => {
            console.log(error)
        })
    }

    getStackTrace(hasPageLog) {
        const v = this
        const {stackParam} = this
        ajaxCall('/ta/0000/getStackTrace.maxy', stackParam).then(async data => {
            const {stackTraceData} = data
            // 데이터가 있는 경우만 실행
            if (!stackTraceData || Object.keys(stackTraceData).length === 0) {
                $('.type_tab_wrap span:nth-child(3)').hide()
                $('.type_tab_wrap span:nth-child(4)').hide()
                return
            }
            this.setTab(data).then(() => {
                if ($('#tab_1').children('.log_stack_table').length === 0) {

                    $('#logInfo__comType').text(util.convertComType(data.comType))
                    $('#logInfo__comSensitivity').text(util.convertComSensitivity(data.comSensitivity)[0])
                    $('#logInfo__cpuUsage').text(data.cpuUsage + '%')
                    $('#logInfo__memUsage').text(util.convertMem('kb', data.memUsage) + '%')
                }
                this.setNativeStackData(data)
            })

            // #디버깅 가이드
            if (typeof this.type !== 'undefined' && this.type.toUpperCase() === 'CRASH') {
                v.logDetailData = {}
                v.logDetailData.hasPageLog = hasPageLog
                v.logDetailData.logDetail = stackTraceData
                await v.debugGuide.setData(v.logDetailData)
            }

        }).catch(error => {
            console.log(error)
        })
    }

    /**
     * log stack 그리기
     * @param data
     */
    setData(data) {
        const v = this

        try {
            const {before, after} = data
            // center 값은 before 조회할 때 lte 로 조회했기 때문에 array 의 마지막 값
            // pop 을 하여 before array 도 하나를 비우게 된다 (11 -> 10개)
            let center

            if (before) {
                if (before.length >= 1 || after.length >= 1) {
                    center = [before.pop()]
                }
                // 상단에 user info 정보 세팅 (clientNm 필요!!)
                const userId = center[0].userId
                const clientNm = center[0].clientNm
                const userNm = center[0].userNm
                const birthDay = center[0].birthDay
                const clientNo = center[0].clientNo

                if (!util.isEmpty(userId) && userId !== '-') {
                    $('#userId').css('display', 'flex')
                    $('#userIdTxt').text(userId)

                    const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                        ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                        ' / ' + (util.isEmpty(userId) ? '-' : userId) +
                        ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                    if (v.userInfoTooltip) {
                        v.userInfoTooltip[0].setContent(userInfo)
                    } else {
                        v.userInfoTooltip = tippy('#userId', {
                            content: userInfo,
                            arrow: false,
                            placement: 'bottom',
                            allowHTML: true,
                            theme: 'maxy-tooltip'
                        })
                    }
                } else if (!util.isEmpty(clientNo) && clientNo !== '-') {
                    // userId가 없거나 -인데, clientNo가 있고 -가 아닌 경우
                    $('#userId').css('display', 'flex')
                    $('#userIdTxt').text(clientNo)

                    const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                        ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                        ' / ' + (util.isEmpty(clientNo) ? '-' : clientNo) +
                        ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                    if (v.userInfoTooltip) {
                        v.userInfoTooltip[0].setContent(userInfo)
                    } else {
                        v.userInfoTooltip = tippy('#userId', {
                            content: userInfo,
                            arrow: false,
                            placement: 'bottom',
                            allowHTML: true,
                            theme: 'maxy-tooltip'
                        })
                    }
                } else {
                    $('#userIdTxt').text('')
                    $('#userId').hide()
                }
            }

            // list를 그려줄 element의 id도 같이 보내준다
            // table 그리기
            this.drawTable({before, center, after}, 'tab_1').then(() => {
                // target 정보를 상단에 기입
                const $target = $('.log_stack_table .target')
                if ($target.length === 0) {
                    return
                }
                this.setDetail($target)
                // 테이블 클릭 이벤트 추가
                this.addTableEventHandler()
            })
        } catch (e) {
            console.log(e)
        }
    }

    async setTab(data) {
        const {stackTraceData, symbolData} = data
        const {osType, contents} = stackTraceData
        const $secondTab = $('.type_tab_wrap span:nth-child(3)')
        const $fourthTab = $('.type_tab_wrap span:nth-child(4)')  // 변경된 부분
        const $lastTab = $('.type_tab_wrap span:nth-child(5)')

        try {
            if (contents.trace) {
                $secondTab.text('Trace')
            } else if (!contents.trace) {
                $secondTab.remove()
            }

            if (osType === 'Android' && (contents.optional && contents.optional !== 'null')) {
                $fourthTab.text('Logcat')
            } else if (osType === 'iOS' && (contents.optional && contents.optional !== 'null')) {
                $fourthTab.text('Binary Images')
            } else {
                $fourthTab.remove()
            }

            // 마지막 탭(Symbolication)은 iOS인 경우에만 보이게 설정
            if (osType === 'iOS') {
                $lastTab.show()  // iOS인 경우 마지막 탭 표시
                if(!symbolData) {
                    $lastTab.addClass('disabled')
                }else {
                    $lastTab.removeClass('disabled')
                }
            } else {
                $lastTab.hide()  // iOS가 아닌 경우 마지막 탭 숨김
            }
        } catch (e) {
            console.log(e)
        }
    }

    setNativeStackData(data) {
        try {
            const {stackTraceData, symbolData} = data
            const {contents} = stackTraceData
            let prime
            let trace
            let logcat
            let symbolication = [] // Symbolication 데이터 추가

            // prime, trace, logcat 순서대로
            if (contents.prime) {
                prime = contents.prime.trim().split('\n')
            }
            if (contents.trace) {
                trace = contents.trace
            }
            if (contents.optional) {
                logcat = contents.optional.trim().split('\n')
            }

            if (symbolData != null) {
                const {items, error} = symbolData
                if(items != null && items.length > 0) {
                    items.forEach(item => {
                        const {stackFrameNumber, appName, crashMemory, exceptionName, exceptionPath, exceptionLine} = item
                        symbolication.push({
                            stackFrameNumber,
                            appName,
                            crashMemory,
                            exceptionName,
                            exceptionPath,
                            exceptionLine
                        })
                    })
                } else {
                    symbolication.push({
                        error
                    })
                }
            }

            const list = [prime, trace, logcat, symbolication]

            this.drawTable(list, 'tab').then(() => {
                this.addTableClickEvent()
            }).catch(err => {
                console.error('Error drawing table:', err)
            })
        } catch (error) {
            console.error('Error setting native stack data:', error)
        }
    }

    /**
     * log stack table 그리기
     * @param data
     * @param targetId
     * @returns {Promise<void>}
     */
    async drawTable(data, targetId) {
        const {appendId, id} = this

        let $target

        try {
            // procedure tab에 리스트 세팅
            if (targetId === 'tab_1') {
                $target = $('#' + appendId + ' #' + targetId)
                if (!($target.length > 0)) {
                    throw 'can\'t find #' + $target
                }
                $target.empty()
                // 데이터가 없는 경우 리턴
                try {
                    // before, after, center 중 하나가 undefined인 경우가 있음
                    if (util.isEmpty(data.after) && util.isEmpty(data.before) && util.isEmpty(data.center)) {
                        return
                    }
                    $target.css('background', 'none')
                    $target.append(this.logStackTable({id, data}))
                    // Path에 툴팁 추가
                    this.initializeTooltips('before', data.before)
                    this.initializeTooltips('center', data.center)
                    this.initializeTooltips('after', data.after)
                } catch (e) {

                }
            }

            // 나머지 탭 메뉴에 리스트 세팅
            else {
                const dataLength = (Object.keys(data)).length
                for (let i = 0; i < dataLength; i++) {
                    $target = $('#tab_' + (i + 2))
                    $target.empty()
                    $target.css('background', 'none')

                    if (i === 3 && data[i]) {
                        $target = $('#tab_5')
                        $target.empty()
                        $target.css('background', 'none')

                        // 데이터 형식에 따라 템플릿에 전달할 객체 생성
                        let templateData = {}

                        // Symbolication 탭(tab_5)에서 에러 처리
                        if (i === 3 && data[i].length > 0 && data[i][0].error) {
                            // 에러가 있는 경우 에러 메시지를 템플릿에 전달
                            templateData.error = data[i][0].error
                        } else {
                            // 정상 데이터인 경우 items
                            templateData.items = data[i]
                        }

                        // 템플릿 적용
                        $target.append(this.symbolicationStackTable(templateData))
                        
                        // tab_5 테이블의 4번째, 5번째 컬럼에 툴팁 추가
                        this.initializeTab5Tooltips()
                    } else {
                        $target.append(this.nativeStackTable(data[i]));
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
    }

    // Path에 툴팁 추가 (공통)
    initializeTooltips(section, data) {
        if (!data) {
            return
        }

        try {
            for (let i = 0; i < data.length; i++) {
                const tdElement = $(`#log_stack_${section}_aliasValue_${i}`);
                const dataContent = tdElement.text();

                tippy(`#log_stack_${section}_aliasValue_${i}`, {
                    content: dataContent,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                });
            }
        } catch (e) {
            console.log(e)
        }
    }

    // tab_5 테이블의 4번째, 5번째 컬럼에 툴팁 추가
    initializeTab5Tooltips() {
        try {
            // 4번째 컬럼 (Symbol)에 툴팁 추가
            $('#tab_5 .log_stack_table tbody tr td:nth-child(4)').each(function() {
                const $td = $(this);
                const content = $td.text().trim();
                
                if (content) {
                    tippy($td[0], {
                        content: content,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    });
                }
            });

            // 5번째 컬럼 (Symbol Path)에 툴팁 추가
            $('#tab_5 .log_stack_table tbody tr td:nth-child(5)').each(function() {
                const $td = $(this);
                const content = $td.text().trim();
                
                if (content) {
                    tippy($td[0], {
                        content: content,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    });
                }
            });
        } catch (e) {
            console.log('tab_5 툴팁 초기화 중 오류 발생:', e);
        }
    }

    /**
     * log stack popup 상단 detail 채우기
     * @param $target
     */
    setDetail($target) {
        const param = $target

        if (param.length === 0) {
            return
        }

        try {
            // target > tr[data-`type`] 으로 작성이 되어 있음
            const data = $target.data()
            for (let d of Object.entries(data)) {
                // 로그 종류 명
                const type = d[0]
                const $target = $('#logInfo__' + type)

                // 값
                let value = d[1]

                // 알맞게 변환
                switch (type) {
                    case 'cpuUsage' :
                        value = value + ' %'
                        break
                    case 'memUsage':
                        value = util.convertMem('kb', value)
                        break
                    case 'comSensitivity':
                        value = util.convertComSensitivity(value)[0]
                        break
                    case 'comType':
                        value = util.convertComType(value)
                        break
                    case 'resMsg':
                        // resMsg 의 경우 JSON 형태일 경우가 있어, beautify 작업 필요
                        if (typeof value === 'object') {
                            value = JSON.stringify(value, null, 4)
                            value = util.splitByEscapeN(value)
                        }

                        if (value.toString().includes('|')) {
                            value = util.convertToNewlines(value)
                        }

                        // textarea 에 넣기 때문에 val() 함수 사용
                        $target.val(value)
                        break
                    default:
                        break
                }

                $target.text(value)
            }
        } catch (e) {
            console.log(e)
        }
    }

    /**
     * log stack 테이블 클릭 이벤트 추가
     */
    addTableEventHandler() {
        // 클릭 이벤트 내부에 class 값을 넣기 위해 변수처리
        const v = this

        try {
            $('.log_stack_table tbody tr').on('click', function (e) {
                e.preventDefault()
                const $target = $(this)
                // 상단 상세 값에 넣음
                v.setDetail($target)
                // 클릭 시 다른 selected 클래스 제거
                $('.log_stack_table tbody tr').removeClass('selected')
                // 해당 클릭된 요소만 selected 처리
                $target.addClass('selected')
            })
        } catch (e) {
            console.log(e)
        }
    }

    addTableClickEvent() {
        // thread 탭 내에 테이블인 경우, thread name만 표시되고 클릭 시 상세 데이터가 표시된다
        $('.native_stack_table .thread_name').on('click', function (e) {
            e.preventDefault()
            const $target = $(this)
            const $parentLi = $target.closest('li')
            const targetId = $(this).data('type')

            $('.native_stack_table .subline, .native_stack_table .child').each(function () {
                const $this = $(this)
                // type이 같으면 열기 (thread name에 속한 subline과 child는 type 값이 같음)
                if ($this.data('type') === targetId) {
                    $parentLi.addClass('selected')
                    $this.toggle()

                    if (!$this.is(':visible')) {
                        $parentLi.removeClass('selected')
                    }
                }
            });
        })
    }

    async downloadHtml() {
        try {
            // svg to data uri
            const icon_device_small = "data:image/svg+xml,%3Csvg width='10' height='13' viewBox='0 0 10 13' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M9 3.17104V2.5C9 1.67157 8.32843 1 7.5 1H2.5C1.67157 1 1 1.67157 1 2.5V10.4999C1 11.3284 1.67157 11.9999 2.5 11.9999H7.5C8.32843 11.9999 9 11.3284 9 10.4999V2.59255' stroke='%237277FF' stroke-width='1.5'/%3E%3Cpath d='M4 9.5H5H6' stroke='%237277FF' stroke-width='1.5'/%3E%3C/svg%3E%0A";
            const icon_gear_purple = "data:image/svg+xml,%3Csvg width='12' height='11' viewBox='0 0 12 11' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M8.00727 0L9.49315 0.857872L9.275 2.54209C9.63812 2.96738 9.91489 3.45242 10.0978 3.96915L11.6671 4.62301V6.33876L10.0987 6.99223C10.0077 7.2482 9.89224 7.49955 9.75154 7.74325C9.62511 7.96224 9.48313 8.16667 9.32781 8.35594L9.55913 10.1419L8.07325 10.9997L6.66995 9.92759C6.12678 10.0301 5.56354 10.0338 5.00902 9.93115L3.65989 10.9619L2.17401 10.104L2.39204 8.42077C2.02836 7.99508 1.75122 7.50947 1.56818 6.99211L0 6.3387V4.62296L1.56738 3.96988C1.65841 3.71383 1.77389 3.46239 1.91464 3.21862C2.06943 2.95051 2.24752 2.70424 2.44486 2.48089L2.23956 0.89583L3.72544 0.0379581L5.02301 1.02931C5.55817 0.931657 6.1123 0.929726 6.65798 1.03087L8.00727 0ZM3.21368 3.96862C4.04891 2.52195 5.89875 2.02629 7.34541 2.86152C8.79207 3.69675 9.28773 5.54659 8.45251 6.99325C7.61727 8.43991 5.76743 8.93558 4.32077 8.10035C2.87411 7.26512 2.37845 5.41528 3.21368 3.96862Z' fill='%237277FF'/%3E%3C/svg%3E%0A";
            const icon_android_purple = "data:image/svg+xml,%3Csvg width='23' height='28' viewBox='0 0 23 28' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M16.0177 1.0959C16.0826 0.983649 16.2261 0.945189 16.3383 1.01C16.4506 1.07481 16.4891 1.21835 16.4243 1.3306L15.174 3.49603C17.2687 4.67439 18.7411 6.82847 18.9749 9.34198H4.01952C4.2533 6.82814 5.72604 4.67382 7.82119 3.49556L6.57139 1.33084C6.50658 1.21859 6.54504 1.07505 6.65729 1.01024C6.76954 0.945433 6.91308 0.983894 6.97789 1.09615L8.23771 3.27822C9.22358 2.80255 10.3293 2.53595 11.4972 2.53595C12.6655 2.53595 13.7715 2.80271 14.7575 3.27864L16.0177 1.0959ZM1.70154 9.69396C0.761807 9.69396 0 10.4558 0 11.3955V18.4364C0 19.3761 0.761807 20.1379 1.70154 20.1379C2.64128 20.1379 3.40309 19.3761 3.40309 18.4364V11.3955C3.40309 10.4558 2.64128 9.69396 1.70154 9.69396ZM21.2986 9.69396C20.3589 9.69396 19.5971 10.4558 19.5971 11.3955V18.4364C19.5971 19.3761 20.3589 20.1379 21.2986 20.1379C22.2383 20.1379 23.0001 19.3761 23.0001 18.4364V11.3955C23.0001 10.4558 22.2383 9.69396 21.2986 9.69396ZM10.4436 22.7194H12.5565V26.2988C12.5565 27.2385 13.3183 28.0003 14.2581 28.0003C15.1978 28.0003 15.9596 27.2385 15.9596 26.2988V22.7194H17.0103C18.1148 22.7194 19.0103 21.824 19.0103 20.7194V9.92847H3.98972V20.7194C3.98972 21.824 4.88515 22.7194 5.98972 22.7194H7.04054V26.2988C7.04054 27.2385 7.80234 28.0003 8.74208 28.0003C9.68182 28.0003 10.4436 27.2385 10.4436 26.2988V22.7194ZM8.09787 6.76062C8.48673 6.76062 8.80196 6.44539 8.80196 6.05653C8.80196 5.66768 8.48673 5.35245 8.09787 5.35245C7.70901 5.35245 7.39378 5.66768 7.39378 6.05653C7.39378 6.44539 7.70901 6.76062 8.09787 6.76062ZM15.6076 6.05653C15.6076 6.44539 15.2923 6.76062 14.9035 6.76062C14.5146 6.76062 14.1994 6.44539 14.1994 6.05653C14.1994 5.66768 14.5146 5.35245 14.9035 5.35245C15.2923 5.35245 15.6076 5.66768 15.6076 6.05653Z' fill='%237277ff'/%3E%3C/svg%3E%0A";
            const icon_ios_purple = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='12' viewBox='0 0 10 12' fill='none'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M4.68054 3.09633C5.93996 2.81231 6.88058 1.68676 6.88058 0.341526C6.88058 0.226098 6.87366 0.112288 6.8602 0.000488281C5.60078 0.284507 4.66016 1.41005 4.66016 2.75529C4.66016 2.87072 4.66708 2.98453 4.68054 3.09633Z' fill='%237277FF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M0.00146441 6.54447C0.0738735 10.0442 1.81169 12.0476 2.77714 11.9993C3.3286 11.9717 3.74619 11.7866 4.09288 11.633C4.35315 11.5177 4.57346 11.42 4.78046 11.42C4.99744 11.42 5.32658 11.5371 5.68898 11.6659C6.13281 11.8237 6.62652 11.9993 7.02514 11.9993C7.59793 11.9993 8.86548 10.9118 9.39408 8.61748C8.37279 8.31754 7.6271 7.37336 7.6271 6.25501C7.6271 5.25958 8.2179 4.40212 9.06797 4.01416C8.52155 3.10809 7.70324 2.82747 7.1941 2.82747C6.98492 2.81138 6.48932 2.82747 6.18037 3.02056C5.79419 3.26193 5.23905 3.50329 4.92528 3.50329C4.61151 3.50329 3.77148 3.17059 3.50123 3.02056C3.16333 2.83297 2.60819 2.8093 2.40988 2.83297C1.55 2.93569 -0.0552639 3.8026 0.00146441 6.54447Z' fill='%237277FF'/%3E%3C/svg%3E"
            const icon_network_type = "data:image/svg+xml,%3Csvg width='19' height='17' viewBox='0 0 19 17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M16 16L16 11' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M18 12L16 11L14 12' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M11 11V16' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M9 15L11 16L13 15' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M1.1039 5.88191C4.46334 3.5197 8.96597 3.99173 11.7711 6.80288' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M2.41263 8.00509C4.27053 6.6987 6.61478 6.59806 8.51574 7.54115' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round'/%3E%3Cpath d='M3.87626 9.98101C4.68967 9.40906 5.66413 9.2364 6.56679 9.42245' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round'/%3E%3Ccircle cx='5.93668' cy='12.1015' r='0.798542' transform='rotate(9.88691 5.93668 12.1015)' fill='%237277FF'/%3E%3C/svg%3E%0A";
            const icon_page_network_purple = "data:image/svg+xml,%3Csvg width='18' height='15' viewBox='0 0 18 15' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='8' y='4.00024' width='2' height='2' rx='1' stroke='%237277ff' stroke-width='2'/%3E%3Cpath d='M8.39922 6.40015H9.59922L10.7992 14.2001H7.19922L8.39922 6.40015Z' fill='%237277ff'/%3E%3Cpath d='M3.4 1.00024C1.98917 1.64546 1 3.14873 1 4.90024C1 6.65176 1.98917 8.15503 3.4 8.80024' stroke='%237277ff' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M5.60039 2.80005C4.85251 3.36384 4.40039 4.09767 4.40039 4.90005C4.40039 5.70242 4.85251 6.43625 5.60039 7.00005' stroke='%237277ff' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M14.6 8.80005C16.0108 8.15483 17 6.65156 17 4.90005C17 3.14853 16.0108 1.64527 14.6 1.00005' stroke='%237277ff' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M12.3996 7.00024C13.1475 6.43645 13.5996 5.70262 13.5996 4.90024C13.5996 4.09787 13.1475 3.36404 12.3996 2.80024' stroke='%237277ff' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E%0A";
            const icon_cpu_purple = "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7.39006 0C7.89987 0 8.31314 0.413278 8.31314 0.923082V2.95148H11.0824L11.0824 0.923082C11.0824 0.413278 11.4957 0 12.0055 0C12.5153 0 12.9286 0.413278 12.9286 0.923082V2.95148H15.6978L15.6978 0.923082C15.6978 0.413278 16.1111 0 16.6209 0C17.1307 0 17.544 0.413278 17.544 0.923082V2.95148H18.083C19.7399 2.95148 21.083 4.29463 21.083 5.95148V6.46146L23.077 6.46146C23.5868 6.46146 24.0001 6.87474 24.0001 7.38454C24.0001 7.89434 23.5868 8.30762 23.077 8.30762H21.083V11.0769H23.077C23.5868 11.0769 24.0001 11.4901 24.0001 11.9999C24.0001 12.5098 23.5868 12.923 23.077 12.923H21.083V15.6923H23.077C23.5868 15.6923 24.0001 16.1056 24.0001 16.6154C24.0001 17.1252 23.5868 17.5384 23.077 17.5384H21.083V18.5669C21.083 20.2238 19.7399 21.5669 18.083 21.5669H17.544V23.077C17.544 23.5868 17.1307 24.0001 16.6209 24.0001C16.1111 24.0001 15.6978 23.5868 15.6978 23.077L15.6978 21.5669H12.9286V23.077C12.9286 23.5868 12.5153 24.0001 12.0055 24.0001C11.4957 24.0001 11.0824 23.5868 11.0824 23.077L11.0824 21.5669H8.31314V23.077C8.31314 23.5868 7.89987 24.0001 7.39006 24.0001C6.88026 24.0001 6.46698 23.5868 6.46698 23.077V21.5669H5.46757C3.81072 21.5669 2.46757 20.2238 2.46757 18.5669V17.5384H0.923082C0.413278 17.5384 0 17.1252 0 16.6154C0 16.1056 0.413278 15.6923 0.923082 15.6923H2.46757V12.923H0.923082C0.413278 12.923 0 12.5098 0 11.9999C0 11.4901 0.413278 11.0769 0.923082 11.0769H2.46757V8.30762H0.923082C0.413278 8.30762 0 7.89434 0 7.38454C0 6.87474 0.413278 6.46146 0.923082 6.46146L2.46757 6.46146V5.95148C2.46757 4.29463 3.81072 2.95148 5.46757 2.95148H6.46698V0.923082C6.46698 0.413278 6.88026 0 7.39006 0ZM7.46639 6.46161C7.44845 6.46161 7.43063 6.46208 7.41292 6.46301L8.98224 8.4807H12.7138C12.9126 8.37042 13.1413 8.30762 13.3847 8.30762C14.1494 8.30762 14.7693 8.92754 14.7693 9.69224C14.7693 10.457 14.1494 11.0769 13.3847 11.0769C12.7189 11.0769 12.1629 10.607 12.0302 9.9807H8.61543H8.24862L8.02341 9.69116L6.46639 7.68927V16.5386C6.46639 17.0909 6.91411 17.5386 7.46639 17.5386H16.5352L14.7402 15.5192L11.2863 15.5192C11.0876 15.6295 10.8588 15.6923 10.6154 15.6923C9.85073 15.6923 9.23082 15.0724 9.23082 14.3077C9.23082 13.5429 9.85073 12.923 10.6154 12.923C11.2812 12.923 11.8373 13.3929 11.97 14.0192L15.077 14.0192H15.4138L15.6376 14.2709L17.5434 16.415V7.46161C17.5434 6.90932 17.0957 6.46161 16.5434 6.46161H7.46639Z' fill='%237277ff'/%3E%3C/svg%3E%0A";
            const icon_memory_purple = "data:image/svg+xml,%3Csvg width='19' height='22' viewBox='0 0 19 22' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M9.15655 0H10.3067V2.74558C10.3067 3.25103 10.7164 3.66078 11.2219 3.66078C11.7273 3.66078 12.137 3.25103 12.137 2.74558V0.0602853C13.025 0.241113 13.7964 0.818052 14.2152 1.64589L17.9901 9.10877C18.2025 9.52857 18.3131 9.99242 18.3131 10.4629V10.7917V18.5833C18.3131 20.2402 16.97 21.5833 15.3131 21.5833H3C1.34315 21.5833 0 20.2402 0 18.5833V3C0 1.34811 1.3351 0.00805659 2.98511 3.61913e-05V2.74558C2.98511 3.25103 3.39485 3.66078 3.9003 3.66078C4.40575 3.66078 4.81549 3.25103 4.81549 2.74558V0H6.64588V2.74558C6.64588 3.25103 7.05563 3.66078 7.56108 3.66078C8.06652 3.66078 8.47627 3.25103 8.47627 2.74558V0H9.15655ZM15.0437 15.8423H2.83496V17.5864H15.0437V15.8423ZM4.83496 8.86583C3.73039 8.86583 2.83496 9.76126 2.83496 10.8658V14.0982H15.0437V10.8658C15.0437 9.76126 14.1483 8.86583 13.0437 8.86583H4.83496Z' fill='%237277ff'/%3E%3C/svg%3E%0A";
            const icon_down_triangle_gr = "data:image/svg+xml,%3Csvg width='16' height='14' viewBox='0 0 16 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 14L0.205774 0.499999L15.7942 0.5L8 14Z' fill='%23DDE0E9'/%3E%3C/svg%3E%0A";
            const icon_up_triangle_gr = "data:image/svg+xml,%3Csvg width='16' height='14' viewBox='0 0 16 14' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 0L15.7942 13.5L0.205771 13.5L8 0Z' fill='%23DDE0E9'/%3E%3C/svg%3E%0A";
            const icon_log_stack_title_gray = "data:image/svg+xml,%3Csvg width='22' height='19' viewBox='0 0 22 19' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='1' y='2' width='12' height='16' rx='1' stroke='%23767676' stroke-width='2'/%3E%3Cline x1='5' y1='4.45685e-08' x2='5' y2='4' stroke='%23767676' stroke-width='2'/%3E%3Cline x1='10' y1='4.65943e-08' x2='10' y2='4' stroke='%23767676' stroke-width='2'/%3E%3Cline x1='3' y1='8' x2='11' y2='8' stroke='%23767676' stroke-width='2'/%3E%3Cline x1='3' y1='13' x2='8' y2='13' stroke='%23767676' stroke-width='2'/%3E%3Cpath d='M17 2V18.8235' stroke='%23767676' stroke-width='2'/%3E%3Cpath d='M21 6L21 19' stroke='%23767676' stroke-width='2'/%3E%3C/svg%3E%0A";
            const icon_mark_check = "\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='16' height='16' rx='8' fill='%2335DA9E'/%3E%3Cpath d='M3.33398 7.15789L7.03769 10.6667L13.334 4' stroke='white' stroke-width='2'/%3E%3C/svg%3E%0A\"";
            const icon_mark_crach = "\"data:image/svg+xml,%3Csvg width='16' height='17' viewBox='0 0 16 17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect y='0.666748' width='16' height='16' rx='8' fill='%23FF6969'/%3E%3Cpath d='M9.22798 3.3335L7.16998 3.3335L7.16998 11.1595L9.22798 11.1595L9.22798 3.3335ZM8.20598 12.4335C7.49198 12.4335 7.00198 12.8815 7.00198 13.5675C7.00198 14.2395 7.49198 14.6735 8.20598 14.6735C8.91998 14.6735 9.39598 14.2395 9.39598 13.5675C9.39598 12.8815 8.91998 12.4335 8.20598 12.4335Z' fill='white'/%3E%3C/svg%3E%0A\"";
            const icon_mark_error = "\"data:image/svg+xml,%3Csvg width='16' height='17' viewBox='0 0 16 17' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect y='0.666748' width='16' height='16' rx='8' fill='%23FFC700'/%3E%3Cpath d='M9.22798 3.3335L7.16998 3.3335L7.16998 11.1595L9.22798 11.1595L9.22798 3.3335ZM8.20598 12.4335C7.49198 12.4335 7.00198 12.8815 7.00198 13.5675C7.00198 14.2395 7.49198 14.6735 8.20598 14.6735C8.91998 14.6735 9.39598 14.2395 9.39598 13.5675C9.39598 12.8815 8.91998 12.4335 8.20598 12.4335Z' fill='white'/%3E%3C/svg%3E%0A\"";
            const icon_user = "\"data:image/svg+xml,%3Csvg width='12' height='13' viewBox='0 0 12 13' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cellipse cx='5.83975' cy='4.07968' rx='3.07998' ry='3.07998' transform='rotate(-90 5.83975 4.07968)' stroke='%237277FF' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cpath d='M10.68 12C10.68 11.1235 10.1054 9.3813 9.18296 8.50002C8.31408 7.66987 7.13657 7.16002 5.83998 7.16002C4.54338 7.16002 3.36587 7.66987 2.49699 8.50002C1.57459 9.3813 1 11.1235 1 12' stroke='%237277FF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A\"";

            const tmp = "%3Csvg width='10' height='12' viewBox='0 0 10 12' fill='none' xmlns='http://www.w3.org/2000/svg'/%3E%3C%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M4.68054 3.09633C5.93996 2.81231 6.88058 1.68676 6.88058 0.341526C6.88058 0.226098 6.87366 0.112288 6.8602 0.000488281C5.60078 0.284507 4.66016 1.41005 4.66016 2.75529C4.66016 2.87072 4.66708 2.98453 4.68054 3.09633Z' fill='#7277FF'/%3E%3Cn%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='0.00146441 6.54447C0.0738735 10.0442 1.81169 12.0476 2.77714 11.9993C3.3286 11.9717 3.74619 11.7866 4.09288 11.633C4.35315 11.5177 4.57346 11.42 4.78046 11.42C4.99744 11.42 5.32658 11.5371 5.68898 11.6659C6.13281 11.8237 6.62652 11.9993 7.02514 11.9993C7.59793 11.9993 8.86548 10.9118 9.39408 8.61748C8.37279 8.31754 7.6271 7.37336 7.6271 6.25501C7.6271 5.25958 8.2179 4.40212 9.06797 4.01416C8.52155 3.10809 7.70324 2.82747 7.1941 2.82747C6.98492 2.81138 6.48932 2.82747 6.18037 3.02056C5.79419 3.26193 5.23905 3.50329 4.92528 3.50329C4.61151 3.50329 3.77148 3.17059 3.50123 3.02056C3.16333 2.83297 2.60819 2.8093 2.40988 2.83297C1.55 2.93569 -0.0552639 3.8026 0.00146441 6.54447Z' fill='#7277FF'/%3E%3C%3C/svg/%3E%3C"
            const commonCssRes = await fetch("/css/common/common.css");
            let commonCss = await commonCssRes.text();
            commonCss = commonCss.replace('/images/maxy/icon-device-small.svg', icon_device_small);
            commonCss = commonCss.replace('/images/maxy/icon-gear-purple.svg', icon_gear_purple);
            commonCss = commonCss.replace('/images/maxy/icon-ios-small.svg', icon_ios_purple);
            commonCss = commonCss.replace('/images/maxy/icon-android-purple.svg', icon_android_purple);
            commonCss = commonCss.replace('/images/maxy/icon-network-type.svg', icon_network_type);
            commonCss = commonCss.replace('/images/maxy/icon-page-network-purple.svg', icon_page_network_purple);
            commonCss = commonCss.replace('/images/maxy/icon-cpu-purple.svg', icon_cpu_purple);
            commonCss = commonCss.replace('/images/maxy/icon-memory-purple.svg', icon_memory_purple);
            commonCss = commonCss.replace('/images/maxy/icon-mark-crash.svg', icon_mark_crach);
            commonCss = commonCss.replaceAll('/images/maxy/icon-mark-check.svg', icon_mark_check);
            commonCss = commonCss.replaceAll('/images/maxy/icon-mark-error.svg', icon_mark_error);
            commonCss = commonCss.replace('/images/maxy/icon-user-p.svg', icon_user);

            const resetCssRes = await fetch("/css/common/reset.css");
            const resetCss = await resetCssRes.text();

            const swiperCssRes = await fetch("/vendor/swiper/swiper-bundle.min.css");
            const swiperCss = await swiperCssRes.text();

            // html 요소 내용 가져오기
            let htmlContent = document.getElementById("maxyPopupWrap").innerHTML;
            htmlContent = htmlContent.replace('/images/maxy/icon-log-stack-title-gray.svg', icon_log_stack_title_gray);
            htmlContent = htmlContent.replaceAll('/images/maxy/icon-down-triangle-gr.svg', icon_down_triangle_gr);
            htmlContent = htmlContent.replaceAll('/images/maxy/icon-up-triangle-gr.svg', icon_up_triangle_gr);
            // 다운로드 버튼 삭제
            const delStartIdx = htmlContent.indexOf('<div class="button_wrap" id="logInfo__buttonWrap">');
            const delEndIdx = htmlContent.indexOf('<div class="stack_wrap">');
            let partOne = htmlContent.substring(0, delStartIdx);
            let partTwo = htmlContent.substring(delEndIdx);
            htmlContent = partOne + "</div>" + partTwo;

            // 생성할 HTML 파일 내용 생성
            const fileContent =
                `<!DOCTYPE html>
                <html>
                <head>                    
                    <style>
                     ${resetCss}
                     ${swiperCss}
                     ${commonCss}
                    </style>
                </head>
                <body>
                	<div>
                		<section class="main_wrap">
                			<article class="contents_wrap">
                				<div class="maxy_popup_common_wrap" id="maxyPopupWrap">
									${htmlContent}
								</div>	
                			</article>
                		</section>                		
                	</div>
                </body>
                <script>
				  function isEmpty(e){return!e||"number"!=typeof e&&("object"==typeof e?e.length<=0:""===e.replace(/\s/g,""))}
                  function convertMem(e,r){try{let t=0;if(isEmpty(r)||0===r)return"0MB";if(r=Number(r),isNaN(r))return"0MB";switch(e){case"kb":return t=(r/1024).toFixed(1),t+"MB";case"mb":return t=(r/1024).toFixed(1),t+"GB";default:return"0GB"}}catch(t){console.log(t)}}
                  function convertComSensitivity(o,d){return o=Number(o),d?d?0<o&&o<=20?["Too Bad","purple"]:20<o&&o<=40?["Bad","red"]:40<o&&o<=60?["Normal","green"]:60<o&&o<=80?["Good","blue"]:["Very Good","indigo"]:void 0:0<o&&o<=20?["Too Bad","too_bad"]:20<o&&o<=40?["Bad","bad"]:40<o&&o<=60?["Normal","normal"]:60<o&&o<=80?["Good","good"]:["Very Good","very_good"]}
                  function convertComType(e){switch(e=Number(e)){case 1:return"WiFi";case 2:return"2G";case 3:return"3G";case 4:return"LTE";case 5:return"5G";case 9:case 0:return"ETC"}}
                  function splitByEscapeN(n){if(n)return n.replace(/\\\\n/g,"\\\n")}
                  function convertToNewlines(e){if(e)return e.replace(/\\\|/g,"\\\n")} 

				  // 탭 이벤트 처리 스크립트 추가 (jquery 제거, 순수 javascript로 작성)
				  let tabTarget = document.querySelectorAll('.type_tab');				  
				  for (let t=0; t<tabTarget.length; t++) {
				    tabTarget[t].addEventListener("click", function(e) {
				      const $clickedTab = e.target;
				      const type =  $clickedTab.dataset.type;
				      for (let t=0; t<tabTarget.length; t++) {
				        tabTarget[t].classList.remove('selected');
				      }
				      $clickedTab.classList.add('selected');
				      let stackWrapEach = document.querySelectorAll('.stack_wrap .log_stack.maxy_box');
				      for (let i=0; i < stackWrapEach.length; i++) {
				        if (stackWrapEach[i].style.display === '' || stackWrapEach[i].style.display === 'block') {
				          stackWrapEach[i].style.display = 'none';
				        }
				      }
				      document.getElementById(type).style.display = 'block';
				    });
				  }

				  function setDetail($target) {
                    const param = $target
                    if(param.length === 0) {
                        return
                    }
                    const data = $target.dataset;
                    for (let d of Object.entries(data)) {
                        const type = d[0]
                        const target = document.getElementById('logInfo__' + type);
                        let value = d[1]
                        switch (type) {
                            case 'cpuUsage' :
                                value = value + ' %'
                                break
                            case 'memUsage':
                                value = convertMem('kb', value)
                                break
                            case 'comSensitivity':
                                value = convertComSensitivity(value)[0]
                                break
                            case 'comType':
                                value = convertComType(value)
                                break
                            case 'resMsg':

                                // resMsg 의 경우 JSON 형태일 경우가 있어, beautify 작업 필요
                                if (typeof value === 'object') {
                                    value = JSON.stringify(value, null, 4)
                                    value = splitByEscapeN(value)
                                }

                                if (value.toString().includes('|')) {
                                    value = convertToNewlines(value)
                                }

                                // textarea 에 넣기 때문에 val() 함수 사용
                                break
                            default:
                                break
                        }

                        if (target != null)
                            target.innerText = value;
                    	}
               		 }
                   	 /* log stack 테이블 클릭 이벤트 추가 (Produce Tab) */
                     let lstTarget = document.querySelectorAll('.log_stack_table tbody tr');
                     for (let t=0; t < lstTarget.length; t++) {
                        lstTarget[t].addEventListener("click", function(e) {
                            e.preventDefault();
                            const $target = this;
                            setDetail($target);
                            for (let i=0; i<lstTarget.length; i++) {
                                lstTarget[i].classList.remove('selected');
                            }
                            $target.classList.add('selected');                         
                        });
                     }

                    // Trace Tab click event
                    // Trace Tab click event
                    let trcTarget = document.querySelectorAll('.native_stack_table .thread_name');
                    for (let t=0; t < trcTarget.length; t++) {
                        trcTarget[t].addEventListener("click", function(e) {
                            e.preventDefault()
                            const $target = this;
                            const $parentLi = $target.closest('li')
                            const targetId = this.dataset.type

                            let nsSubChildEach = document.querySelectorAll('.native_stack_table .subline, .native_stack_table .child');
				            for (let i=0; i < nsSubChildEach.length; i++) {
                                const $this = nsSubChildEach[i];
                                // type이 같으면 열기 (thread name에 속한 subline과 child는 type 값이 같음)
                                if ($this.dataset.type === targetId) {
                                    if ($this.style.display === '') {
                                        $parentLi.classList.add('selected');
                                        $this.style.display = 'block';
                                    } else if ($this.style.display === 'block') {
                                        $parentLi.classList.remove('selected');
                                        $this.style.display = null;
                                    }                                    
                                }
                            }
                        });
                    }
                    // 페이지 높이 재조정
                    document.getElementById('realTime__popup').style.height = '100vh';
                    document.getElementById('tab_1').style.height = '700px';
                    document.getElementById('tab_2').style.height = '700px';
                    document.getElementById('tab_3').style.height = '700px';
                    document.getElementById('tab_4').style.height = '700px';
				</script>
                </html>
             `;

            const blob = new Blob([fileContent], {type: "text/html"});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);

            link.download = "report_log_stack.html";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // 선택한 탭에 대한 데이터만 보여준다
    toggleTab(e) {
        const $clickedTab = $(e.target)

        const type = $clickedTab.data('type')
        const $tab = $('.type_tab')

        // 해당 CRASH의 DSYM파일이 없을 경우
        if(type === 'tab_5' && $tab.hasClass('disabled')) {
            const msg = trl('management.dsym.text.validDsym')
            modal.show({
                msg: '<div>' + msg + '</div>'
            })
            return
        }

        // tab 선택
        $tab.removeClass('selected')

        $clickedTab.addClass('selected')
        // tab content 선택
        const $content = $('.type_content')
        $content.removeClass('selected')

        $('.type_content[data-type="' + type + '"]').addClass('selected')

        $('.stack_wrap .log_stack.maxy_box').each(function () {
            if ($(this).css('display') === 'block') {
                $(this).hide()
            }
        });

        $('#' + type).show()
    }

    getUserFlow() {
        const {stackParam} = this

        const packageNm = stackParam.packageNm
        const serverType = stackParam.serverType
        const deviceId = stackParam.deviceId
        const logTm = Number(stackParam.logTm)
        const params = {
            packageNm,
            serverType,
            deviceId,
            logTm
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))
        // 사용자 행동분석 버튼을 눌러 사용자 분석 화면으로 이동할 떄는 새창으로 열도록 변경
        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    }

    valid() {
        let logType;
        let exceptLog;

        // 선택한 데이터의 로그타입
        const $selectedLogType = $('.log_stack_table .selected').data('log-type')
        if ($selectedLogType !== undefined) {
            logType = $selectedLogType
        } else {
            logType = $('.target').data('log-type')
        }

        if (logType !== 65538 && logType !== 131076 && logType !== 131077 && logType !== 262148 &&
            logType !== 524292 && logType !== 1048579 && logType !== 4194306 && logType !== 2097152) {
            alert(i18next.tns('common.msg.err'))
            return false
        }

        const $logInfoResMsgValue = $('#logInfo__resMsg').val()
        if ($logInfoResMsgValue.indexOf('at ') > -1) {
            exceptLog = $logInfoResMsgValue.substring(0, $logInfoResMsgValue.indexOf('at '))
            if (exceptLog.indexOf('\n') > -1) exceptLog = exceptLog.substring(0, exceptLog.indexOf('\n'))
        } else exceptLog = $logInfoResMsgValue

        return {logType, exceptLog}
    }

    openExceptLogPopup(result) {
        $('#exceptConfirmPopup').css('display', 'flex')
        $('.except_dimmed').show()
        $('#exceptLog').val(result.exceptLog)

    }

    setExceptLog() {
        if (!confirm(i18next.tns('common.msg.except.error'))) {
            return
        }

        const exceptLog = $('#exceptLog').val()
        if (!exceptLog) {
            toast(i18next.tns('system.except.msg.emptyString'))
            return
        }

        if (exceptLog.length < 10) {
            toast(i18next.tns('system.except.msg.length'))
            return
        }

        const $packageNm = $('#packageNm option:selected')

        const param = {
            'deviceId': $('#deviceInfo').data('tooltip'),
            'packageNm': $packageNm.val(),
            'serverType': $packageNm.data('server-type'),
            'logType': this.addExceptLogType,
            'exceptString': exceptLog,
        }

        ajaxCall('/sm/0000/addExceptLog.maxy', param).then(() => {
            // 데이터가 있는 경우만 실행
            toast(i18next.tns('common.msg.success'))
            this.addExceptLogType = 0
            // 성공 후 컨펌 팝업 닫기
            this.closeConfirmPopup()
        }).catch(error => {
            console.log(error)
            toast(i18next.tns(error.msg))
        })
    }

    // 상단 타이틀 옆 회색 아이콘에 툴팁 추가
    setTooltip() {
        const tooltipTxt = [
            i18next.tns('common.msg.deviceIdCopy'),
            i18next.tns('common.text.appVersion'),
            i18next.tns('common.text.osVersion'),
            i18next.tns('common.text.networkType'),
            i18next.tns('common.text.networkPerform'),
            i18next.tns('common.text.cpuUsage'),
            i18next.tns('common.text.memoryUsage')
        ]

        $('.device_info_wrap .device_info').not(':last-child').each(function (idx) {
            const id = $(this).attr('id')
            tippy('#' + id, {
                content: tooltipTxt[idx],
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })
        })
    }

    /**
     * 팝업 열기
     */
    async openPopup() {
        $('.dimmed').show()
        $(this.popupId).show()
    }

    /**
     * 팝업 초기화 후 팝업 닫기
     */
    closePopup() {
        $(this.popupId + ' input', this.popupId + ' textarea').val('')
        $(this.popupId + ' span').text('')

        // except confirm 팝업 열려있으면
        const $exceptConfirmPopup = $('#exceptConfirmPopup')

        if ($exceptConfirmPopup.css('display') !== 'none') {
            $('.except_dimmed').hide()
            $exceptConfirmPopup.hide()
        }

        util.removeMaxyCursor()

        const $dimmed = $('.dimmed')
        $dimmed.off('click')
        $dimmed.hide()
        $(this.popupId).hide()
    }

    // confirm 팝업 닫기
    closeConfirmPopup() {
        $('.except_dimmed').hide()
        $('#exceptConfirmPopup').hide()
    }
}
