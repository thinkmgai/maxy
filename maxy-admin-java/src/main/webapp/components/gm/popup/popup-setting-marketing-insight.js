class PopupSettingMarketingInsight {
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
        this.currentFocus = -1

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
        const $navbar = $('#' + id + '__navbar')
        const $inputs = $('#' + id + '__optFromUrl, #' + id + '__optToUrl')

        // 툴팁 설정
        v.tooltip = v.tooltip ? v.tooltip.setContent(desc) : tippy('#' + id + '__navbar_tooltip', {
            content: desc,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip',
            followCursor: true
        })

        // 저장 버튼 클릭 이벤트
        $navbar.find('.btn_component_setting_save').on('click', () => v.save())

        // dimmed 클릭 이벤트 추가
        $('.dimmed').on('click', () => {
            v.close()
        })

        // URL입력 필드의 keyup 이벤트 (자동완성 리스트 표시 및 키보드 탐색)
        $inputs.on('keyup', async function (e) {
            const $this = $(this)
            const val = $this.val().trim()
            const $autocompleteList = $this.siblings('.autocomplete-box')
            const $checkImg = $this.siblings('.check_img')

            // URL 입력값 없으면 자동완성 리스트 숨김
            if (!val) {
                $checkImg.removeClass('checked')
                return $autocompleteList.empty().hide()
            }

            // 방향키 위, 아래, 엔터눌렀을때
            // 자동완성 리스트 선택 표시 이동 및 선택
            if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                const items = document.querySelectorAll('.autocomplete-item')
                if (items.length === 0) return

                // 현재 선택된 항목 인덱스
                v.currentFocus = e.key === 'ArrowDown' ? (v.currentFocus + 1) % items.length :
                    e.key === 'ArrowUp' ? (v.currentFocus - 1 + items.length) % items.length : v.currentFocus
                // 현재 선택된 항목 선택
                if (e.key === 'Enter' && v.currentFocus > -1) items[v.currentFocus].click()
                // 현재 선택된 항목 없이 URL 입력칸에서 엔터시 첫번째 항목 선택
                if (e.key === 'Enter' && v.currentFocus === -1) v.currentFocus = 0
                // 자동완성 리스트 선택 css 표시
                $(items).removeClass('active').eq(v.currentFocus).addClass('active')
                return
            }

            // 자동완성 리스트를 가져오는 함수 호출
            v.currentFocus = -1
            await v.fetchAutocompleteList(val, $autocompleteList)
        })

        // URL입력 필드 focus 이벤트 (자동완성 리스트 표시)
        $inputs.on('focus', async function () {
            const $this = $(this)
            const val = $this.val().trim()
            const $checkImg = $this.siblings('.check_img')
            v.currentFocus = -1

            // 검증된 URL인 경우 다시 자동완성 리스트를 가져오지 않음
            if($checkImg.hasClass('checked')) return
            if (val) await v.fetchAutocompleteList(val, $this.siblings('.autocomplete-box'))
        })

        // URL입력 필드 focusout 이벤트 (자동완성 리스트 숨김)
        $inputs.on('focusout', function () {
            const $autocompleteList = $(this).siblings('.autocomplete-box')
            // keep-open : 자동완성 항목 클릭 시에는 focusout 이벤트 발생하지 않도록 설정
            setTimeout(() => !$autocompleteList.data('keep-open') && $autocompleteList.empty().hide(), 100)
        })

        // 자동완성 항목 클릭 시 focusout 방지
        $(document).on('mousedown', '.autocomplete-item', function () {
            // keep-open : 자동완성 항목 클릭 시에는 focusout 이벤트 발생하지 않도록 설정
            $(this).parent().data('keep-open', true)
        })

        // 자동완성 항목 클릭 시 값 입력 및 다음 입력 필드 포커스 이동
        $(document).on('click', '.autocomplete-item', function (e) {
            const $this = $(this)
            const $input = $this.parent().siblings('input')
            const pageAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), e.target.innerText)
            const nextInput = $this.closest('.navbar_input_wrap').next('.navbar_input_wrap').find('input')

            $input.val(e.target.innerText)
            $input.attr('title', e.target.innerText)
            // 페이지 별칭이 있으면 입력, 없으면 빈값 입력
            if (pageAlias !== e.target.innerText) nextInput.val(pageAlias)
            else nextInput.val('')

            $input.data('datatype', e.target.dataset.datatype)

            // URL 검증 이미지 표시 및 자동완성 리스트 숨김
            $this.parent().siblings('.check_img').addClass('checked')
            $this.parent().data('keep-open', false).empty().hide()
            nextInput.focus()
        })

        // Enter 키 입력 시 다음 입력 필드로 이동
        $('#' + id + '__optFromTitle').on('keydown', function (e) {
            if (e.key === 'Enter') $('#' + id + '__optToUrl').focus()
        })
    }

    // 자동완성 리스트를 가져오는 함수
    fetchAutocompleteList(val, $autocompleteList) {
        const params = {
            packageNm: sessionStorage.getItem('packageNm'),
            serverType: sessionStorage.getItem('serverType'),
            limit: 5,
            offset: 0,
            type: '',
            searchType: 'reqUrl',
            searchValue: val
        }

        ajaxCall('/gm/0303/getPageList.maxy', params, {disableCursor: true})
            .then(data => {
                if (data.pageList) {
                    // 현재 선택된 항목 초기화, URL 검증이미지 삭제
                    $autocompleteList.siblings('.check_img').removeClass('checked')

                    // 자동완성 리스트 업데이트
                    $autocompleteList.empty().show().append(
                        data.pageList.map(item => `<div class="autocomplete-item" data-datatype="${item.dataType}">${item.reqUrl}</div>`).join('')
                    )
                }
            })
            .catch(e => {
                toast(trl('common.msg.serverError'))
                console.error(e)
            })
    }

    /**
     * url 로 시작/도달 목록 조회 함수. 일단 보류
     */
    fetchTargetUrlListBySourceUrl(field, value) {
        const params = {
            packageNm: sessionStorage.getItem('packageNm'),
            serverType: sessionStorage.getItem('serverType'),
        }
        params[field] = value

        ajaxCall('/gm/0302/searchRelatedUrlList.maxy', params).then(data => {
            console.log(data)
        }).catch(err => {
            console.log(err)
        })
    }

    async init() {
        const {appendId, id, param, tip, title, prefix} = this

        const source = await fetch(
            '/components/gm/popup/popup-setting-marketing-insight.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }

        // packageNm 에 해당하는 패키지 명 반환
        const packageNm = sessionStorage.getItem('packageNm');
        const serverType = sessionStorage.getItem('serverType');

        const packageDisplayName = getDisplayNm(packageNm, serverType);
        const serverName = getServerNm(serverType);
        const translatedServerName = trl(`common.${serverName}`);

        const displayNm = `${packageDisplayName} (${translatedServerName})`;

        $target.append(template({id, param, tip, title, prefix, displayNm}))
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

        // 입력 필드 초기화
        $('#' + id + '__navbar input').val('')
    }

    getOption() {
        const {id} = this
        // 검증 확인 이미지 삭제
        $('#' + id + '__navbar .check_img').removeClass('checked')

        ajaxCall('/gm/0302/getMarketingInsightConfig.maxy',
            {
                'packageNm': sessionStorage.getItem('packageNm'),
                'serverType': sessionStorage.getItem('serverType'),
                'userNo': Number(sessionStorage.getItem('userNo'))
            },
            {disableCursor: true}
        ).then(data => {
            const $fromUrl = $('#' + id + '__optFromUrl')
            const $toUrl = $('#' + id + '__optToUrl')
            const $fromUrlTitle = $('#' + id + '__optFromTitle')
            const $toUrlTitle = $('#' + id + '__optToTitle')

            $fromUrl.val(data['preUrl'])
            $toUrl.val(data['reqUrl'])
            $fromUrl.attr('title', data['preUrl'])
            $toUrl.attr('title', data['reqUrl'])

            const fromUrlTitle = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), data['preUrl'])
            const toUrlTitle = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), data['reqUrl'])
            if(fromUrlTitle === data['preUrl'] || toUrlTitle === data['reqUrl']) {
                $fromUrlTitle.val('')
                $toUrlTitle.val('')
            }else{
                const dataTypeParams = {
                    packageNm: sessionStorage.getItem('packageNm'),
                    serverType: sessionStorage.getItem('serverType'),
                    "infoList": [
                        { "reqUrl": data['preUrl'] },
                        { "reqUrl": data['reqUrl'] }
                    ]
                }

                // reqUrl로 page정보에서 dataType 가져오기
                // page 정보 변경없이 alias만 변경할 경우에 dataType이 필요해서 따로 조회
                // getPageList.maxy로 페이지 정보 조회하면 dataType이 있음
                ajaxCall('/gm/0303/getPageDataType.maxy', dataTypeParams, {json: true})
                    .then(dataT => {
                        // 페이지 alias
                        $fromUrlTitle.val(fromUrlTitle)
                        $toUrlTitle.val(toUrlTitle)

                        // 페이지 dataType
                        $fromUrl.attr('data-datatype', dataT.dataTypes[data['preUrl']])
                        $toUrl.attr('data-datatype', dataT.dataTypes[data['reqUrl']])

                        // 이미 저장됐던 url을 가져올 경우 url체크이미지 활성화
                        $('.check_img').addClass('checked')
                    })
                    .catch(e => {
                        toast(trl('common.msg.serverError'))
                        console.error(e)
                    })
            }

        }).catch(error => {
            console.log(error)
            toast(trl(error.msg))
        })
    }

    save() {
        const v = this
        const {id} = v

        const $fromInput = $('#' + id + '__optFromUrl')
        const $toInput = $('#' + id + '__optToUrl')
        const $fromTitle = $('#' + id + '__optFromTitle')
        const $toTitle = $('#' + id + '__optToTitle')

        if (!$fromInput.siblings('.check_img').hasClass('checked')) {
            toast(i18next.tns('alert.check.url'))
            $fromInput.focus()
        } else if (!$toInput.siblings('.check_img').hasClass('checked')) {
            toast(i18next.tns('alert.check.url'))
            $toInput.focus()
        } else if ($fromInput.val() === $toInput.val()) {
            toast(i18next.tns('alert.same.url'))
            $toInput.focus()
        } else if ($fromTitle.val().trim() === '') {
            toast(i18next.tns('alert.check.alias'))
            $fromTitle.focus()
        } else if ($toTitle.val().trim() === '') {
            toast(i18next.tns('alert.check.alias'))
            $toTitle.focus()
        } else {
            const infoList = []
            infoList.push({
                'reqUrl': $fromInput.val(),
                'appPageNm': $fromTitle.val(),
                'dataType': $fromInput.data('datatype')
            })
            infoList.push({
                'reqUrl': $toInput.val(),
                'appPageNm': $toTitle.val(),
                'dataType': $toInput.data('datatype')
            })

            const params = {
                'packageNm': sessionStorage.getItem('packageNm'),
                'serverType': sessionStorage.getItem('serverType'),
                'userNo': Number(sessionStorage.getItem('userNo')),
                infoList
            }

            ajaxCall('/gm/0302/setMarketingInsightConfig.maxy', params, {json: true}).then(() => {
                appInfo.getSessionAlias()
                const msg = trl('common.msg.success')
                toast(msg)
                v.close()
            }).catch((e) => {
                if (e.msg) {
                    toast(trl(e.msg))
                } else {
                    const msg = trl('common.msg.serverError')
                    toast(msg)
                }
            })
        }
    }
}