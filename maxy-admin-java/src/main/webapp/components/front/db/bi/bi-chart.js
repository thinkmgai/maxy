/**
 * MaxyFrontBasicInformationChart 클래스
 * 대시보드의 기본 정보 차트들을 관리하는 클래스
 * - dsb_radial_wrap의 모든 canvas 차트를 관리
 * - 카운터 애니메이션 시스템 제공
 * - 더미 데이터 생성 및 자동 업데이트
 */
class MaxyFrontBasicInformationChart {
    /**
     * 생성자
     * @param {Object} props - 초기화 옵션
     * @param {string} props.id - 식별자 (현재는 사용하지 않음)
     */
    constructor(props) {
        this.id = props.id || 'basicInformationChart';

        // 차트 인스턴스들을 저장할 객체
        this.charts = {};

        // 카운터 애니메이션 관리 객체
        this.dsbRadialCounter = {};

        // 현재 표시 중인 숫자 값들 (애니메이션용)
        this.biUseInfo = [];
        this.gauge = {};
        this.dsbRadialCounter = {}

        this.base = null

        // 초기화 실행
        this.initCounters()
        this.initBiUseInfo()
        this.addEventListener()
    }

    addEventListener() {
        const v = this

        $('.dsb_radial_wrap > li').off('click').on('click', function(e) {
            v.openBiPopup(e)
        })
    }

    openBiPopup(event) {
        const v = this  // 클래스의 this
        const clickedElement = event.currentTarget  // 클릭된 DOM 요소 (li 태그)
        const id = $(clickedElement).find('canvas').attr('id')

        const dataType = v.setDataType()

        v.setBiPopupOption(id, dataType)
    }

    resetData() {
        this.base = {
            gauge: {
                'countNew': {num: -1, text: '-'},
                'countDau': {num: -1, text: '-'},
                'countMau': {num: -1, text: '-'},
                'countCcu': {num: -1, text: '-'},
                'countPv': {num: -1, text: '-'},
                'avgUseTime': {num: -1, text: '-'},
                'countRevisit': {num: -1, text: '-'},
                'avgLcp': {num: -1, text: '-'},
                'avgFcp': {num: -1, text: '-'},
                'avgInp': {num: -1, text: '-'},
                'avgCls': {num: -1, text: '-'},
                'avgTtfb': {num: -1, text: '-'},
                'countError': {num: -1, text: '-'}
            }
        }
        this.gauge = {
            'countNew': 0,
            'countDau': 0,
            'countMau': 0,
            'countCcu': 0,
            'countPv': 0,
            'avgUseTime': 0,
            'countRevisit':0,
            'avgLcp': 0,
            'avgFcp': 0,
            'avgInp': 0,
            'avgCls': 0,
            'avgTtfb': 0,
            'countError': 0
        }
    }

    // 상단 BI 게이지 차트 그리기
    drawBiInfoChart() {
        // resetData() 이후에 작동되어야 함
        const data = this.base.gauge
        // 그래프 그리기
        const dataKeys = Object.keys(data)
        for (let i = 0; i < dataKeys.length; i++) {
            this.drawArc(dataKeys[i], data[dataKeys[i]])
        }

        //다크모드 변환시 그래프 새로 그리기 이벤트 추가
        $('.day_night_btn').on('click', function () {
            for (let i = 0; i < dataKeys.length; i++) {
                this.drawArc(dataKeys[i], data[dataKeys[i]])
            }
        })
    }

    initBiUseInfo() {
        const v = this

        const dummy = {
            countNewYn: 'Y',
            countDauYn: 'Y',
            countMauYn: 'Y',
            countCcuYn: 'Y',
            countPvYn: 'Y',
            avgUseTimeYn: 'Y',
            countRevisitYn: 'Y',
            avgLcpYn: 'Y',
            avgFcpYn: 'Y',
            avgInpYn: 'Y',
            avgClsYn: 'Y',
            avgTtfbYn: 'Y',
            countErrorYn: 'Y'
        }
        v.setBiUseInfoData(dummy)
    }

