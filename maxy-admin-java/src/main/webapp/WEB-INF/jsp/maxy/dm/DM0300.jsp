<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<style>
    .device_page_divide {
        display: grid;
        grid-template-columns: 50% 49%;
        gap: 1%;
    }

    .device_page_wrap {
        position: relative;
    }

    .menu_role_detail_wrap .detail_input_wrap > div {
        margin-bottom: 10px;
    }

    .menu_role_detail_wrap .detail_text_wrap input[type="text"] {
        width: 85%;
    }

    .menu_role_detail_wrap .detail_text_wrap input[type="number"] {
        width: 85%;
    }

    .menu_role_detail_wrap .detail_text_wrap input[type="text"]:invalid {
        animation: shake 300ms;
        color: #dc3545;
    }

    @keyframes shake {
        25% {
            transform: translateX(4px);
        }
        50% {
            transform: translateX(-4px);
        }
        75% {
            transform: translateX(4px);
        }
    }

    .menu_role_detail_wrap .detail_choose_wrap input[type="radio"] + label {
        width: 100px;
        margin-right: 25px;
    }

    .menu_role_detail_wrap .detail_choose_wrap input[type="radio"]:disabled:checked + label {
        background-image: url(/images/maxy/radio-on-disabled.svg);
    }

    .detail_btn_wrap .btn_common {
        width: 145px;
        height: 30px;
    }

    .menu_role_tree > div {
        display: grid;
        grid-template-columns: 32px auto;
        height: var(--box-height);
        padding: 10px;
        align-items: center;
        margin-bottom: 10px;
    }

    .dark_mode .detail_input_wrap .detail_text_wrap input[type="text"]:read-only {
        border-color: var(--black-2) !important;
        background-color: var(--black-2) !important;
        color: #fff;
    }

    .tabulator .tabulator-header .tabulator-col.tabulator-sortable .tabulator-col-title {
        padding-right: 0;
    }
</style>

<%-- 관리 > 장치 > 모니터링 화면 설정 --%>
<div class="contents_header">
    <div class="ctts_h_left">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title" data-t="management.title.monitoringSetting"></h4>
            </div>

            <h5 class="gm_menu_desc" data-t="management.title.desc.monitoring"></h5>
        </div>
    </div>
</div>
<jsp:include page="DM03P1.jsp"/>
<div class="device_page_divide">
    <div class="device_page_wrap">
        <div class="table-group">
            <div id="targetDeviceListTable"></div>
        </div>
        <div class="add_btn_wrap">
            <label for="addSize"></label>
            <select id="addSize">
                <option value="100" selected>100</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="10000">10000</option>
            </select>
            <button id="btnLoadMoreData" class="btn btn_common opposite" data-t="common.btn.more"></button>
        </div>

    </div>
    <div class="device_page_wrap">
        <input type="hidden" name="selectedPackageNm" id="selectedPackageNm"/>
        <input type="hidden" name="selectedServerType" id="selectedServerType"/>
        <input type="hidden" name="selectedTargetId" id="selectedTargetId"/>
        <input type="hidden" name="selectedDeviceId" id="selectedDeviceId"/>

        <div id="area-detailTable">
            <div id="targetDevicePageListTable">
            </div>
        </div>
    </div>
