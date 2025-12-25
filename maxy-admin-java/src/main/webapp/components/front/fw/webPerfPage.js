class MaxyFrontWebPerfPage {
    constructor(props) {
        this.id = props.id
        this.targetPage = props.targetPage
        this.pending = new Set();

        // Core Vital별 상태 기준 값, NEEDS_IMPROVEMENT 이상일 경우 POOR
        this.THRESHOLDS = {
            LCP: {GOOD: 2500, NEEDS_IMPROVEMENT: 4000},
            INP: {GOOD: 200, NEEDS_IMPROVEMENT: 500},
            CLS: {GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25},
            FCP: {GOOD: 1800, NEEDS_IMPROVEMENT: 3000},
        }

        this.create().then(() => {
        })
    }

    async create() {
        const v = this

        v.initTable()
    }

    initTable() {
        const v = this
        const {pending} = v

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')

        v.table = new Tabulator("#pageList", {
            selectableRows: 1,
            height: '40vh',
            renderVertical: "basic",
            layout: 'fitDataFill',
            placeholder: 'Data is being processed',
            initialSort: [
                {column: "mark", dir: "desc"}, // 즐겨찾기된 항목이 먼저 오도록
                {column: "count", dir: "desc"} // 그 다음은 Page View 기준으로 내림차순
            ],
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
                    title: 'Page URL',
                    field: 'reqUrl',
                    width: "25%",
                },
                {
                    title: 'Page Name',
                    field: 'reqUrl',
                    width: "20%",
                    formatter: cell => {
                        return getPageList(packageNm, serverType, cell.getValue())
                    }
                },
                {
                    title: 'Page View',
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
                    title: 'User',
                    field: 'userCount',
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
                    title: 'Load Time',
                    field: 'loadingTime',
                    width: '9%',
                    cssClass: "right-align",
                    formatter: cell => {
                        const value = cell.getValue()
                        if (isNaN(value)) {
                            return '-'
                        } else {
                            return popup.dataFormat(value, 'interval')
                        }
                    }
                },
                {
                    title: 'Avg. LCP',
                    field: 'lcp',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '9%',
                    cssClass: "right-align",
                    formatter: (cell) => {
                        if(cell.getData().lcp === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const lcp = Number(cell.getData().lcp).toFixed(0)
                        const lcpTxt = lcp / 1000 + 's'

                        if (lcp < v.THRESHOLDS.LCP.GOOD) {
                            return `<span class='btn_yn good'>${lcpTxt}</span>`
                        } else if (lcp >= v.THRESHOLDS.LCP.GOOD && lcp < v.THRESHOLDS.LCP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${lcpTxt}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${lcpTxt}</span>`
                        }
                    }
                },
                {
                    title: 'Avg. INP',
                    field: "inp",
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: "9%",
                    cssClass: "right-align",
                    formatter: (cell) => {
                        if(cell.getData().inp === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const inpVal = Number(cell.getData().inp)
                        const inp = inpVal.toFixed(0)
                        const formatted = util.comma(inp)

                        if (inpVal < v.THRESHOLDS.INP.GOOD) {
                            return `<span class='btn_yn good'>${formatted}ms</span>`
                        } else if (inpVal >= v.THRESHOLDS.INP.GOOD && inpVal < v.THRESHOLDS.INP.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${formatted}ms</span>`
                        } else {
                            return `<span class='btn_yn poor'>${formatted}ms</span>`
                        }
                    }
                },
                {
                    title: 'Avg. CLS',
                    field: 'cls',
                    vertAlign: 'middle',
                    hozAlign: 'center',
                    width: '9%',
                    cssClass: "right-align",
                    formatter: (cell) => {
                        if(cell.getData().cls === ''){
                            return `<span class='btn_yn none'>-</span>`
                        }
                        const cls = (Number(cell.getData().cls) === 0 ? 0 : Number(cell.getData().cls).toFixed(4))
                        if (cls < v.THRESHOLDS.CLS.GOOD) {
                            return `<span class='btn_yn good'>${cls}</span>`
                        } else if (cls >= v.THRESHOLDS.CLS.GOOD && cls < v.THRESHOLDS.CLS.NEEDS_IMPROVEMENT) {
                            return `<span class='btn_yn improve'>${cls}</span>`
                        } else {
                            return `<span class='btn_yn poor'>${cls}</span>`
                        }
                    }
                },
            ]
        })

        v.table.on('rowClick', (e, row) => {
            if ($(e.target).closest('.mark-cell').length > 0) return;
            popup.rowClick(e, row, v, (data) => {
                if ($(e.target).closest('.mark-cell').length > 0) return;

                v.getList(data)
            });
            // 현재 테이블의 이전 선택 해제
        })
    }

    setData(data) {
        const v = this

        v.table.setData(data)
    }

    /**
     * 즐겨찾기 상태를 토글하는 API 호출
     * @param {string} reqUrl - 페이지 URL
     * @param {boolean} isFavorite - 즐겨찾기 상태
     * @returns {Promise} API 응답
     */
    async updateFavorite(reqUrl, isFavorite) {
        const v = this
        const {targetPage} = v

        try {
            return await ajaxCall('/fw/0000/page/mark.maxy', {
                packageNm: $('#packageNm').val(),
                serverType: $('#packageNm option:checked').data('server-type'),
                from: targetPage.v.time.from,
                to: targetPage.v.time.to,
                // type: 'PAGE',
                reqUrl,
                mark: isFavorite
            }, {disableCursor: true}) // 성공 시 undefined 반환

        } catch (error) {
            console.error('즐겨찾기 API 호출 실패:', error)
            throw error
        }
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

    getList(data) {
        const v = this
        const {targetPage} = v
        const {time} = targetPage.v
        const {from, to} = time

        const options = {
            appendId: 'maxyPopupWrap',
            id: 'pvPopup',
            type: 'Page View',
            from: from,
            to: to,
            logType: 'page',
            topChartId:'webVital',
            botChartId: 'waterfall',
            searchType: 'reqUrl',
            searchValue: data.reqUrl,
            title: 'Page URL'
        }

        new MaxyFrontPopupPageView(options)

    }

    /**
     * 차트 데이터 초기화
     * 모든 차트와 테이블의 데이터를 초기 상태로 리셋
     */
    clear() {
        const v = this

        // page tale 초기화
        if (v.table) {
            // 테이블 초기화 (테이블 데이터 삭제)
            if (v.table.rowManager.renderer) {
                v.table.clearData() // 테이블 데이터 초기화
            }
        }

        if (v.pending.size > 0) {
            v.pending = new Set()
        }
    }
}
