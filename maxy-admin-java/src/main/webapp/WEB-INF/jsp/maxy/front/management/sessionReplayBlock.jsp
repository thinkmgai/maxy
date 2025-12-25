<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .gm_text_wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1em;
    }

    .gm_text_wrap .app_info_wrap{
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .gm_btn_wrap {
        display: flex;
        align-items: center;
        gap: .8em;
    }
</style>

<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title" data-t="menu.management.sessionReplayBlock"></h4>
            </div>
            <p class="gm_menu_desc" data-t="management.title.desc.sessionReplayBlock1"></p>
            <p class="gm_menu_desc" data-t="management.title.desc.sessionReplayBlock2"></p>
            <p class="gm_menu_desc" data-t="management.title.desc.sessionReplayBlock3"></p>
        </div>
    </div>

    <div class="gm_text_wrap">
        <div class="app_info_wrap">
            <span class="app_icon">A</span>
            <select id="packageNm" class="app_info_select"></select>
        </div>
        <div class="gm_btn_wrap">
            <button type="button" class="btn_common download" id="btn-add">
                <span data-t="common.btn.register"></span>
                <img class="img_entry" alt=""/>
            </button>

            <button class="btn_common" id="btn-delete" data-t="common.btn.delete" disabled></button>
        </div>
    </div>

    <div class="gm_contents_wrap">
        <div id="blockClassList"></div>
    </div>
</div>
<div class="popup_dimmed" data-content="dimmed"></div>
<jsp:include page="sessionReplayBlockPopup.jsp"/>

<script>
    var sessionReplayBlock = {
        v: {
            table: {},
            pending: new Set()
        },
        init: {
            event() {
                const {func} = sessionReplayBlock

                $('#btn-add').on('click', func.openPopup);
                $('#btn-delete').on('click', func.delete);

                $('#packageNm').on('change', function () {
                    func.fetch.list().then(() => {
                        sessionReplayBlock.v.table.deselectRow();
                        func.updateUi();
                    }).catch(err => console.error('초기 로딩 실패:', err));
                })
            },
            created() {
                const {func} = sessionReplayBlock

                updateContent()
                func.draw.table()

                appInfo.append({pId: 'packageNm'}).then(() => {
                    func.fetch.list().then(() => {
                        sessionReplayBlock.v.table.deselectRow();
                        func.updateUi();
                    }).catch(err => console.error('초기 로딩 실패:', err));
                })
            }
        },
        func: {
            fetch: {
                async list() {
                    const {v} = sessionReplayBlock
                    const {packageNm, serverType} = util.getAppInfo('#packageNm')
                    
                    return ajaxCall('/fm/0401/list.maxy', {
                        packageNm: packageNm,
                        serverType: serverType
                    }).then(data => {
                        const list = Array.isArray(data?.list) ? data.list : [];
                        v.table.setData(list);
                        return list;
                    }).catch(err => {
                        console.error('목록 조회 실패:', err);
                        v.table.setData([]);
                        return [];
                    });
                }
            },
            openPopup(data) {
                sessionReplayBlockPopup.func.open(data)
            },
            async add(data) {
                const {func} = sessionReplayBlock
                const {packageNm, serverType} = util.getAppInfo('#packageNm')

                try {
                    await ajaxCall('/fm/0401/add.maxy', {
                        packageNm: packageNm,
                        serverType: serverType,
                        selector: data.selector,
                        target: data.target,
                        remark: data.remark
                    }, {
                        disableCursor: true,
                        json: true
                    });
                    
                    toast(trl('common.msg.add'));
                    
                    await func.fetch.list();
                    sessionReplayBlock.v.table.deselectRow();
                    func.updateUi();
                } catch (err) {
                    console.error('등록 실패:', err);
                    toast(trl('common.msg.serverError'));
                }
            },
            async update(data) {
                const {func} = sessionReplayBlock
                const {packageNm, serverType} = util.getAppInfo('#packageNm')

                try {
                    await ajaxCall('/fm/0401/update.maxy', {
                        packageNm: packageNm,
                        serverType: serverType,
                        seq: data.seq,
                        selector: data.selector,
                        target: data.target,
                        remark: data.remark
                    }, {
                        disableCursor: true,
                        json: true
                    });

                    toast(trl('common.msg.modify'));
                    
                    await func.fetch.list();
                    sessionReplayBlock.v.table.deselectRow();
                    func.updateUi();
                } catch (err) {
                    console.error('수정 실패:', err);
                    toast(trl('common.msg.serverError'));
                }
            },
            async delete() {
                const {v, func} = sessionReplayBlock
                const selected = v.table.getSelectedData()
                
                if (!selected.length) return;

                const seqs = selected.map(r => r.seq);

                const lang = localStorage.getItem('lang')
                let msg
                if (lang === 'ko' || lang === 'ja') {
                    msg = selected.length + trl('common.msg.countdelete')
                } else if (lang === 'en') {
                    msg = trl('common.msg.countdelete') + selected.length + ' items?'
                }

                modal.show({
                    id: 'deleteModal',
                    msg: msg,
                    confirm: true,
                    fn: async () => {
                        try {
                            await ajaxCall('/fm/0401/delete.maxy', seqs, {
                                disableCursor: true,
                                json: true
                            });

                            toast(trl('common.msg.delete'));

                            await func.fetch.list();
                            v.table.deselectRow();
                            func.updateUi();
                        } catch (err) {
                            console.error('삭제 실패:', err);
                            toast(trl('common.msg.serverError'));
                        }
                    }
                })
            },
            draw: {
                table() {
                    const {v, func} = sessionReplayBlock

                    v.table = new Tabulator("#blockClassList", {
                        layout: 'fitDataFill',
                        height: 'calc(100vh - 260px)',
                        placeholder: trl('common.msg.noData'),
                        selectable: true,
                        columns: [
                            {
                                titleFormatter: "rowSelection",
                                formatter: "rowSelection",
                                hozAlign: "center",
                                headerSort: false,
                                vertAlign: 'middle',
                                width: '5%'
                            },
                            {
                                title: 'Selector Type',
                                field: 'selector',
                                width: '10%',
                                formatter: cell => {
                                    if(cell.getValue() === 'id'){
                                        return 'ID'
                                    } else if(cell.getValue() === 'class') {
                                        return 'Class'
                                    }
                                }
                            },
                            {
                                title: 'Target',
                                field: 'target',
                                width: '30%'
                            },
                            {
                                title: 'Remark',
                                field: 'remark',
                                width: '40%'
                            },
                            {
                                title: 'Reg Date',
                                field: 'regDt',
                                width: '15%',
                                formatter: cell => {
                                    return util.datetimeFormat(cell.getValue())
                                }
                            }
                        ],
                    });

                    v.table.on("rowSelectionChanged", () => {
                        func.updateUi()
                    });

                    v.table.on("rowClick", (e, row) => {
                        func.openPopup(row.getData())
                    });
                }
            },
            updateUi() {
                const {v} = sessionReplayBlock

                const $btnDelete = $('#btn-delete');

                const count = v.table.getSelectedRows().length;

                $btnDelete.prop('disabled', count === 0);
            }
        }
    }

    sessionReplayBlock.init.created();
    sessionReplayBlock.init.event();
</script>
