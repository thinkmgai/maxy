'use strict';

// select > option 태그 추가 함수
const appendOptions = ($select, optionArray) => {
    if (typeof optionArray === 'object') {
        optionArray.forEach(d => {
            const $option = $('<option>', {'text': d.text, 'value': d.value})
            // data 속성 추가
            for (const key in d) {
                if (key.startsWith('data-')) {
                    $option.attr(key, d[key])
                }
            }
            $select.append($option)
        });
    }
    return $select
}

// 검색창 관련 공통 함수
const search = {
    v: {
        fromCalendar: {},
        toCalendar: {},
        /*
            로그분석의 error, crash. pv 탭을 이동할 때 마다 search 팝업을 새로 append 하면서 (조회 조건이 다르기 때문에)
            calendar도 계속 초기화 됨에따라 기존에 입력해둔 날짜, 시간이 없어짐. 없어지지 않게 해당 변수에 저장하고 변수에 값이 있으면
            그 값을 set 해주도록 함
        */
        fromDate: '',
        toDate: '',
        fromHour: '',
        toHour: '',
        fromMinute: '',
        toMinute: ''
    },
    id: 'searchPopup',
    menuNm: '',
    /**
     * 검색창 추가
     * @param option{{keyword: boolean, type: string[], data: {}, func: (function(): number)}}
     */
    async append(option) {
        // 검색창 확인용
        const $existPopup = $('#' + search.id)
        // 이미 검색창이 있으면 삭제하고 다시 만들기
        if ($existPopup.length > 0) {
            $existPopup.remove()
        }

        // 검색창 여는 버튼 삭제 후 다시 추가 (이벤트 unbind)
        const $searchPopupWrapper = $('#showSearchPopupWrapper').empty()
        $searchPopupWrapper.empty()
        const $btnShowSearchPopup = $('<button>', {
            'id': 'btnShowSearchPopup',
            'class': 'search_open_btn search'
        })
        $searchPopupWrapper.append($btnShowSearchPopup)
        $searchPopupWrapper.append('<div class="search_popup_append_wrap"></div>')

        // option 없으면 빈값 넣어주기 (에러 방지)
        option = option ? option : {}
        // 검색창이 들어갈 contents_wrap
        const $contentsWrap = $('.contents_wrap')
        const $searchPopupWrap = $('.search_popup_append_wrap')
        // 검색창
        // const $popup = $('<div>', {'id': search.id, 'class': 'search_wrap'})
        const popupHtml = await fetch('/templates/search/search-popup.html')
            .then(response => response.text())
        const template = Handlebars.compile(popupHtml)

        $searchPopupWrap.html(template)
        const $popup = $('#searchPopup')

        search.menuNm = option.menuNm
        //console.log(search.menuNm)

        if (option.menuNm === 'TA0001') {
            $popup.addClass('log_type_on')
        }
        const dateContent = $('.search_date_content')
        // 검색버튼
        const $btnSearch = $('<button>', {'id': 'btnSearch', 'class': 'search_btn opposite', 'text': 'Search'})

        const $btnSearchWrap = $('.search_popup_btn_wrap')
        const $checkBoxWrap = $('#searchPopup.search_popup_wrap.log_type_on .log_type_wrap')
        $btnSearchWrap.append($btnSearch)

        // 검색 조건 초기화 버튼
        const $resetSearch = $('<button>', {
            'id': 'resetSearch',
            'text': 'Reset',
            'class': 'search_btn'
        })
        $btnSearchWrap.prepend($resetSearch)
        $resetSearch.on('click', search.reset)

        // 검색란
        if (option.keyword) {
            search.add.keyword(dateContent)
        }

        // 검색 조건 wrapper
        const $searchFilter = $('.search_filter_content')
        const $searchOsVer = $('.search_os_ver_content')
        const appInfoContent = $('.search_appInfo_content')
        const $dtWrapWrap = $('<div>', {'class': 'date_time_wrap_wrap'})

        let {type: types} = option
        const typeArray = []
        for (let key of Object.keys(types)) {
            if (types[key]) {
                typeArray.push(types[key])
            }
        }

        // 'appInfo'가 types에 포함되어 있는지 확인
        if (!Object.values(types).includes('appInfo')) {
            appInfoContent.hide() // div 숨기기
        } else {
            appInfoContent.show() // 필요하면 다시 보이게 처리
        }

        const dateTimeArr = ['fromDt', 'fromDttm', 'toDt', 'toDttm']
        const textTypeArr = [
            'textType1', 'textType2', 'textType3', 'textType4',
            'textType5', 'textType6', 'textType7', 'textType8'
        ]
        for (let key of typeArray) {
            if (dateTimeArr.includes(key)) {
                search.add.dateTime(dateContent, $dtWrapWrap, key, option.menuNm)
                continue
            } else if (textTypeArr.includes(key)) {
                continue
            } else if (key === 'appInfo') {
                let packageNm = false;
                let osType = false;
                let appVer = false;
                for (let k of typeArray) {
                    if (k === 'packageNm') {
                        packageNm = true;
                    } else if (k === 'appVer') {
                        appVer = true;
                    } else if (k === 'osType') {
                        osType = true;
                    }
                }
                search.add[key](appInfoContent, packageNm, appVer, osType)
                continue
            } else if (key === 'checkAppVer') {
                const packageNm = sessionStorage.getItem('packageNm')
                const serverType = sessionStorage.getItem('serverType')
                await search.add[key]($searchOsVer, packageNm, serverType)
                continue
            }

            try {
                search.add[key]($searchFilter)
            } catch (e) {
                console.log(key + ' is not defined.')
            }
        }

        $('.search_contents').append($searchFilter)

        $contentsWrap.append($popup)

        for (let key of typeArray) {
            if (textTypeArr.includes(key)) {
                search.add[key]($popup)
            }
        }

        types = types.reduce((acc, type) => {
            acc[type] = true;
            return acc;
        }, {});

        option.type = option.type.reduce((acc, type) => {
            acc[type] = true;
            return acc;
        }, {});

        if (!option.type.fromDttm) {
            $('#searchFromDt').css('width', '100%')
            $('#searchToDt').css('width', '100%')
        }

        if (types.fromDt || types.fromDttm || types.toDttm || types.toDt) {
            const $searchFromDt = $('#searchFromDt')
            const $searchToDt = $('#searchToDt')
            if (types.fromDt || types.fromDttm && $searchFromDt.length > 0) {
                search.v.fromCalendar = calendar.init({
                    id: 'searchFromDt',
                    type: 'single',
                    created: () => {
                        const $searchFromDt = $('#searchFromDt')

                        if (search.v.fromDate) {
                            $searchFromDt.val(search.v.fromDate)
                        } else {
                            // 오늘날짜 세팅
                            const today = util.getDateToString()
                            $searchFromDt.val(today)
                        }

                        if (search.v.fromHour) {
                            $('#searchFromDtHH').val(search.v.fromHour)
                        }
                        if (search.v.fromMinute) {
                            $('#searchFromDtmm').val(search.v.fromMinute)
                        }

                    },
                    fn: (date) => {
                        // 바뀐 날짜로 세팅 (date는 배열형태임)
                        $('#searchFromDt').val(date[0])

                        const isDisplaySearchToDt = $searchToDt.css('display')
                        if (isDisplaySearchToDt === 'none') {
                            $('#searchToDt').val(date[0])
                        }

                        /*
                         실시간 로그조회 (당일 조회만 가능)
                          - search 팝업 내에서 오늘 이전 날짜로 변경할 시 시간을 00:00 ~ 23:59로 세팅
                      */
                        if (date[0] !== util.getDateToString()) {
                            $('#searchFromDtHH').val('00')
                            $('#searchFromDtmm').val('00')
                            $('#searchToDtHH').val('23')
                            $('#searchToDtmm').val('59')
                        } else {
                            const date = new Date()
                            let hours = date.getHours()
                            let minutes = date.getMinutes()

                            if (hours < 10) {
                                hours = util.padding(hours)
                            }
                            if (minutes < 10) {
                                minutes = util.padding(minutes)
                            }
                            $('#searchFromDtHH').val('00')
                            $('#searchFromDtmm').val('00')
                            $('#searchToDtHH').val(hours)
                            $('#searchToDtmm').val(minutes)
                        }
                    }
                })

                if (search.v.fromDate) {
                    search.v.fromCalendar.settings.selected.dates = []
                    search.v.fromCalendar.settings.selected.dates.push(search.v.fromDate)
                    search.v.fromCalendar.update({year: true, month: true, dates: true})
                }
            }
            if (types.toDt || types.toDttm && $searchToDt.length > 0) {
                search.v.toCalendar = calendar.init({
                    id: 'searchToDt',
                    type: 'single',
                    created: () => {
                        const $searchToDt = $('#searchToDt')
                        // 오늘날짜 세팅
                        if (search.v.toDate) {
                            $searchToDt.val(search.v.toDate)
                        } else {
                            const today = util.getDateToString()
                            $searchToDt.val(today)
                        }

                        if (search.v.toHour) {
                            $('#searchToDtHH').val(search.v.toHour)
                        }
                        if (search.v.toMinute) {
                            $('#searchToDtmm').val(search.v.toMinute)
                        }
                    },
                    fn: (date, {min, max}, e) => {
                        const $searchFromDt = $('#searchFromDt')
                        const $searchToDt = $('#searchToDt')

                        // from 날짜가 to 날짜보다 크면 return
                        if ($searchFromDt.val() > date[0]) {
                            return
                        }
                        // 바뀐 날짜로 세팅 (date는 배열형태임)
                        $searchToDt.val(date[0])

                        /*
                        로그분석 (기간 조회 가능)
                         - to date를 오늘 이전 날짜로 바꾸면 to time을 23:59로 세팅
                     */
                        const isDisplaySearchToDt = $searchToDt.css('display')
                        if (date[0] !== util.getDateToString()
                            && isDisplaySearchToDt === 'block') {
                            $('#searchToDtHH').val('23')
                            $('#searchToDtmm').val('59')
                        }
                    }
                })

                if (search.v.toDate) {
                    search.v.toCalendar.settings.selected.dates = []
                    search.v.toCalendar.settings.selected.dates.push(search.v.toDate)
                    search.v.toCalendar.update({year: true, month: true, dates: true})
                }
            }

        }

        // 앱 정보 (packageNm(serverType) / osType / appVer)
        const pId = 'packageNm'
        if (types.appInfo) {
            // $searchFilter.append($sSelect)
            const p = {
                pId: pId
            }
            if (types.osType) {
                p['oId'] = 'osType'
            }
            if (types.appVer) {
                p['vId'] = 'appVer'
            }
            await appInfo.append(p)
        }

        if (types.checkAppVer) {
            $searchFilter.hide()

            // search팝업 내 패키지변경시 OS Type, App Ver 구성 변경
            $('#' + pId).on('change', async function () {
                const $this = $(this)
                const packageNm = $this.val()
                const serverType = $this.find('option:selected').data('server-type')

                await search.add.checkAppVer($searchOsVer, packageNm, serverType)
            })
        }

        const resetContent = trl('common.btn.searchReset')
        // Reset 버튼 툴팁 추가
        tippy('#resetSearch', {
            content: resetContent,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip',
        })

        // event 등록
        $btnShowSearchPopup.show()
        $btnShowSearchPopup.on('click', search.toggle)

        if (types.fromDt || types.fromDttm || types.toDt || types.toDttm) {
            /* 시간 입력 - 숫자 제한 */
            $('.time_box input').on('propertychange change keyup paste input', function () {
                this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
            })
        }

        // 검색 팝업에서 로그 타입 버튼을 눌렀을 때 이벤트
        // 버튼이 눌린 상태를 확인
        const isActive = $(this).hasClass('active');
        if ($popup.hasClass('log_type_on')) {
            search.add.addCheckBox(logTypeSetMap, $checkBoxWrap);
        }

        if (isActive) {
            // 이미 눌린 상태라면, slideUp을 적용
            $('.checkBox_wrap').slideUp(500)
            $(this).removeClass('active');  // 눌림 해제 상태로 변경
        } else {
            // 눌리지 않은 상태라면, slideDown을 적용
            // 추가적인 함수 호출 (search.add.addCheckBox)
            $('.checkBox_wrap').slideDown(500);
            $(this).addClass('active');  // 눌린 상태로 변경
        }

        $('.search_contents').append($btnSearchWrap)
        // $searchFilter.append($btnSearchWrap)

        $('#btnSearch').on('click', () => {
            const ckBoxes = document.querySelectorAll('.log_type_group_wrap input[type="checkbox"]')
            const checkedCkBoxes = document.querySelectorAll('.log_type_group_wrap input[type="checkbox"]:checked')

            // 체크된 선택박스가 없으면
            if (ckBoxes.length !== 0 && checkedCkBoxes.length === 0) {
                toast(trl('common.msg.noSelect'))
                return
            }

            // option.func() 의 반환값이 -1이면 검색창을 닫지 않음
            // 예) util.emptyInput 을 사용할 경우 검색창을 닫으면 안됨
            if (option.func() !== -1) {
                search.hide()
            }
        })
    },
    /**
     * 검색창 토글 함수
     * func 객체에 함수를 넣으면 닫은 후 해당 함수를 실행
     *
     * @param param {{func: function=}=}
     */
    toggle(param) {
        const $popup = $('#' + search.id)
        const $dimmed = $('.search_dimmed')
        const $calendarDimmed = $('.calendar_dimmed')
        const $searchWrap = $('.search_wrap')
        if ($popup.length > 0) {
            if ($popup.css('display') === 'none') {
                $popup.show()
                $dimmed.show()
                $dimmed.on('click', search.hide)
                $calendarDimmed.on('click', function () {
                    $calendarDimmed.hide()
                })
                $searchWrap.on('click', function () {
                    $calendarDimmed.hide()
                })
            } else {
                // 함수 실행하고 닫기
                if (param && param.func) {
                    param.func()
                }
                search.hide()
            }
        }

        $(document).on('click', '.date_time_wrap', function () {
            //$calendarDimmed.show() // calendar_dimmed를 통해 달력팝업이 닫히는게 아닌듯
        })

        $('#logClass').on('change', function (e) {
            let selectBox = document.getElementById('logType');

            while (selectBox.options.length > 0) {
                selectBox.remove(0);
            }

            let selectedOption = $(this).find('option:selected');
            const optionDataType = selectedOption[0].dataset.type
            const dataArray = optionDataType.split(":")

            search.insertLogTypeOption(dataArray)
        })
    },
    insertLogTypeOption(param) {
        const $wrap = $('#logType')
        $wrap.empty()
        // $wrap.append($('<label for="logType">로그 유형</label>'))
        // $wrap.append($('<label for="logType">로그 유형</label>'))
        const text = {
            'logType': trl('common.text.logtypeall'),
            'error': trl('dashboard.bi.error'),
            'scripterror': trl('dashboard.bi.scripterror'),
            'crash': trl('dashboard.bi.crash'),
            'response': trl('dashboard.bi.response'),
            'request': trl('common.text.request'),
            'appforeground': trl('common.text.appforeground'),
            'appbackground': trl('common.text.appbackground'),
            'appstart': trl('common.text.appstart'),
            'start': "Start",
            'end': "End",
            'open': "Open",
            'send': "Send",
            'common': "Common",
            'alarm': "Alarm",
            "sumbit": "Submit"
        }

        const optionAllArray = [
            {'text': text.logType, 'value': ''},
            {'text': text.error, 'value': 'Error'},
            {'text': text.scripterror, 'value': 'Script Error'},
            {'text': text.crash, 'value': 'Crash'},
            {'text': text.request, 'value': 'Request'},
            {'text': text.response, 'value': 'Response'},
            {'text': text.appforeground, 'value': 'App Foreground'},
            {'text': text.appbackground, 'value': 'App Background'},
            {'text': text.appstart, 'value': 'App Start'},
            {'text': text.start, 'value': 'Start'},
            {'text': text.end, 'value': 'End'},
            {'text': text.open, 'value': 'Open'},
            {'text': text.send, 'value': 'Send'},
            {'text': text.common, 'value': 'Common'},
            {'text': text.alarm, 'value': 'Alarm'},
            {'text': text.sumbit, 'value': 'Submit'}
        ]

        let optionArray = []

        if (param[0] === '') {
            $wrap.append(appendOptions($wrap, optionAllArray))
        } else {
            for (const item of optionAllArray) {
                for (const p of param) {
                    if (item.value === p) {
                        optionArray.push(item)
                    }
                }
            }
            optionArray.unshift({'text': text.logType, 'value': ''})

            $wrap.append(appendOptions($wrap, optionArray))
        }

    },
    // 검색창 닫기
    hide() {
        const $popup = $('#' + search.id)
        const $dimmed = $('.search_dimmed')

        // 팝업 hide
        $popup.hide()

        // dimmed hide
        $('.calendar_dimmed').hide()
        $dimmed.hide()
        $dimmed.off('click')
    },
    /**
     * 검색 조건 결과 텍스트 생성 함수
     * @param tid {String=} 결과 텍스트가 들어갈 Element ID
     * @param did {String=} Date 가 들어갈 Element ID
     */
    setOptionsText(tid, did) {
        const $searchOptionText = $('#' + (tid ? tid : 'searchOptionText'))
        const $searchTextDate = $('#' + (did ? did : 'searchTextDate'))
        if ($searchOptionText.length < 1) {

            return
        }

        // 1. date / time box
        const $searchFromDt = $('#searchFromDt')
        const $searchToDt = $('#searchToDt')
        if ($searchFromDt.length > 0) {
            const $searchFromDtHH = $('#searchFromDtHH')
            const $searchFromDtmm = $('#searchFromDtmm')
            const $searchToDtHH = $('#searchToDtHH')
            const $searchToDtmm = $('#searchToDtmm')
            // date + time box
            if ($searchFromDtHH.length > 0) {
                $searchTextDate.text(
                    $searchFromDt.val() + ' '
                    + $searchFromDtHH.val() + ':' + $searchFromDtmm.val()
                    + '~' + $searchToDtHH.val() + ':' + $searchToDtmm.val()
                )
            }
            // date box
            else {
                $searchTextDate.text($searchFromDt.val() + '~' + $searchToDt.val())
            }
        }

        // 2. search_filter select
        let optionText = ''
        const $selected = $('.search_filter select > option:selected')

        for (let i = 0; i < $selected.length; i++) {
            const option = $($selected[i]).text()
            if (option) {
                optionText += ' | ' + option
            }
        }

        // 3. set option text to target elements
        $searchOptionText.text(optionText)
    },
    types: [
        'searchText',
        'searchFromDt', 'searchFromDtHH', 'searchFromDtmm',
        'searchToDt', 'searchToDtHH', 'searchToDtmm',
        'textType', 'userType', 'logType',
        'osType', 'prevCalendar', 'nextCalendar', 'logClass'
    ],
    save() {
        const {types} = search
        //console.log(search.menuNm)

        let $packageNmTarget = $('#packageNm')
        if ($packageNmTarget.css('display') !== 'block') {
            $packageNmTarget = $('#packageNm_a')
        }

        for (let i in types) {
            const type = types[i]
            const $item = $('#' + type)
            if (type.indexOf('searchFrom') >= 0
                || type.indexOf('searchTo') >= 0
            ) {
                continue
            }
            if (type === 'serverType') {
                sessionStorage.setItem(type, $packageNmTarget.find('option:selected').data('server-type'));
            }
            if ($item.length > 0 && type !== 'serverType') {
                sessionStorage.setItem(type, $item.val())
            }
        }
    },
    async load() {
        const {types} = search
        for (let i in types) {
            const type = types[i]
            if ('packageNm' === type
                || 'serverType' === type
                || 'osType' === type
                || 'appVer' === type
                || type.indexOf('searchFrom') >= 0
                || type.indexOf('searchTo') >= 0
            ) {
                continue
            }
            const item = sessionStorage.getItem(type)
            if (item !== null) {
                $('#' + type).val(item)
            }
        }
    },
    reset() {
        const {types} = search
        const now = new Date()
        let minutes = now.getMinutes()
        if (minutes < 10) {
            minutes = '0' + minutes
        }
        for (let i = 0; i < types.length; i++) {
            const type = types[i]
            const id = '#' + type
            if (type === 'searchFromDt' || type === 'searchToDt') {
                if (document.getElementById(type)) {
                    $(id).val(util.dateFormat())

                    // 검색팝업 내 from calendar, to calendar도 오늘 날짜로 초기화
                    search.v.fromCalendar.settings.selected.dates = []
                    search.v.toCalendar.settings.selected.dates = []
                    search.v.fromCalendar.settings.selected.dates.push(util.dateFormat())
                    search.v.toCalendar.settings.selected.dates.push(util.dateFormat())
                    search.v.fromCalendar.update({year: true, month: true, dates: true})
                    search.v.toCalendar.update({year: true, month: true, dates: true})
                }
            } else if (type === 'searchFromDtHH' || type === 'searchFromDtmm') {
                if (document.getElementById(type)) {
                    $(id).val('00')
                }
            } else if (type === 'searchToDtHH') {
                if (document.getElementById(type)) {
                    let hours = now.getHours()

                    if (hours < 10) {
                        hours = '0' + hours
                    }
                    $(id).val(hours)
                }
            } else if (type === 'searchToDtmm') {
                if (document.getElementById(type)) {
                    $(id).val(minutes)
                }
            } else if (type === 'searchText') {
                $(id).val('')
            }
            // slide를 다시 올림.
            $('.checkBox_wrap').slideUp(500)
            $('#logTypeBtn').removeClass('active')
            const checkboxes = document.querySelectorAll('.checkBox_wrap input[type="checkbox"]')
            checkboxes.forEach(checkbox => {
                // 모든 checkBox 선택 및 logTypeArr 비움 ( 검색조건을 사용하지 않게 )
                checkbox.checked = true;
                TA0001.v.logTypeArr = []
            });
        }
        const $searchFilterSelectEl = $('.search_keyword select, .search_filter select')
            .not('#packageNm')
            .find('option:first')
        $searchFilterSelectEl.attr('selected', 'selected')
        $searchFilterSelectEl.prop('selected', true)

        // search 팝업 내 reset 버튼 클릭 시 osType, appVer 모두 '전체'로 변경
        // 단, 세션 값 변경은 없음 (세션 값은 저장 눌러야 변경됨)
        $('#osType').val('A').prop('selected', true)
        $('#appVer option').not('[value="A"]').remove()

        search.insertLogTypeOption([''])

        const msg = trl('common.msg.reset')
        toast(msg)
    },
    add: {
        keyword($popup) {
            const placeholder = trl('common.msg.searchValue')
            const $searchKeyword = $('<div>', {'class': 'search_keyword'})
            $searchKeyword.append($('<input>', {
                'id': 'searchText',
                'type': 'text',
                'placeholder': placeholder
            }))
            // 검색란 옆에 검색 버튼 추가
            // $searchKeyword.append($btnSearch)
            if ($popup.find('.search_keyword').length <= 0) {
                $popup.append($searchKeyword)
            }
        },
        // searchType (Raw / Group)
        searchType($searchFilter) {
            const $select = $('<select>', {'class': 'search_groups', 'id': 'searchType'})
            $searchFilter.append(appendOptions($select, [
                {'text': 'Raw', 'value': 'Raw'},
                {'text': 'Group', 'value': 'Group'}
            ]))
        },
        dateTime($popup, $dtWrapWrap, key, menuNm) {
            // fromDt
            if (key === 'fromDt' || key === 'fromDttm') {
                const $dtWrap = $('<div>', {'class': 'date_time_wrap', 'id': 'searchFromDtWrap'})
                $dtWrap.append($('<input>', {
                    'type': 'text',
                    'class': 'calendar_input',
                    'id': 'searchFromDt',
                    'readOnly': true
                }))
                if (key === 'fromDttm') {
                    if (menuNm !== 'TA0001') {
                        // fromTm
                        const $tmWrap = $('<div>', {'class': 'time_box'})
                        $tmWrap.append($('<input>', {
                            'type': 'text',
                            'pattern': '[0-9]+',
                            'class': 'time_box_input',
                            'maxlength': 2,
                            'id': 'searchFromDtHH',
                            'value': '00'
                        }))
                        $tmWrap.append(':')
                        $tmWrap.append($('<input>', {
                            'type': 'text',
                            'pattern': '[0-9]+',
                            'class': 'time_box_input',
                            'maxlength': 2,
                            'id': 'searchFromDtmm',
                            'value': '00'
                        }))
                        $dtWrap.append($tmWrap)
                    }
                }

                $dtWrapWrap.append($dtWrap)
            }
            // toDt
            if (key === 'toDt' || key === 'toDttm') {
                const $dtWrap = $('<div>', {'class': 'date_time_wrap', 'id': 'searchToDtWrap'})
                if (menuNm === 'TA0001') {
                    const $tmWrap = $('<div>', {'class': 'time_box'})

                    $tmWrap.append($('<input>', {
                        'type': 'text',
                        'pattern': '[0-9]+',
                        'class': 'time_box_input',
                        'maxlength': 2,
                        'id': 'searchFromDtHH',
                        'value': search.v.fromHour ? search.v.fromHour : '00'
                    }))
                    $tmWrap.append(':')
                    $tmWrap.append($('<input>', {
                        'type': 'text',
                        'pattern': '[0-9]+',
                        'class': 'time_box_input',
                        'maxlength': 2,
                        'id': 'searchFromDtmm',
                        'value': search.v.fromMinute ? search.v.fromMinute : '00'
                    }))
                    $dtWrap.append($tmWrap)
                }
                $dtWrap.append($('<input>', {
                    'type': 'text',
                    'class': 'calendar_input',
                    'id': 'searchToDt',
                    'readOnly': true
                }))
                if (key === 'toDttm') {
                    const now = new Date()
                    let hours = now.getHours()
                    let minutes = now.getMinutes()
                    if (hours < 10) {
                        hours = '0' + hours
                    }
                    if (minutes < 10) {
                        minutes = '0' + minutes
                    }

                    const $tmWrap = $('<div>', {'class': 'time_box '})
                    if (menuNm === 'TA0001') {
                        $tmWrap.append('<span>~</span>')
                    }

                    $tmWrap.append($('<input>', {
                        'type': 'text',
                        'class': 'time_box_input',
                        'pattern': '[0-9]+',
                        'maxlength': 2,
                        'id': 'searchToDtHH',
                        'value': search.v.toHour ? search.v.toHour : hours
                    }))
                    $tmWrap.append(':')
                    $tmWrap.append($('<input>', {
                        'type': 'text',
                        'class': 'time_box_input',
                        'pattern': '[0-9]+',
                        'maxlength': 2,
                        'id': 'searchToDtmm',
                        'value': search.v.toMinute ? search.v.toMinute : minutes
                    }))
                    $dtWrap.append($tmWrap)
                }
                $dtWrapWrap.append($dtWrap)    //날짜 초기화
            }
            $popup.append($dtWrapWrap)

        },
        // textType1 (사용자명 / 장치 ID)
        textType1() {
            const $wrap = $('<div class="search_option_wrap">')
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const all = trl('common.text.textall')
            const deviceId = trl('common.tableColumn.deviceId')
            const userId = trl('common.text.userId')
            const userNm = trl('management.user.name')

            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': all, 'value': ''},
                {'text': deviceId, 'value': 'deviceId'},
                {'text': userId, 'value': 'userId'},
                {'text': userNm, 'value': 'userNm'}
            ]))

            $('.search_keyword').prepend($wrap)
        },
        // textType2 (사용자명 / 장치 ID)
        textType2() {
            const $wrap = $('<div class="search_option_wrap">')
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const text = {
                'deviceId': trl('common.tableColumn.deviceId'),
                'userId': trl('common.text.userId'),
                'userNm': trl('management.user.name')
            }

            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': text.deviceId, 'value': 'deviceId'},
                {'text': text.userId, 'value': 'userId'},
                {'text': text.userNm, 'value': 'userNm'}
            ]))
            $('.search_keyword').prepend($wrap)
        },
        // textType3 (사용자명 / 장치 ID / 호출 URL)
        textType3() {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'placeholder': trl('common.msg.searchValue'),
                'deviceId': trl('common.tableColumn.deviceId'),
                'userId': trl('common.text.userId'),
                'userNm': trl('management.user.name'),
                'reqUrl': trl('management.device.btn.reqUrl')
            }

            const all = trl('common.text.textall')
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': all, 'value': ''},
                {'text': text.deviceId, 'value': 'deviceId'},
                {'text': text.userId, 'value': 'userId'},
                {'text': text.userNm, 'value': 'userNm'},
                {'text': text.reqUrl, 'value': 'reqUrl'},
                {'text': "Page Url", 'value': 'pageUrl'}
            ]))
            $('.search_keyword').prepend($wrap)
        },
        // textType4 (전체 / 웹서버 / 리소스다운로드)
        textType4($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const all = trl('common.text.textall')
            const deviceId = trl('common.tableColumn.deviceId')
            const userId = trl('common.text.userId')
            const userNm = trl('management.user.name')

            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': all, 'value': ''},
                {'text': deviceId, 'value': 'deviceId'},
                {'text': userId, 'value': 'userId'},
                {'text': userNm, 'value': 'userNm'}
            ]))
            $searchFilter.append($wrap)
        },
        // textType5 (전체 / 코드값 / 코드명)
        textType5() {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'placeholder': trl('common.msg.searchValue'),
                'deviceId': trl('common.tableColumn.deviceId'),
                'userId': trl('common.text.userId'),
                'userNm': trl('management.user.name'),
                'pageUrl': "Page Url"
            }

            const all = trl('common.text.textall')
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': all, 'value': ''},
                {'text': text.deviceId, 'value': 'deviceId'},
                {'text': text.userId, 'value': 'userId'},
                {'text': text.userNm, 'value': 'userNm'},
                {'text': text.pageUrl, 'value': 'pageUrl'}
            ]))
            $('.search_keyword').prepend($wrap)
        },
        // textType6 (전체 / 사용자명 / 사용자 ID / 그룹명)
        textType6($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'target': trl('common.text.searchtarget'),
                'userId': trl('common.text.userId'),
                'userName': trl('management.user.name'),
                'groupName': trl('management.user.groupName')
            }
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': text.target, 'value': ''},
                {'text': text.userId, 'value': 'userId'},
                {'text': text.userName, 'value': 'userNm'},
                {'text': text.groupName, 'value': 'grpNm'}
            ]))
            $searchFilter.append($wrap)
        },
        // textType7 (전체 / 사용자명 / 사용자 ID / 그룹명)
        textType7($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'target': trl('common.text.searchtarget'),
                'packageNm': trl('common.text.packageNm'),
                'displayNm': trl('system.package.displayName')
            }
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': text.target, 'value': ''},
                {'text': text.packageNm, 'value': 'packageNm'},
                {'text': text.displayNm, 'value': 'displayNm'}
            ]))
            $searchFilter.append($wrap)
        },
        // textType8 (사용자명 / 장치 ID / 이메일)
        textType8() {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'placeholder': trl('common.msg.searchValue'),
                'textAll': trl('common.text.textall'),
                'deviceId': trl('common.tableColumn.deviceId'),
                'deviceModel': trl('common.tableColumn.deviceModel'),
                'userId': trl('common.text.userId'),
                'userNm': trl('management.user.name'),
                'reqUrl': trl('management.device.btn.reqUrl')
            }

            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': text.textAll, 'value': ''},
                {'text': text.deviceId, 'value': 'deviceId'},
                {'text': text.deviceModel, 'value': 'deviceModel'},
                {'text': text.userId, 'value': 'userId'},
                {'text': text.userNm, 'value': 'userNm'},
                {'text': text.reqUrl, 'value': 'reqUrl'}
            ]))
            $('.search_keyword').prepend($wrap)
        },
        // textType9 (사용자명 / 장치 ID / 이메일)
        textType9() {
            const $wrap = $('<div class="search_option_wrap">')
            // $wrap.append($('<label for="textType">검색 대상</label>'))
            const all = trl('common.text.textall')
            const deviceId = trl('common.tableColumn.deviceId')
            const userId = trl('common.text.userId')
            const userNm = trl('management.user.name')
            const pageUrl = 'Page URL'

            const $selectTextType = $('<select>', {'class': 'search_groups', 'id': 'textType'})
            $wrap.append(appendOptions($selectTextType, [
                {'text': all, 'value': ''},
                {'text': deviceId, 'value': 'deviceId'},
                {'text': userId, 'value': 'userId'},
                {'text': userNm, 'value': 'userNm'},
                {'text': pageUrl, 'value': 'reqUrl'},
            ]))

            $('.search_keyword').prepend($wrap)
        },
        // userType (전체 사용자 / 일반 사용자 / VIP)
        userType1($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')

            const $select = $('<select>', {'class': 'search_groups', 'id': 'userType'})
            const user = {
                'type': trl('common.text.usertype'),
                'general': trl('management.user.general')
            }
            $wrap.append(appendOptions($select, [
                {'text': user.type, 'value': ''},
                {'text': user.general, 'value': 'common'},
                {'text': 'VIP', 'value': 'vip'}
            ]))
            $searchFilter.append($wrap)
        },
        // userType (일반 사용자 / VIP)
        userType2($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            const general = trl('management.user.general')
            // $wrap.append($('<label for="userType">사용자 유형</label>'))
            const $select = $('<select>', {'class': 'search_groups', 'id': 'userType'})
            $wrap.append(appendOptions($select, [
                {'text': general, 'value': 'common'},
                {'text': 'VIP', 'value': 'vip'}
            ]))
            $searchFilter.append($wrap)
        },
        // logType1 (전체 로그 유형 / error / crash)
        logType1($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'type': trl('common.text.logtype'),
                'error': trl('dashboard.bi.error'),
                'crash': trl('dashboard.bi.crash')
            }
            // $wrap.append($('<label for="logType">로그 유형</label>'))
            const $selectLogType = $('<select>', {'class': 'search_groups', 'id': 'logType'})
            $wrap.append(appendOptions($selectLogType, [
                {'text': text.type, 'value': ''},
                {'text': text.error, 'value': 'error'},
                {'text': text.crash, 'value': 'crash'}
            ]))
            $searchFilter.append($wrap)
        },
        // logType2 (전체 로그 유형 / 웹서버 / 리소스다운로드 / 웹통신 / 페이지이동 / 네이티브)
        logType2($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            // $wrap.append($('<label for="logType">로그 유형</label>'))
            const text = {
                'logType': trl('common.text.logtypeall'),
                'webserver': trl('common.text.webserver'),
                'resourcedownload': trl('common.text.resourcedownload'),
                'webcommunication': trl('common.text.webcommunication'),
                'pagemove': trl('common.text.pagemove'),
                'native': trl('common.text.native'),
                'custom': trl('common.text.custom'),
                'crash': trl('dashboard.bi.crash'),
                'error': trl('dashboard.bi.error')
            }
            const $selectLogType = $('<select>', {'class': 'search_groups', 'id': 'logType'})
            $wrap.append(appendOptions($selectLogType, [
                {'text': text.logType, 'value': ''},
                {'text': text.webserver, 'value': 'WEBSERVER'},
                {'text': text.resourcedownload, 'value': 'RESDOWN'},
                {'text': text.webcommunication, 'value': 'HTTP'},
                {'text': 'AJAX', 'value': 'AJAX'},
                {'text': text.pagemove, 'value': 'WEBNAVIGATION'},
                {'text': text.native, 'value': 'NATIVE'},
                {'text': text.error, 'value': 'ERROR'},
                {'text': text.crash, 'value': 'CRASH'},
                {'text': text.custom, 'value': 'CUSTOM'}
            ]))
            $searchFilter.append($wrap)
        },
        // logType2 (전체 로그 유형 / 웹서버 / 리소스다운로드 / 웹통신 / 페이지이동 / 네이티브)
        logType3($searchFilter) {
            // $wrap.append($('<label for="logType">로그 유형</label>'))
            const text = {
                'logType': trl('common.text.logtypeall'),
                'error': trl('dashboard.bi.error'),
                'scripterror': trl('dashboard.bi.scripterror'),
                'crash': trl('dashboard.bi.crash'),
                'request': trl('common.text.request'),
                'response': trl('dashboard.bi.response'),
                'appforeground': trl('common.text.appforeground'),
                'appbackground': trl('common.text.appbackground'),
                'appstart': trl('common.text.appstart'),
                'start': "Start",
                'end': "End",
                'open': "Open",
                'send': "Send",
                'common': "Common",
                "alarm": "Alarm",
                "sumbit": "Submit"
            }
            const $selectLogType = $('<select>', {'class': 'search_groups', 'id': 'logType'})
            $searchFilter.append(appendOptions($selectLogType, [
                {'text': text.logType, 'value': ''},
                {'text': text.error, 'value': 'Error'},
                {'text': text.scripterror, 'value': 'Script Error'},
                {'text': text.crash, 'value': 'Crash'},
                {'text': text.request, 'value': 'Request'},
                {'text': text.response, 'value': 'Response'},
                {'text': text.appforeground, 'value': 'App Foreground'},
                {'text': text.appbackground, 'value': 'App Background'},
                {'text': text.appstart, 'value': 'App Start'},
                {'text': text.start, 'value': 'Start'},
                {'text': text.end, 'value': 'End'},
                {'text': text.open, 'value': 'Open'},
                {'text': text.send, 'value': 'Send'},
                {'text': text.common, 'value': 'Common'},
                {'text': text.alarm, 'value': 'Alarm'},
                {'text': text.sumbit, 'value': 'Submit'},
            ]))
        },
        // logType4 (logType CheckBox 추가)
        logType4($searchFilter) {
            const $wrap = $('<div class="search_groups">')
            const $selectLogType = $('<button>', {'class': 'search_groups', 'id': 'logTypeBtn', 'text': '로그 타입'})
            $wrap.append($selectLogType)
            $searchFilter.append($wrap)
        },
        // useYn (전체 / 사용 / 미사용)
        useYn($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'isactive': trl('common.text.activeornot'),
                'active': trl('common.text.active'),
                'inactive': trl('common.text.inactive')
            }
            // $wrap.append($('<label for="logType">활성 여부</label>'))
            const $select = $('<select>', {'class': 'search_groups', 'id': 'useYn'})
            $wrap.append(appendOptions($select, [
                {'text': text.isactive, 'value': ''},
                {'text': text.active, 'value': 'Y'},
                {'text': text.inactive, 'value': 'N'}
            ]))
            $searchFilter.append($wrap)
        },
        // serverType (전체 서버 유형 / 개발 / ...)
        serverType($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            // $wrap.append($('<label for="logType">인프라 환경</label>'))
            const text = trl('common.text.servertypeall')
            const $select = $('<select>', {'class': 'search_groups', 'id': 'serverType'})
            $wrap.append(appendOptions($select, [
                {'text': text, 'value': ''}
            ]))
            Object.entries(appInfo.serverType).forEach(d => {
                const serverType = trl('common.' + d[1])
                $select.append($('<option>', {'value': d[0], 'text': serverType}))
            })
            $searchFilter.append($wrap)
        },
        // loggingType (전체 / 로깅 대상 / 로깅 미대상)
        loggingType($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            const text = {
                'device': trl('common.text.deviceall'),
                'loggingtarget': trl('common.text.loggingtarget'),
                'loggingnotarget': trl('common.text.loggingnotarget')
            }
            // $wrap.append($('<label for="logType">로깅 유형</label>'))
            const $select = $('<select>', {'class': 'search_groups', 'id': 'loggingYn'})
            $wrap.append(appendOptions($select, [
                {'text': text.device, 'value': ''},
                {'text': text.loggingtarget, 'value': 'Y'},
                {'text': text.loggingnotarget, 'value': 'N'}
            ]))
            $searchFilter.append($wrap)
        },
        // makeType (전체 / MANUAL / AUTO)
        makeType($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            const text = trl('common.text.creationtype')

            // $wrap.append($('<label for="logType">생성 유형</label>'))
            const $select = $('<select>', {'class': 'search_groups', 'id': 'makeType'})
            $wrap.append(appendOptions($select, [
                {'text': text, 'value': ''},
                {'text': 'MANUAL', 'value': 'MANUAL'},
                {'text': 'AUTO', 'value': 'AUTO'}
            ]))
            $searchFilter.append($wrap)
        },
        // dataType (전체 데이터 유형 / Page / Native )
        dataType($searchFilter) {
            const $wrap = $('<div class="search_option_wrap">')
            // $wrap.append($('<label for="dataType">데이터 유형</label>'))
            const text = {
                'datatypeall': trl('common.text.datatypeall'),
                'page': trl('common.tableColumn.page'),
                'native': trl('common.text.native')
            }

            const $select = $('<select>', {'class': 'search_groups', 'id': 'dataType'})
            $wrap.append(appendOptions($select, [
                {'text': text.datatypeall, 'value': ''},
                {'text': text.page, 'value': '1'},
                {'text': text.native, 'value': '2'}
            ]))
            $searchFilter.append($wrap)
        },
        appInfo($searchFilter, packageNm, appVer, osType) {
            const appInfoDiv = $('<div class="appInfoDiv">')
            $searchFilter.append(appInfoDiv);
            const $pSelect = $('<select>', {'class': 'search_groups', 'id': 'packageNm'})

            if (!packageNm) {
                appInfoDiv.append($pSelect)
            }
            if (osType) {
                appInfoDiv.append($('<select>', {'class': 'search_groups', 'id': 'osType'}))
            }
            if (appVer) {
                appInfoDiv.append($('<select>', {'class': 'search_groups', 'id': 'appVer'}))
            }
        },
        osType($searchFilter) {

        },
        appVer($searchFilter) {

        },
        async checkAppVer($searchOsVer, packageNm, serverType) {
            // osType정보에서 "A" 키 제거
            const removeKeyA = (obj) =>
                Object.fromEntries(
                    Object.entries(obj)
                        .filter(([key]) => key !== "A") // "A" 키 제거
                        .map(([key, value]) => [key, value instanceof Object ? removeKeyA(value) : value]) // 재귀적으로 처리
                );

            const osTypes = removeKeyA(appInfo.packageInfo[`${packageNm}:${serverType}`]);

            const source = await fetch('/templates/search/search-popup-check-ostype.html')
                .then(response => response.text())
            const template = Handlebars.compile(source)
            const resource = template(osTypes)
            $searchOsVer.html(resource)
            $searchOsVer.show()

            // App Ver 체크박스 접기/펼치기
            $('.check_app_ver_wrap .folding_btn').on('click', function () {
                const $this = $(this)

                $this.parent('.os_type_header').toggleClass('act')
                $this.parent('.os_type_header').next('.os_type_detail').toggleClass('act')
            })

            $('.check_app_ver_wrap input[type="checkbox"]').on('click', function () {
                const $this = $(this)
                const isChecked = $this.prop('checked')
                // 체크된 상태에 따라 클래스 추가/제거
                $this.next('label').toggleClass('on', isChecked)

                // 현재 체크박스가 속한 부모 div 찾기 (.os_type_header, .os_type_detail)
                const $parentDiv = $this.closest('div')

                if($parentDiv.hasClass('os_type_header')){ // OS 타입 체크박스 클릭 시
                    // OS 타입에 해당하는 App Ver 체크박스 모두 체크/해제
                    const $osTypeDetail = $parentDiv.next('.os_type_detail')
                    // App Ver 체크박스 모두 체크/해제
                    $osTypeDetail.find('input[type="checkbox"]').prop('checked', isChecked)
                        .next('label').toggleClass('on', isChecked)

                }else if($parentDiv.hasClass('os_type_detail')){ // App Ver 체크박스 클릭 시
                    // App Ver에 해당하는 OS 타입 div
                    const $osTypeHeader = $parentDiv.prev('.os_type_header')
                    // App Ver이 모두 체크됐는지 확인후 OS 타입 체크박스 체크/해제
                    const allChecked = $parentDiv.find('input[type="checkbox"]').length === $parentDiv.find('input[type="checkbox"]:checked').length
                    $osTypeHeader.find('input[type="checkbox"]').prop('checked', allChecked)
                        .next('label').toggleClass('on', allChecked)
                }
            })

            // 처음 로드될때 전체 체크
            $('.check_app_ver_wrap .os_type_header input[type="checkbox"]').trigger('click')
        },
        // dataType (전체 데이터 유형 / Page / Native )
        logClass($searchFilter) {
            // $wrap.append($('<label for="dataType">데이터 유형</label>'))
            const text = {
                'logClassAll': trl('common.text.logclassall'),
                'webserver': trl('common.text.webServer'),
                'webnavigation': trl('common.text.webnavigation'),
                'httprequest': trl('common.text.httprequest'),
                'nativeaction': trl('common.text.nativeaction'),
                'native': trl('common.text.native'),
                'customtag': trl('common.text.customtag'),
                'ajax': "AJAX"
            }

            const $select = $('<select>', {'class': 'search_groups', 'id': 'logClass'})
            $searchFilter.append(appendOptions($select, [
                {'text': text.logClassAll, 'value': '', 'data-type': ''},
                {'text': text.webserver, 'value': 'Webserver', 'data-type': 'Start:Error:End'},
                {'text': text.ajax, 'value': 'Ajax', 'data-type': 'Submit:Open:Send:Response'},
                {'text': text.native, 'value': 'Native', 'data-type': 'Crash'},
                {
                    'text': text.webnavigation,
                    'value': 'WebNavigation',
                    'data-type': 'Start:Response:End:Error:Script Error'
                },
                {'text': text.httprequest, 'value': 'HttpRequest', 'data-type': 'Request:Response:End:Error'},
                {
                    'text': text.nativeaction,
                    'value': 'NativeAction',
                    'data-type': 'Start:End:Error:App Foreground:App Background:App Start'
                },
                {'text': text.customtag, 'value': 'Custom Tag', 'data-type': 'Error:Common:Alarm'},
            ]))
        },
        addCheckBox(logTypeList, $searchFilter) {
            // 체크박스 만들기
            const div = $('<div class="log_type_group_wrap">')
            $searchFilter.html(div)
            let dataTypeArray = []; // decimal 값을 넣을 배열
            for (const item in logTypeList) {
                const $select = $('<div class="log_type_div"><div class="log_type_nm">' +
                    '<input type="checkbox" id="' + item + '" data-check-type="head"><label class="log_type_t_check" for="' + item + '">' + item + '</label>'
                    + '</div>')

                const list = logTypeList[item]
                const inDiv = $('<div class="log_type_detail_wrap">')
                for (const l of list) {
                    const $check = $('<div class="log_type_block"><input type="checkbox" data-check-type="item" id="' + l.decimal + l.detail + '" name="' + item + '" data-type="' + l.decimal + '">'
                        + '<label class="log_type_check" for="' + l.decimal + l.detail + '">' + l.detail + '</label>'
                        + '</div>')
                    inDiv.append($check)
                }

                $select.append(inDiv)
                div.append($select)
            }

            // 첫번째 헤더 오른쪽에 전체체크박스 추가
            const $firstLogTypeNm = div.find('.log_type_nm').first()
            $firstLogTypeNm.css('justify-content', 'space-between')
            $firstLogTypeNm.append(`
                <input type="checkbox" id="logTypeAll" data-check-type="all">
                <label class="log_type_t_check on" for="logTypeAll" data-t="dashboard.bi.all" style="width: 100px;"></label>
            `)

            // 다국어 텍스트 적용
            updateContent()

            // 체크박스 클릭시 처리
            function clickCheckbox(isChecked, $targets) {
                // 변경대상 체크박스
                $targets.each(function () {
                    const dataType = $(this).attr('data-type')
                    const $label = $(this).next('label')
                    $targets.prop('checked', isChecked)

                    if (isChecked) {
                        dataTypeArray.push(dataType)
                        $label.addClass('on')
                    } else {
                        dataTypeArray = dataTypeArray.filter(item => item !== dataType)
                        $label.removeClass('on')
                    }
                })

                // 헤더 체크박스 on/off 처리
                const $headItems = $('.log_type_group_wrap input[data-check-type="head"]')
                $headItems.each(function () {
                    const $items = $('.log_type_group_wrap input[name="' + $(this).prop('id') + '"]')
                    const $checkedItems = $('.log_type_group_wrap input[name="' + $(this).prop('id') + '"]:checked')
                    const $label = $(this).next('label')

                    // 하위 체크박스가 모두 선택되었을 경우
                    if ($items.length === $checkedItems.length) {
                        $(this).prop('checked', true)
                        $label.addClass('on')
                    } else {
                        $(this).prop('checked', false)
                        $label.removeClass('on')
                    }
                })

                const $checkedHeadItems = $('.log_type_group_wrap input[data-check-type="head"]:checked')
                // 전체 체크박스 on/off 처리
                if ($headItems.length === $checkedHeadItems.length) {
                    $('#logTypeAll').next('label').addClass('on')
                } else {
                    $('#logTypeAll').next('label').removeClass('on')
                }

                TA0001.v.logTypeArr = dataTypeArray
            }

            // 체크박스 클릭시 이벤트
            $('.log_type_group_wrap [data-check-type]').on('click', function () {
                const $this = $(this)

                // 변경대상 체크박스
                let $targets

                // 클릭한 체크박스 타입에 따라 변경대상 체크박스 설정
                if ($this.attr('data-check-type') === 'all') {
                    $targets = $('.log_type_group_wrap input[data-check-type="item"]')
                } else if ($this.attr('data-check-type') === 'head') {
                    $targets = $('.log_type_group_wrap input[name="' + $this.prop('id') + '"][data-check-type="item"]')
                } else if ($this.attr('data-check-type') === 'item') {
                    $targets = $this
                }

                // 체크박스 클릭
                clickCheckbox($this.is(':checked'), $targets)
            })

            // 초기엔 모든 체크박스 선택 및 decimal 값 array에 추가
            const checkboxes = document.querySelectorAll('.log_type_group_wrap input[type="checkbox"]')
            checkboxes.forEach(checkbox => {
                const dataType = checkbox.getAttribute('data-type')
                const label = document.querySelector(`label[for="${checkbox.id}"]`);
                label.classList.add('on');
                if (dataType != null) {
                    dataTypeArray.push(dataType)
                }
                checkbox.checked = true;
                TA0001.v.logTypeArr = dataTypeArray
            });
        }
    },
    valid(func) {
        const date = new Date()
        const hours = date.getHours()
        const minutes = date.getMinutes()
        const today = util.getDateToString()

        // 시간 입력 값 확인
        const searchFromDt = $('#searchFromDt').val()
        const searchToDt = $('#searchToDt').val()
        const $searchFromDtHH = $('#searchFromDtHH')
        const $searchToDtHH = $('#searchToDtHH')
        const $searchFromDtmm = $('#searchFromDtmm')
        const $searchToDtmm = $('#searchToDtmm')
        const $textType = $('#textType')
        const $searchText = $('#searchText')

        // 종료 시간이 현재 시간보다 큰 경우
        if (today === searchFromDt) {
            if (hours < Number($searchToDtHH.val()) || hours < Number($searchFromDtHH.val())) {
                const msg = trl('common.msg.nowtime')
                toast(msg)
                return -1
            } else if (hours === Number($searchToDtHH.val()) && minutes < Number($searchToDtmm.val())) {
                const msg = trl('common.msg.nowtime')
                toast(msg)
                return -1
            }
        }

        // 시작 시간(시)이 종료 시간(시)보다 큰 경우
        if (searchFromDt === searchToDt
            && Number($searchFromDtHH.val()) > Number($searchToDtHH.val())) {
            const msg = trl('system.link.msg.onlyendtimestarttime')
            toast(msg)
            return -1
        }
        // 시작 시간(시)은 같고 시작 시간(분)보다 종료 시간(분)이 큰 경우
        if (Number($searchFromDtHH.val()) === Number($searchToDtHH.val())
            && Number($searchFromDtmm.val()) > Number($searchToDtmm.val())) {

            const msg = trl('common.msg.invalid.minute')
            toast(msg)
            return -1
        }
        // 시간값이 시간의 범주를 넘은경우
        if (Number($searchFromDtHH.val()) > 23 || Number($searchToDtHH.val()) > 23 || Number($searchFromDtmm.val()) > 59 || Number($searchToDtmm.val()) > 59) {
            const msg = trl('common.msg.maxminute')
            toast(msg)
            return -1
        }
        if (today === searchToDt && Number($searchToDtHH.val()) > hours) {
            const msg = trl('common.msg.nowtime')
            toast(msg)
            return -1
        }
        if ($textType.val() === '' && $searchText.val() !== '') {
            const msg = trl('common.msg.invalid.texttype')
            toast(msg)
            return -1
        }
        func()
    }
}