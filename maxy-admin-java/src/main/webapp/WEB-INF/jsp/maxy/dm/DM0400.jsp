<%--suppress CssUnusedSymbol, suppress RequiredAttributes, suppress ES6ConvertVarToLetConst --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<style>

    .gm_contents .content_header_wrap {
        display: flex;
        gap: 1em;
        margin-bottom: 1em;
        justify-content: space-between;
    }

    .gm_contents .content_header_wrap .btn_wrap {
        display: flex;
        gap: 1em;
        margin: 0;
    }

    .gm_contents .btn {
        height: 32px;
        border: 1px solid var(--color-border-out-light);
        border-radius: var(--radius);
        background-color: white;
        width: 100px;
        display: flex;
        justify-content: space-evenly;
        align-items: center;
        gap: 1em;
        font-weight: 500;
        cursor: pointer;
    }

    .gm_contents .content_header_wrap i {
        width: 14px;
        height: 14px;
    }

    .gm_contents .content_header_wrap .btn_save {
        content: url(/images/maxy/icon-save.svg);
    }

    .gm_contents .content_header_wrap .filter_wrap input[type="text"] {
        margin: 0 !important;
    }

    .gm_contents .content_header_wrap .btn_delete {
        background: url(/images/maxy/icon-delete.svg) no-repeat center;
    }

    .gm_contents .content_header_wrap .filter_wrap {
        display: flex;
        align-items: center;
        gap: .5em;
    }
</style>

<%-- 관리 > 장치 > 디바이스 모델 --%>
<div class="contents_header">
    <div class="ctts_h_left">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title" data-t="management.title.model"></h4>
            </div>

            <h5 class="gm_menu_desc">
                <span id="appInfoText"></span>
                <span data-t="management.title.desc.model"></span>
            </h5>
        </div>

    </div>
</div>
<div class="gm_contents">
    <div class="content_header_wrap">
        <div class="filter_wrap">
            <%--suppress HtmlFormInputWithoutLabel --%>
            <select id="filter-field">
                <option value="deviceModel">Device Model</option>
                <option value="nameKo">Name (Ko)</option>
                <option value="nameEn">Name (En)</option>
                <option value="description">Description</option>
            </select>

            <%--suppress HtmlFormInputWithoutLabel --%>
            <input id="filter-value" type="text" placeholder=""/>
            <button id="filter-clear" class="filter_clear"></button>
        </div>
        <div class="btn_wrap">
            <button id="btnDel" class="btn_common">
                <span data-t="common.btn.delete"></span>
                <img class="img_delete" alt="">
            </button>
            <button id="btnNew" class="btn_common">
                <span data-t="common.btn.register"></span>
                <img class="img_save" alt="">
            </button>
        </div>
    </div>
    <div id="modelTable"></div>
</div>
<div class="popup_dimmed" data-content="dimmed"></div>
<jsp:include page="DM04P1.jsp"/>
<script>
    var DM0400 = {
        v: {
            table: ''
        },

        init: {
            // 버튼 이벤트 등록
            event() {
                const {func} = DM0400
                $('#btnDel').on('click', func.openDeleteModal)
                $('#btnNew').on('click', func.openPopup)
            },
            // 화면이 켜지고 초기값 세팅하는 함수 모음
            created() {
                const {func} = DM0400
                updateContent()
                func.drawTable()
                func.getData()
            }
        },

        func: {
            openPopup(data) {
                if (!data.seq) {
                    data = null
                }
                DM04P1.func.open(data)
            },
            openDeleteModal() {
                const {v, func} = DM0400
                const deleteList = v.table.getSelectedData()
                if (!deleteList || deleteList.length === 0) {
                    const msg = i18next.tns('common.msg.noSelect')
                    toast(msg)
                    return
                }
                const param = []
                for (let x of deleteList) {
                    param.push({seq: x.seq})
                }

                const lang = localStorage.getItem('lang')
                let msg
                if (lang === 'ko' || lang === 'ja') {
                    msg = param.length + i18next.tns('common.msg.countdelete')
                } else if (lang === 'en') {
                    msg = i18next.tns('common.msg.countdelete') + param.length + ' items?'
                }
                modal.show({
                    id: 'delModal',
                    confirm: true,
                    msg: '<div>' + msg + '</div>',
                    fn: () => {
                        func.delete(param)
                    }
                })
            },
            drawTable() {
                const {v, func} = DM0400

                v.table = new Tabulator('#modelTable', {
                    height: '77vh',
                    layout: 'fitDataFill',
                    placeholder: i18next.tns('common.msg.noData'),
                    columns: [
                        {
                            field: 'seq',
                            visible: false
                        },
                        {
                            formatter: "rowSelection",
                            titleFormatter: "rowSelection",
                            hozAlign: "center",
                            headerSort: false,
                            vertAlign: "middle",
                            width: "3%"
                        },
                        {
                            title: i18next.tns('common.tableColumn.deviceModel'),
                            field: 'deviceModel',
                            width: '15%'
                        },
                        {
                            title: i18next.tns('common.tableColumn.nameKo'),
                            field: 'nameKo',
                            width: '15%'
                        },
                        {
                            title: i18next.tns('common.tableColumn.nameEn'),
                            field: 'nameEn',
                            width: '15%'
                        },
                        {
                            title: i18next.tns('common.tableColumn.description'),
                            field: 'description',
                            width: '25%'
                        },
                        {
                            title: i18next.tns('common.tableColumn.regDt'),
                            field: 'regDt',
                            width: '13%',
                            formatter: cell => {
                                return util.datetimeFormat(cell.getValue())
                            }
                        },
                        {
                            title: i18next.tns('common.tableColumn.updDt'),
                            field: 'updDt',
                            width: '13%',
                            formatter: cell => {
                                return util.datetimeFormat(cell.getValue())
                            }
                        }
                    ],
                })

                v.table.on('rowClick', (e, row) => {
                    func.openPopup(row.getData())
                })

                util.likeSearchTable(v.table)
            },
            setData(data) {
                const {v} = DM0400
                if (data) {
                    v.table.setData(data)
                }
            },
            getData() {
                const {func} = DM0400
                ajaxCall('/gm/0504/getModelList.maxy', {})
                    .then(data => {
                        func.setData(data)
                    })
                    .catch(err => toast(err.msg))
            },
            save(data) {
                const {func} = DM0400

                ajaxCall('/gm/0504/addModelInfo.maxy', data)
                    .then(data => {
                        func.setData(data)
                        const msg = i18next.tns('common.msg.add')
                        toast(msg)
                        DM04P1.func.close()
                    })
                    .catch(err => toast(err.msg))
            },
            modify(data) {
                const {func} = DM0400

                ajaxCall('/gm/0504/modifyModelInfo.maxy', data)
                    .then(data => {
                        func.setData(data)
                        const msg = i18next.tns('common.msg.modify')
                        toast(msg)
                        DM04P1.func.close()
                    })
                    .catch(err => toast(err.msg))
            },
            delete(deleteList) {
                const {func} = DM0400

                const param = {
                    deleteList
                }
                ajaxCall('/gm/0504/delModelInfo.maxy', param, {json: true})
                    .then(data => {
                        func.setData(data)
                        const msg = i18next.tns('common.msg.delete')
                        toast(msg)
                    })
                    .catch(err => toast(err.msg))
            }
        }
    }

    DM0400.init.created()
    DM0400.init.event()
</script>