    // biInfo 사용 여부의 key 와 biInfo 의 key 가 다르기 때문에 두 가지를 매핑 하는 함수
    biInfoMapper(param) {
        const v = this
        const data = param

        if (!v.biUseInfo || !Array.isArray(v.biUseInfo) || v.biUseInfo.length === 0) {
            return data
        }

        v.biUseInfo.forEach(info => {
            if (info.value === 'N') {
                switch (info.key) {
                    case 'countNewYn':
                        data['countNew'] = -1
                        break
                    case 'countDauYn':
                        data['countDau'] = -1
                        break
                    case 'countMauYn':
                        data['countMau'] = -1
                        break
                    case 'countCcuYn':
                        data['countCcu'] = -1
                        break
                    case 'countPvYn':
                        data['countPv'] = -1
                        break
                    case 'avgUseTimeYn':
                        data['avgUseTime'] = -1
                        break
                    case 'countRevisitYn':
                        data['countRevisit'] = -1
                        break
                    case 'avgLcpYn':
                        data['avgLcp'] = -1
                        break
                    case 'avgFcpYn':
                        data['avgFcp'] = -1
                        break
                    case 'avgInpYn':
                        data['avgInp'] = -1
                        break
                    case 'avgClsYn':
                        data['avgCls'] = -1
                        break
                    case 'avgTtfbYn':
                        data['avgTtfb'] = -1
                        break
                    case 'countErrorYn':
                        data['countError'] = -1
                        break
                }
            } else {
                // 사용여부 Y 인데 데이터 없는 경우 0으로 처리
                switch (info.key) {
                    case 'countNewYn':
                        if (data['countNew'] === undefined) data['countNew'] = 0
                        break
                    case 'countDauYn':
                        if (data['countDau'] === undefined) data['countDau'] = 0
                        break
                    case 'countMauYn':
                        if (data['countMau'] === undefined) data['countMau'] = 0
                        break
                    case 'countCcuYn':
                        if (data['countCcu'] === undefined) data['countCcu'] = 0
                        break
                    case 'countPvYn':
                        if (data['countPv'] === undefined) data['countPv'] = 0
                        break
                    case 'avgUseTimeYn':
                        if (data['avgUseTime'] === undefined) data['avgUseTime'] = 0
                        break
                    case 'countRevisitYn':
                        if (data['countRevisit'] === undefined) data['countRevisit'] = 0
                        break
                    case 'avgLcpYn':
                        if (data['avgLcp'] === undefined) data['avgLcp'] = 0
                        break
                    case 'avgFcpYn':
                        if (data['avgFcp'] === undefined) data['avgFcp'] = 0
                        break
                    case 'avgInpYn':
                        if (data['avgInp'] === undefined) data['avgInp'] = 0
                        break
                    case 'avgClsYn':
                        if (data['avgCls'] === undefined) data['avgCls'] = 0
                        break
                    case 'avgTtfbYn':
                        if (data['avgTtfb'] === undefined) data['avgTtfb'] = 0
                        break
                    case 'countErrorYn':
                        if (data['countError'] === undefined) data['countError'] = 0
                        break
                }
            }
        })

        return data
    }

    setBiInfoBaseData(param) {
        const v = this
        v.gauge = param
    }

    setBiInfoChart(param) {
        const v = this
        const data = v.biInfoMapper(param)

        Object.keys(data).forEach(key => {
            const value = data[key]

            const option = {}

            if (value >= 0) {
                option.value = value

                const biInfo = v.gauge

                let biValue = 0
                if (biInfo !== undefined
                    && biInfo[key] !== undefined) {
                    biValue = biInfo[key]
                }

                // text 세팅
                if (key === 'avgUseTime'
                    || key === 'avgLcp'
                    || key === 'avgFcp'
                    || key === 'avgInp'
                    || key === 'avgTtfb') {
                    // 시간은 h / m 을 붙임
                    option.text = util.convertTime(value)
                } else if (key === 'countRevisit') {
                    option.text = value > biValue && biValue === 0 ? 100 : util.percent(value, biValue)
                } else if (key === 'avgCls') {
                    option.text = value.toFixed(2)
                    if (option.text === '0.00') {
                        option.text = 0
                    }
                } else {
                    // 1000 건, 100만건 단위의 k, m 을 붙임
                    option.text = util.convertNum(value)
                }

                // percent 세팅
                if (value === 0 && biValue === 0) {
                    // 전일자와 오늘 데이터가 모두 0이면 퍼센트를 0으로 고정
                    option.num = 0
                }  else if (v.gauge === undefined || !v.gauge[key]) {
                    option.num = 100
                } else {
                    option.num = util.percent(value, biValue)
                }
            }

            // 게이지 그래프 그리기
            v.drawArc(key, option)
        })
    }

