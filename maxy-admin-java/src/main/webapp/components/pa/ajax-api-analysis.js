class AjaxApiAnalysis {
    constructor(props) {
        this.id = props.id
        this.chart = null
        this.table = null
        this.targetPage = props.targetPage
        this.selectedRow = null

        this.create().then(() => {
         //   this.setData()
        })
    }

    async create() {
        const v = this

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')
        v.table = new Tabulator("#ajaxApiTable", {
            selectableRows: 1,
            layout: 'fitDataFill',
            placeholder: 'Data is being processed',
            // rowFormatter: this.rowFormatter,
            columns: [
                {
                    title: 'Request URL',
                    field: 'reqUrl',
                    width: "50%",
                    formatter: cell => {
                        return getPageList(packageNm, serverType, cell.getValue())
                    }
                },
                {
                    title: 'Response (AVG.)',
                    field: 'durationAvg',
                    width: '25%',
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return util.comma(value.toFixed(0)) + 'ms'
                        }
                    }
                },
                {
                    title: 'Count',
                    field: 'count',
                    width: '24%',
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return util.comma(value)
                        }
                    }
                }

            ]
        })

        v.table.on('rowClick', (e, row) => {
            if (this.selectedRow) {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            // 나머지 코드...
            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            const {v, func} = PA0000
            const {apiHitmap} = v.class

            let durationFrom, durationTo
            if (apiHitmap && apiHitmap.durationFrom
                && apiHitmap.durationTo) {
                durationFrom = apiHitmap.durationFrom
                durationTo = apiHitmap.durationTo
            }

            const time ={
                durationFrom, durationTo
            }

            // 팝업열기
            func.draw.ajaxApi.tablePopup(e, row, time)
        })
    }

    setTableData(data) {
        // 테이블 데이터가 업데이트될 때 selectedRow 초기화
        this.selectedRow = null

        const v = this

        // 테이블에 데이터 설정
        v.table.setData(data)
    }

    /**
     * 테이블 데이터 초기화
     */
    clear() {
        const v = this
        if (v.table.rowManager.renderer) {
            v.table.clearData()
        }
    }
}