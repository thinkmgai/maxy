/*
 * User 검색 팝업 컴포넌트
 */
class MaxyUserSearchPopup {
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
            const source = await fetch('/components/cmm/popup-search-user.html')
                .then(response => response.text())

            const template = Handlebars.compile(source)
            const $target = $('#' + appendId)

            if (!$target.length) {
                throw new Error(`Target element not found: #${appendId}`)
            }

            $target.empty().append(template({id}))

            //this.setOptionalSearchFields()
            updateContent()
        } catch (error) {
            console.error('User 검색 팝업 HTML 로드 오류:', error)
            throw error
        }
    }

    /**
     * 이벤트 바인딩
     */
    addEventListener() {
        const {id} = this
        const $popup = $(`#${id}`)

        $('.search_user_dimmed').on('click', () => {
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
        const columnNames = {
            'customerNo': i18next.tns('common.tableColumn.customerNo'),
            'userId': i18next.tns('common.tableColumn.userId')
        }

        this.table = new Tabulator("#searchUserTable", {
            height: '500px',
            layout: "fitDataFill",
            placeholder: trl('common.msg.noData'),
            columns: [
                {
                    title: columnNames.userId,
                    field: "userId",
                    //vertAlign: "middle",
                    width: "100%",
                    tooltip: true
                }
            ],
        })

        this.table.on("rowClick", (e, row) => {
            this.selectUser(row.getData())
        })
    }

    /**
     * 팝업 열기
     */
    openPopup() {
        const {id, $targetInput} = this
        const $popup = $(`#${id}`)

        $('.search_user_dimmed').show()
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
        $('.search_user_dimmed').hide()
        $(`#${id}`).hide()
        this.reset()
    }

    /**
     * 팝업 상태 초기화
     */
    reset() {
        const {id} = this
        const $popup = $(`#${id}`)

        $popup.find('.search_type').val('userId')
        $popup.find('.search_input').val('')
    }

    setOptionalSearchFields() {
        const {id, $targetInput} = this
        const $popup = $(`#${id}`)

        // sessionStorage에 저장된 optionalSearchFields 값을 가져옴
        const optionalSearchFields = sessionStorage.getItem('optionalSearchFields')
        if (optionalSearchFields && optionalSearchFields.trim() !== '') {
            try {
                // optionalSearchFields 값을 JSON 객체로 파싱
                const fieldsObj = JSON.parse(optionalSearchFields)

                // 객체의 각 키-값 쌍을 순회하면서 .search_type에 옵션으로 추가
                for (const [key, value] of Object.entries(fieldsObj)) {
                    $popup.find('.search_type').append(`<option value="${key}">${value}</option>`)
                }
            } catch (e) {
                console.error('optionalSearchFields 파싱 오류:', e)
            }
        }
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
                packageNm, serverType, searchType, searchValue,
                from: util.dateToTimestamp(util.getDate(-30), true), //임의로 30일치만 조회
                to: util.dateToTimestamp(new Date(), false)
            }

            ajaxCall('/sm/0500/getUserList.maxy', param).then(data => {
                this.table.setData(data)
            }).catch(error => {
                console.log(error)
            })
        } catch (error) {
            console.error('URL 검색 오류:', error)
        }
    }

    /**
     * User 선택 및 입력창에 설정
     */
    selectUser(data) {
        this.$targetInput.val(data.userId)
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