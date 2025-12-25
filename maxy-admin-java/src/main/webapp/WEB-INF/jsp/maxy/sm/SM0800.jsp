<%--suppress RequiredAttributes --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<%--suppress CssUnusedSymbol --%>
<style>
    .contents_header {
        white-space: nowrap;
        margin-bottom: 1.7em;
    }

    .contents_header .ctts_h_right {
        align-items: flex-end;
        flex-direction: column;
    }

    .count_txt {
        margin-bottom: -20px;
        cursor: default;
    }
</style>
<!-- 컨텐츠 헤더 -->
<div class="contents_header">
    <div class="ctts_h_left">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title" data-t="system.title.exception"></h4>
            </div>

            <h5 class="gm_menu_desc" data-t="system.title.exceptDesc"></h5>
        </div>
    </div>
    <div class="ctts_h_right">
        <label for="packageNm"></label>
        <select class="app_info_select" id="packageNm"></select>
        <div id="exceptCount" class="count_txt">-/20</div>
    </div>
</div>
<div id="exceptStringTable"></div>
<div id="exceptModifyPopup" class="maxy_popup_common_extra_small">
    <div class="popup_header">
        <img class="img_caution" alt="">
        <h4>Exception</h4>
    </div>
    <div class="confirm_msg" data-t="system.except.msg.exceptModify"></div>
<%--suppress HtmlFormInputWithoutLabel --%>
    <textarea class="textarea_item" id="exceptString"></textarea>

    <div class="popup_footer">
        <button class="btn_common" id="btnSave" data-t="common.btn.save"></button>
    </div>
</div>
<%--<div class="dimmed" data-content="dimmed"></div>--%> <!-- esc 작업중 불필요해보여 주석 -->
<script>
    var SM0800 = {
        v: {
            selected: {
                packageNm: '',
                serverType: '',
                seq: -1
            }
        },
        init: {
            event() {
                const {func} = SM0800
                $('#packageNm').on('change', function(){
                    func.getData()

                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')
                })
                $('.dimmed').on('click', func.closePopup)
                $('#btnSave').on('click', func.modify)
            },
            created() {
                const {func} = SM0800
                updateContent()
                appInfo.append({pId: 'packageNm'}).then(() => {
                    func.createTable()
                })

                tippy('#exceptCount', {
                    content: i18next.tns('system.except.msg.exceptCount'),
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            }
        },
        func: {
            delete(seq) {
                const {func} = SM0800
                if (!seq) {
                    toast(i18next.tns('common.msg.noSelect'))
                    return
                }

                if (!confirm(i18next.tns('system.except.msg.delete'))) {
                    return
                }

                ajaxCall('/sm/0800/deleteExceptLog.maxy', {
                    seq,
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type')
                }).then(data => {
                    const msg = i18next.tns('common.msg.delete')
                    toast(msg)
                    func.setData(data)
                }).catch(error => {
                    console.log(error)
                })
            },
            openModifyPopup(data) {
                const {v} = SM0800
                $('#exceptModifyPopup').css('display', 'flex')
                $('.dimmed').show()
                const {seq, packageNm, serverType, exceptString} = data
                $('#exceptModifyPopup textarea').val(exceptString)
                v.selected.packageNm = packageNm
                v.selected.serverType = serverType
                v.selected.seq = seq
            },
            getData() {
                const {func} = SM0800
                ajaxCall('/sm/0800/getExceptLogList.maxy', {
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type')
                }).then(data => {
                    func.setData(data)
                }).catch(error => {
                    console.log(error)
                })
            },
            setData(data) {
                const {v} = SM0800
                // 테이블에 데이터 세팅
                v.table.replaceData(data)
                // 우상단 count 수 세팅
                $('#exceptCount').text(`\${data.length}/20`)
            },
            createTable() {
                const {v, func} = SM0800

                const delBtn = () => {
                    return '<img src="/images/maxy/icon-delete.svg" alt="iconModify" class="modify"/>'
                }

                const columnNames = {
                    'regDt': i18next.tns('system.link.regDt'),
                    'exceptString': i18next.tns('system.link.exceptString')
                }

                const nodata = i18next.tns('common.msg.noData')
                v.table = new Tabulator("#exceptStringTable", {
                    height: 'calc(100vh - 170px)',
                    selectableRows: 1,
                    layout: "fitDataFill",
                    placeholder: nodata,
                    rowFormatter: this.rowFormatter,
                    columns: [
                        {
                            title: columnNames.regDt,
                            field: "updDt",
                            width: "15%",
                            formatter: function (cell) {
                                return util.datetimeFormat(cell.getValue())
                            }
                        }, {
                            title: columnNames.exceptString,
                            field: "exceptString",
                            width: "80%"
                        }, {
                            headerSort: false,
                            width: "4%",
                            vertAlign: 'middle',
                            hozAlign: 'right',
                            formatter: delBtn,
                            cellClick: function (e, cell) {
                                const targetElement = $(e.target)[0]
                                if (targetElement.tagName.toUpperCase() === 'IMG') {
                                    func.delete(cell.getData().seq);
                                }
                            }
                        },
                        {field: "seq", visible: false},
                    ],
                });

                v.table.on('rowClick', (e, row) => {
                    // 삭제 버튼 click 이벤트 동작 방지
                    const targetElement = $(e.target)[0]
                    if (targetElement.tagName.toUpperCase() === 'IMG') {
                        return
                    }
                    func.openModifyPopup(row.getData())
                })

                v.table.on("tableBuilt", func.getData)
            },
            modify() {
                const {v, func} = SM0800

                if (!confirm(i18next.tns('common.msg.except.error'))) {
                    return
                }

                const exceptString = $('#exceptString').val()

                if (exceptString.length < 10) {
                    toast(i18next.tns('system.except.msg.length'))
                    return
                }

                const param = {
                    ...v.selected,
                    exceptString
                }

                ajaxCall('/sm/0000/modifyExceptLog.maxy', param).then(data => {
                    // 데이터가 있는 경우만 실행
                    toast(i18next.tns('common.msg.success'))
                    // 성공 후 팝업 닫기
                    func.closePopup()
                    func.setData(data)
                }).catch(error => {
                    console.log(error)
                    toast(i18next.tns(error.msg))
                })
            },
            closePopup() {
                const {v} = SM0800
                $('.dimmed').hide()
                $('#exceptModifyPopup').hide()
                $('#exceptModifyPopup textarea').val('')

                v.selected.packageNm = ''
                v.selected.serverType = ''
                v.selected.seq = -1
            }
        }
    }

    SM0800.init.event()
    SM0800.init.created()
</script>