<%--suppress HtmlFormInputWithoutLabel --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>

<style>
    #systemLogMenu .ctts_h_left {
        flex-direction: column;
        gap: 3em !important;
        align-items: flex-start !important;
    }

    #systemLogMenu .btn_search {
        background-image: url(/images/maxy/icon-search-bk.svg);
        background-repeat: no-repeat;
        background-size: 20px;
        width: 20px;
        height: 20px;
    }

    .system_log_search_wrap {
        display: flex;
        align-items: center;
        gap: .5em;
    }

    #systemLogMenu .contents_header {
        margin-bottom: 1em;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
    }

    #systemLogMenu .filter_wrapper {
        display: flex;
        align-items: center;
        gap: .5em;
    }

    #systemLogMenu #systemLogParamPopup {
        height: 50vh;
        width: 50vw;
    }

    #systemLogMenu .system_log_menu_top {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 1em;
        margin-bottom: 1em;
    }

    #systemLogMenu .system_log_menu_top h4 {
        font-weight: var(--bold);
        font-size: var(--font-l-size);
        display: inline-block;
        margin-right: 8px;
    }

    .param_detail {
        width: 100%;
        height: 100%;
    }

    #systemLogMenu .system_log_search_wrap input[type="datetime-local"] {
        padding-right: .5em;
        padding-left: .5em;
        height: var(--box-height);
        font-size: var(--font-m-size);
        cursor: pointer;
        border: 1px solid var(--color-border-in-light);
        border-radius: var(--radius);
        outline: none;
        appearance: none;
    }

    #systemLogMenu .btn_infinity {
        background: url("/images/maxy/icon-refresh.svg") no-repeat;
        width: 20px;
        height: 20px;
        background-size: 20px;
    }

    .server_status_wrap {
        display: flex;
        gap: 1em;
        justify-content: start;
    }

    .server_status_wrap .server_status_block {
        height: 20px;
        border: 1px solid var(--color-border-out-light);
        background-color: white;
        border-radius: 4px;
        font-size: 11px;
        text-align: center;
        line-height: 21px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding-left: .5em;
        padding-right: .5em;
        cursor: default;
    }

    .server_status_wrap .server_status_block .server_status {
        display: inline-block;
        background-color: #fa4949;
        width: 8px;
        height: 8px;
        border-radius: 15px;
        margin-left: 5px;
    }

    .server_status_wrap .server_status_block .server_status.green {
        background-color: #00AF6F;
    }

    #systemLogMenu .system_chart_wrap {
        display: flex;
        gap: 1em;
        margin-bottom: 1em;
    }