    setBiUseInfoData(param) {
        const v = this

        if (!param || typeof param !== 'object') {
            console.warn('setBiUseInfoData: Invalid param provided');
            v.biUseInfo = []
            return
        }

        const allKeys = Object.keys(param)
        const result = []

        allKeys.forEach(key => {
            const value = param[key]
            if (value === 'Y' || value === 'N') {
                result.push({key, value})
            }
        })
        v.biUseInfo = result
    }

    /**
     * 카운터 시스템 초기화
     * DB0100.jsp의 counter 로직을 참고하여 구현
     */
    initCounters() {
        // 각 counter-unit 요소를 찾아서 초기화
        $('.counter-unit').each((i, el) => {
            // canvas id 추출 (부모 요소에서 찾기)
            const canvasId = el.parentNode.parentNode.querySelector('canvas').id;
            const dataCntLoc = el.dataset.cntLoc

            if (this.dsbRadialCounter[canvasId] === undefined) {
                this.dsbRadialCounter[canvasId] = {}
            }

            // counter 함수 적용
            this.dsbRadialCounter[canvasId][dataCntLoc] = this.counter(el);
        });
    }

    /**
     * 개별 카운터 생성 함수 (DB0100.jsp의 counter 함수와 동일)
     * @param {HTMLElement} el - counter-unit DOM 요소
     * @returns {Object} 카운터 제어 객체
     */
    counter(el) {
        // .is-changing-up, .is-changing-down으로
        // current를 prev 또는 next 요소와 자리를 바꾸는 애니메이션으로 숫자 증감을 표현
        let current = el.querySelector('[data-cnt-js="current"]'),
            prev = el.querySelector('[data-cnt-js="prev"]'),
            next = el.querySelector('[data-cnt-js="next"]'),
            timeout;

        function update(value, css) {
            if (typeof value === 'undefined') value = ''

            // .data-cnt-loc의 data-cnt-value값 변경, (낱개 자리수끼리 값 변경 여부에 따라 애니메이션)
            el.dataset.cntValue = value

            // 처음 시작시 자연스러운 모션을 위해..
            if (prev.innerHTML === '' && next.innerHTML === '') {
                current.innerHTML = value
            }
            prev.innerHTML = value
            next.innerHTML = value

            // ms 값은 작은 text로
            if (value === 'ms') {
                prev.classList.add('sm-text')
                next.classList.add('sm-text')
            } else {
                prev.classList.remove('sm-text')
                next.classList.remove('sm-text')
            }

            // 애니메이션 주기
            el.classList.add(css)

            window.clearTimeout(timeout)
            timeout = window.setTimeout(function () {
                current.innerHTML = next.innerHTML
                // ms 값은 작은 text로
                if (value === 'ms') current.classList.add('sm-text')
                else current.classList.remove('sm-text')

                el.classList.remove(css)
            }, 210) // 애니메이션 속도
        }

        return {
            update: update
        };
    }

