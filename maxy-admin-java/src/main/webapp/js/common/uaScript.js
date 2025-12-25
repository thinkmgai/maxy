var UA0000 = {
    v: {
        offsetIndex: 0,
        searchParam: {
            searchValue: '',
            searchType: '',
            searchServerType: '',
            searchPackageNm: '',
            searchToDt: '',
            searchToDtHH: '',
            searchToDtMM: '',
            searchFromDt: '',
            searchFromDtHH: '',
            searchFromDtMM: '',
        },
        template: {
            userBehavior: '',
            userFlowChart: ''
        },
        fileName: '',
        deviceId: ''
    },

    init: {
        async getTemplate() {
            const [userBehaviorResponse, userFlowChartResponse] = await Promise.all([
                fetch('/templates/userBehaviorAnalysis.html'),
                fetch('/templates/userFlowChart.html')
            ])

            const userBehaviorTemplate = await userBehaviorResponse.text()
            const userFlowChartTemplate = await userFlowChartResponse.text()

            // 두 개의 템플릿을 객체로 반환
            return {userBehaviorTemplate, userFlowChartTemplate}
        },
        event() {
            const {v, func} = UA0000

            // 조회하기 버튼 클릭 이벤트
            $('#doSearch').on('click', function (event, param) {
                const $searchValue = $('#searchValue')

                if($searchValue.val() === '-' || util.isEmpty($searchValue.val())) {
                    toast(trl('common.msg.searchValue'))
                    return
                }

                // 공통 파라미터 생성
                const getCommonParams = () => ({
                    packageNm: sessionStorage.getItem('packageNm'),
                    serverType: sessionStorage.getItem('serverType'),
                    osType: sessionStorage.getItem('osType') || 'A', // session에 없으면 A로 고정
                    from: param?.searchFromDt
                        ? param.searchFromDt
                        : util.dateToTimestamp(new Date(v.from), true),
                    to: param?.searchToDt
                        ? param.searchToDt
                        : util.dateToTimestamp(new Date(v.to), false),
                    searchType: $('#searchKey').val(),
                    searchValue: ''
                })

                let options = {
                    appendId: 'maxyPopupWrap',
                    id: 'searchUser',
                    ...getCommonParams()
                }

                if($searchValue.val().trim() === '') {
                    new MaxySearchUser(options)
                    return
                }

                const listParam = {
                    ...getCommonParams(),
                    searchValue: $searchValue.val().trim()
                }

                ajaxCall('/ua/0000/getUserList.maxy', listParam).then(data => {
                    if (data.length === 0) {
                        toast(trl('common.msg.noSearchData'))
                    } else if (data.length === 1) {
                        func.getFlowData(param)
                    } else {
                        options.searchValue = listParam.searchValue
                        options.data = data

                        new MaxySearchUser(options)
                    }
                })
            })

            $('#searchKey').on('change', function () {
                const searchKey = $('#searchKey').val();
                const $searchValue = $('#searchValue')
                if (searchKey === '') {
                    $searchValue.attr('readonly', true)
                    $searchValue.val('');
                    $searchValue.attr('placeholder', '')
                } else {
                    $searchValue.attr('readonly', false)
                    $searchValue.val('')
                    $searchValue.attr('placeholder', i18next.tns('common.msg.searchValue'))
                }
            })

            $(document).on('keyup', function (e) {
                if (e.keyCode === 13 && $('#searchValue').is(':focus')){
                    $('#doSearch').trigger('click')
                }
            })

            $('#btnUserList').on('click', function () {
                func.getTotalUserList()
            })

            const searchBtn = trl('common.btn.search')

            tippy('#doSearch', {
                content: searchBtn,
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })

            //$('#btnReset').on('click', func.reset)
            $('#packageNm').on('change', function () {
                // 패키지 변경하면 검색조건 초기화
                $('#searchValue').val('')
                func.reset()
                sessionStorage.setItem('osType', 'A')
                sessionStorage.setItem('appVer', 'A')
            })

            $('#btnFilterToggle').on('click', func.filter.toggleFilterArea)
            $('.filter input[type="checkbox"]').on('change', func.filter.do)
            $('.filter input[type="text"]').on('input', func.filter.do)
            // esc로 팝업닫기
            popup.escClose()

            $(document).on('click', '.status.search_after', function () {
                new MaxyUserInfo({
                    id: 'maxyUserInfo',
                    deviceId: v.deviceId ? v.deviceId : $('#searchValue').val()
                })
            })
        },

        async created() {
            const {v} = UA0000
            // 화면 그릴 영역
            const contentsWrap = '.contents_wrap'
            const $graph = $(contentsWrap)
            $graph.empty()

            // page 템플릿
            const template = Handlebars.compile(v.template.userBehavior)
            // 데이터 넣기
            $graph.append(template)

            // ua0000인 경우: 사용자 분석 메뉴 눌러서 진입한 경우 (새 창 아님)
            // ua0400인 경우: 팝업 내 user flow 버튼 눌러서 새 창으로 진입한 경우 (새 창임)
            if ($('#ua0400').length === 1) {
                v.fileName = 'UA0400'
            } else {
                v.fileName = 'UA0000'
            }

            $('#searchValue').attr('placeholder', trl('common.msg.searchValue'))

            const {func} = UA0000
            func.setOptionalSearchFields()

            i18next.changeLanguage(getLang()).then(() => {
                appInfo.append({pId: 'packageNm', oId: '', vId: ''})
                    .then(() => {
                        // 사용자분석 화면 새로고침 시 sse 연결 안되어있으면 다시 연결 (새 창으로 사용자분석 진입한 경우는 ML0100 없음)
                    })
                // 세션에 저장된 값 있으면 세팅해줌 (device id, 패키지명, 서버타입 등)
                func.setPrevData().then(() => {
                    $('.graph_box li').on('click', func.getTotalUserList)
                })
                // datePicker 값 세팅
                func.settingDatePicker()
                userflow.setHandlebars()

                tippy('#btnReset', {
                    content: 'Reset',
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            })
        }
    },

    func: {
        filter: {
            // filter 영역 토글
            toggleFilterArea() {
                $('.filter_area').slideToggle()
            },
            do() {
                const {func} = UA0000
                const param = {}
                func.filter.setFilterParam(param)
                if (Object.keys(param).length === 0) {
                    $('.page').removeClass('filtered')
                    return
                }

                func.filter.markFilteredPages(param)
            },
            markFilteredPages(param) {
                const $pages = $('.page');
                $pages.removeClass('filtered');  // 기존에 적용된 'filtered' 클래스를 제거

                // 각 페이지에 대해 필터링 조건을 확인
                $pages.each(function () {
                    const $page = $(this);
                    let shouldFilter = true;  // 기본적으로 필터링을 해야 한다고 가정

                    // 조건을 하나씩 비교
                    for (const [key, val] of Object.entries(param)) {
                        const pageData = $page.data(key);

                        // 'aliasValue' 조건은 대소문자 구분없이 비교
                        if (key === 'aliasValue') {
                            if (!pageData.toLowerCase().includes(val.toLowerCase())) {
                                shouldFilter = false;
                                break;  // 하나라도 조건이 맞지 않으면 더 이상 비교할 필요 없음
                            }
                        } else {
                            // 그 외의 조건은 페이지 데이터가 val보다 큰지 비교
                            if (pageData < val) {
                                shouldFilter = false;
                                break;  // 하나라도 조건이 맞지 않으면 더 이상 비교할 필요 없음
                            }
                        }
                    }

                    // 모든 조건을 만족하면 'filtered' 클래스 추가
                    if (shouldFilter) {
                        $page.addClass('filtered');
                    }
                });
            },
            /**
             * filter 에 설정된 값이 있으면 해당 filter key와 값을 반환
             */
            setFilterParam(param) {
                const types = [
                    'loadingTime', 'responseTime',
                    'intervaltime', 'eventIntervaltime',
                    'eventCount', 'requestCount',
                    'errorCount', 'aliasValue'
                ]
                for (const type of types) {
                    try {
                        const $checkbox = $('#filter__' + type);
                        const $input = $('#filterVal__' + type);

                        // 체크박스가 체크되지 않은 경우 건너뜀
                        if (!$checkbox.is(':checked')) continue;

                        // 입력값 확인
                        const val = $input.val();
                        if (val === undefined) continue;

                        if (type === 'aliasValue') {
                            if (val.trim() !== '') {
                                param[type] = val.trim();
                            }
                        } else {
                            const numVal = Number(val);
                            // 유효한 숫자인 경우만 추가
                            if (!isNaN(numVal) && numVal > 0) {
                                param[type] = numVal;
                            }
                        }
                    } catch (e) {
                        console.error('Error processing type:', type, e);
                    }
                }
            }
        },
        async setPrevData() {
            const {v} = UA0000
            // 사용자 분석 버튼(메인화면 등)에서 진입한 경우 or 새로고침 한 경우 가장 최근 데이터로 조회되도록 한다.
            let uaParams = v.fileName === 'UA0400'
                ? sessionStorage.getItem('ua0400Params')
                : sessionStorage.getItem('ua0000Params')

            // 파일명에 따라 세션값 가져오는게 다름
            v.fileName === 'UA0400'
                ? uaParams = sessionStorage.getItem('ua0400Params')
                : uaParams = sessionStorage.getItem('ua0000Params')

            if (uaParams) {
                // 세션스토리지에 저장된 값 가져오기
                uaParams = JSON.parse(uaParams)

                // device id, server type, pacakage name 세팅
                v.searchParam.searchServerType = uaParams.serverType
                v.searchParam.searchPackageNm = uaParams.packageNm

                // 팝업에서 사용자 분석 버튼으로 넘어온 경우 search type이 항상 device Id
                if (uaParams.deviceId) {
                    v.searchParam.searchValue = uaParams.deviceId
                    $('#searchValue').val(uaParams.deviceId)
                    $('#searchKey').val('deviceId').prop('selected', true)
                    // 그 외에 새로고침 한 경우는 세션에 저장된 search type을 넣어줌
                } else if (uaParams.searchValue) {
                    v.searchParam.searchValue = uaParams.searchValue
                    $('#searchValue').val(uaParams.searchValue)
                    $('#searchKey').val(uaParams.searchType).prop('selected', true)
                }
            }
        },
        validateInput() {
            const searchKey = $('#searchKey').val()
            const searchValue = $('#searchValue').val()
            if (searchValue === '') {
                toast(i18next.tns('common.msg.searchValue'))
                return false
            } else {
                return true
            }

        },
        async initTimeBox(isSearchClick) {
            const {v, func} = UA0000

            await util.sleep(150)

            const $timeLineTab = $(".time_line .graph_box li")

            let date = new Date()
            let timeCnt = date.getHours()

            let uaParams
            v.fileName === 'UA0400'
                ? uaParams = sessionStorage.getItem('ua0400Params')
                : uaParams = sessionStorage.getItem('ua0000Params')

            // 메인화면의 logmeter 팝업 -> 사용자 분석 버튼에서 진입한 경우는 param에 logTm이 들어옴
            if (uaParams && !isSearchClick) {
                uaParams = JSON.parse(uaParams)

                if (uaParams.logTm) {
                    v.searchParam.searchToDt = uaParams.logTm
                    v.searchParam.searchFromDt = uaParams.logTm
                    v.searchParam.searchToDtHH = timeCnt
                    v.searchParam.searchFromDtHH = timeCnt
                } else if (uaParams.from && uaParams.to) {
                    v.searchParam.searchToDt = uaParams.to
                    v.searchParam.searchFromDt = uaParams.from
                    v.searchParam.searchToDtHH = timeCnt
                }


                /*
                    marketing insight 팝업에서 사용자 분석 새창으로 넘어온 경우에 대한 처리
                    파라미터에 type이라는 키가 있고, value는 'marketing'으로 들어옴
                    searchParam에 marketing insight 전용 파라미터를 넣어준다
                    flow에 핀 찍어줄 때 값 비교용으로 필요함
                 */
                if (uaParams.type) {
                    v.searchParam.type = uaParams.type
                    v.searchParam.reqUrl = uaParams.reqUrl
                    v.searchParam.preUrl = uaParams.preUrl
                    v.searchParam.preUrlTime = uaParams.preUrlTime
                    v.searchParam.pageStartTm = uaParams.pageStartTm
                }

                func.setTimeStamp(timeCnt, v.searchParam)
            }

            // 조회하기 버튼을 눌러서 조회한 경우
            else if (!uaParams || isSearchClick) {
                // 오늘 날짜를 unix timestamp로 변환
                let today = util.dateToTimestamp(util.getDate(0), true)

                let prevDate = util.dateToTimestamp(new Date(v.from), true)
                let nextDate = util.dateToTimestamp(new Date(v.to), true)

                if (v.from === today) {
                    v.searchParam.searchToDtHH = util.padding(date.getHours())
                } else {
                    v.searchParam.searchToDtHH = '23'
                }

                v.searchParam.searchToDtMM = '59'

                if ((today === nextDate && today === prevDate)
                    || (today === nextDate && today !== prevDate)) {
                    func.setTimeStamp(timeCnt)
                } else if (today !== nextDate && today !== prevDate) {
                    $timeLineTab.removeClass("on")
                    $timeLineTab.removeClass("last")
                    for (let i = 0; i < 24; i++) {
                        $timeLineTab.eq(i).addClass("on")
                    }

                    v.searchParam.searchToDtHH = '23'
                } else {
                    const msg = i18next.tns('common.msg.incorrect')
                    toast(msg)
                }
            }
        },

        setTimeStamp(timeCnt, param) {
            const {func} = UA0000

            const $timeLineTab = $(".time_line .graph_box li")

            let date = new Date()
            let hour = date.getHours()

            $timeLineTab.removeClass("on")
            $timeLineTab.removeClass("last")

            if (param) {
                const today = util.dateFormat(util.nowDateTime())
                const paramDate = util.timestampToDate(param.searchToDt)

                // 오늘 날짜가 아니면 hour은 24로 고정
                if (paramDate !== today) {
                    hour = 24
                }

                for (let i = 0; i <= hour; i++) {
                    $timeLineTab.eq(i).addClass("on")
                }
                if (paramDate === today) {
                    $timeLineTab.eq(timeCnt).addClass("last")
                }

                // 팝업에서 넘어왔거나 새로고침 한 경우
                func.getFlowData(param)

            } else {
                for (let i = 0; i <= timeCnt; i++) {
                    $timeLineTab.eq(i).addClass("on")
                }
                $timeLineTab.eq(timeCnt).addClass("last")
            }
        },
        doSearch() {
            const {v, func} = UA0000
            v.offsetIndex = 0;
            func.settingDatePicker()
            func.initTimeBox(true)
            func.changeData()
        },
        isValid(min, max) {
            const {v} = UA0000
            // const date = func.getDate()
            //
            if (util.getDateDiff(max, min) > 7) {
                const msg = trl('common.msg.date7')
                toast(msg)
                return false
            } else {
                return true
            }
        },
        settingDatePicker() {
            const {v, func} = UA0000

            const today = util.getDateToString()
            let uaParams = v.fileName === 'UA0400'
                ? sessionStorage.getItem('ua0400Params')
                : sessionStorage.getItem('ua0000Params')

            v.fileName === 'UA0400'
                ? uaParams = sessionStorage.getItem('ua0400Params')
                : uaParams = sessionStorage.getItem('ua0000Params')

            if (uaParams) {
                // 세션스토리지에 저장된 값 가져오기
                uaParams = JSON.parse(uaParams)
                if (uaParams.logTm) {
                    const logTm = util.timestampToDate(uaParams.logTm)

                    v.from = logTm
                    v.to = logTm
                } else if (uaParams.from && uaParams.to) {
                    v.from = util.timestampToDate(uaParams.from)
                    v.to = util.timestampToDate(uaParams.to)
                }
            } else {
                // 세션에 저장된 값이 없으면 오늘 날짜
                v.from = today
                v.to = today
            }

            calendar.init({
                id: 'uaCalendar',
                checkedDate: [v.from],
                fn: (dates, date) => {
                    const isValid = func.isValid(date.min, date.max)
                    if (isValid) {
                        v.from = date.min
                        v.to = date.max

                        func.reset()
                        func.initTimeBox(true)
                    }
                },
                created: () => {
                    // 팝업 내 사용자 행동분석 버튼으로 사용자 분석 화면 진입한 경우 또는 이전 데이터를 조회하고 새로고침 한 경우
                    $('#uaCalendar').val(v.from)
                    func.initTimeBox()
                }
            })
        },
        setOptionalSearchFields() {
            // sessionStorage에 저장된 optionalSearchFields 값을 가져옴
            const optionalSearchFields = sessionStorage.getItem('optionalSearchFields')
            if (optionalSearchFields && optionalSearchFields.trim() !== '') {
                try {
                    // optionalSearchFields 값을 JSON 객체로 파싱
                    const fieldsObj = JSON.parse(optionalSearchFields)

                    // 객체의 각 키-값 쌍을 순회하면서 #searchKey에 옵션으로 추가
                    for (const [key, value] of Object.entries(fieldsObj)) {
                        $('#searchKey').append(`<option value="${key}">${value}</option>`)
                    }
                } catch (e) {
                    console.error('optionalSearchFields 파싱 오류:', e)
                }
            }
        },
        async changeData() {
            const {v, func} = UA0000
            await util.sleep(150)
            v.offsetIndex = 0;
            cursor.show()
            func.getFlowData()
            func.settingDatePicker()
            search.save()
        },

        //데이터 가져오기
        getFlowData(param) {
            const {v} = UA0000

            cursor.show()
            const {func} = UA0000

            let params = {
                'packageNm': '',
                'serverType': '',
                'searchType': $('#searchKey').val(),
                'searchValue': ''
            }

            // 사용자 분석 버튼(로그분석 error,crash,pv 팝업 등)에서 진입한 경우, param으로 받은 값을 넣어줌
            if (param) {
                // 팝업에서 사용자 분석 버튼을 통해 넘어온 경우 logTm을 넣어줌
                if (param.searchToDt === param.searchFromDt) {
                    params.logTm = param.searchFromDt
                } else {
                    params.from = param.searchFromDt
                    params.to = param.searchToDt
                }

                params.packageNm = param.searchPackageNm ? param.searchPackageNm : $('#packageNm').val()
                params.serverType = param.searchServerType ? param.searchServerType : $('#packageNm option:checked').data('server-type')
                params.searchType = param.searchType ? param.searchType : $('#searchKey').val()
                
                // 복합 검색 파라미터 구조 처리
                if (param.searchType === 'multiple' && param.searchValues) {
                    params.searchValues = param.searchValues
                } else {
                    params.searchValue = param.searchValue
                }

                // param에 type이 있는 경우는 marketing insight에서 넘어온 경우
                // 이 때, marketing insight 전용 파라미터를 넣어줌
                if (param.type) {
                    params.type = param.type
                    params.preUrl = param.preUrl
                    params.reqUrl = param.reqUrl
                    params.pageStartTm = param.pageStartTm
                    params.preUrlTime = param.preUrlTime
                }
                // 아닌 경우 선택한 시작 시간, 종료 시간을 넣어줌
            } else {
                const date = func.getDate()
                params.from = date.from
                params.to = date.to
                params.packageNm = $('#packageNm').val()
                params.serverType = $('#packageNm option:checked').data('server-type')
                params.searchValue = $('#searchValue').val()
            }

            v.fileName === 'UA0400' ?
                sessionStorage.setItem('ua0400Params', JSON.stringify(params))
                : sessionStorage.setItem('ua0000Params', JSON.stringify(params))

            if (util.checkParam(params) || util.isEmpty(params.searchType) || (util.isEmpty(params.searchValue) && util.isEmpty(params.searchValues))) {
                cursor.hide()
                return
            }

            ajaxCall('/ua/0000/getPageFlowList.maxy', params, {disableCursor: true})
                .then((data) => {
                    cursor.hide()

                    const userFlowList = data.userFlowList
                    const $noData = $('#noData')
                    const $userInfo = $('#userInfo')

                    if (userFlowList.length <= 0) {
                        if ($userInfo.css('display') !== 'none') {
                            func.resetUserInfo()
                            $userInfo.hide()
                        }
                        $noData.show()
                        $('#appFlowChart').empty()
                        return
                    }

                    // 검색이 정상적으로 되고 결과값이 있는 경우
                    // 검색창 좌측 아이콘 변경
                    const $searchStatus = $('.search_before')
                    $searchStatus.removeClass('search_before').addClass('search_after')

                    $noData.hide()

                    v.deviceId = userFlowList[0][0]['deviceId']

                    func.setUserInfo(userFlowList)
                    func.drawFlowChart(userFlowList, params).then(func.filter.do)
                })
                .catch((error) => {
                    console.log(error)
                    cursor.hide()
                })
        },
        setUserInfo(data) {
            let {userId, userNm, deviceId, clientNo} = data[0][0]

            // clientNo가 비어있거나 존재하지 않으면 기본값 '-' 세팅
            if (util.isEmpty(clientNo)) {
                clientNo = '-'
            }

            if (util.isEmpty(userId)) {
                userId = '-'
            }

            if (util.isEmpty(userNm)) {
                userNm = '-'
            }

            if (util.isEmpty(deviceId)) {
                deviceId = '-'
            }

            if (userId !== '-' || userNm !== '-' || deviceId !== '-') {
                // 데이터 매핑 객체
                const valueMap = {
                    deviceId: deviceId,
                    userId: userId,
                    clientNo: clientNo
                }

                // HTML 요소들을 배열로 수집
                const userInfoElements = []

                // 옵션 순회 및 HTML 생성
                $('#searchKey option').each(function() {
                    const optionText = $(this).text()
                    const optionKey = $(this).val()
                    const optionValue = valueMap[optionKey] || ''

                    if (optionValue) {
                        userInfoElements.push(
                            `<span>${optionText}</span>
                            <span>:</span>
                            <span>${optionValue}</span>
                            <span>|</span>`
                        )
                    }
                })

                // 사용자명 추가
                const userNmText = i18next.tns('common.text.userNm')
                userInfoElements.push(`<span>${userNmText}</span><span>:</span><span>${userNm}</span>`)

                const $userInfo = $('#userInfo')
                $userInfo.empty().append(userInfoElements.join('')).css('display', 'flex')

                $('.user_flow_wrap .graph_wrap').addClass('exist_user_info')
            } else {
                $('.user_info').hide()
                $('#userId').text('')
                $('#userName').text('')
            }
        },
        resetUserInfo() {
            $('#userId').text('')
            $('#userName').text('')
        },
        // 그래프 그리기
        async drawFlowChart(data, params) {
            const {v, func} = UA0000

            $('#appFlowChart').empty()
            if (data === null) {
                return
            }

            const userFlowList = data

            // 그래프 그릴 영역
            const graphId = '#appFlowChart'
            const $graph = $(graphId)
            $graph.empty()

            // page 템플릿
            const template = Handlebars.compile(v.template.userFlowChart)

            // 데이터 넣기
            const menuList = template(userFlowList)
            $graph.append(menuList)

            // 다국어 적용
            updateContent()

            const msg = i18next.tns('common.msg.deviceIdCopy')

            const tooltipTxt = [
                i18next.tns('common.text.appVersion'),
                i18next.tns('common.text.osVersion'),
                i18next.tns('common.text.carrier'),
                i18next.tns('common.text.location'),
            ]

            for (let i = 0; i < userFlowList.length; i++) {
                tippy('#deviceId_' + i, {
                    content: msg,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                tippy('#appVer_' + i, {
                    content: tooltipTxt[0],
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                tippy('#osVer_' + i, {
                    content: tooltipTxt[1],
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                tippy('#carrier_' + i, {
                    content: tooltipTxt[2],
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                tippy('#timezone_' + i, {
                    content: tooltipTxt[3],
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                $('#deviceId_' + i).on('click', function () {
                    const target = $(this).data('deviceId')
                    util.copy(target)
                })
            }

            // 플로우에 마우스 오버 시 상세 툴팁 추가
            userflow.addTooltip(userFlowList, params)

            // 그래프 클릭 시 팝업 열기
            // 클릭 대상
            const $pageGraph = $('.graph .page_wrap .page')
            $pageGraph.on('click', userflow.openPopup)
        },

        getDate() {
            const {v} = UA0000
            let toDateHH, toDateMM, toDateHHmm

            const date = new Date()
            const hours = date.getHours()
            const today = util.getDateToString()

            // to 시간이 비어있으면 현재시간으로 고정
            if (today === v.from &&
                !v.searchParam.searchToDtHH || v.searchParam.searchToDtHH < hours) {
                v.searchParam.searchToDtHH = hours
            } else if (today !== v.from) {
                v.searchParam.searchToDtHH = '23'
            }

            if (!v.searchParam.searchToDtMM) {
                v.searchParam.searchToDtMM = '59'
            }

            toDateHH = v.searchParam.searchToDtHH
            toDateMM = v.searchParam.searchToDtMM

            // 서버에 보내기 위해 timestamp 로 변환
            const fromDateTimestamp = util.dateToTimestamp(new Date(v.from), true)

            // 캘린더 날짜와 time line 그래프에 찍혀있는 시간, 분 가져오기
            const toDate = v.to
            toDateHHmm = toDate + ' ' + toDateHH + ':' + toDateMM + ':59.999'

            // 서버에 보내기 위해 timestamp 로 변환
            const toDateTimestamp = new Date(toDateHHmm).getTime()

            return {
                from: fromDateTimestamp,
                to: toDateTimestamp
            };
        },


        // user 아이콘 클릭 시 해당 시간대에 사용자 정보를 출력
        getTotalUserList(e) {
            const {v} = UA0000

            const $timeLineTab = $(".time_line .graph_box li")
            const $clickedLi = $(e.target).closest('li')

            // 클릭한 시간대 찾기
            let index = $timeLineTab.index($clickedLi)
            index = util.padding(Number(index))

            const today = util.getDateToString()
            // to date가 오늘인 경우 현재시간 이후 클릭 안되어야함
            if (today === v.to) {
                const currentHour = Number(util.nowTime().substr(0, 2))
                if (index > currentHour) {
                    const msg = trl('common.msg.time')
                    toast(msg)
                    return
                }
            }

            // 캘린더 날짜와 time line 그래프에 찍혀있는 시간, 분 가져오기
            const fromDateHHmm = v.to + ' ' + index + ':' + '00'

            // 캘린더 날짜와 time line 그래프에 찍혀있는 시간, 분 가져오기
            const toDateHHmm = v.to + ' ' + index + ':' + '59:59.999'

            // 서버에 보내기 위해 timestamp 로 변환
            const fromDateTimestamp = new Date(fromDateHHmm).getTime()
            const toDateTimestamp = new Date(toDateHHmm).getTime()

            const options = {
                appendId: 'maxyPopupWrap',
                id: 'userList',
                searchFromDt: fromDateTimestamp,
                searchToDt: toDateTimestamp,
                fromDateHHmm,
                toDateHHmm
            }

            new MaxyPopUserList(options)
        },
        // 검색조건 초기화 및 데이터 초기화
        reset() {
            const {func} = UA0000

            const $graphWrap = $('.user_flow_wrap .graph_wrap')
            $graphWrap.removeClass('exist_user_info')

            $('#appFlowChart').empty()
            $('#noData').show()
            func.resetUserInfo()
            $('#userInfo').hide()
            $('.status.search_after').removeClass('search_after').addClass('search_before')

            // $('#packageNm, #uaCalendarBtn, #uaCalendar, #searchKey, #searchValue').removeAttr('disabled')
            if (sessionStorage.getItem('ua0000Params')) {
                sessionStorage.removeItem('ua0000Params')
            }
            if (sessionStorage.getItem('ua0400Params')) {
                sessionStorage.removeItem('ua0400Params')
            }
        },
        isEmpty(val) {
            return typeof val === "undefined" ||
                val === null ||
                val === "" ||
                val === "null" ||
                val.length === 0 ||
                (typeof val === "object" && !Object.keys(val).length);
        },
        setSearchKeyValue(key, value) {
            $('#searchKey').val(key)
            $('#searchValue').val(value)
        }
    }
}

UA0000.init.getTemplate()
    .then(function (templates) {
        UA0000.v.template.userBehavior = templates.userBehaviorTemplate
        UA0000.v.template.userFlowChart = templates.userFlowChartTemplate

        UA0000.init.created().then(() => {
            UA0000.init.event()
        })
    })