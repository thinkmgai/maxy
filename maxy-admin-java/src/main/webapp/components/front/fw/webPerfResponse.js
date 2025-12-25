class MaxyFrontWebPerfNetwork {
    constructor(props) {
        this.id = props.id
        this.targetPage = props.targetPage
        this.from = null
        this.to = null
        this.table = {}
        this.pending = new Set();

        this.create().then(() => {
        })
    }

    async create() {
        const v = this

     //   v.initChart()
        v.initTable()
    }


    initTable() {
        const v = this
        const {id, pending} = v

        const selector = `#${id}List`

        // 해당 ID가 실제 DOM에 있는지 확인 (없으면 건너뜀)
        if (!$(selector).length) {
            console.warn(`${selector} 요소가 존재하지 않습니다.`)
            return
        }

        v.table = new Tabulator(selector, {
            selectableRows: 1,
            height: '40vh',
            renderVertical: "basic",
            layout: 'fitDataFill',
            placeholder: 'Data is being processed',
            columns: [
                {
                    title: '',
                    field: 'mark',
                    width: '1%',
                    hozAlign: 'center',
                    headerSort: false,
                    cssClass: "mark-cell",
                    formatter: (cell) => {
                        const rowData = cell.getRow().getData()
                        const isFavorite = rowData.mark || false // 서버에서 즐겨찾기 상태를 받아온다고 가정

                        const starClass = isFavorite ? 'filled' : ''
                        return `<img class="favorite-star ${starClass}" data-url="${rowData.pageUrl}">`
                    },
                    cellClick: async (e, cell) => {
                        e.stopPropagation() // 행 클릭 이벤트 방지

                        const row = cell.getRow()
                        const data = row.getData()

                        const rowKey = data._rowKey
                        if (pending.has(rowKey)) return
                        pending.add(rowKey)

                        const nextMark = !Boolean(data.mark)
                        row.update({mark: nextMark})

                        try {
                            const reqUrl = data.reqUrl
                            // 즐겨찾기 상태 토글을 위한 AJAX 호출
                            await v.updateFavorite(reqUrl, nextMark)

                            // 성공 시 테이블 재정렬 (mark가 true인 것들이 먼저 오도록)
                            v.sortByFavorite()

                            v.table.deselectRow();    // 선택 초기화
                        } catch (error) {
                            console.error('즐겨찾기 API 호출 오류:', error)
                            row.update({mark: !nextMark});
                            // 실패 시 사용자에게 알림
                            toast('즐겨찾기 업데이트에 실패했습니다.')
                        } finally {
                            pending.delete(rowKey)
                        }
                    }
                },
                {
                    title: 'Call URL',
                    field: 'reqUrl',
                    width: '50%'
                },
                {
                    title: 'Count',
                    field: 'count',
                    width: '8%',
                    cssClass: "right-align",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return util.comma(value)
                        }
                    }
                },
                {
                    title: 'Success',
                    field: 'count2xx',
                    width: '8%',
                    cssClass: "right-align",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return util.comma(value)
                        }
                    }
                },
                {
                    title: 'Client Error',
                    field: 'count4xx',
                    width: '8%',
                    cssClass: "right-align",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return util.comma(value)
                        }
                    }
                },
                {
                    title: 'Server Error',
                    field: 'count5xx',
                    width: '8%',
                    cssClass: "right-align",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return util.comma(value)
                        }
                    }
                },
                {
                    title: 'User',
                    field: 'userCount',
                    width: '6%',
                    cssClass: "right-align",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (!value) {
                            return '-'
                        } else {
                            return util.comma(value)
                        }
                    }
                },
                {
                    title: 'Response Time',
                    field: 'responseTime',
                    width: '8%',
                    cssClass: "right-align",
                    formatter: cell => {
                        const value = cell.getValue()

                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return popup.dataFormat(value, 'interval')
                        }
                    }
                }
            ]
        })

        v.table.on('rowClick', (e, row) => {
            // 다른 테이블의 선택된 행 초기화
            if ($(e.target).closest('.mark-cell').length > 0) return

            popup.rowClick(e, row, v, (data) => {
                if ($(e.target).closest('.mark-cell').length > 0) return;

                v.getList(data)
            });
        })

    }

    setData(data) {
        const v = this

        if (data) {
            v.table.setData(data)
        }
    }

    getList(data) {
        const v = this
        const {targetPage} = v
        const {time} = targetPage.v
        const {from, to} = time

        const options = {
            appendId: 'maxyPopupWrap',
            id: 'networkDetail',
            type: 'Response Time',
            from: from,
            to: to,
            logType: 'ajax',
            topChartId: 'responseDetail',
            botChartId: 'responseChart',
            reqUrl: data.reqUrl
        }

        new MaxyFrontPopupFwAjaxResponse(options)
    }

    /**
     * 즐겨찾기(mark) 기준으로 테이블 정렬
     * mark가 true인 항목들이 맨 위로 오도록 정렬
     */
    sortByFavorite() {
        const v = this

        // mark 필드 기준으로 내림차순 정렬 (true가 먼저 오도록)
        v.table.setSort([
            {column: "mark", dir: "desc"}, // mark가 true인 것들이 먼저
            {column: "count", dir: "desc"} // 그 다음은 Page View 기준으로 정렬 (선택사항)
        ])
    }

    /**
     * 즐겨찾기 상태를 토글하는 API 호출
     * @param {string} reqUrl - api URL
     * @param {boolean} isFavorite - 즐겨찾기 상태
     * @returns {Promise} API 응답
     */
    async updateFavorite(reqUrl, isFavorite) {
        const v = this
        const {targetPage} = v

        try {
            return await ajaxCall('/fw/0000/api/mark.maxy', {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                from: targetPage.v.time.from,
                to: targetPage.v.time.to,
                // type: 'API',
                reqUrl,
                mark: isFavorite
            }, {disableCursor: true}) // 성공 시 undefined 반환

        } catch (error) {
            console.error('즐겨찾기 API 호출 실패:', error)
            throw error
        }
    }

    /**
     * 차트 데이터 초기화
     * 모든 차트와 테이블의 데이터를 초기 상태로 리셋
     */
    clear() {
        const v = this

        const {table} = v

        try {
            // 테이블 초기화
            if (table) {
                if (table.rowManager.renderer) {
                    table.clearData()
                }
            } else {
                toast('오류가 발생하였습니다.')
            }
        } catch (e) {
            console.log(e)
            toast('오류가 발생하였습니다.')
        }
    }

    clearTable() {
        const v = this
        if (v.table.rowManager.renderer) {
            v.table.clearData()
        }
    }

}
