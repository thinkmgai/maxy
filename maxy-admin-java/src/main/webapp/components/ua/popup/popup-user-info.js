class MaxyUserInfo {
    constructor(options) {
        this.id = options.id
        this.deviceId = options.deviceId

        if (!this.id || !this.deviceId) {
            console.log('check parameter', this)
            return false
        }

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    openPopup() {
        const {id} = this
        $('.dimmed').show()
        const $target = $('#' + id)

        $target.addClass('show')

        this.getUserDetail()
    }

    async init() {
        const {id} = this

        const source = await fetch('/components/ua/popup/popup-user-info.html').then(res => res.text())
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

        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        // 다국어 적용
        updateContent()
    }

    getUserDetail() {
        const {deviceId} = this
        const {packageNm, serverType} = util.getAppInfo('#packageNm')
        const currentTime = new Date().getTime()

        const param = {
            packageNm,
            serverType,
            deviceId: deviceId,
            from: currentTime,
            to: currentTime
        }

        ajaxCall('/ua/0000/getUserDetail.maxy', param, {disableCursor: true})
            .then((data) => {
                cursor.hide()
                this.setData(data)
            })
            .catch((error) => {
                console.log(error)
                cursor.hide()
            })
    }

    setData(data) {
        const {id} = this

        const $target = $('#' + id)

        // 데이터가 없거나 유효하지 않은 경우 처리
        if (!data || typeof data !== 'object') {
            console.warn('유효하지 않은 데이터:', data)
            // 모든 필드를 '-'로 설정
            $target.find('span[id]').text('-')
            return
        }

        // 데이터 객체에서 필요한 속성 추출 (기본값 undefined)
        const {
            appBuildNum,
            appVer,
            avgStayTime,
            clientDiv,
            clientNm,
            clientNo,
            comSensitivity,
            comType,
            createdDate,
            deviceModel,
            deviceId,
            deviceSt,
            email,
            logType,
            osVer,
            phoneNo,
            residenceNo,
            revisitCount,
            simOperatorNm,
            timezone,
            totalStayTime,
            totalVisitCount,
            updatedDate,
            userId,
            webviewVer,
            sleepDate
        } = data

        // 값이 없을 때 '-'로 표시하는 헬퍼 함수
        const displayValue = (value) => value || '-'

        // 휴먼 유저 안내 툴팁
        let content = trl('common.user.sleep.desc')
        content = content.replace('{sleepDate}', sleepDate)
        tippy('.icon_question', {
            content: content,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        });

        // target 아래의 id에 값 세팅하는 로직 추가
        // 각 ID 요소를 찾아서 데이터 값을 설정합니다
        let deviceStatus = '-'
        if (deviceSt === 'N') {
            deviceStatus = '정상'
        } else if (deviceSt === 'D') {
            deviceStatus = '삭제'
        } else if (deviceSt === 'S') {
            deviceStatus = '휴면'
        } else if (deviceSt) {
            deviceStatus = deviceSt
        }
        $target.find('#deviceSt').text(deviceStatus)

        $target.find('#updatedDate').text(displayValue(updatedDate))
        $target.find('#clientNo').text(displayValue(clientNo))
        $target.find('#deviceId').text(displayValue(deviceId))
        $target.find('#timezone').text(displayValue(timezone))
        $target.find('#clientDiv').text(displayValue(clientDiv))
        $target.find('#userId').text(displayValue(userId))
        $target.find('#clientNm').text(displayValue(clientNm))
        $target.find('#phoneNo').text(displayValue(phoneNo))
        $target.find('#residenceNo').text(displayValue(residenceNo))
        $target.find('#email').text(displayValue(email))
        $target.find('#createdDate').text(displayValue(createdDate))
        $target.find('#lastDate').text(displayValue(updatedDate))

        // 특수 케이스 처리 (단위가 있는 경우)
        $target.find('#totalVisitCount').text(totalVisitCount ? totalVisitCount + '일' : '-')

        // util 함수 호출 시 안전하게 처리
        try {
            $target.find('#totalStayTime').text(totalStayTime ? util.convertTime(totalStayTime, true, false, true) : '-')
        } catch (e) {
            console.warn('totalStayTime 변환 오류:', e)
            $target.find('#totalStayTime').text('-')
        }

        try {
            $target.find('#avgStayTime').text(avgStayTime ? util.convertTime(avgStayTime, true, false, true) : '-')
        } catch (e) {
            console.warn('avgStayTime 변환 오류:', e)
            $target.find('#avgStayTime').text('-')
        }

        $target.find('#revisitCount').text(revisitCount ? revisitCount + '회' : '-')

        try {
            $target.find('#deviceModel').text(deviceModel ? getDeviceModel(deviceModel) : '-')
        } catch (e) {
            console.warn('deviceModel 변환 오류:', e)
            $target.find('#deviceModel').text('-')
        }

        $target.find('#comType').text(displayValue(comType))

        try {
            $target.find('#simOperatorNm').text(simOperatorNm ? util.simOperatorNmFormat(simOperatorNm) : '-')
        } catch (e) {
            console.warn('simOperatorNm 변환 오류:', e)
            $target.find('#simOperatorNm').text('-')
        }

        try {
            $target.find('#comSensitivity').text(comSensitivity ? util.convertComSensitivity(comSensitivity, false)[0] : '-')
        } catch (e) {
            console.warn('comSensitivity 변환 오류:', e)
            $target.find('#comSensitivity').text('-')
        }

        try {
            $target.find('#logType').text(logType ? util.logTypeToPageType(logType)[1] : '-')
        } catch (e) {
            console.warn('logType 변환 오류:', e)
            $target.find('#logType').text('-')
        }

        $target.find('#webviewVer').text(displayValue(webviewVer))
        $target.find('#osVer').text(displayValue(osVer))
        $target.find('#appBuildNum').text(displayValue(appBuildNum))
        $target.find('#appVer').text(displayValue(appVer))
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        $(span).text('')

        $dimmed.off('click')
        $dimmed.hide()
        $(popup).removeClass('show')
    }
}
