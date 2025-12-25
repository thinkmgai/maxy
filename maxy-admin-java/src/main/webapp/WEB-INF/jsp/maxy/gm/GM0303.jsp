<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .right_content_wrap .maxy_contents_wrap {
        height: 100%;
    }

    .maxy_contents_wrap .gm_wrap {
        height: 100%;
    }

    .gm_header {
        margin-bottom: 16px;
        display: grid;
        grid-template-columns: 48% 52%;
    }

    .btn_common {
        white-space: nowrap;
    }

    .tabulator-cell[tabulator-field="reqUrl"],
    .tabulator-cell[tabulator-field="appPageNm"],
    .tabulator-cell[tabulator-field="appPageDesc"] {
        display: block !important;
        text-overflow: ellipsis;
        height: auto !important;
    }

    .gm_contents_wrap {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .gm_header .app_info_wrap {
        display: flex;
        justify-content: end;
        margin-bottom: 1em;
        gap: .5em;
        align-items: center;
    }

    .config_contents_wrap {
        width: 100%;
        display: grid;
        align-items: center;
        border: 1px solid #E3E5E8;
        border-radius: var(--radius);;
        margin-bottom: 16px;
    }

    .config_list_item {
        display: flex;
        justify-content: space-between;
        padding: 8px;
    }

    .config_list_item .list_item {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .config_list_item .list_item:first-child {
        width: 100%;
    }

    .config_list_item .list_item:last-child {
        display: flex;
        justify-content: space-between;
    }

    .config_list_item label + input[type="text"] {
        width: 100px;
    }

    .config_list_item .list_item > div {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: flex-end;
    }

    .config_list_item .list_item .btn_common {
        font-size: 14px;
        width: 75px;
    }

    .config_list_item .list_item .btn_common:after {
        content: 'Confirm';
    }

    .config_list_item .list_item .btn_common.checked {
        background-image: url("/images/maxy/icon-mark-check.svg");
        background-repeat: no-repeat;
        background-position: center;
    }

    .config_list_item .list_item .btn_common.checked:after {
        content: '';
    }

    .config_list_item .input_parameter {
        width: 100% !important;
    }

    .gm_header .gm_menu_button_wrap {
        justify-content: flex-end;
    }

    .gm_header .gm_menu_text_wrap .gm_menu_desc {
        line-height: normal;
    }

    .gm_contents_wrap .search_input_wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        gap: .5em;
    }

    .gm_contents_wrap .search_input_wrap .search_input_wrapper {
        display: flex;
        gap: .5em;
        align-items: center;
    }

    .gm_contents_wrap .search_input_wrap .btn_search {
        background: url(/images/maxy/icon-search-small-p.svg) no-repeat center center / 16px;
        width: 32px;
        height: 32px;
    }

    .gm_contents_wrap .paging_btn_wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        flex-wrap: wrap;
    }

    .gm_contents_wrap .paging_btn_wrap button {
        padding: 5px 10px;
        font-size: 13px;
    }

    .gm_contents_wrap .paging_btn_wrap .active {
        font-weight: bold;
        border-radius: var(--radius) !important;
        color: var(--color-grid-paging);
        background: var(--black-3);
    }

    .paging_btn_wrap {
        gap: .5em !important;
        height: 23px !important;
    }

    .paging_btn_wrap > button {
        min-width: 28px !important;
        width: 28px !important;
        border-radius: var(--radius) !important;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .paging_btn_wrap > button:disabled {
        opacity: .5;
    }


    .paging_btn_wrap > button > span {
        line-height: 100%;
    }

    .border_bottom_purple_wrap {
        padding-bottom: 0 !important;
    }
</style>

<%-- 관리 > Alias Management --%>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title" data-t="menu.management.alias"></h4>
            </div>

            <h5 class="gm_menu_desc" data-t="management.alias.title"></h5>
            <h5 class="gm_menu_desc red">
                <span>※</span>
                <span data-t="management.alias.subTitle"></span>
            </h5>
            <h5 class="gm_menu_desc red">
                <span>※</span>
                <span data-t="management.alias.subTitle2"></span>
            </h5>
        </div>
        <div>
            <div class="app_info_wrap">
                <label for="packageNm" class="app_icon">A</label>
                <select id="packageNm" class="app_info_select"></select>
            </div>
            <div class="gm_menu_button_wrap mt_auto">
                <a href=""
                   class="btn_common download"
                   id="downloadResult"
                   target="_blank"
                >
                    <span data-t="management.alias.btn.csvDownload"></span>
                    <img class="img_file_download" alt="">
                </a>
                <label for="uploadFile" class="btn_common download">
                    <i class="fake-upload"></i>
                    <span data-t="management.alias.btn.csvUpload"></span>
                    <img class="img_file_upload" alt="">
                </label>
                <input type="file"
                       class="btn_common download"
                       id="uploadFile"
                       style="display: none"/>
                <button id="insertAlias" class="btn_common download">
                    <span data-t="management.alias.btn.pageReg"></span>
                    <img class="img_entry" alt="">
                </button>
                <button class="btn_common" id="btnExceptStringList" data-t="management.alias.btn.pageParameter">
                </button>
                <button class="btn_common download"
                        id="btnAliasMore"
                >
                    <span data-t="management.alias.btn.noset"></span>
                </button>
            </div>
        </div>

    </div>
    <div class="gm_contents_wrap">
        <div>
            <div class="border_bottom_purple_wrap">
                <div class="search_input_wrap">
                    <div>
                        <select id="dataType">
                            <option value="" selected>Resource Type</option>
                            <option value="1">Page</option>
                            <option value="2">Native</option>
                        </select>
                    </div>
                    <div class="search_input_wrapper">
                        <select id="searchType">
                            <option value="reqUrl" data-t="common.text.requestedUrl"></option>
                            <option value="appPageNm" data-t="common.tableColumn.pageName"></option>
                        </select>
                        <input id="searchValue" type="text"/>
                        <button class="btn_search" id="btnSearch"></button>
                    </div>
                </div>
            </div>
            <div class="gm_contents">
                <div class="" id="pageTable"></div>
            </div>
            <div class="paging_btn_wrap" id="paginationContainer">
                <button class="btn_prev">
                    <span data-t="common.btn.◀"></span>
                </button>
                <span id="pageButtons"></span>
                <button class="btn_next">
                    <span data-t="common.btn.▶"></span>
                </button>
            </div>
        </div>
    </div>
</div>
<jsp:include page="../gm/GM03P1.jsp"/>
<jsp:include page="../gm/GM03P2.jsp"/>
<div class="maxy_popup_vertical large" id="pageParameterPopup">
    <div class="maxy_popup_header">
        <div>
            <h5 data-t="management.alias.btn.pageParameterSet"></h5>
            <i class="ic_question" id="pageParameterInfo"></i>
        </div>
        <button class="btn_refresh"></button>
    </div>
    <div class="config_contents_wrap">
        <div class="config_list_item">
            <div class="list_item">
                <label for="parameter" style="width: 100px">Parameter</label>
                <select id="parameterType" class="">
                    <option value="1" selected>Include</option>
                    <option value="2">Exclude</option>
                </select>
                <input id="parameter" type="text" class="input_parameter">
                <label for="parameterType"></label>
            </div>
            <div class="list_item">
                <div>
                    <button id="btnAddPage"><img src="<c:url value="/images/maxy/icon-add.svg"/>" alt="+">
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class="maxy_popup_content enable_scrollbar">
        <table id="includeListTable">
            <thead>
            <tr>
                <th>Include Parameter Name</th>
                <th>Registration Date</th>
                <th></th>
                <%-- delete button --%>
            </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
    <div class="maxy_popup_content enable_scrollbar">
        <table id="excludeListTable">
            <thead>
            <tr>
                <th>Exclude Parameter Name</th>
                <th>Registration Date</th>
                <th></th>
                <%-- delete button --%>
            </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
</div>
<div class="maxy_popup_vertical large" id="noAliasPopup">
    <div class="maxy_popup_header">
        <div>
            <h5 data-t="management.alias.btn.noset"></h5>
            <i class="ic_question" id="noAliasInfo"></i>
        </div>
        <div>
            <select id="noAliasUrlType">
                <option value="1" selected>Page</option>
                <option value="2">Native</option>
            </select>
        </div>
    </div>
    <div class="config_contents_wrap">
        <div id="noAliasTable"></div>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM0303 = {
        // 전역 변수 모음
        v: {
            noAliasTable: {},
            table: {},
            updateParam: {
                updateLogNm: '',
                updateLogDescription: '',
                updateReqUrl: '',
                updateDataType: ''
            },
            type: '',
            pagination: {
                totalItems: 0,
                itemsPerPage: 100,
                maxPageButtons: 10,
                totalPages: 0,
                totalCount: 0,
                currentPage: 1,
                currentPageSet: 1
            },
            search: {
                searchType: '',
                searchValue: '',
                dataType: ''
            }
        },
        // 초기화 함수 모음
        init: {
            // 버튼 이벤트 등록
            event() {
                const {v, func} = GM0303
                $('#packageNm').on('change', () => {
                    func.getPageList(1)
                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')
                    func.setDownloadUrl()
                })
                $("#searchOptionText").on('click', search.toggle)
                $("#uploadFile").on('change', function (e) {
                    func.uploadFile(e)
                })
                $('#insertAlias').on('click', function () {
                    GM0303.v.type = "insert"
                    func.showInsertPopup()
                    $('#monitoringY_i').prop('checked', true)
                })

                $(document).on('click', '.dimmed', function () {
                    if (GM0303.v.type === "insert") {
                        $('#pageInsertPopup').hide()
                        GM03P2.func.cancelPopup()
                    } else if (GM0303.v.type === "update") {
                        $('#pageUpdatePopup').hide()
                        GM03P1.func.cancelPopup()
                    }
                })


                $('#btnExceptStringList').on('click', func.pageParameter.openPageParameterListPopup)
                $('#pageParameterPopup .btn_refresh').on('click', function () {
                    func.pageParameter.getPageParameterList()
                })
                $('#btnAddPage').on('click', function () {
                    func.pageParameter.insertParameter()
                })

                $('.paging_btn_wrap .btn_prev').on('click', () => {
                    func.goPrevPage()
                })
                $('.paging_btn_wrap .btn_next').on('click', () => {
                    func.goNextPage()
                })

                $('.btn_search').on('click', () => {
                    v.search.searchType = $('#searchType').val()
                    v.search.searchValue = $('#searchValue').val()
                    func.getPageList(1)
                })

                $('#dataType').on('change', () => {
                    v.search.dataType = $('#dataType').val()
                    v.search.searchValue = ''
                    $('#searchValue').val('')
                    func.getPageList(1)
                })
                $('#searchValue').on('keyup', (key) => {
                    if (key.keyCode === 13) {
                        v.search.searchType = $('#searchType').val()
                        v.search.searchValue = $('#searchValue').val()
                        func.getPageList(1)
                    }
                })
                $('#btnAliasMore').on('click', () => {
                    func.noAliasUrls.openPopup().then(func.noAliasUrls.get)
                })
                $('#noAliasUrlType').on('change', () => {
                    func.noAliasUrls.get()
                })
            },

            // 화면이 켜지고 초기값 세팅하는 함수 모음
            created() {
                const {func} = GM0303
                updateContent()
                const txt = trl('common.msg.searchValue')
                $('#searchValue').attr('placeholder', txt)
                appInfo.append({pId: 'packageNm'}).then(() => {
                    func.drawTable()
                    func.getPageList(1)
                })
                func.pageParameter.setInfoIcon()
                func.pageParameter.getPageParameterList()
                func.noAliasUrls.init()
                func.setDownloadUrl()
            },
        },

        // 일반 함수 모음
        func: {
            noAliasUrls: {
                init() {
                    const {v, func} = GM0303
                    func.noAliasUrls.addTable()
                    func.noAliasUrls.setTooltip()
                },
                addTable() {
                    const {v, func} = GM0303
                    v.noAliasTable = new Tabulator("#noAliasTable", {
                        placeholder: trl('common.msg.noData'),
                        height: '58vh',
                        layout: "fitDataFill",
                        columns: [
                            {
                                title: 'Requested URL',
                                field: "reqUrl",
                                width: '80%',
                                tooltip: true
                            },
                            {
                                title: "Count",
                                field: "count",
                                width: '19%'
                            },
                        ],
                    })

                    v.noAliasTable.on('rowClick', (e, row) => {
                        func.noAliasUrls.openSavePopup(row.getData())
                    })
                },
                setTooltip() {
                    tippy('#noAliasInfo', {
                        content: trl('management.alias.noset.info'),
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip',
                    })
                },
                async openPopup() {
                    const {v, func} = GM0303
                    $('#noAliasPopup').show()
                    const $dimmed = $('.dimmed')
                    $dimmed.show()
                    $dimmed.on('click', func.noAliasUrls.closePopup)
                },
                closePopup() {
                    const {v, func} = GM0303
                    $('#noAliasPopup').hide()
                    const $dimmed = $('.dimmed')
                    $dimmed.hide()
                    $dimmed.off('click', func.noAliasUrls.closePopup)
                    func.noAliasUrls.clear()
                },
                async get() {
                    const {v, func} = GM0303
                    const type = $('#noAliasUrlType').val()
                    const param = util.getAppInfo('#packageNm')
                    param.type = type
                    ajaxCall('/gm/0303/getNoAliasUrlList.maxy', param, {disableDimmed: true}).then(data => {
                        v.noAliasType = type
                        func.noAliasUrls.set(data)
                    }).catch(error => {
                        console.log(error)
                    })
                },
                set(data) {
                    const {v, func} = GM0303
                    console.log(data)
                    v.noAliasTable.setData(data)
                },
                clear() {
                    const {v, func} = GM0303
                    v.noAliasTable.setData([])
                },
                openSavePopup(data) {
                    const {v, func} = GM0303
                    console.log(data, v.noAliasType)
                    alias.show({
                        reqUrl: data.reqUrl,
                        dataType: v.noAliasType,
                        cb: func.noAliasUrls.get
                    })
                }
            },
            pageParameter: {
                setInfoIcon() {
                    tippy('#pageParameterInfo', {
                        content: trl('management.alias.pageParameter.info'),
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip',
                    })
                },
                openPageParameterListPopup() {
                    const {func} = GM0303

                    $('#pageParameterPopup').show()
                    const $dimmed = $('.dimmed')
                    $dimmed.show()
                    $dimmed.on('click', func.pageParameter.closePageParameterListPopup)

                    func.pageParameter.getPageParameterList()
                },

                closePageParameterListPopup() {
                    $('#pageParameterPopup').hide()
                    const $dimmed = $('.dimmed')
                    $('#parameter').val('')
                    $dimmed.off('click')
                    $dimmed.hide()
                },

                getPageParameterList() {
                    const {func} = GM0303
                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                    }
                    ajaxCall('/gm/0303/getPageParameterList.maxy', param, {disableCursor: true}).then(data => {
                        const {includeList, excludeList} = func.pageParameter.makeParameterList(data)
                        func.pageParameter.drawPageParameterTable('includeList', includeList)
                        func.pageParameter.drawPageParameterTable('excludeList', excludeList)
                    }).catch(error => {
                        toast(trl(error.msg))
                    })
                },

                makeParameterList(data = []) {
                    return data.reduce((result, x) => {
                        const list = x.type === 1 ? result.includeList : result.excludeList;
                        list.push(x);
                        return result;
                    }, {includeList: [], excludeList: []});
                },

                drawPageParameterTable(type, param) {
                    try {

                        const {func} = GM0303
                        const $tbody = $('#' + type + 'Table tbody')
                        $tbody.empty()
                        if (param.length === 0) {
                            const $tr = $('<tr>')
                            $tr.append($('<td>', {
                                text: 'No PageParameter.'
                            }))

                            $tbody.append($tr)
                            console.log('no page parameter')
                            return
                        }
                        for (let x of param) {
                            const {packageNm, serverType, parameter, type: dataType, regDt} = x
                            const $tr = $('<tr>')
                            let isTooltip = false
                            let str = parameter
                            if (str.length > 50) {
                                isTooltip = true
                                str = str.substring(0, 50) + '...'
                            }
                            const uuid = Math.random() + ''
                            const id = uuid.slice(3, uuid.length)
                            $tr.append($('<td>', {
                                text: str,
                                id: 'content-' + id
                            }))
                            $tr.append($('<td>', {
                                text: util.datetimeFormat(regDt)
                            }))
                            const $btn = $('<button>', {
                                id: id,
                                'class': 'btn_delete',
                                'data-parameter': parameter,
                                'data-type': dataType
                            })
                            const $btnWrap = $('<td>')
                            $btnWrap.append($btn)
                            $tr.append($btnWrap)

                            $tbody.append($tr)

                            if (isTooltip) {
                                tippy('#content-' + id, {
                                    content: parameter,
                                    arrow: false,
                                    placement: 'bottom',
                                    allowHTML: true,
                                    theme: 'maxy-tooltip',
                                })
                            }

                            try {
                                $btn.on('click', e => {
                                    func.pageParameter.delete($(e.target).data('parameter'), dataType)
                                })
                            } catch (e) {
                                console.log(e)
                            }

                        }
                    } catch (e) {
                        console.log(e)
                    }
                },

                insertParameter() {
                    const {v, func} = GM0303
                    const $parameter = $('#parameter')
                    const parameter = $parameter.val()

                    if (!parameter) {
                        util.emptyInput($parameter)
                        return
                    }

                    ajaxCall('/gm/0303/insertPageParameter.maxy', {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        type: $('#parameterType').val(),
                        parameter
                    }).then(data => {
                        toast(trl('common.msg.add'))
                        const {includeList, excludeList} = func.pageParameter.makeParameterList(data)
                        func.pageParameter.drawPageParameterTable('includeList', includeList)
                        func.pageParameter.drawPageParameterTable('excludeList', excludeList)
                        $('#parameter').val('')
                    }).catch(error => {
                        toast(trl(error.msg))
                    })
                },
                delete(parameter, type) {
                    const {func} = GM0303
                    const param = {
                        packageNm: $('#packageNm').val(),
                        serverType: $('#packageNm option:checked').data('server-type'),
                        type: type,
                        parameter: parameter
                    }
                    ajaxCall('/gm/0303/delPageParameter.maxy', param).then(data => {
                        const {includeList, excludeList} = func.pageParameter.makeParameterList(data)
                        func.pageParameter.drawPageParameterTable('includeList', includeList)
                        func.pageParameter.drawPageParameterTable('excludeList', excludeList)
                        toast(trl('common.msg.delete'))
                    }).catch(error => {
                        toast(trl(error.msg))
                    })
                }
            },
            uploadFile(e) {
                const {func} = GM0303
                const formData = new FormData();
                formData.append('file', e.target.files[0]);
                formData.append('packageNm', util.getAppInfo('#packageNm').packageNm);
                formData.append('serverType', util.getAppInfo('#packageNm').serverType);
                $.ajax({
                    url: '/gm/0303/uploadFile.maxy',
                    type: 'POST',
                    data: formData,
                    contentType: false,
                    processData: false,
                    success: function() {
                        func.getPageList(1)
                        toast(trl('common.msg.uploadSuccess'))
                    },
                    error: function (error) {
                        const {
                            status
                        } = error

                        // ajax datatype 이 json 으로 되어 있기 때문에
                        // 빈 데이터 + 200 코드가 내려오면 에러로 리턴
                        // 200 코드일 경우는 성공을 의미 하기 때문에 resolve 를 실행한다.
                        if (status === 200) {
                            cursor.hide()
                            return
                        }

                        // 권한 없는 경우 (
                        if (status === 403) {
                            location.href = '<c:url value="/ln/doLogout.maxy?denied=session.expired" />'
                            return
                        }
                        cursor.hide()

                        if (error.msg) {
                            toast(trl(error.msg))
                        } else {
                            const msg = trl('common.msg.serverError')
                            toast(msg)
                        }
                    }
                })

                document.getElementById('uploadFile').value = ''
            },
            //메뉴 나오는 함수
            showUpdatePopup(data) {
                const {v, func} = GM0303
                if (data.dataType == 1) {
                    const pageNm = trl('management.alias.text.pageName')
                    const pageDesc = trl('management.alias.text.pageDesc')
                    const title = trl('management.alias.text.pageModify')
                    $('#pageTitle').text(title)
                    $("label[for='pageNm']").text(pageNm)
                    $("label[for='pageDescription']").text(pageDesc)
                    $('#favorites').show()
                } else {
                    const pageNm = trl('management.alias.text.pageName')
                    const pageDesc = trl('management.alias.text.pageDesc')
                    const title = trl('management.alias.text.aliasModify')
                    $('#pageTitle').text(title)
                    $("label[for='pageNm']").text(pageNm)
                    $("label[for='pageDescription']").text(pageDesc)
                    $('#favorites').hide()
                }
                $('#resourceType').val(data.dataType == 1 ? 'Page' : 'Native')
                $('#reqUrl').val(data.reqUrl)
                $('#pageNm').val(data.appPageNm)
                $('#pageDescription').val(data.appPageDesc)
                $('#pageSeq').val(data.seq)
                v.updateReqUrl = data.reqUrl
                v.updateDataType = data.dataType
                $('#pageUpdatePopup').show()
                $('.dimmed').show()
                $('input[name=monitoringYn]:input[value=' + data.monitoringYn + ']').prop('checked', true)
                $('input[name=webPerfCheckYn]:input[value=' + data.webPerfCheckYn + ']').prop('checked', true)
                // 저장 버튼 클릭 이벤트
                $('#pageBtnSave').unbind('click').bind('click', func.valid)
                // 취소 버튼 클릭 이벤트
                $('#pageBtnCancel').on('click', GM03P1.func.cancelPopup)
            },
            valid() {
                const {func} = GM0303

                console.log('update?')

                // 값 비었는지 체크
                func.doSave('update')
            },
            validInsert() {
                const {func} = GM0303
                const pageNm = $('#pageNm_i').val()
                const reqUrl = $('#requestedURL_i').val()

                // 값 비었는지 체크
                if (util.isEmpty(pageNm) || util.isEmpty(reqUrl)) {
                    const msg = trl('common.msg.valid.alias')
                    toast(msg)
                    return false
                }
                func.doSave("insert")
            },
            doSave(type) {
                const {v, func} = GM0303
                let params, url;
                if (type === "update") {
                    params = {
                        'appPageNm': $("#pageNm").val(),
                        'appPageDesc': $("#pageDescription").val(),
                        'monitoringYn': $('input[name="monitoringYn"]:checked').val(),
                        'webPerfCheckYn': $('input[name="webPerfCheckYn"]:checked').val(),
                        'seq': $("#pageSeq").val(),
                        'uploadYn': 'N',
                        'packageNm': $('#packageNm').val(),
                        'serverType': $('#packageNm option:checked').data('server-type'),
                        'reqUrl': v.updateReqUrl,
                        'dataType': v.updateDataType
                    };
                    url = "/gm/0303/updatePage.maxy"
                } else if (type === "insert") {
                    params = {
                        'appPageNm': $("#pageNm_i").val(),
                        'appPageDesc': $("#pageDescription_i").val(),
                        'monitoringYn': $('input[name="monitoringYn_i"]:checked').val(),
                        'webPerfCheckYn': $('input[name="webPerfCheckYn_i"]:checked').val(),
                        'seq': $("#pageSeq_i").val(),
                        'uploadYn': 'N',
                        'packageNm': $('#packageNm').val(),
                        'serverType': $('#packageNm option:checked').data('server-type'),
                        'reqUrl': $('#requestedURL_i').val()
                    };
                    url = "/gm/0303/insertPage.maxy"
                }
                ajaxCall(url, params).then(() => {
                    const msg = trl('common.msg.success')
                    func.getPageList(v.pagination.currentPage)
                    toast(msg)
                    if (type === "update") {
                        $('#pageUpdatePopup').hide()
                        $('.dimmed').hide()
                    } else if (type === "insert") {
                        $('#pageInsertPopup').hide()
                        GM03P2.func.cancelPopup()
                        func.clearRadioBtn("monitoringYn_i")
                        func.clearRadioBtn("webPerfCheckYn_i")
                    }
                    getSessionInfo()
                }).catch((e) => {
                    if (e.msg) {
                        toast(trl(e.msg))
                    } else {
                        const msg = trl('common.msg.serverError')
                        toast(msg)
                    }
                })
            },

            // 리스트 가져오는 api 호출 함수
            getPageList(page) {
                const {v, func} = GM0303
                const {pagination} = v
                const params = {
                    'packageNm': $('#packageNm').val(),
                    'serverType': $('#packageNm option:checked').data('server-type'),
                    'limit': pagination.itemsPerPage,
                    'offset': (page * pagination.itemsPerPage) - pagination.itemsPerPage,
                    'type': v.search.dataType,
                    'searchType': v.search.searchType,
                    'searchValue': v.search.searchValue
                }

                if (util.checkParam(params)) {
                    return
                }
                ajaxCall('/gm/0303/getPageList.maxy', params).then(data => {
                    const {pageList, pageCount} = data

                    pagination.currentPage = page
                    pagination.currentPageSet = Math.ceil(page / pagination.maxPageButtons);
                    pagination.totalCount = pageCount;
                    pagination.totalPages = Math.ceil(pagination.totalCount / pagination.itemsPerPage);

                    func.renderPagination()
                    func.makeList(pageList)
                }).catch(e => {
                    const msg = trl('common.msg.serverError')
                    toast(msg)
                    console.error(e)
                })

            },
            goPrevPage() {
                const {v, func} = GM0303
                const {pagination} = v
                if (pagination.currentPageSet > 1) {
                    pagination.currentPageSet--;
                    func.getPageList((pagination.currentPageSet - 1) * pagination.maxPageButtons + 1);
                }
            },
            goNextPage() {
                const {v, func} = GM0303
                const {pagination} = v
                if (pagination.currentPageSet * pagination.maxPageButtons < pagination.totalPages) {
                    pagination.currentPageSet++;
                    func.getPageList((pagination.currentPageSet - 1) * pagination.maxPageButtons + 1);
                }
            },
            drawTable() {
                const {v, func} = GM0303

                const columnNames = {
                    'resourceType': trl('common.tableColumn.resourceType'),
                    'reqUrl': trl('common.text.requestedUrl'),
                    'pageName': trl('common.tableColumn.pageName'),
                    'notice': trl('common.text.notice'),
                    'favorites': trl('dashboard.component.title.favorites'),
                    'webPerform': trl('common.tableColumn.webPerform'),
                    'alias': trl('common.tableColumn.alias'),
                }

                v.table = new Tabulator("#pageTable", {
                    placeholder: trl('common.msg.noData'),
                    height: '68vh',
                    layout: "fitDataFill",
                    columns: [
                        {
                            title: columnNames.resourceType,
                            field: "dataType",
                            formatter: (cell) => {
                                return cell.getValue() == 1 ? 'Page' : 'Native'
                            },
                            width: '10%'
                        },
                        {
                            title: columnNames.reqUrl,
                            field: "reqUrl",
                            width: '45%',
                            tooltip: true
                        },
                        {
                            title: columnNames.pageName,
                            field: "appPageNm",
                            width: '18%'
                        },
                        {
                            title: columnNames.notice,
                            field: "appPageDesc",
                            width: '18%'
                        },
                        {
                            title: columnNames.favorites,
                            field: "monitoringYn",
                            headerHozAlign: 'center',
                            vertAlign: 'middle',
                            hozAlign: 'center',
                            width: '8%',
                            formatter: (cell) => {
                                const on = trl('management.alias.text.monitoringOn')
                                const off = trl('management.alias.text.monitoringOff')

                                if (cell.getData().monitoringYn === 'Y') {
                                    return "<span class='btn_yn'>" + on + "</span>"
                                } else if (cell.getData().monitoringYn === 'N') {
                                    return "<span class='btn_yn off'>" + off + "</span>"
                                }
                            }
                        }
                    ],
                })

                v.table.on('rowClick', (e, row) => {
                    const rowData = row.getData()
                    v.type = "update"
                    func.showUpdatePopup(rowData)
                })
            },

            makeList(data) {
                const {v, func} = GM0303
                v.table.setData(data)
            },

            renderPagination() {
                const {v, func} = GM0303
                const {pagination} = v
                const $pageButtonsContainer = $("#pageButtons");
                $pageButtonsContainer.empty();

                // 현재 페이지 집합의 시작 페이지 계산
                const startPage = (pagination.currentPageSet - 1) * pagination.maxPageButtons + 1;
                const endPage = Math.min(startPage + pagination.maxPageButtons - 1, pagination.totalPages);

                for (let page = startPage; page <= endPage; page++) {
                    const $button = $("<button></button>").text(page)
                    if (page === pagination.currentPage) {
                        console.log('active: ' + page)
                        $button.addClass("active");
                    }

                    $button.on("click", function () {
                        func.getPageList(page)
                    });
                    $pageButtonsContainer.append($button);
                }
            },

            setDownloadUrl() {
                let url = "<c:url value="/gm/0303/downloadPageList.maxy?"/>"
                let searchUrl = new URLSearchParams(url.search);
                searchUrl.append('packageNm', $('#packageNm').val());
                searchUrl.append('serverType', $('#packageNm option:checked').data('server-type'));
                document.getElementById("downloadResult").href = url + searchUrl;
            },

            showInsertPopup() {
                const {func} = GM0303
                $('#pageInsertPopup').show();
                $('.dimmed').show()
                // 저장 버튼 클릭 이벤트
                $('#pageBtnSave_i').unbind('click').bind('click', func.validInsert)
                // 취소 버튼 클릭 이벤트
                $('#pageBtnCancel_i').on('click', GM03P2.func.cancelPopup)
            },

            clearRadioBtn(name) {
                let radioButtons = document.getElementsByName(name);
                for (let i = 0; i < radioButtons.length; i++) {
                    radioButtons[i].checked = false;
                }
            },
        }
    }

    GM0303.init.created()
    GM0303.init.event()
</script>