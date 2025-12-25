class MaxyPopupAlarmSetting {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.param = options.param
        this.func = options.func

        this.init().then(() => {
            this.addEventListener()
        })
    }

    async init() {
        const v = this
        const {id, appendId} = v
        const source = await fetch(
            '/components/gm/popup/popup-alarm-setting.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id}))

        updateContent()
    }

    addEventListener() {
        const v = this

        $('#' + v.id + '__popup' + ' #btnConfirm').on('click', () => {
            const isValidation = v.valid()

            if (isValidation) {
                v.save()
            }
        })

        // dimmed클릭 이벤트 추가
        $('.dimmed').off('click').on('click', () => {
            v.closePopup()
        })
    }

    openPopup(data) {
        this.param = data

        const {id} = this

        $('.dimmed').show()

        const selector = '#' + id + '__popup'
        const $target = $(selector)

        if (!$target.length) {
            console.warn('popup not found:', selector)
            return
        }

        $target.addClass('show')

        if (data.target !== 'LOADING_TIME' && data.target !== 'RESPONSE_TIME') {
            $('#' + id + '__popup' + ' #selectOptional').attr('disabled', true)
        } else {
            $('#' + id + '__popup' + ' #selectOptional').removeAttr('disabled')
        }
        this.setData()
    }

    closePopup() {
        const {id} = this
        const popup = '#' + id + '__popup'
        const input = popup + ' input'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        this.resetErrorMsg()
        // 팝업 닫을 때 커서가 보이면 없애주도록
        util.removeMaxyCursor()

        $(input).val('')
        $(span).text('')
        $dimmed.hide()
        $(popup).removeClass('show')
    }

    setData() {
        const {id, param} = this

        const $target = $('#' + id + '__popup')

        const {
            limitOvertime,
            limitValue,
            optional,
            targetDesc,
            targetPostfix,
            templateMsg,
            useYn
        } = param

        $target.find('#limitValueLabel').text(targetDesc + ' 임계치')
        $target.find('#targetDesc').text('항목: ' + targetDesc)
        $target.find('#selectLimitOvertime').val(String(limitOvertime))
        $target.find('#limitValue').val(limitValue)
        const $select = $target.find('#selectOptional')

        if (optional) {
            $select.val(optional)
        } else {
            $select.prop('selectedIndex', 0)
        }
        $target.find('#targetPostfix').text(targetPostfix)

        $target.find('#templateMsg').val(templateMsg)
        if (useYn) {
            $target.find('#useYn').prop('checked', true)
        } else {
            $target.find('#useYn').prop('checked', false)
        }
    }

    valid() {
        const v = this
        const {id} = v
        const $target = $('#' + id + '__popup')

        const $limitValue = $target.find('#limitValue')
        const $templateMsg = $target.find('#templateMsg')

        if ($limitValue.val() === undefined || $limitValue.val() === '' || isNaN($limitValue.val())) {
            v.setErrorMsg('limitValue', trl('management.alarm.msg.limitValueRequired'))
            return false
        }
        else if ($templateMsg.val() === undefined || $templateMsg.val() === '') {
            v.setErrorMsg('templateMsg', trl('management.alarm.msg.limitValueRequired'))
            return false
        }
        else {
            return true
        }
    }

    save() {
        const v = this

        try {
            const popupParam = {
                packageNm: v.param.packageNm,
                serverType: v.param.serverType,
                targetDesc: v.param.targetDesc,
                regNo: v.param.regNo,
                target: v.param.target,
                regDt: v.param.regDt,
                targetPostfix: v.param.targetPostfix,
                templateMsg: $('#' + v.id + '__popup' + ' #templateMsg').val(),
                optional: v.param.optional,
                useYn: $('#useYn').is(':checked') ? 1 : 0,
                limitValue: $('#' + v.id + '__popup' + ' #limitValue').val(),
                limitOvertime: $('#' + v.id + '__popup' + ' #limitOvertime').val()
            }

            // loading time, response time 상세 설정 팝업인 경우만 optional 설정 변경, 아니면 그대로
            if (v.param.target === 'LOADING_TIME' || v.param.target === 'RESPONSE_TIME') {
                const $optional = $('#' + v.id + '__popup #selectOptional')
                popupParam.optional = $optional.val()
            }

            const $limitOvertime = $('#' + v.id + '__popup #selectLimitOvertime')
            popupParam.limitOvertime = $limitOvertime.val()

            v.func(popupParam)

        } catch (e) {
            console.log(e)
        }
    }

    setErrorMsg(type, error) {
        const errTxt = $('.err_txt')
        errTxt.text('')

        const target = $('#' + type)
        const targetErrTxt = $('#' + type + 'ErrTxt')
        target.val('')
        targetErrTxt.text(error)
        targetErrTxt.addClass('show')
    }

    resetErrorMsg() {
        const errTxt = $('.err_txt')
        errTxt.text('')
        errTxt.removeClass('show')
    }

}