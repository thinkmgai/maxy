<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<title>Obfuscation Rule Mgmt.</title>
<script>

</script>

<style>
    .gm_contents .content_header_wrap {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-direction: column;
        margin-bottom: .5em;
    }

    .gm_contents .add_wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        margin-bottom: 1em;
        width: 100%;
        background-color: var(--color-block-light-1);
        border-radius: 5px;
        padding: 1em;
    }


    .gm_contents .add_wrap .add_options_wrap {

    }

    .gm_contents .add_wrap .add_options_wrap label {
        font-weight: 700;
        text-align: right;
        width: 40%;
        margin-right: 1em;
    }

    .gm_contents .add_wrap .add_options_wrap tr {
        display: flex;
    }

    .gm_contents .add_wrap .add_options_wrap td {
        padding: .5em 1em;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 300px;
    }

    .gm_contents .add_wrap .add_options_wrap input, select {
        width: 150px;
    }

    .gm_contents .add_wrap .add_btn_wrap {
        display: flex;
        flex-direction: column;
        gap: 1em;
        margin: 0;
    }

    .gm_contents .btn {
        width: 32px;
        height: 32px;
        border: 1px solid var(--color-border-out-light);
        border-radius: var(--radius);
        background-color: white;
    }

    .gm_contents .add_btn_wrap .btn {
        width: 100px;
        display: flex;
        justify-content: space-evenly;
        align-items: center;
        gap: 1em;
        font-weight: 500;
        cursor: pointer;
    }

    .gm_contents .add_btn_wrap i {
        width: 14px;
        height: 14px;
    }

    .gm_contents .add_wrap .btn_upload {
        content: url(/images/maxy/icon-upload.svg);
    }

    .gm_contents .add_wrap .btn_upload.on {
        content: url(/images/maxy/icon-mark-check-purple.svg);
    }

    .gm_contents .add_wrap .btn_save {
        content: url(/images/maxy/icon-save.svg);
    }

    .gm_contents .content_header_wrap .border_bottom_purple_wrap {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 1em !important;
    }

    .gm_contents .content_header_wrap .filter_wrap {
        display: flex;
        align-items: center;
        gap: 1em;
    }

    .gm_contents .content_header_wrap h5 {
        font-weight: 400;
        font-size: 22px;
    }

    .gm_contents .content_header_wrap .filter_wrap input[type="text"] {
        margin: 0 !important;
    }

    .gm_contents .content_header_wrap .btn_delete {
        background: url(/images/maxy/icon-delete.svg) no-repeat center;
    }
</style>
<%-- 관리 > 난독화 관리 --%>
<div class="gm_header">
    <div class="gm_menu_text_wrap">
        <h4 class="gm_menu_title" data-t="menu.management.obfuscationrule"></h4>
        <h5 class="gm_menu_desc" data-t="management.title.desc.obfuscation"></h5>
    </div>
    <div class="gm_filter_group">
        <div class="app_info_wrap">
            <label for="packageNm" class="app_icon">A</label>
            <select id="packageNm" class="app_info_select"></select>
            <label for="osType" class="app_icon">O</label>
            <select id="osType" class="app_info_select"></select>
        </div>
    </div>
</div>

<div class="gm_contents">
    <div class="add_wrap">
        <table class="add_options_wrap">
            <tr>
                <td>
                    <label for="osTypeSel">OS Type</label>
                    <select id="osTypeSel">
                        <option value="iOS">iOS</option>
                        <option value="Android">Android</option>
                    </select>
                </td>
                <td>
                    <label for="appVer">App Ver</label><input type="text" id="appVer"/>
                </td>
            </tr>
            <tr>
                <td>
                    <label for="obfType">Obfuscated Type</label>
                    <select id="obfType">
                        <option value="proguard">ProGuard</option>
                        <option value="arxan">Arxan</option>
                    </select>
                </td>
                <td>
                    <label for="appBuildNum">App Build Num</label><input type="text" id="appBuildNum"/>
                </td>
            </tr>
        </table>
        <div class="add_btn_wrap">
            <input type="file" id="ruleFileInput" style="display: none" accept=".json, .txt">
            <label for="ruleFileInput" class="btn" id="btnUpload">Upload<i class="btn_upload"></i></label>
            <button class="btn" id="btnSave">Save<i class="btn_save"></i></button>
        </div>
    </div>
    <div class="content_header_wrap">
        <div class="border_bottom_purple_wrap">
            <h5>Rule</h5>
            <div class="filter_wrap">
                <%--suppress HtmlFormInputWithoutLabel --%>
                <select id="filter-field">
                    <option value="">조회항목</option>
                    <option value="osType">OS</option>
                    <option value="appVer">App Ver</option>
                    <option value="appBuildNum">App Build Num</option>
                    <option value="regDt">Reg Date</option>
                </select>

                <%--suppress HtmlFormInputWithoutLabel --%>
                <input id="filter-value" type="text" placeholder=""/>
            </div>
        </div>
        <button class="btn btn_delete" id="btnDelete"></button>

    </div>
    <div class="table_wrap">
        <div id="ruleTable"></div>
    </div>