</style>
<!-- 시스템 관리 > 시스템 로그 -->
<div id="systemLogMenu">
    <div class="system_log_menu_top">
        <h4 data-t="menu.system.log"></h4>
        <div class="server_status_wrap">
            <div></div>
        </div>
    </div>
    <div class="system_chart_area">
        <div id="dashboard-container"></div>
    </div>
    <div class="system_chart_area">
        <div class="system_chart_wrap">
            <div id="consumerChart" class="maxy_box"></div>
            <div id="consumerChart__err" class="maxy_box"></div>
        </div>
        <div class="system_chart_wrap">
            <div id="producerChart" class="maxy_box"></div>
            <div id="producerChart__err" class="maxy_box"></div>
        </div>
        <div class="system_chart_wrap">
            <div id="websocketChart" class="maxy_box"></div>
            <div id="websocketChart__err" class="maxy_box"></div>
        </div>
    </div>

    <div style="display: none">
        <div class="contents_header">
            <div class="ctts_h_left">
                <div class="system_log_search_wrap">
                    <select id="consumerList">
                    </select>
                    <select id="threadNumList">

                    </select>
                    <input type="datetime-local" id="fromTm">
                    ~
                    <input type="datetime-local" id="toTm">
                    <button></button>
                </div>
            </div>

            <div class="ctts_h_right">
                <div class="filter_wrapper">
                    <select id="filter-field">
                        <option value="type">Type</option>
                    </select>
                    <input id="filter-value" class="filter_value" type="text" placeholder="">
                    <button id="filter-clear" class="filter_clear"></button>
                </div>
                <div>
                    <button class="btn_infinity"></button>
                </div>
            </div>
        </div>
        <div id="systemLogList"></div>
    </div>

    <div class="popup_common" id="systemLogParamPopup">
        <textarea class="param_detail enable_scrollbar" id="param" readonly></textarea>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var SM0900 = {
        v: {
            table: {},
            chart: {
                websocket: {
                    cmm: {},
                    err: {},
                },
                producer: {
                    cmm: {},
                    err: {},
                },
                consumer: {
                    sent: {},
                    err: {},
                }
            },
            dashboard: {}
        },
        init: {
            event() {
                const {func} = SM0900
                $('.dimmed').on('click', func.closePopup)
                $('#consumerList, #threadNumList, #fromTm, #toTm').on('change', func.getSystemLogList)
                $('.btn_infinity').on('click', func.toggleGet)
            },
            async created() {
                const {v, func} = SM0900
                updateContent()

                func.status.getSystemStatus()

                await func.health.drawDashboard()
                func.health.get()
            }
        },
        func: {
            health: {
                set(target, type, data) {
                    const {v} = SM0900
                    const {component} = v.dashboard.mountedComponents.find(c => c.options.renderTo === 'dashboard-' + target + '-' + type)
                    const {chart} = component

                    // 새로운 series 추가
                    data.forEach(s => {
                        const d = {
                            name: s.name,
                            data: s.data.map(([ts, val]) => [Number(ts), val])
                        }
                        chart.addSeries(d);
                    })
                },
                async drawDashboard() {
                    const {v} = SM0900
                    v.dashboard = Dashboards.board('dashboard-container', {
                        gui: {
                            layouts: [{
                                rows: [
                                    {
                                        cells: [
                                            {id: 'dashboard-producer-cmm'},
                                            {id: 'dashboard-producer-err'}
                                        ]
                                    }, {
                                        cells: [
                                            {id: 'dashboard-consumer-sent'},
                                            {id: 'dashboard-consumer-err'}
                                        ]
                                    }, {
                                        cells: [
                                            {id: 'dashboard-websocket-cmm'},
                                            {id: 'dashboard-websocket-err'}
                                        ]
                                    },
                                ]
                            }]
                        },
                        components: [{
                            renderTo: 'dashboard-producer-cmm',
                            type: 'Highcharts',
                            sync: {
                                extremes: true,
                                highlight: true
                            },
                            chartOptions: {
                                chart: {
                                    zooming: {type: 'x'}
                                },
                                title: {text: 'Producer Sent'},
                                xAxis: {type: 'datetime'},
                                plotOptions: {
                                    series: {marker: {enabled: false}}
                                },
                                series: []
                            }
                        }, {
                            renderTo: 'dashboard-producer-err',
                            type: 'Highcharts',
                            sync: {
                                extremes: true,
                                highlight: true
                            },
                            chartOptions: {
                                chart: {
                                    zooming: {type: 'x'}
                                },
                                title: {text: 'Producer Error'},
                                xAxis: {type: 'datetime'},
                                plotOptions: {
                                    series: {marker: {enabled: false}}
                                },
                                series: []
                            }
                        }, {
                            renderTo: 'dashboard-consumer-sent',
                            type: 'Highcharts',
                            sync: {
                                extremes: true,
                                highlight: true
                            },
                            chartOptions: {
                                chart: {
                                    zooming: {type: 'x'}
                                },
                                title: {text: 'Consumer Sent'},
                                xAxis: {type: 'datetime'},
                                plotOptions: {
                                    series: {marker: {enabled: false}}
                                },
                                series: []
                            }
                        }, {
                            renderTo: 'dashboard-consumer-err',
                            type: 'Highcharts',
                            sync: {
                                extremes: true,
                                highlight: true
                            },
                            chartOptions: {
                                chart: {
                                    zooming: {type: 'x'}
                                },
                                title: {text: 'Consumer Error'},
                                xAxis: {type: 'datetime'},
                                plotOptions: {
                                    series: {marker: {enabled: false}}
                                },
                                series: []
                            }
                        }, {
                            renderTo: 'dashboard-websocket-cmm',
                            type: 'Highcharts',
                            sync: {
                                extremes: true,
                                highlight: true
                            },
                            chartOptions: {
                                chart: {
                                    zooming: {type: 'x'}
                                },
                                title: {text: 'WebSocket Clients'},
                                xAxis: {type: 'datetime'},
                                plotOptions: {
                                    series: {marker: {enabled: false}}
                                },
                                series: []
                            }
                        }, {
                            renderTo: 'dashboard-websocket-err',
                            type: 'Highcharts',
                            sync: {
                                extremes: true,
                                highlight: true
                            },
                            chartOptions: {
                                chart: {
                                    zooming: {type: 'x'}
                                },
                                title: {text: 'WebSocket Error'},
                                xAxis: {type: 'datetime'},
                                plotOptions: {
                                    series: {marker: {enabled: false}}
                                },
                                series: []
                            }
                        }]
                    })
                },
                get() {
                    const {v, func} = SM0900
                    ajaxCall('/sm/0800/getSystemHealth.maxy', {
                        programName: 'websocket',
                        nodeNumber: 0,
                        logType: 'cmm'
                    }, {json: true}).then(data => {
                        func.health.set('websocket', 'cmm', data)
                    }).catch((e) => {
                        console.log(e)
                    })
                    ajaxCall('/sm/0800/getSystemHealth.maxy', {
                        programName: 'websocket',
                        nodeNumber: 0,
                        logType: 'err'
                    }, {json: true}).then(data => {
                        func.health.set('websocket', 'err', data)
                    }).catch((e) => {
                        console.log(e)
                    })
                    ajaxCall('/sm/0800/getSystemHealth.maxy', {
                        programName: 'producer',
                        nodeNumber: 0,
                        logType: 'cmm'
                    }, {json: true}).then(data => {
                        func.health.set('producer', 'cmm', data)
                    }).catch((e) => {
                        console.log(e)
                    })
                    ajaxCall('/sm/0800/getSystemHealth.maxy', {
                        programName: 'producer',
                        nodeNumber: 0,
                        logType: 'err'
                    }, {json: true}).then(data => {
                        func.health.set('producer', 'err', data)
                    }).catch((e) => {
                        console.log(e)
                    })
                    ajaxCall('/sm/0800/getSystemHealth.maxy', {
                        programName: 'consumer',
                        nodeNumber: 0,
                        logType: 'sent'
                    }, {json: true}).then(data => {
                        func.health.set('consumer', 'sent', data)
                    }).catch((e) => {
                        console.log(e)
                    })
                    ajaxCall('/sm/0800/getSystemHealth.maxy', {
                        programName: 'consumer',
                        nodeNumber: 0,
                        logType: 'err'
                    }, {json: true}).then(data => {
                        func.health.set('consumer', 'err', data)
                    }).catch((e) => {
                        console.log(e)
                    })
                }
            },
            status: {
                m: [
                    {key: 'admin', name: 'Admin'},
                    {key: 'batch', name: 'Batch'},
                    {key: 'consumer', name: 'Consumer'},
                    {key: 'producer', name: 'Producer'},
                    {key: 'websocket', name: 'WebSocket'},
                    {key: 'db', name: 'Database'},
                    {key: 'kafka', name: 'Kafka'},
                    {key: 'elastic', name: 'Opensearch'},
                    {key: 'redis', name: 'Redis'}
                ],
                getSystemStatus() {
                    const {v, func} = SM0900

                    ajaxCall('/sm/0800/getSystemStatus.maxy', {})
                        .then(data => {
                            console.log(data)
                            func.status.setSystemStatus(data)
                        }).catch((e) => {
                        console.log(e)
                    })

                },
                setSystemStatus(data) {
                    const {func} = SM0900
                    const $wrap = $('.server_status_wrap')
                    $wrap.empty()
                    // m 리스트에 있는 key 별로 group을 만들고, data에서 matching된 key 모두를 찾음
                    func.status.m.forEach(m => {
                        const baseKey = m.key;

                        // 이 key에 해당하는 모든 항목 추출 (baseKey 또는 baseKey::n)
                        const matchedKeys = Object.keys(data).filter(k => k === baseKey || k.startsWith(baseKey + '::'))

                        if (matchedKeys.length === 0) {
                            // 매칭되는 데이터가 없다면 기본 블럭 하나만 표시
                            const $block = $('<div>', {
                                class: 'server_status_block',
                                text: m.name
                            })
                            const $status = $('<span>', {
                                id: 'status__' + baseKey,
                                class: 'server_status'
                            })
                            $block.append($status)
                            $wrap.append($block)
                        } else {
                            // 매칭되는 key 하나하나에 대해 표시
                            matchedKeys.forEach((k, idx) => {
                                const label = matchedKeys.length > 1 ? `\${m.name} \${idx + 1}` : m.name

                                const $block = $('<div>', {
                                    class: 'server_status_block',
                                    text: label
                                })
                                const $status = $('<span>', {
                                    id: 'status__' + k,
                                    class: 'server_status'
                                })
                                if (data[k]) {
                                    $status.addClass('green')
                                }
                                $block.append($status)
                                $wrap.append($block)
                            })
                        }
                    })
                },
            },
            sysLog: {
                getSystemLogList() {
                    const {v} = SM0900

                    const $consumerList = $('#consumerList')
                    const $threadNumList = $('#threadNumList')
                    const $fromTm = $('#fromTm')
                    const $toTm = $('#toTm')

                    const param = {
                        consumerName: $consumerList.val(),
                        threadNum: $threadNumList.val(),
                        from: $fromTm.val(),
                        to: $toTm.val() + ':59.999'
                    }

                    ajaxCall('/sm/0800/getSystemLogList.maxy', param, {json: true})
                        .then(data => {
                            v.table.setData(data)
                        }).catch((e) => {
                        console.log(e)
                    })
                },
                drawTable() {
                    const {v, func} = SM0900

                    const placeholder = trl('common.msg.noData')
                    v.table = new Tabulator("#systemLogList", {
                        height: 'calc(100vh - 205px)',
                        layout: "fitDataFill",
                        placeholder: placeholder,
                        initialSort: [
                            {
                                column: "regDt", dir: "desc"
                            }
                        ],
                        columns: [
                            {
                                title: "Reg Dt.",
                                field: "regDt",
                                vertAlign: 'middle',
                                width: '15%',
                                formatter: util.timestampToDateTimeMs
                            },
                            {
                                title: "Type",
                                field: "type",
                                vertAlign: 'middle',
                                width: '7%'
                            },
                            {
                                title: "Msg",
                                field: "msg",
                                vertAlign: 'middle',
                                width: '23%'
                            },
                            {
                                title: "Param",
                                field: "param",
                                vertAlign: 'middle',
                                width: '55%'
                            }
                        ],
                    })
                    v.table.on('rowClick', func.sysLog.openParamDetailPopup.bind(this))
                    util.likeSearchTable(v.table)
                },
                openParamDetailPopup(e, row) {
                    $('.dimmed').show()
                    $('#systemLogParamPopup').show()

                    $("#param").scrollTop(0)

                    const param = row.getData().param
                    const $param = $('#param')
                    const isJSONString = util.isJSONString(param)
                    // json 형식의 데이터면 보기좋게 파싱해줌
                    if (isJSONString) {
                        $param.val(util.beautifyJson(param))
                        // 아니면 개행만 해줌
                    } else if (content.includes('\n')) {
                        $param.val(util.convertToNewlines(param))
                    } else {
                        $param.val(param)
                    }
                },
                closePopup() {
                    $('.dimmed').hide()
                    $('#systemLogParamPopup').hide()
                    $('#systemLogParamPopup textarea').val('')
                },

                toggleGet() {
                    const {func} = SM0900
                    func.sysLog.getSystemLogList()
                },
                async setSearchFilter() {
                    const {func} = SM0900

                    const consumerList = '${consumers}'
                    const trimmedStr = consumerList.replace(/^\[|]$/g, '')
                    const array = trimmedStr.split(',').map(item => item.trim())

                    // 상단 콤보박스 , 시간 세팅
                    // 1. thread name, 2. thread number, 3. from (now - 10분), 4. to (now)
                    const $consumerList = $('#consumerList')

                    // 콤보박스에 옵션 추가
                    array.forEach(function (workerName) {
                        $consumerList.append($('<option>', {
                            value: workerName,
                            text: workerName
                        }))
                    })

                    const $threadNumList = $('#threadNumList');
                    for (let i = 0; i < 50; i++) {
                        $threadNumList.append($('<option>', {
                            value: i,
                            text: i
                        }));
                    }

                    const $fromTm = $('#fromTm')
                    const $toTm = $('#toTm')
                    const offset = new Date().getTimezoneOffset() * 60000

                    // 현재 시간을 로컬 시간으로 설정
                    const today = new Date(Date.now() - offset)

                    // 현재 시간을 YYYY-MM-DDTHH:MM 형태로 포맷팅
                    const formattedDate = today.toISOString().slice(0, 16)

                    // 현재 시간에서 1분 전의 시간을 계산
                    today.setMinutes(today.getMinutes() - 1)
                    const formattedDateMinusOneMinute = today.toISOString().slice(0, 16)

                    // 초기값 설정
                    $fromTm.val(formattedDateMinusOneMinute) // 현재 -1분
                    $toTm.val(formattedDate) // 현재
                },
            }
        }
    }

    SM0900.init.created()
    SM0900.init.event()
</script>