    // BiInfo 차트 그리기
    drawArc(key, data) {
        const v = this

        // 다크모드 체크
        const isDark = $("body").hasClass("dark_mode")
        let el = key
        let {num, value, text} = data

        const canvas = document.getElementById(el)
        const $el = $('#' + el)
        if (!canvas) {
            return
        }

        //console.log(num, el, value)

        canvas.width = 100
        canvas.height = 100
        const ctx = canvas.getContext('2d')
        const radian = Math.PI / 180

        // ctx 초기화 (지우기)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 밑 바탕 그리기
        ctx.beginPath()
        ctx.arc(50, 50, 40, radian * 135, radian * 45, false)

        if (isDark) {
            ctx.strokeStyle = '#313233'
        } else {
            ctx.strokeStyle = '#ECEEF2'
        }
        ctx.lineWidth = 8
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.closePath()

        // @@bi 애니메이션 적용@@
        if (typeof text === 'undefined') text = '-'
        // 기존에 있던 값, (각 bi그래프에서 div.counter의 data-cnt-values 값)
        const orgValue = $el.siblings('.counter')[0].getAttribute('data-cnt-values')

        // bi 비활성화 등으로 undefined값이 계속 들어오면 애니메이션 없이 '-'
        // orgValue 값도 비교해줘야 제일 처음 들어온 ws인지 구분할 수 있음, 제일 처음일때는 빈칸으로(디자인이 깔끔해보임)
        if (text === '-' && orgValue === '-') {
            // data-cnt-js="prev", data-cnt-js="current", data-cnt-js="next"의 값을 모두 -로 만들기
            $el.siblings('.counter').find('[data-cnt-loc="0"]').children().each(function () {
                $(this).text('-')
            })

            // 기존값과 다른 값이 들어와서 애니메이션을 줘야할때, 자료형이 섞여있어서 !=로
        } else if (text !== '-' && orgValue != text) {
            text = text.toString()
            let textArr, css
            // 문자열을 하나씩 잘라서 array로 변환, ms값은 하나의 단어로 묶어줌
            if (text.indexOf('ms') > -1) {
                textArr = Array.from(text.split('ms')[0])
                textArr.push('ms')
            } else {
                textArr = Array.from(text)
            }

            const $counter = $el.siblings('.counter')
            // true면 count-unit show/hide 변경 필요, 변경될 글자의 수 != show인 .counter-unit의 개수
            const changeDisplay = (textArr.length !== $counter.children('.counter-unit:not(:hidden)').length)

            // 기존값이 - 에서 다른값으로 바뀔땐 애니메이션 없음
            if (orgValue === '-') {
            } else if (el === 'avgUseTime'
                || el === 'avgLcp'
                || el === 'avgInp'
                || el === 'avgFcp' || el === 'avgTtfb') {
                // 시간 비교
                if (util.reConvertTime(orgValue) > util.reConvertTime(text) || util.reConvertTime(text) === 0) {
                    css = 'is-changing-down'
                } else {
                    css = 'is-changing-up'
                }
            } else {
                // 숫자 비교
                if (util.reconvertNum(orgValue) > util.reconvertNum(text) || util.reconvertNum(text) === 0) {
                    css = 'is-changing-down'
                } else {
                    css = 'is-changing-up'
                }
            }

            $counter.children('.counter-unit').each(function (i, eachEl) {
                // 자리수 증가나 감소가 있다면 .counter-unit을 show 또는 hide하며 애니메이션
                if (changeDisplay) {
                    if (textArr.length - 1 < i) {
                        eachEl.style.display = 'none'
                    } else {
                        eachEl.style.display = 'block'
                        v.dsbRadialCounter[el][i].update(textArr[i], css)
                    }
                } else {
                    // 자리수 변경이 없다면 동일 자리의 숫자값이 변경됐는지 확인하고 애니메이션
                    if (textArr[i] !== $counter.children('.counter-unit')[i].getAttribute('data-cnt-value')) {
                        v.dsbRadialCounter[el][i].update(textArr[i], css)
                    }
                }
            })
        }

        // 변경된 값 data-cnt-values에 저장
        $el.siblings('.counter')[0].setAttribute('data-cnt-values', text)

        // 값이 정상 범위 내에 있는 경우만 그림
        if (num >= 0) {
            // p 상위의 li 에 disabled 클래스 삭제
            $el.parent().removeClass('disabled')
            $el.parent().addClass('open')

            let pct = num  // 0 - 100
            let deg = 135 // 0퍼센트 라디안

            // ios, android 는 그래프 내 점 그리지 않음
            if (key !== 'countCcu') {
                //그래프의 점 그리기
                //라디안 계산
                if (!(pct >= 0)) {
                    pct = 0
                }
                if (pct !== 0) {
                    deg = deg + (pct * 2.7)
                    if (deg > 359) {
                        deg = deg - 360
                    }
                }
                ctx.beginPath()
                // 0퍼센트(135,135), 50퍼센트(270,270), 100퍼센트(45,45)
                ctx.arc(50, 50, 40, radian * deg, radian * (deg + 1), false)
                if (isDark) {
                    ctx.strokeStyle = '#6560FF' // dark mode
                } else {
                    ctx.strokeStyle = '#7277FF'
                }
                ctx.lineWidth = 14
                ctx.lineCap = 'round'
                ctx.stroke()
                ctx.closePath()
            }

            v.addTooltip(canvas, pct, value, key)

        } else {
            // 정상 범위 밖의 값인 경우 disabled 클래스 추가
            $el.parent().removeClass('open')
            $el.parent().addClass('disabled')
        }
    }

