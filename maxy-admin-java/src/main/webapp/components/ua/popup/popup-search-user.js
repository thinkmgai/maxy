class MaxySearchUser {
    constructor(options) {
        // 옵션에서 속성 초기화
        this.appendId = options.appendId
        this.id = options.id
        this.packageNm = options.packageNm
        this.serverType = options.serverType
        this.osType = options.osType
        this.from = options.from
        this.to = options.to
        this.searchType = options.searchType
        this.searchValue = options.searchValue
        this.data = options.data
        this.selectRow = null
        this.table = null

        // 필수 매개변수 검증
        if (!this.id || !this.appendId) {
            toast(trl('common.msg.checkParam'))
            return false
        }

        // 팝업 초기화
        this.init().then(() => {
            this.addEventListener()
            this.drawTable()
            this.openPopup().then(() => {
                $('#' + this.id + '__searchValue').focus()
            })
        }).catch(error => {
            console.error('Failed to initialize popup:', error)
            toast(trl('common.msg.searchValue'))
        })
    }

    /**
     * 템플릿을 로드하고 초기값을 설정하여 팝업 초기화
     */
    async init() {
        try {
            // HTML 템플릿 로드
            const source = await fetch('/components/ua/popup/popup-search-user.html')
                .then(res => res.text())
            const template = Handlebars.compile(source)

            // 대상 요소 찾기 및 검증
            const $target = $('#' + this.appendId)
            if ($target.length === 0) {
                throw new Error(`Cannot find target element: #${this.appendId}`)
            }

            // 템플릿 렌더링
            $target.empty().append(template({ id: this.id }))

            // 선택적 검색 필드 설정
            this.setOptionalSearchFields()

            // 이전 검색값 설정
            const $searchValue = $('#' + this.id + '__searchValue')
            const $searchKey = $('#' + this.id + '__searchKey')

            $searchValue.attr('placeholder', trl('common.msg.searchValue'))
            $searchKey.val(this.searchType)
            $searchValue.val(this.searchValue)

            // 다국어 적용
            updateContent()
        } catch (error) {
            console.error('Failed to initialize popup:', error)
            throw error
        }
    }

    /**
     * 팝업 상호작용을 위한 이벤트 리스너 추가
     */
    addEventListener() {
        // 배경 클릭 시 팝업 닫기
        $('.dimmed').on('click', () => {
            this.closePopup()
        })

        // 검색 입력에서 Enter 키 처리
        $('#' + this.id + '__searchValue').on('keyup', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch()
            }
        })

        // 검색 버튼 클릭 처리
        $('#' + this.id + '__btnSearch').on('click', () => {
            this.handleSearch()
        })

        // 검색키 변경 처리
        $('#' + this.id + '__searchKey').on('change', () => {
            const $searchValue = $('#' + this.id + '__searchValue')
            $searchValue.val('').focus()
        })

        // 확인 버튼 클릭 처리
        $('#' + this.id + '__btnOk').on('click', () => {
            if (this.selectRow === null) {
                toast(trl('common.msg.noSelect'))
                return
            }

            this.executeMultipleSearch(this.selectRow)
            this.closePopup()
        })
    }

    /**
     * 검색 기능 처리
     */
    handleSearch() {
        const searchValue = $('#' + this.id + '__searchValue').val()
        if(searchValue === '-' || util.isEmpty(searchValue)) {
            toast(trl('common.msg.searchValue'))
            return
        }

        const searchParams = {
            packageNm: this.packageNm,
            serverType: this.serverType,
            osType: this.osType,
            from: this.from,
            to: this.to,
            searchType: $('#' + this.id + '__searchKey').val(),
            searchValue: $('#' + this.id + '__searchValue').val()
        }

        ajaxCall('/ua/0000/getUserList.maxy', searchParams)
            .then(data => {
                if (data.length === 1) {
                    // 단일 결과 - 즉시 검색 실행
                    this.executeMultipleSearch(data[0])
                    this.closePopup()
                } else {
                    // 복수 결과 - 테이블에 표시
                    this.data = data
                    this.setTableData(data)
                }
            })
            .catch(error => {
                console.error('Search failed:', error)
                toast(trl('common.msg.searchValue'))
            })
    }

    /**
     * 사용자 데이터로 복합 검색 실행
     * @param {Object} userData - deviceId와 clientNo를 포함한 사용자 데이터
     */
    executeMultipleSearch(userData) {
        const multipleParams = {
            searchFromDt: this.from,
            searchToDt: this.to,
            searchPackageNm: this.packageNm,
            searchServerType: this.serverType,
            searchType: 'multiple',
            searchValues: {
                deviceId: userData.deviceId,
                clientNo: userData.clientNo
            }
        }
        UA0000.func.getFlowData(multipleParams)
    }

    /**
     * 데이터 테이블 초기화 및 그리기
     */
    drawTable() {
        const placeholder = i18next.tns('common.msg.noData')
        const columnNames = {
            'createdDate': i18next.tns('common.tableColumn.createdDate'),
            'updatedDate': i18next.tns('common.tableColumn.updatedDate'),
            'customerNo': i18next.tns('common.tableColumn.customerNo'),
            'deviceNo': i18next.tns('common.tableColumn.deviceNo'),
            'appVersion': i18next.tns('common.tableColumn.appVersion'),
            'operatingSystem': i18next.tns('common.tableColumn.operatingSystem'),
            'modelName': i18next.tns('common.tableColumn.modelName'),
            'userId': i18next.tns('common.tableColumn.userId')
        }

        this.table = new Tabulator("#" + this.id + "__searchList", {
            placeholder: placeholder,
            layout: "fitDataFill",
            selectable: 1,
            columns: [
                {
                    title: "",
                    field: "radio",
                    headerSort: false,
                    hozAlign: 'center',
                    vertAlign: 'middle',
                    width: '4%',
                    formatter: (cell) => {
                        const isSelected = cell.getRow().isSelected()
                        return `<input type="radio" style="display: block;" name="row-radio" ${isSelected ? "checked" : ""}>`
                    },
                    cellClick: (e, cell) => {
                        // 선택된 행 데이터 저장
                        this.selectRow = cell.getRow().getData()
                        // 다른 행 선택 해제 후 현재 행 선택
                        cell.getTable().deselectRow()
                        cell.getRow().select()
                    }
                },
                {
                    title: columnNames.createdDate,
                    field: "createdDate",
                    width: '12%'
                },
                {
                    title: columnNames.updatedDate,
                    field: "updatedDate",
                    width: '12%'
                },
                {
                    title: columnNames.deviceNo,
                    field: "deviceId",
                    width: '25%'
                },
                {
                    title: columnNames.userId,
                    field: "userId",
                    width: '16%'
                },
                {
                    title: columnNames.customerNo,
                    field: "clientNo",
                    width: '16%'
                },
                /* {
                    title: columnNames.operatingSystem,
                    field: "osType",
                    width: '8%'
                }, */
                {
                    title: columnNames.modelName,
                    field: "deviceModel",
                    width: '15%',
                    formatter: cell => getDeviceModel(cell.getValue())
                }
            ]
        })

        this.table.on("tableBuilt", () => {
            this.setTableData()
        })

        this.table.on("rowClick", (e, row) => {
            // 기존 선택 해제 후 현재 row만 선택
            row.getTable().deselectRow()
            row.select()

            // 선택된 데이터 저장
            this.selectRow = row.getData()

            // radio 버튼의 checked 상태를 직접 업데이트
            const allRows = row.getTable().getRows()
            allRows.forEach(r => {
                const radioCell = r.getCell("radio")
                const radioInput = radioCell.getElement().querySelector('input[type="radio"]')
                if (radioInput) {
                    radioInput.checked = r.isSelected()
                }
            })
        })
    }

    /**
     * 테이블에 데이터 설정
     * @param {Array} data - 선택적 데이터 배열, 제공되지 않으면 this.data 사용
     */
    setTableData(data = this.data) {
        if (this.table && data) {
            this.table.setData(data)
        }
    }

    /**
     * 세션 스토리지에서 선택적 검색 필드 설정
     */
    setOptionalSearchFields() {
        try {
            // 세션 스토리지에서 선택적 검색 필드 가져오기
            const optionalSearchFields = sessionStorage.getItem('optionalSearchFields')
            if (!optionalSearchFields || optionalSearchFields.trim() === '') {
                return
            }

            // 파싱하여 검색키 드롭다운에 옵션 추가
            const fieldsObj = JSON.parse(optionalSearchFields)
            const $searchKey = $('#' + this.id + '__searchKey')

            for (const [key, value] of Object.entries(fieldsObj)) {
                $searchKey.append(`<option value="${key}">${value}</option>`)
            }
        } catch (error) {
            console.error('Failed to parse optionalSearchFields:', error)
        }
    }

    /**
     * 팝업 열기
     */
    async openPopup() {
        $('.dimmed').show()
        $('#' + this.id + '__popup').show()
    }

    /**
     * 팝업 닫기 및 정리
     */
    closePopup() {
        // 현재 검색값 저장
        UA0000.func.setSearchKeyValue(
            $('#' + this.id + '__searchKey').val(),
            $('#' + this.id + '__searchValue').val()
        )

        // 팝업 요소 가져오기
        const popupSelector = '#' + this.id + '__popup'
        const $popup = $(popupSelector)
        const $dimmed = $('.dimmed')

        // 폼 입력 필드 초기화
        this.clearPopupInputs(popupSelector)

        // 이벤트 리스너 제거 및 요소 숨기기
        $dimmed.off('click')
        $dimmed.hide()
        $popup.hide()
    }

    /**
     * 팝업의 모든 입력 필드 초기화
     * @param {string} popupSelector - 팝업 선택자 문자열
     */
    clearPopupInputs(popupSelector) {
        const inputSelectors = [
            popupSelector + ' input',
            popupSelector + ' textarea'
        ]

        inputSelectors.forEach(selector => {
            $(selector).val('')
        })

        $(popupSelector + ' span').text('')
    }
}
