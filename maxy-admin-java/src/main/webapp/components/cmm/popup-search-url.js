/*
 * URL 검색 팝업 컴포넌트
 * 재사용 가능한 URL 검색 팝업 클래스
 */
class MaxyUrlSearchPopup {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.packageNm = options.packageNm
        this.serverType = options.serverType
        this.$targetInput = options.$targetInput

        // 유효성 검사
        if (!this.id || !this.appendId || !this.packageNm || !this.serverType || !this.$targetInput) {
            console.error('필수 파라미터가 누락되었습니다: packageNm, serverType, $targetInput')
            return false
        }

        // 비동기 초기화
        this.init().then(() => {
            this.addEventListener()
            this.createTable()
            this.openPopup()
        }).catch(error => {
            console.error('Initialization failed:', error)
        })
    }

    /**
     * 팝업 초기화
     */
    async init() {
        const {id, appendId} = this

        try {
            // HTML 템플릿 가져오기
            const source = await fetch('/components/cmm/popup-search-url.html')
                .then(response => response.text())

            const template = Handlebars.compile(source)
            const $target = $('#' + appendId)

            if (!$target.length) {
                throw new Error(`Target element not found: #${appendId}`)
            }

            $target.empty().append(template({id}))
            updateContent()
        } catch (error) {
            console.error('URL 검색 팝업 HTML 로드 오류:', error)
            throw error
        }
    }

    /**
     * 이벤트 바인딩
     */
    addEventListener() {
        const {id} = this
        const $popup = $(`#${id}`)

        $('.search_url_dimmed').on('click', () => {
            this.close()
        })

        // 팝업 닫기
        $popup.find('.popup_close, .btn_cancel').on('click', () => {
            this.close()
        })

        // 검색 버튼
        $popup.find('.search_btn').on('click', () => {
            this.doSearch()
        })

        // 엔터키로 검색
        $popup.find('.search_input').on('keypress', (e) => {
            if (e.which === 13) {
                this.doSearch()
            }
        })
    }

    createTable() {
        this.table = new Tabulator("#searchUrlTable", {
            height: '500px',
            layout: "fitDataFill",
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: 'Requested URL',
                    field: "reqUrl",
                    //vertAlign: "middle",
                    width: "70%",
                    tooltip: true
                },
                {
                    title: 'Page Name',
                    field: "appPageNm",
                    //vertAlign: "middle",
                    width: "30%",
                    tooltip: true
                }
            ],
        })

        this.table.on("rowClick", (e, row) => {
            this.selectUrl(row.getData())
        })
    }

    /**
     * 팝업 열기
     */
    openPopup() {
        const {id, $targetInput} = this
        const $popup = $(`#${id}`)

        $('.search_url_dimmed').show()
        $popup.show()
        $popup.find('.search_input').focus()

        // 초기화
        this.reset()

        if (!util.isEmpty($targetInput.val())) {
            $popup.find('.search_input').val($targetInput.val())
            this.doSearch()
        }
    }

    /**
     * 팝업 닫기
     */
    close() {
        const {id} = this
        $('.search_url_dimmed').hide()
        $(`#${id}`).hide()
        this.reset()
    }

    /**
     * 팝업 상태 초기화
     */
    reset() {
        const {id} = this
        const $popup = $(`#${id}`)

        $popup.find('.search_type').val('reqUrl')
        $popup.find('.search_input').val('')
    }

    /**
     * URL 검색 수행
     */
    doSearch() {
        const {id, packageNm, serverType} = this
        const $popup = $(`#${id}`)

        const searchTerm = $popup.find('.search_input').val().trim()

        if (!searchTerm) {
            toast('검색어를 입력해주세요.')
            return
        }

        try {
            const searchType = $popup.find('.search_type').val()
            const searchValue = $popup.find('.search_input').val()

            const param = {
                packageNm, serverType, searchType, searchValue
            }

            ajaxCall('/gm/0303/getPageList.maxy', param).then(data => {
                const {pageList} = data

                this.table.setData(pageList)
            }).catch(error => {
                console.log(error)
            })
        } catch (error) {
            console.error('URL 검색 오류:', error)
        }
    }

    /**
     * URL 선택 및 입력창에 설정
     */
    selectUrl(data) {
        this.$targetInput.val(data.reqUrl)
        this.close()
    }

    /**
     * 팝업 제거
     */
    destroy() {
        const {id} = this
        $(`#${id}`).remove()
    }
}