</div>
<script>
    var DM0300 = {
        v: {
            table: [],
            // 검색 매개 변수 저장용. 페이지 이동시에도 동일한 검색 결과를 바탕으로 이동해야 함
            searchParam: {
                searchOsType: '',
                searchTextType: '',
                searchServerType: '',
                searchValue: '',
                offsetIndex: 0,
                targetIndex: 100,
                pageSize: 100,
                listSize: ''
            },
            //해당 코드 targetId 저장용
            targetId: -1,
            detailTable: []
        },
        init: {
            // 버튼 이벤트 등록
            event() {
                // 검색 조건 텍스트
                $('.search_filter_comp').on('click', search.toggle)
                $('#btnLoadMoreData').on('click', DM0300.func.loadMoreData)
            },
            // 화면이 켜지고 초기값 세팅하는 함수 모음
            created() {
                updateContent()
                search.append({
                    keyword: true,
                    type: [
                        'textType1',
                        'appInfo',
                        'osType'
                    ],
                    func: DM0300.func.doSearch
                }).then(() => {
                    search.load()
                    search.setOptionsText()

                    DM0300.func.createTable()
                    DM0300.func.createDetailTable()

                    DM0300.func.getTargetDeviceList()
                })
            }
        },
        func: {
            loadMoreData() {
                const pageSize = $('#addSize').val()
                const listSize = DM0300.v.searchParam.listSize
                DM0300.v.searchParam.offsetIndex += Number(listSize)
                DM0300.v.searchParam.targetIndex = Number(pageSize)

                DM0300.func.getTargetDeviceList()
            },
            doSearch() {
                DM0300.v.searchParam.searchValue = $('#searchText').val()
                DM0300.v.searchParam.searchOsType = $('#osType').val()
                DM0300.v.searchParam.searchTextType = $('#textType').val()
                DM0300.v.searchParam.offsetIndex = 0
                DM0300.v.searchParam.targetIndex = 100
                $('#addSize').val(100);
                search.setOptionsText()
                DM0300.func.getTargetDeviceList()
                search.save()
            },
            createTable() {
                const vipYn = function (cell) {
                    if (cell.getData().vipYn === 'Y') {
                        return "<span class='btn_yn'>VIP</span>"
                    }
                }

                const serverTypeNm = function (cell) {
                    let serverName = getServerNm(cell.getData().serverType)
                    return i18next.tns('common.' + serverName)
                }

                const placeholderText = i18next.tns('common.msg.noData')

                const columnNames = {
                    'deviceId': i18next.tns('common.tableColumn.deviceId'),
                    'userId': i18next.tns('common.text.userId'),
                    'status': i18next.tns('common.text.status'),
                    'target': i18next.tns('common.tableColumn.app'),
                    'vip': i18next.tns('management.device.text.vipYn'),
                    "server": i18next.tns('common.tableColumn.server'),
                    "path": i18next.tns('common.tableColumn.path'),
                    "reqUrl": i18next.tns('common.tableColumn.reqUrl'),
                }

                DM0300.v.table = new Tabulator("#targetDeviceListTable", {
                    height: 'calc(100vh - 225px)',
                    layout: "fitDataFill",
                    columnHeaderVertAlign: 'middle',
                    placeholder: placeholderText,
                    selectable: 1,
                    columns: [ //Define Table Columns
                        {
                            title: columnNames.deviceId,
                            field: "deviceId",
                            vertAlign: "middle",
                            width: "38%"
                        },
                        {
                            title: columnNames.userId,
                            field: "userId",
                            vertAlign: "middle",
                            width: "18%"
                        },
                        {
                            title:  columnNames.vip,
                            field: "vipYn",
                            vertAlign: "middle",
                            width: "7%",
                            headerTooltip: "VIP",
                            formatter: vipYn
                        },
                        {
                            title: columnNames.target,
                            field: "packageNm",
                            vertAlign: "middle",
                            width: "18%",
                            formatter: util.getAppName
                        },
                        {
                            title: columnNames.server,
                            field: "serverType",
                            vertAlign: "middle",
                            width: "9%",
                            headerTooltip: "Server",
                            formatter: serverTypeNm
                        },
                        {
                            title: "OS",
                            field: "osType",
                            vertAlign: "middle",
                            width: "8%",
                            headerTooltip: "OS"
                        }
                    ],
                });

                //trigger an alert message when the row is clicked
                DM0300.v.table.on("rowClick", (e, row) => {
                    DM0300.func.openDetailTable(row.getData())
                    DM0300.func.openSavePopup()
                });
            },
            openDetailTable(data) {
                $('#selectedPackageNm').val(data.packageNm);
                $('#selectedServerType').val(data.serverType);
                $('#selectedTargetId').val(data.targetId);
                $('#selectedDeviceId').val(data.deviceId);
                DM0300.func.getTargetDevicePageList(data)
            },
            createDetailTable() {
                const placeholderText = i18next.tns('common.msg.noData')

                const columnNames = {
                    'deviceId': i18next.tns('common.tableColumn.deviceId'),
                    'userId': i18next.tns('common.text.userId'),
                    'status': i18next.tns('common.text.status'),
                    'target': i18next.tns('common.tableColumn.app'),
                    'vip': i18next.tns('management.device.text.vipYn'),
                    "server": i18next.tns('common.tableColumn.server'),
                    "path": i18next.tns('common.tableColumn.pageName'),
                    "reqUrl": i18next.tns('common.text.requestedUrl'),
                }

                DM0300.v.detailTable = new Tabulator("#targetDevicePageListTable", {
                    height: 'calc(100vh - 220px)',
                    layout: "fitDataFill",
                    columnHeaderVertAlign: 'middle',
                    placeholder: placeholderText,
                    columns: [
                        {
                            title: columnNames.reqUrl,
                            field: "reqUrl",
                            vertAlign: "middle",
                            width: "60%"
                        },
                        {
                            title: columnNames.path,
                            field: "appPageNm",
                            vertAlign: "middle",
                            width: "33%"
                        },
                        {
                            title: columnNames.target,
                            field: "packageNm",
                            visible: false,
                        },
                        {
                            title: columnNames.server,
                            field: "serverType",
                            visible: false,
                        },
                        {
                            title: "SEQ",
                            field: "pageSeq",
                            vertAlign: "middle",
                            visible: false,
                        }
                    ],
                });
            },
            openSavePopup() {
                const $dimmed = $('.dimmed')

                //페이지 등록 시 선택된 device가 있는지 Check
                if ($('#selectedServerType').val() && $('#selectedPackageNm').val()
                    && $('#selectedTargetId').val() && $('#selectedDeviceId').val()) {

                    $('#targetDevicePagePopup').show()
                    DM03P1.func.open()

                    $dimmed.show()
                } else {
                    const msg = i18next.tns('management.device.msg.deviceSelect')
                    toast(msg)
                }
            },
            makeList(data) {
                const {targetDeviceList} = data
                if (targetDeviceList) {
                    if (DM0300.v.searchParam.offsetIndex > 0) {
                        DM0300.v.table.addData(targetDeviceList)
                        DM0300.v.table.setPageSize(DM0300.v.searchParam.pageSize)
                    } else {
                        DM0300.v.table.setData(targetDeviceList)
                    }
                }
            },
            getTargetDeviceList() {
                DM0300.v.searchParam.packageNm = $('#packageNm').val()
                DM0300.v.searchParam.serverType = $('#packageNm option:checked').data('server-type')

                const params = {...DM0300.v.searchParam}

                if (util.checkParam(params)) {
                    return;
                }

                ajaxCall('/gm/0503/getTargetDeviceList.maxy', params)
                    .then((data) => {
                        DM0300.v.searchParam.listSize = data.targetDeviceList.length
                        DM0300.func.makeList(data)
                    }).catch((error) => {
                    toast(i18next.tns(error.msg))
                })
            },
            getTargetDevicePageList(rowData) {
                const params = {
                    packageNm: rowData.packageNm,
                    serverType: rowData.serverType,
                    deviceId: rowData.deviceId,
                    targetId: rowData.targetId
                }
                DM0300.v.search = params
                ajaxCall('/gm/0503/getTargetDevicePageList.maxy', params)
                    .then((data) => {
                        DM0300.func.makeDetailList(data)
                    }).catch((error) => {
                    toast(i18next.tns(error.msg))
                })
            },
            makeDetailList(data) {
                DM0300.v.detailTable.setData(data.targetDevicePageList)
            },
        }
    }

    DM0300.init.created()
    DM0300.init.event()
</script>