    addTooltip(target, pct, value, key) {
        const v = this

        /* 툴팁 문구
        *   설치: 건수: 40 / 전일 대비: 15%
        *   MAU: 건수: 22,172/ 전일 대비: 80%
        *   DAU: 건수: 28,121/ 전일 대비: 55%
        *   재방문: 건수: 2,614/ 전일 대비: 100%
        *   체류시간: 체류 시간: 3m/ 전일 대비: 100%
        *   로그: 건수: 17,000/ 전일 대비: 100%
        *   LCP/CLS/INP: LCP: 310ms/ 전일 대비: 100%
        * */

        // 기본 텍스트는 '건수'
        let valueText = trl('dashboard.bi.val') + ': '
        // 체류시간인 경우만 건수 -> 체류 시간 문구 사용
        if (key === 'avgUseTime') {
            valueText = trl('dashboard.bi.stayTime') + ': '
        } else if (key === 'avgLcp') {
            valueText = 'LCP' + ': '
        } else if (key === 'avgCls') {
            valueText = 'CLS' + ': '
        } else if (key === 'avgInp') {
            valueText = 'INP' + ': '
        } else if (key === 'avgFcp') {
            valueText = 'FCP' + ': '
        } else if (key === 'avgTtfb') {
            valueText = 'TTFB' + ': '
        }

        // 기본 텍스트는 '전일 대비'
        let pctText = trl('dashboard.bi.pct') + ': '
        // OS 점유율 인 경우만 전일 대비 -> 비율 문구 사용
        // MAU인 경우 전일 대비 -> 전월 대비
        if (key === 'countMau') {
            pctText = trl('dashboard.bi.previousMonth') + ': '
        }

        // 기본 값은 comma만 적용, 체류시간인 경우 시간 변환 함수 사용
        let formattedValue = util.comma(value)
        if (key === 'avgUseTime'
            || key === 'avgLcp'
            || key === 'avgInp'
            || key === 'avgFcp'
            || key === 'avgTtfb') {
            formattedValue = util.convertTime(value, false, false, false)
        }
        const valText = !isNaN(value) ? valueText + '<b>' + formattedValue + '</b>' : ''
        const tooltip = target.id + 'Tooltip'

        let content
        if (key !== 'countCcu') {
            content = valText + '<br>' + pctText + '<b>' + pct + '%</b>'
        } else {
            content = valText
        }

        if (v[tooltip]) {
            v[tooltip].setContent(content)
        } else {
            v[tooltip] = tippy(target.parentNode, {
                content: content,
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip',
                followCursor: true
            })
        }
    }

    setDataType() {
        const dataTypeAll = "all"
        const dataTypeSeries0 = "series0"
        const dataTypeSeries1 = "series1"

        const dataTypeRate = "rate"

        const dataTypeAvgSeries0 = "avgSeries0"
        const dataTypeAvgSeries1 = "avgSeries1"

        const dataTypePvPerPerson = "pvPerPerson"

        const summaryTitleCcu = "CCU"
        const summaryTitlePcuIos = "iosPcu"
        const summaryTitlePcuAndroid = "androidPcu"
        const dataTypeDate = "date"

        const dataTypeNoLogin = "noLogin"
        const dataTypeAppAvgAllUser = "appAvgAllUser"

        const dataTypeSum = 'sum'
        const dataTypeAvg = 'avg'
        const dataTypeSeries0Sum = 'series0Sum'
        const dataTypeSeries1Sum = 'series1Sum'
        const dataTypeSeries0Avg = 'series0Avg'
        const dataTypeSeries1Avg = 'series1Avg'

        return {
            all: dataTypeAll,
            series0: dataTypeSeries0,
            series1: dataTypeSeries1,
            rate: dataTypeRate,
            avgSeries0: dataTypeAvgSeries0,
            avgSeries1: dataTypeAvgSeries1,
            pvPerPerson: dataTypePvPerPerson,
            ccu: summaryTitleCcu,
            iosPcu: summaryTitlePcuIos,
            androidPcu: summaryTitlePcuAndroid,
            date: dataTypeDate,
            noLogin: dataTypeNoLogin,
            appAvgAllUser: dataTypeAppAvgAllUser,
            sum: dataTypeSum,
            avg: dataTypeAvg,
            series0Sum: dataTypeSeries0Sum,
            series1Sum: dataTypeSeries1Sum,
            series0Avg: dataTypeSeries0Avg,
            series1Avg: dataTypeSeries1Avg
        }
    }