</div>

<div class="dimmed" data-content="dimmed"></div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM1004 = {
        v: {param: {}},

        init: {
            event() {
                const {func} = GM1004
                $('#ruleFileInput').on('change', function () {
                    const $btn = $('.btn_upload')
                    this.files.length > 0 ? $btn.addClass('on') : $btn.removeClass('on')
                })

                $('#btnSave').on('click', func.save)
                $('#btnDelete').on('click', func.delete)
            },

            created() {
                const {func} = GM1004
                updateContent()
                appInfo.append({pId: 'packageNm', oId: 'osType'}).then(() => {
                    func.drawTable()
                    func.getData()

                    $('#packageNm').on('change', function () {
                        func.getData()
                        // 패키지 변경시 osType, appVer 전체 값으로 초기화
                        sessionStorage.setItem('osType', 'A')
                        sessionStorage.setItem('appVer', 'A')
                    })

                    $('#osType').on('change', function () {
                        func.getData()
                        // 패키지 변경시 appVer 전체 값으로 초기화
                        sessionStorage.setItem('appVer', 'A')
                    })
                })

                tippy('#btnUpload', {
                    content: 'File Upload',
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-file-upload-tooltip'
                })
                tippy('#btnSave', {
                    content: 'Rule Save',
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-rule-save-tooltip'
                })
                tippy('#btnDelete', {
                    content: 'Selected Rule Delete',
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-delete-tooltip'
                })
            }
        },

        func: {
            /**
             * 저장할 값 검증
             */
            valid() {
                // input / select
                const $infoArray = [$('#packageNm')
                    , $('#obfType')
                    , $('#osTypeSel')
                    , $('#osType')
                    , $('#appVer')
                    , $('#appBuildNum')]

                // 업로드 할 파일
                const $ruleFileInput = $('#ruleFileInput')
                const files = $ruleFileInput.val()

                // input / select 순회
                for (let el of $infoArray) {
                    // value 가 비어있는 경우
                    if (!el.val() || el.val().trim() === '') {
                        util.emptyInput(el)
                        const msg = i18next.tns('management.obfuscation.msg.paramempty')
                        toast(msg)
                        return false
                    }
                }

                // 파일있는지 체크
                if (!files) {
                    const msg = i18next.tns('management.obfuscation.msg.fileempty')
                    toast(msg)
                    util.emptyInput($ruleFileInput)

                    // 업로드 할 파일이 없는 경우 on class 제거
                    $ruleFileInput.removeClass('on')
                    return false
                }

                // 파일 확장자 체크, json / txt 만 허용
                const fileType = files.split('.').pop().toLowerCase()
                if (!(fileType === 'json' || fileType === 'txt')) {
                    const msg = i18next.tns('management.obfuscation.msg.jsonortext')
                    toast(msg)
                    $ruleFileInput.val('')
                    return false
                }

                // parameter 객체 반환
                return {
                    packageNm: $infoArray[0].val(),
                    serverType: $('#packageNm option:checked').data('server-type'),
                    obfType: $infoArray[1].val().toUpperCase(), // enum 에 정의되어 있는 값과 비교
                    osTypeVal: $infoArray[2].val(),
                    osType: $infoArray[3].val(),   // 검색용
                    appVer: $infoArray[4].val(),
                    appBuildNum: $infoArray[5].val(),
                    ruleFile: document.getElementById('ruleFileInput').files[0],
                }
            },
            /**
             * 저장 이벤트
             */
            save() {
                const {v, func} = GM1004
                // 값 검증
                const param = func.valid()

                // 객체가 리턴되어 오면
                if (param) {
                    // 파일 업로드 실행 -> 콜백으로 info 저장
                    func.uploadFile(param.ruleFile)

                    // 콜백에서 쓸 param 전역으로 임시 저장
                    v.param = param
                } else {
                    // 검증 통과 되지 않았을 경우 전역 변수 비우기
                    v.param = {}
                }
            },
            /**
             * save 이벤트
             */
            saveRule(data) {
                const {v, func} = GM1004
                const {fileName} = data
                if (!fileName) {
                    const msg = i18next.tns('common.msg.uploadError')
                    toast(msg)
                    v.param = {}
                    return false
                }
                v.param.fileName = fileName
                delete v.param.ruleFile

                ajaxCall('/gm/0701/saveRuleInfo.maxy', v.param).then(data => {
                    const msg = i18next.tns('common.msg.success')
                    toast(msg)
                    func.resetInput()
                    func.setData(data)
                    v.param = {}
                }).catch(error => {
                    v.param = {}
                    toast(i18next.tns(error.msg))
                })
            },
            /**
             * upload 성공시 input 및 업로드 관련 초기화
             */
            resetInput() {
                $('.add_wrap input').val('')
                $('.add_wrap .btn_upload').removeClass('on')
                $('#osTypeSel option:eq(0)').prop('selected', true)
                $('#filter-field option:eq(0)').prop('selected', true)
                $('#filter-value').val('')
            },
            /**
             * 파일 업로드
             */
            uploadFile(file) {
                const {func} = GM1004
                const formData = new FormData()
                formData.append('file', file)
                $.ajax({
                    url: '/gm/0701/upload.maxy',
                    type: 'POST',
                    data: formData,
                    contentType: false,
                    processData: false,
                    success: func.saveRule,
                    error: function (error) {
                        const {
                            status,
                            statusText,
                            responseText,
                            responseJSON
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

                        const msg = i18next.tns('common.msg.serverError')
                        toast(msg)
                    }
                })

                document.getElementById('ruleFileInput').value = ''
            },

            delete() {
                const {v, func} = GM1004
                const deleteList = v.table.getSelectedData()
                if (!deleteList || deleteList.length === 0) {
                    const msg = i18next.tns('common.msg.noSelect')
                    toast(msg)
                    return
                }
                const param = {
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type'),
                    osType: $('#osType').val(),
                    deleteList
                }
                $.ajax({
                    url: '/gm/0701/delRuleList.maxy',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(param),
                    success: function(data) {
                        func.setData(data)
                        func.resetInput()
                        const msg = i18next.tns('common.msg.delete')
                        toast(msg)
                    },
                    error: function(error) {
                        const errorMsg = error.responseJSON?.msg || 'Error occurred'
                        toast(errorMsg)
                    }
                })
            },
            drawTable() {
                const placeholder = i18next.tns('common.msg.noData')
                const {v} = GM1004
                v.table = new Tabulator("#ruleTable", {
                    placeholder: placeholder,
                    height: '70vh',
                    layout: "fitDataFill",
                    columns: [
                        {
                            formatter: "rowSelection",
                            titleFormatter: "rowSelection",
                            hozAlign: "center",
                            headerSort: false,
                            vertAlign: "middle",
                            width: "3%"
                        },
                        {
                            title: "Obfuscated Type",
                            field: "obfType",
                            width: '20%',
                            headerHozAlign: 'center',
                            vertAlign: 'middle',
                            hozAlign: 'center'
                        },
                        {
                            title: "OS",
                            field: "osType",
                            headerHozAlign: 'center',
                            vertAlign: 'middle',
                            hozAlign: 'center',
                            width: '15%'
                        },
                        {
                            title: "App Ver",
                            field: "appVer",
                            width: '15%',
                            headerHozAlign: 'center',
                            vertAlign: 'middle',
                            hozAlign: 'center'
                        },
                        {
                            title: "App Build Num",
                            field: "appBuildNum",
                            width: '15%',
                            headerHozAlign: 'center',
                            vertAlign: 'middle',
                            hozAlign: 'center'
                        },
                        {
                            field: "type",
                            visible: false
                        },
                        {
                            field: "obfFullText",
                            visible: false
                        },
                        {
                            title: "Reg Date",
                            field: "regDt",
                            width: '20%',
                            headerHozAlign: 'center',
                            vertAlign: 'middle',
                            hozAlign: 'center',
                            formatter: cell => {
                                return util.datetimeFormat(cell.getValue())
                            }
                        }
                    ]
                })

                util.likeSearchTable(v.table)
            },
            setData(data) {
                const {v} = GM1004
                if (data) {
                    v.table.setData(data)
                }
            },
            getData() {
                const {func} = GM1004
                const param = {
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type'),
                    osType: $('#osType').val(),   // 검색용
                }
                ajaxCall('/gm/0701/getRuleList.maxy', param)
                    .then(data => {
                        func.setData(data)
                    })
                    .catch(err => toast(err.msg))
            }
        }
    }
    GM1004.init.event()
    GM1004.init.created()
</script>
