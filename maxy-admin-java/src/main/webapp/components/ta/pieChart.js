class PieChart {
    constructor(props) {

        this.id = props.id
        this.table = null
        this.target = props.target

        this.create()
    }

    create() {
        this.table = new Tabulator('#' + this.id, {
            height: 'calc(100vh - 516px)',
            layout: "fitDataFill",
            placeholder: trl('common.msg.noData'),
            selectableRows: 1,
            rowFormatter: this.rowFormatter,
            columns: []
        })
    }

    setData(data) {
        const {table} = this

        // type : error, crash, page
        const type = sessionStorage.getItem('la-tab');
        // tap type에 따라 컬럼 설정
        table.setColumns(this.columns[type])

        table.setData(data)
        table.off('rowClick')
        table.on('rowClick', this.rowClick.bind(this))
        table.redraw(true)
        cursor.hide()
    }

    clear() {
        const {table, target} = this

        // log table 페이징 전용 변수 초기화
        target.v.page.offsetIndex = 1
        target.v.page.lastId = []
        target.v.page.lastLogTm = []
        target.v.page.from = null
        target.v.page.to = null

        table.setColumns([])
        table.setData([])
    }

    rowFormatter(row){
        // type : error, crash, page
        if (sessionStorage.getItem('la-tab') === 'error' && typeof row.getCells()[3] !== 'undefined'){
            // 로그타입에 맞는 아이콘을 리턴받아서 각 셀에 넣어줌
            const logType = row.getData().logType;
            const convertedLogType = util.convertByLogType(logType);

            // log class
            $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(convertedLogType[0]))
            // log type
            $(row.getCells()[4].getElement()).prepend($("<span>").addClass(convertedLogType[1]))
        }

        const $btnCopy = row.getElement().querySelectorAll('.btn_copy')
        $btnCopy.forEach((btnCopy) => {
            const $btn = $(btnCopy);
            $btn.off(); // 이전 이벤트 제거
            $btn.on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                util.copy($(e.target).data('str'));
            });
        });
    }

    rowClick(e, row){
        const {target} = this
        const params = {
            packageNm: row.getData().packageNm,
            serverType: row.getData().serverType,
            appVer: row.getData().appVer,
            osType: row.getData().osType,
            deviceId: row.getData().deviceId,
            logTm: row.getData().logTm,
            logType: row.getData().logType,
            memUsage: row.getData().memUsage,
            cpuUsage: row.getData().cpuUsage,
            deviceModel: row.getData().deviceModel,
            comType: row.getData().comType,
            comSensitivity: row.getData().comSensitivity,
            osVer: row.getData().osVer,
            logTypeNm: row.getData().logTypeNm,
            logTypeDnm: row.getData().logTypeDnm,
            docId: row.getData()._id,
            dummy: false
        }

        const crashParams = {
            ...params,
            dummy: row.getPosition() === 1
        }

        const stackParams = {
            packageNm: row.getData().packageNm,
            serverType: row.getData().serverType,
            appVer: row.getData().appVer,
            osType: row.getData().osType,
            deviceId: row.getData().deviceId,
            logTm: Number(row.getData().logTm),
            docId: row.getData()._id,
        }

        const crashStackParams = {
            ...stackParams,
            dummy: row.getPosition() === 1
        }

        // type : error, crash, page
        const type = sessionStorage.getItem('la-tab');

        if (type === 'error') {
            const options = {
                appendId: 'maxyPopupWrap',
                id: 'realTime',
                param: params,
                stackParam: stackParams
            }
            new MaxyPopupLogStack(options)
        } else if (type === 'crash') {
            const options = {
                appendId: 'maxyPopupWrap',
                id: 'realTime',
                param: crashParams,
                stackParam: crashStackParams,
                type: 'crash'
            }
            new MaxyPopupLogStack(options)
        } else if (type === 'page') {
            const pvParams = {
                data: row.getData(),
                from: target.v.time.from,
                to: target.v.time.to,
                searchType: $('#textType').val(),
                searchValue: $('#searchText').val(),
                appVer: sessionStorage.getItem('appVer')
            }

            const options = {
                appendId: 'maxyPopupWrap',
                id: 'pageView',
                param: pvParams,
                popupType: 'Page View'
            }
            new MaxyPopUpPvList(options)
        }
    }

    columnNames = {
        "time": trl('common.tableColumn.time'),
        "deviceId": trl('common.tableColumn.deviceId'),
        "appVer": trl('common.tableColumn.appVer'),
        "crashName": trl('common.tableColumn.crashName'),
        "logClass": trl('common.tableColumn.logClass'),
        "logType": trl('common.tableColumn.logType'),
        "causedBy": trl('common.tableColumn.causedBy'),
        "reqUrl": trl('common.text.requestedUrl'),
        "pageUrl": trl('common.text.pageUrl'),
        "timeFrom": trl('common.tableColumn.timeFrom'),
        "timeTo": trl('common.tableColumn.timeTo'),
        "pageName": trl('common.tableColumn.pageName'),
        "view": trl('common.tableColumn.view'),
        "viewer": trl('dashboard.bi.viewer'),
        "avgLoadingTime": trl('common.tableColumn.avgLoadingTime'),
        "avgStayTime": trl('common.tableColumn.avgStayTime'),
    }

    columns = {
        error: [
            {
                title: this.columnNames.time,
                field: "logTm",
                hozAlign: "left",
                width: 190,
                formatter: util.timestampToDateTimeMs
            },
            {
                title: this.columnNames.deviceId,
                field: "deviceId",
                hozAlign: "left",
                width: "18%",
                formatter: cell => {
                    return util.addCopyButton(cell.getValue())
                },
            },
            {
                title: "App Ver.",
                field: "appVer",
                hozAlign: "left",
                width: "7%"
            },
            {
                title: this.columnNames.logClass,
                field: "logType",
                hozAlign: "left",
                width: "15%",
                formatter: cell => {
                    return getLogTypeGroup(cell.getValue())
                }
            },
            {
                title: this.columnNames.logType,
                field: "logType",
                hozAlign: "left",
                width: "13%",
                formatter: cell => {
                    return getLogTypeDetail(cell.getValue())
                }
            },
            {
                title: this.columnNames.reqUrl,
                field: "reqUrl",
                hozAlign: "left",
                width: "17%",
                tooltip: true,
                formatter: cell => {
                    return util.addCopyButton(cell.getValue())
                },
            },
            {
                title: this.columnNames.pageUrl,
                field: "pageUrl",
                hozAlign: "left",
                width: "17%",
                tooltip: true,
                formatter: cell => {
                    return util.addCopyButton(cell.getValue())
                },
            },
        ],
        crash: [                 //define the table columns
            {
                title: this.columnNames.time,
                field: "logTm",
                hozAlign: "left",
                width: 190,
                formatter: util.timestampToDateTimeMs
            },
            {
                title: this.columnNames.deviceId,
                field: "deviceId",
                hozAlign: "left",
                width: "18%",
                formatter: cell => {
                    return util.addCopyButton(cell.getValue())
                },
            },
            {
                title: "App Ver.",
                field: "appVer",
                hozAlign: "left",
                width: "7%"
            },
            {
                title: this.columnNames.crashName,
                field: "logName",
                hozAlign: "left",
                width: "19%",
                formatter: function (cell) {
                    const logNameData = setLogName(cell);
                    return util.addCopyButton(logNameData ? logNameData.crashName : '-');
                }
            },
            {
                title: this.columnNames.causedBy,
                field: "logName",
                hozAlign: "left",
                width: "28%",
                formatter: function (cell) {
                    let logNameData = setLogName(cell);
                    return util.addCopyButton(logNameData ? logNameData.caused : '-');
                }
            },
            {
                title: this.columnNames.pageUrl,
                field: "pageUrl",
                hozAlign: "left",
                width: "15%",
                tooltip: true,
                formatter: cell => {
                    return util.addCopyButton(cell.getValue())
                },
            },
        ],
        page: [
            {
                title: this.columnNames.pageUrl,
                field: "reqUrl",
                hozAlign: "left",
                width: "30%",
                formatter: cell => {
                    return util.addCopyButton(cell.getValue())
                }
            },
            {
                title: this.columnNames.pageName,
                field: "reqUrl",
                hozAlign: "left",
                width: "30%",
                formatter: cell => {
                    // todo: selector 너무 많이 돌거 같은데 어떻게 할 지 생각 필요
                    const {packageNm, serverType} = util.getAppInfo('#packageNm')
                    let pageName = getPageList(packageNm, serverType, cell.getValue(), true)
                    if(pageName === '') pageName = '-'
                    return util.addCopyButton(pageName)
                }
            },
            {
                title: this.columnNames.avgStayTime,
                field: "avgStayTime",
                hozAlign: "left",
                width: "10%",
                formatter: cell => {
                    return util.convertTime(cell.getValue(), false, false)
                }
            },
            {
                title: this.columnNames.avgLoadingTime,
                field: "avgLoadingTime",
                hozAlign: "left",
                width: "10%",
                formatter: cell => {
                    return util.convertTime(cell.getValue(), false, false)
                }
            },
            {
                title: this.columnNames.view,
                field: "view",
                hozAlign: "left",
                width: "10%",
                formatter: cell => {
                    return Number(cell.getValue()).toLocaleString()
                }
            },
            {
                title: this.columnNames.viewer,
                field: "viewer",
                hozAlign: "left",
                width: "9%",
                formatter: cell => {
                    return Number(cell.getValue()).toLocaleString()
                }
            }
        ]
    }
}

function setLogName(cell) {
    const logName = cell.getData().logName
    if (!logName) {
        return '-'
    }

    const parts = logName.split(":");

    return {
        "caused": parts[1],
        "crashName": parts[0]
    }
}