class MaxyFrontPopupUserSessionSetting {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId

        this.init().then(() => {
            this.openPopup()
            this.addEventListener()
        })
    }

    async init() {
        const v = this
        const {id, appendId} = v
        const source = await fetch(
            '/components/front/db/popup/popup-user-session-setting.html')
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

        $('#' + v.id + '__popup' + ' #btnClose').on('click', () => {
            v.closePopup(v)
        })

        $('#' + v.id + '__popup' + ' #btnSave').on('click', () => {
            v.save()
        })
    }

    openPopup() {
        const {id} = this
        const v = this

        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        v.getConfig()
    }

    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const input = popup + ' input'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        // 팝업 닫을 때 커서가 보이면 없애주도록
        util.removeMaxyCursor()

        $(input).val('')
        $(span).text('')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }

    getConfig() {
        const v = this

        const param = {
            packageNm: $('#packageNm').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
        }
        ajaxCall('/mf/0000/dashboard/feeldex/config.maxy', param).then(data => {
            v.setOption(data)
        })
    }

    setOption(data) {
        try {
            if (data.cls && data.inp && data.lcp) {
                const {cls, inp, lcp} = data

                $('#cls_input').val(cls)
                $('#inp_input').val(inp)
                $('#lcp_input').val(lcp)
            }
        } catch (e) {
            console.log(e)
        }
    }

    save() {
        const v = this

        try {
            const $lcp_input = $('#lcp_input')
            const $inp_input = $('#inp_input')
            const $cls_input = $('#cls_input')

            const lcp = parseInt($lcp_input.val())
            const inp = parseInt($inp_input.val())
            const cls = parseFloat($cls_input.val())

            if (isNaN(lcp) || lcp < 0) {
                toast('lcp 비율을 입력해주세요.')
                $lcp_input.focus()
                return
            }

            if (isNaN(inp) || inp < 0) {
                toast('lcp 비율을 입력해주세요.')
                $inp_input.focus()
                return
            }

            if (isNaN(cls) || cls < 0) {
                toast('cls 비율을 입력해주세요.')
                $cls_input.focus()
                return
            }

            // 합계 검증
            const total = lcp + inp + cls

            if (total > 100) {
                toast('LCP, INP, CLS 비율의 합은 100을 초과할 수 없습니다.')
                return
            }

            const param = {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                lcp,
                inp,
                cls
            }

            ajaxCall('/mf/0000/dashboard/feeldex/save.maxy', param).then(data => {
                const msg = trl('common.msg.success')
                toast(msg)

                $('.dimmed').hide()
                $('#' + v.id + '__popup').hide()
            }).catch(error => {
                console.log(error)
                toast(error)
            })
        } catch (e) {
            console.log(e)
        }



    }
}