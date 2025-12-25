var userAnalysis = {
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
            searchMxPageId: ''
        },
        template: {
            userBehavior: '',
            userFlowChart: ''
        },
        fileName: '',
        deviceId: '',
        from: '',
        to: ''
    },

    init: {
        async getTemplate() {
            const [userBehaviorResponse, userFlowChartResponse] = await Promise.all([
                fetch('/templates/front/frontUserBehaviorAnalysis.html'),
                fetch('/templates/front/frontUserFlowChart.html')
            ])

            const userBehaviorTemplate = await userBehaviorResponse.text()
            const userFlowChartTemplate = await userFlowChartResponse.text()

            // 두 개의 템플릿을 객체로 반환
            return {userBehaviorTemplate, userFlowChartTemplate}
        },
        event() {
            const {v, func} = userAnalysis

            // 조회하기 버튼 클릭 이벤트
            $('#doSearch').on('click', function (event, param) {
                // 기존에 팝업으로 넘어왔다가 조회버튼 누르면 기존에 갖고있던 데이터 제거
                if (sessionStorage.getItem('userAnalysisPopupParams')) {
                    sessionStorage.removeItem('userAnalysisPopupParams')
                } else if (sessionStorage.getItem('userAnalysisParams')) {
                    sessionStorage.removeItem('userAnalysisParams')
                }

                const $searchValue = $('#searchValue')

                if($searchValue.val() === '-' || util.isEmpty($searchValue.val())) {
                    toast(trl('common.msg.searchValue'))
                    return
                }
                
                // 공통 파라미터 생성
                const getCommonParams = () => ({
                    packageNm: sessionStorage.getItem('packageNm'),
                    serverType: sessionStorage.getItem('serverType'),
                    osType: sessionStorage.getItem('osType') || 'A', // 화면내 별도 os설정 기능이 없어서 session에 없으면 A로 고정
                    from: util.dateToTimestamp(new Date(v.from), true),
                    to: util.dateToTimestamp(new Date(v.to), false),
                    searchType: $('#searchKey').val(),
                    searchValue: ''
                })

                let options = {
                    appendId: 'maxyPopupWrap',
                    id: 'searchUser',
                    ...getCommonParams()
                }

                if($searchValue.val().trim() === '') {
                    new MaxyFrontPopupSearchUser(options)
                    return
                }

                const listParam = {
                    ...getCommonParams(),
                    searchValue: $searchValue.val().trim()
                }

                ajaxCall('/fu/0000/users.maxy', listParam).then(data => {
                    const {users} = data

                    if (users && users.length === 1) {
                        func.getFlowData(param)
                    } else {
                        options.searchValue = listParam.searchValue
                        options.data = users

                        new MaxyFrontPopupSearchUser(options)
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
                    $searchValue.attr('placeholder', trl('common.msg.searchValue'))
                }
            })

            $(document).on('keyup', function (e) {
                if (e.keyCode === 13 && $('#searchValue').is(':focus')){
                    $('#doSearch').trigger('click')
                }
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
                new MaxyFrontPopupUserInfo({
                    id: 'maxyFrontUserInfo',
                    deviceId: v.deviceId ? v.deviceId : $('#searchValue').val()
                })
            })
        },

        async created() {
            const {v} = userAnalysis
            // 화면 그릴 영역
            const contentsWrap = '.contents_wrap'
            const $graph = $(contentsWrap)
            $graph.empty()

            // page 템플릿
            const template = Handlebars.compile(v.template.userBehavior)
            // 데이터 넣기
            $graph.append(template)

            // userAnalysis인 경우: 사용자 분석 메뉴 눌러서 진입한 경우 (새 창 아님)
            // ua0400인 경우: 팝업 내 user flow 버튼 눌러서 새 창으로 진입한 경우 (새 창임)
            if ($('#userAnalysisPopup').length === 1) {
                v.fileName = 'userAnalysisPopup'
            } else {
                v.fileName = 'userAnalysis'
            }

            $('#searchValue').attr('placeholder', trl('common.msg.searchValue'))

            const {func} = userAnalysis
            func.setOptionalSearchFields()

            i18next.changeLanguage(getLang()).then(() => {
                appInfo.append({pId: 'packageNm', oId: '', vId: ''})
                    .then(() => {
                        // 사용자분석 화면 새로고침 시 sse 연결 안되어있으면 다시 연결 (새 창으로 사용자분석 진입한 경우는 ML0100 없음)
                    })
                // 세션에 저장된 값 있으면 세팅해줌 (device id, 패키지명, 서버타입 등)
                func.setPrevData()
                // datePicker 값 세팅
                func.settingDatePicker()
                frontUserflow.setHandlebars()

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
                const {func} = userAnalysis
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
            const {v} = userAnalysis

            // 사용자 분석 버튼(메인화면 등)에서 진입한 경우 or 새로고침 한 경우 가장 최근 데이터로 조회되도록 한다.
            let uaParams = v.fileName === 'userAnalysisPopup'
                ? sessionStorage.getItem('userAnalysisPopupParams')
                : sessionStorage.getItem('userAnalysisParams')

            // 파일명에 따라 세션값 가져오는게 다름
            v.fileName === 'userAnalysisPopup'
                ? uaParams = sessionStorage.getItem('userAnalysisPopupParams')
                : uaParams = sessionStorage.getItem('userAnalysisParams')

            if (uaParams) {
                // 세션스토리지에 저장된 값 가져오기
                uaParams = JSON.parse(uaParams)

                // device id, server type, pacakage name 세팅
                v.searchParam.searchServerType = uaParams.serverType
                v.searchParam.searchPackageNm = uaParams.packageNm

                if (uaParams.mxPageId) {
                    v.searchParam.mxPageId = uaParams.mxPageId
                }

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
        doSearch() {
            const {v, func} = userAnalysis
            v.offsetIndex = 0;
            func.settingDatePicker()
            func.initTimeBox(true)
            func.changeData()
        },
        isValid(min, max) {
            const {v} = userAnalysis
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
            const {v, func} = userAnalysis

            const today = util.getDateToString()
            let uaParams = v.fileName === 'userAnalysisPopup'
                ? sessionStorage.getItem('userAnalysisPopupParams')
                : sessionStorage.getItem('userAnalysisParams')

            v.fileName === 'userAnalysisPopup'
                ? uaParams = sessionStorage.getItem('userAnalysisPopupParams')
                : uaParams = sessionStorage.getItem('userAnalysisParams')

            let inputDate

            if (uaParams) {
                // 세션스토리지에 저장된 값 가져오기
                uaParams = JSON.parse(uaParams)

                if (uaParams.logTm) {
                    v.from = uaParams.logTm
                    v.to = uaParams.logTm
                } else if (uaParams.from && uaParams.to) {
                    v.from = uaParams.from
                    v.to = uaParams.to
                }
                inputDate = util.timestampToDate(v.from)
            } else {
                // 세션에 저장된 값이 없으면 오늘 날짜
                v.from = today
                v.to = today

                inputDate = v.from
            }

            calendar.init({
                id: 'uaCalendar',
                checkedDate: [inputDate],
                fn: (dates, date) => {
                    const isValid = func.isValid(date.min, date.max)
                    if (isValid) {
                        v.from = date.min
                        v.to = date.max

                        func.reset()
                    }
                    func.getFlowData()
                },
                created: () => {
                    // 팝업 내 사용자 행동분석 버튼으로 사용자 분석 화면 진입한 경우 또는 이전 데이터를 조회하고 새로고침 한 경우
                    $('#uaCalendar').val(inputDate)
                    func.getFlowData(uaParams)
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
            const {v, func} = userAnalysis
            await util.sleep(150)
            v.offsetIndex = 0;
            cursor.show()
            func.getFlowData()
            func.settingDatePicker()
            search.save()
        },

        //데이터 가져오기
        getFlowData(param) {
            const {v} = userAnalysis

            cursor.show()
            const {func} = userAnalysis

            let params = {
                'packageNm': '',
                'serverType': '',
                'searchType': $('#searchKey').val(),
                'searchValue': ''
            }

            // 사용자 분석 버튼(로그분석 error,crash,pv 팝업 등)에서 진입한 경우, param으로 받은 값을 넣어줌
            if (param) {
                // 팝업에서 사용자 분석 버튼을 통해 넘어온 경우 logTm을 넣어줌
                params.from = param.logTm ? param.logTm : param.from
                params.to = param.logTm ? param.logTm : param.to

                params.packageNm = param.packageNm ? param.packageNm : $('#packageNm').val()
                params.serverType = param.serverType ? param.serverType : $('#packageNm option:checked').data('server-type')
                params.searchType = param.searchType ? param.searchType : $('#searchKey').val()

                // response, loading 팝업에서 넘어왔을 경우 mxPageId 필요함.
                if (param.mxPageId) {
                    params.mxPageId = param.mxPageId
                }

                // 복합 검색 파라미터 구조 처리
                if (param.searchType === 'multiple' && param.searchValues) {
                    params.searchValues = param.searchValues
                } else {
                    params.searchValue = param.deviceId
                }

            } else {
                const date = func.getDate()
                params.from = date.from
                params.to = date.to
                params.packageNm = $('#packageNm').val()
                params.serverType = $('#packageNm option:checked').data('server-type')
                params.searchValue = $('#searchValue').val()
            }

            // v.fileName === 'userAnalysisPopup' ?
            //     sessionStorage.setItem('userAnalysisPopupParams', JSON.stringify(params))
            //     : sessionStorage.setItem('userAnalysisParams', JSON.stringify(params))

            if (util.checkParam(params) ||
                util.isEmpty(params.searchType) ||
                (util.isEmpty(params.searchValue) && util.isEmpty(params.searchValues))
            ) {
                cursor.hide()
                return
            }

            ajaxCall('/fu/0000/pages.maxy', params, {disableCursor: true})
                .then((data) => {
                    cursor.hide()

                    const {pages} = data 
                    const userFlowList = pages
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

                    const searchType = params.searchType
                    const searchValue = params.searchValue
                    $noData.hide()

                    v.deviceId = userFlowList[0][0]['deviceId']

                    func.setUserInfo(userFlowList, searchType, searchValue)
                    func.drawFlowChart(userFlowList, params).then(func.filter.do)
                })
                .catch((error) => {
                    console.log(error)
                    cursor.hide()
                    toast('해당 Page 정보를 찾을 수 없습니다.')
                })
        },
        setUserInfo(data, searchType, searchValue) {
            let userId, userNm, deviceId, clientNo

            // userId 검색조건 여부
            const isUserIdSearch = ('userId' === searchType)
            const isDeviceIdSearch = ('deviceId' === searchType)
            const isClientNoSearch = ('clientNo' === searchType)

            // user flow list 중에 검색 된 user id랑 name이 하나라도 있으면 유저정보 표시
            outer: for (let i = 0; i < data.length; i++) {
                // 가장 마지막에 접속한 userId를 찾기 위해 data를 역순으로 순회
                for (let j = data[i].length - 1; j >= 0; j--) {
                    const row = data[i][j]
                    const tmpUserId = row.userId
                    const tmpUserName = row.userNm
                    const tmpDeviceId = row.deviceId
                    const tmpClientNo = row.clientNo

                    // deviceId, userId 유효성 체크
                    const hasDevice = !(util.isEmpty(tmpDeviceId) || tmpDeviceId === '-')
                    const hasUserId = !(util.isEmpty(tmpUserId) || tmpUserId === '-')
                    const hasClientNo = !(util.isEmpty(tmpClientNo) || tmpClientNo === '-')

                    // deviceId 검색 조건인 경우: 검색값과 일치하는 deviceId를 찾는다
                    if (isDeviceIdSearch) {
                        if (hasDevice && searchValue === tmpDeviceId) {
                            deviceId = tmpDeviceId
                            // userId가 존재하면 함께 세팅
                            if (hasUserId) {
                                userId = tmpUserId
                                userNm = tmpUserName
                            }
                            break outer
                        }
                        continue
                    }

                    // userId 검색 조건인 경우: 검색값과 일치하는 userId를 찾는다
                    if (isUserIdSearch) {
                        if (hasUserId && searchValue === tmpUserId) {
                            userId = tmpUserId
                            userNm = tmpUserName
                            if (hasDevice) {
                                deviceId = tmpDeviceId
                            }
                            break outer
                        }
                        continue
                    }

                    // 3) clientNo로 검색한 경우: clientNo 일치 레코드 우선 선택
                    if (isClientNoSearch) {
                        if (hasClientNo && searchValue === tmpClientNo) {
                            clientNo = tmpClientNo
                            // 부가정보가 있으면 함께 세팅
                            if (hasDevice) deviceId = tmpDeviceId
                            if (hasUserId) {
                                userId = tmpUserId
                                userNm = tmpUserName
                            }
                            break outer
                        }
                        continue
                    }

                    // 그 외 검색 조건(혹은 기본 동작): 가장 최근의 유효한 레코드를 하나 선정
                    if (hasDevice || hasUserId) {
                        if (hasDevice) deviceId = tmpDeviceId
                        if (hasUserId) {
                            userId = tmpUserId
                            userNm = tmpUserName
                        }
                        break outer
                    }
                }
            }

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

            if ((!util.isEmpty(userId) && userId !== '-')
            || (!util.isEmpty(userNm) && userNm !== '-') ||
                (!util.isEmpty(deviceId) || deviceId === '-')) {

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
                const userNmText = trl('common.text.userNm')
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
            const {v, func} = userAnalysis

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

            const msg = trl('common.msg.deviceIdCopy')

            const tooltipTxt = [
                trl('common.text.osVersion'),
                trl('common.text.location'),
            ]

            for (let i = 0; i < userFlowList.length; i++) {
                tippy('#deviceId_' + i, {
                    content: msg,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                tippy('#osVer_' + i, {
                    content: tooltipTxt[0],
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                tippy('#timezone_' + i, {
                    content: tooltipTxt[1],
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
            frontUserflow.addTooltip(userFlowList, params)

            // 그래프 클릭 시 팝업 열기
            // 클릭 대상
            const $pageGraph = $('.graph .page_wrap .page')
            $pageGraph.on('click', frontUserflow.openPopup)
        },

        getDate() {
            const {v} = userAnalysis
            let toDateHH, toDateMM, toDateHHmm

            const date = new Date()
            const hours = date.getHours()
            const today = util.getDateToString()

            let from
            if (typeof v.from === 'number') {
                from = util.timestampToDate(v.from)
            } else {
                from = v.from
            }

            // to 시간이 비어있으면 현재시간으로 고정
            if (today === from &&
                !v.searchParam.searchToDtHH || v.searchParam.searchToDtHH < hours) {
                v.searchParam.searchToDtHH = hours
            } else if (today !== from) {
                v.searchParam.searchToDtHH = '23'
            }

            if (!v.searchParam.searchToDtMM) {
                v.searchParam.searchToDtMM = '59'
            }

            toDateHH = v.searchParam.searchToDtHH
            toDateMM = v.searchParam.searchToDtMM

            // 서버에 보내기 위해 timestamp 로 변환
            const fromDateTimestamp = util.dateToTimestamp(new Date(from), true)

            let to
            if (typeof v.from === 'number') {
                to = util.timestampToDate(v.to)
            } else {
                to = v.to
            }

            // 캘린더 날짜와 time line 그래프에 찍혀있는 시간, 분 가져오기
            const toDate = to
            toDateHHmm = toDate + ' ' + toDateHH + ':' + toDateMM + ':59.999'

            // 서버에 보내기 위해 timestamp 로 변환
            const toDateTimestamp = new Date(toDateHHmm).getTime()

            return {
                from: fromDateTimestamp,
                to: toDateTimestamp
            };
        },
        // 검색조건 초기화 및 데이터 초기화
        reset() {
            const {func} = userAnalysis

            const $graphWrap = $('.user_flow_wrap .graph_wrap')
            $graphWrap.removeClass('exist_user_info')

            $('#appFlowChart').empty()
            $('#noData').show()
            func.resetUserInfo()
            $('#userInfo').hide()
            $('.status.search_after').removeClass('search_after').addClass('search_before')

            // $('#packageNm, #uaCalendarBtn, #uaCalendar, #searchKey, #searchValue').removeAttr('disabled')
            if (sessionStorage.getItem('userAnalysisParams')) {
                sessionStorage.removeItem('userAnalysisParams')
            }
            if (sessionStorage.getItem('userAnalysisPopupParams')) {
                sessionStorage.removeItem('userAnalysisPopupParams')
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

userAnalysis.init.getTemplate()
    .then(function (templates) {
        userAnalysis.v.template.userBehavior = templates.userBehaviorTemplate
        userAnalysis.v.template.userFlowChart = templates.userFlowChartTemplate

        userAnalysis.init.created().then(() => {
            userAnalysis.init.event()
        })
    })