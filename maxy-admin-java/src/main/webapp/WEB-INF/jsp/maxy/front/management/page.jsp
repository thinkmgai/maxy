<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .gm_btn_wrap {
        align-items: center;
        gap: .8em;
    }

    .favorite-star {
        content: url("/images/maxy/icon-favorite-star-empty.svg");
    }

    .favorite-star.filled {
        content: url("/images/maxy/icon-favorite-star-filled.svg");
    }

    .gm_text_wrap {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1em;
    }

    #resourceType {
        width: 100px;
    }
</style>

<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title">Mark Management</h4>
            </div>
            <p class="gm_menu_desc">앱별 및 로그인 사용자별로 즐겨찾기한 URL 및 Message를 조회하고 관리할 수 있습니다.</p>
            <p class="gm_menu_desc">웹 성능 분석 화면에서 즐겨찾기를 등록한 URL 및 Message만 표시됩니다.</p>
        </div>
        <div class="gm_menu_button_wrap mt_auto">
            <span class="app_icon">A</span>
            <select id="packageNm" class="app_info_select"></select>
        </div>
    </div>
    <div class="gm_text_wrap">
        <div class="app_info_wrap">
            <select id="resourceType" class="app_info_select">
                <option value="PAGE">Page</option>
                <option value="API">Api</option>
                <option value="ERROR">Error</option>
            </select>
        </div>
        <div class="gm_btn_wrap">
            <div>
                <span>선택</span>
                <span class="bold" id="sel-count">0</span>
                <span>건</span>
            </div>
            <button class="btn_common" id="btn-delete" disabled>선택 삭제</button>
        </div>
    </div>
    <div class="gm_contents_wrap">
        <div id="pageList"></div>
    </div>
</div>

<script>
    var pageMarkList = {
        v: {
            table: {},
            pending: new Set()
        },
        init: {
            event() {
                const {v, func} = pageMarkList
                // 선택 삭제 버튼
                const $btnDelete = $('#btn-delete')

                $btnDelete.on('click', func.fetch.delete);

                $('#packageNm').on('change', function () {
                    func.fetch.page().then(() => {
                        v.table.deselectRow();
                        func.update.page();
                    }).catch(err => console.error('초기 로딩 실패:', err));
                })

                $('#resourceType').on('change', function () {
                    const resourceType = $(this).val();

                    // URL 컬럼 title 변경
                    const newTitle = resourceType === 'ERROR' ? 'Res Msg' : 'URL';
                    v.table.updateColumnDefinition("reqUrl", { title: newTitle });
                    func.fetch.page()
                })
            },
            created() {
                const {v, func} = pageMarkList
                // 최초 로딩
                func.draw.page()

                // appinfo 추가
                appInfo.append({pId: 'packageNm'}).then(() => {
                    func.fetch.page().then(() => {
                        v.table.deselectRow();
                        func.update.page();
                    }).catch(err => console.error('초기 로딩 실패:', err));
                })
            }
        },
        func: {
            fetch: {
                async page() {
                    const {v} = pageMarkList
                    const {packageNm, serverType} = util.getAppInfo('#packageNm')
                    return ajaxCall('/fm/0303/pages.maxy', {
                        packageNm: packageNm,
                        serverType: serverType,
                        type: $('#resourceType').val()
                    }, {disableCursor: true}).then(data => {
                        const list = Array.isArray(data?.list) ? data.list : [];
                        list.forEach(row => {
                            row._rowKey = row.packageNm + '|' + row.serverType + '|' + row.userNo + '|' + row.reqUrl;
                        });
                        v.table.setData(list);
                        return list;
                    });
                },
                async delete() {
                    const {v, func} = pageMarkList
                    const selected = v.table.getSelectedData()
                    if (!selected.length) return;

                    const targets = selected.map(r => ({
                        packageNm: r.packageNm,
                        serverType: r.serverType,
                        userNo: r.userNo,
                        reqUrl: r.reqUrl,
                        type: r.type
                    }));

                    if (!confirm(targets.length + '건을 삭제하시겠습니까?')) return;

                    try {
                        await ajaxCall('/fm/0303/page/delete.maxy', {items: targets}, {
                            disableCursor: true,
                            json: true
                        });
                        toast('삭제되었습니다.')

                        await func.fetch.page();
                        v.table.deselectRow();
                        func.update.page()
                    } catch (err) {
                        console.error('선택 삭제 실패:', err);
                        alert('삭제 중 오류가 발생했습니다.');
                    }
                }
            },
            draw: {
                page() {
                    const {v, func} = pageMarkList

                    const resourceType = $('#resourceType').val()

                    // URL 컬럼 타이틀 동적 설정
                    const urlColumnTitle = resourceType === 'error' ? 'resMsg' : 'URL'

                    // 테이블 생성
                    v.table = new Tabulator("#pageList", {
                        layout: 'fitDataFill',
                        height: 'calc(100vh - 225px)',
                        placeholder: trl('common.msg.noData'),
                        index: "_rowKey",
                        selectable: true,
                        columns: [
                            {
                                titleFormatter: "rowSelection",
                                formatter: "rowSelection",
                                hozAlign: "center",
                                headerSort: false,
                                width: '1%'
                            },
                            {
                                title: 'Mark',
                                field: 'mark',
                                hozAlign: "center",
                                headerSort: false,
                                cssClass: "mark-cell",
                                formatter: (cell) => {
                                    const rowData = cell.getRow().getData()
                                    const isFavorite = rowData.mark || false
                                    const starClass = isFavorite ? 'filled' : ''
                                    return '<img class="favorite-star ' + (starClass || '') +
                                        '" data-url="' + (rowData.pageUrl || '') + '">';
                                },
                                cellClick: async (e, cell) => {
                                    const row = cell.getRow();
                                    const data = row.getData();

                                    const rowKey = data._rowKey;
                                    if (v.pending.has(rowKey)) return;
                                    v.pending.add(rowKey);

                                    const nextMark = !Boolean(data.mark);
                                    row.update({mark: nextMark});

                                    try {
                                        const type = $('#resourceType').val().toLowerCase()
                                        await ajaxCall('/fm/0303/' + type + '/mark.maxy', {
                                            packageNm: data.packageNm,
                                            serverType: data.serverType,
                                            reqUrl: data.reqUrl,
                                            mark: nextMark
                                        }, {disableCursor: true});

                                        await func.fetch.page();
                                        v.table.deselectRow();
                                        func.update.page();
                                    } catch (err) {
                                        console.error('mark 토글 실패:', err);
                                        row.update({mark: !nextMark});
                                        alert('처리 중 오류가 발생했습니다.');
                                    } finally {
                                        v.pending.delete(rowKey);
                                    }
                                },
                            },
                            {
                                title: urlColumnTitle,
                                field: 'reqUrl',
                            }
                        ],
                    });

                    // 선택 변경 이벤트: 항상 공통 UI 갱신만 호출
                    v.table.on("rowSelectionChanged", (e) => {
                        console.log(e)
                        func.update.page()
                    });
                }
            },
            update: {
                page() {
                    const {v} = pageMarkList

                    // 공용 DOM 캐시
                    const $btnDelete = $('#btn-delete');
                    const $selCount = $('#sel-count');

                    const count = v.table.getSelectedRows().length;

                    // 텍스트 변경
                    $selCount.text(count);

                    // disabled 속성 제어
                    $btnDelete.prop('disabled', count === 0);
                }
            }
        }
    }

    pageMarkList.init.created();
    pageMarkList.init.event();
</script>