    setBiPopupOption(id, dataType) {
        const v = this
        let title, type, summaryTitle, allTitle

        const {
            all: dataTypeAll,
            series0: dataTypeSeries0,
            series1: dataTypeSeries1,
            rate: dataTypeRate,
            date: dataTypeDate,
            sum: dataTypeSum,
            avg: dataTypeAvg,
            series1Sum: dataTypeSeries1Sum
        } = dataType

        switch (id) {
            case 'countNew' :
                title = 'dashboard.bi.newUser'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "dashboard.bi.newUser", "type": dataTypeAll}
                ]
                break
            case 'countMau' :
                title = 'dashboard.bi.mauFull'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "dashboard.bi.mauFull", "type": dataTypeAll}
                ]
                break
            case 'countDau' :
                title = 'dashboard.bi.dauFull'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "dashboard.bi.dauFull", "type": dataTypeAll}
                ]
                break
            case 'countCcu' :
                title = 'dashboard.bi.ccuFull'
                type = 3
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "dashboard.bi.ccuFull", "type": dataTypeAll},
                    {"title": "PCU", "type": dataTypeAvg}
                ]
                break
            case 'countPv' :
                title = 'PV'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "PV", "type": dataTypeAll}
                ]
                break
            case 'countRevisit' :
                title = 'dashboard.bi.returnVisit'
                type = 4
                allTitle = [
                    {"title": "dashboard.bi.alluser", "type": dataTypeSum},
                    {"title": "dashboard.bi.dailyAvg", "type": dataTypeAvg},
                    {"title": "dashboard.bi.reconnect", "type": dataTypeSeries1Sum},
                    {"title": "dashboard.bi.revisitRate", "type": dataTypeRate}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "dashboard.bi.alluser", "type": dataTypeSeries0},
                    {"title": "dashboard.bi.reconnect", "type": dataTypeSeries1},
                    {"title": "dashboard.bi.revisitRate", "type": dataTypeRate}
                ]
                break
            case 'avgUseTime' :
                title = 'dashboard.bi.staytime'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "dashboard.bi.staytime", "type": dataTypeSeries0}
                ]
                break
            case 'avgLcp' :
                title = 'LCP'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "LCP", "type": dataTypeSeries0}
                ]
                break
            case 'avgFcp' :
                title = 'FCP'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "FCP", "type": dataTypeSeries0}
                ]
                break
            case 'avgInp' :
                title = 'INP'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "INP", "type": dataTypeSeries0}
                ]
                break
            case 'avgCls' :
                title = 'CLS'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "CLS", "type": dataTypeSeries0}
                ]
                break
            case 'avgTtfb' :
                title = 'TTFB'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "common.text.avg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "TTFB", "type": dataTypeSeries0}
                ]
                break
            case 'countError' :
                title = 'dashboard.bi.error'
                type = 2
                allTitle = [
                    {"title": "dashboard.bi.all", "type": dataTypeSum},
                    {"title": "dashboard.bi.dailyAvg", "type": dataTypeAvg}
                ]
                summaryTitle = [
                    {"title": "dashboard.bi.datetime", "type": dataTypeDate},
                    {"title": "dashboard.bi.error", "type": dataTypeSeries0}
                ]
                break
        }

        v.getPopupData(id, {title, type, summaryTitle, allTitle})
    }

    getPopupData(id, options) {
        const v = this

        const {
            title,
            type,
            summaryTitle,
            allTitle
        } = options

        if (id === 'countCcu') {
            v.ccuDetail = new MaxyFrontPopupCcuDetail({
                id: id,
                title: title,
                summaryTitle: summaryTitle,
                type: type,
                appendId: 'maxyPopupWrap'
            })

            v.ccuDetail.init().then(() => {
                v.ccuDetail.getBiDetail(id)
            })
        } else if (id !== 'countError') {
            v.biDetail = new MaxyFrontPopupBiAnalysis({
                id: id,
                title: title,
                summaryTitle: summaryTitle,
                type: type,
                allTitle: allTitle,
                appendId: 'maxyBiPopupWrap'
            })

            v.biDetail.init().then(() => {
                v.biDetail.getBiDetail(id)
            })
        } else if (id === 'countError') {
            v.biErrorDetail = new MaxyFrontPopupBiErrorAnalysis({
                id: id,
                title: title,
                summaryTitle: summaryTitle,
                type: type,
                allTitle: allTitle,
                appendId: 'maxyBiPopupWrap'
            })

            v.biErrorDetail.init().then(() => {
                v.biErrorDetail.getBiDetail(id)
            })
        }
    }


    /**
     * 리소스 정리 함수
     * 메모리 누수 방지를 위해 모든 리소스를 정리
     */
    destroy() {
        console.log('Destroying MaxyFrontBasicInformationChart');

        // 차트 정리
        this.charts = {};
        this.dsbRadialCounter = {};
        this.currentValues = {};

        console.log('MaxyFrontBasicInformationChart destroyed');
    }
}