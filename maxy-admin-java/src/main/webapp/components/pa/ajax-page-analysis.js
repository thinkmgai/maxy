class AjaxPageAnalysis {
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
        this.table = new Tabulator("#ajaxPageTable", {
            selectableRows: 1,
            layout: 'fitDataFill',
            placeholder: 'Data is being processed',
            // rowFormatter: this.rowFormatter,
            columns: [
                {
                    title: 'Page URL',
                    field: 'reqUrl',
                    width: "50%",
                    formatter: cell => {
                        return getPageList(packageNm, serverType, cell.getValue())
                    }
                },
                {
                    title: 'Loading (AVG.)',
                    field: 'durationAvg',
                    width: '20%',
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
                    width: '17%',
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return util.comma(value)
                        }
                    }
                },
                {
                    title: 'Error',
                    field: 'errorCount',
                    width: '12%',
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
            if (this.selectedRow && typeof this.selectedRow.getElement().classList !== 'undefined') {
                this.selectedRow.getElement().classList.remove('selected_row')
            }
            // 나머지 코드...
            row.getElement().classList.add('selected_row')
            this.selectedRow = row

            const {v, func} = PA0000
            const {pageHitmap} = v.class

            let durationFrom, durationTo
            if (pageHitmap && pageHitmap.durationFrom
                && pageHitmap.durationTo) {
                durationFrom = pageHitmap.durationFrom
                durationTo = pageHitmap.durationTo
            }

            const time = {
                durationFrom, durationTo
            }

            // 팝업열기
            func.draw.ajaxPage.tablePopup(e, row, time)
        })
    }

    setTableData(data) {
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