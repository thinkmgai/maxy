class PopupSettingScatter {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.name = options.name
        this.param = options.param
        this.desc = options.desc
        this.tip = options.tip
        this.prefix = options.prefix
        this.title = options.title
        this.tooltip = null

        if (!this.id || !this.appendId || !this.name) {
            console.log('check parameter')
            return false
        }

        this.init().then(() => {
            this.addEventListener()
        })
    }

    addEventListener() {
        const v = this
        const {id, desc} = v
        $('#' + id + '__navbar' + ' .btn_component_setting_save').on('click', () => {
            v.save()
        })

        // dimmed클릭 이벤트 추가
        $('.dimmed').on('click', () => {
            v.close()
        })

        if (v.tooltip) {
            v.tooltip.setContent(desc)
        } else {
            v.tooltip = tippy('#' + id + '__navbar_tooltip', {
                content: desc,
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip',
                followCursor: true
            })
        }
    }

    async init() {
        const {appendId, id, param, tip, title, prefix} = this

        const source = await fetch(
            '/components/gm/popup/popup-setting-scatter.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }

        $target.append(template({id, param, tip, title, prefix}))
        updateContent()
    }

    // 팝업 열기 함수
    open() {
        const {id} = this
        $('.dimmed').show()

        this.getOption()

        // 클래스 추가로 슬라이드 인 효과 적용
        $('#' + id + '__navbar').addClass('open')
    }

    // 팝업 닫기 함수
    close() {
        const {id} = this
        $('.dimmed').hide()

        // 클래스 제거로 슬라이드 아웃 효과 적용
        $('#' + id + '__navbar').removeClass('open')

        // 입력 필드 초기화는 필요에 따라 결정
        $('#' + id + '__navbar input').val('')
    }

    getOption() {
        const {id, param} = this
        ajaxCall('/gm/0302/getComponentConfig.maxy',
            {type: id},
            {disableCursor: true}
        ).then(data => {
            $('#' + id + '__optMaxSize').val(data[param.type])
        }).catch(error => {
            console.log(error)
            toast(trl(error.msg))
        })
    }

    validate() {
        const {id} = this
        const maxSize = $('#' + id + '__optMaxSize').val()

        if (id === 'responsetimescatter' || id === 'loadingtimescatter') {
            // Response Time (S)의 경우 2000~5000 사이의 값만 입력 가능
            // Loading Time (S)의 경우 2000~5000 사이의 값만 입력 가능
            if (util.isEmpty(maxSize) || maxSize < 100 || maxSize > 50000) {
                toast(trl('common.msg.checkValue'))
                return false
            }
        }

        return true
    }

    save() {
        const v = this
        const {id} = v

        // 입력값 유효성 체크
        if (v.validate() === false) return

        const param = {}
        param[v.param.type] = $('#' + id + '__optMaxSize').val()
        ajaxCall('/gm/0302/modifyComponentConfig.maxy', param).then(() => {
            toast(trl('common.msg.success'))
            v.close()
        }).catch(error => {
            console.log(error)
            toast(trl(error.msg))
        })
    }
}