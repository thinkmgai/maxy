<%@ page contentType="text/html;charset=UTF-8" %>
<style>
    .gm_contents .tabulator-row.tabulator-selected {
        background-color: #F6F7FF;
    }
</style>
<%-- 관리 > Log Description --%>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <h4 class="gm_menu_title" data-t="menu.management.logdesc"></h4>
            <h5 class="gm_menu_desc" data-t="management.title.desc.logDescription"></h5>
        </div>
        <div class="gm_menu_button_wrap mt_auto">
            <span class="app_icon">A</span>
            <select id="packageNm" class="app_info_select"></select>
            <button id="btnSave" class="btn_common download" data-t="common.btn.save"></button>
        </div>
    </div>
    <div class="gm_contents">
        <div id="logDescriptionTable"></div>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM0305 = {
        v: {
            logType: [],
            logTypeNm: [],
            logTypeDnm: [],
            checkLogLevel: false,
            logLevelId: 0,
            logTypeListSize: 0
        },
        init: {
            event() {
                const {func} = GM0305
                $('#btnSave').on('click', func.save)

                $('#packageNm').on('change', function () {
                    func.getData()
                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')
                })
            },
            created() {
                const {func} = GM0305
                updateContent()
                appInfo.append({pId: 'packageNm'}).then(func.createTable)
            }
        },
        func: {
            createTable() {
                const {v, func} = GM0305
                const descFormatter = (cell) => {
                    const rowData = cell.getRow().getData()
                    const group = func.toCamelCase(rowData.group)
                    const detail = func.toCamelCase(rowData.detail)

                    return trl('management.log.' + group + '.' + detail)
                }

                const rowFormatter = (row) => {
                    const logType = row.getData().decimal;
                    const convertedLogType = util.convertByLogType(logType);
                    const {essentialYn} = row.getData()

                    const rowEl = row.getElement()
                    const checkbox = rowEl.querySelector('input[type="checkbox"]')

                    // 필수요소인 경우 checkbox disabled 처리
                    if (essentialYn && checkbox) {
                        checkbox.disabled = true;
                    }

                    $(row.getCells()[3].getElement()).prepend($("<span>").addClass("bp").addClass(convertedLogType[0]));
                    $(row.getCells()[4].getElement()).prepend($("<span>").addClass(convertedLogType[1]));
                }
                v.table = new Tabulator('#logDescriptionTable', {
                    height: 'calc(100vh - 175px)',
                    layout: 'fitDataFill',
                    placeholder: trl('common.msg.noData'),
                    rowFormatter,
                    columns: [
                        {
                            formatter: "rowSelection",
                            titleFormatter: "rowSelection",
                            headerSort: false,
                            hozAlign: 'center',
                            vertAlign: 'middle',
                            width: '5%'
                        },
                        {
                            title: 'Code',
                            field: 'hex',
                            width: '10%',
                        },
                        {
                            title: 'Decimal',
                            field: 'decimal',
                            width: '10%',
                        },
                        {
                            title: 'Log Class',
                            field: 'group',
                            width: '18%',
                        },
                        {
                            title: 'Log Type',
                            field: 'detail',
                            width: '20%'
                        },
                        {
                            title: 'Description',
                            field: 'description',
                            width: '35%',
                            formatter: descFormatter
                        }
                    ]
                })
                v.table.on('tableBuilt', func.getData)
            },
            async getData() {
                const {packageNm, serverType} = util.getAppInfo('#packageNm')
                await ajaxCall('/gm/0305/getLogDescription.maxy', {packageNm, serverType}).then(data => {
                    const {func} = GM0305
                    func.setData(data)
                }).catch(error => {
                    toast(trl(error.msg))
                })
            },
            setData(data) {
                const {v} = GM0305

                // maxy front인 경우 app전용 로그제외
                const maxyMode = sessionStorage.getItem('maxyMode') || 'maxy'
                if(maxyMode === 'front') {
                    data = data.filter(item => item.appOnly === false)
                }

                v.table.replaceData(data)
                v.tableSize = data.length
                v.table.getRows().filter(row => row.getData().use).forEach(row => row.toggleSelect())
            },
            save() {
                const {v, func} = GM0305
                const $checkedArray = v.table.getSelectedData()
                const logTypeList = []

                for (let i = 0; i < $checkedArray.length; i++) {
                    logTypeList.push($checkedArray[i].decimal)
                }

                const {packageNm, serverType} = util.getAppInfo('#packageNm')
                const params = {
                    packageNm, serverType,
                    logTypeList,
                    'insertType': $checkedArray.length === v.tableSize ? 'A' : ''
                }

                // 통신 시작
                ajaxCall('/gm/0305/regLogType.maxy', params, {json: true}).then(data => {
                    toast(trl('common.msg.success'))
                    func.setData(data)
                }).catch(error => {
                    const {msg} = error
                    toast(msg)
                })

            },
            toCamelCase(str) {
                if (str === 'SSL' || str === 'MAXY') {
                    return str.toLowerCase()
                } else {
                    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
                        return index === 0 ? word.toLowerCase() : word.toUpperCase()
                    }).replace(/\s+/g, '')
                }

            }
        }
    }
    GM0305.init.event()
    GM0305.init.created()
</script>