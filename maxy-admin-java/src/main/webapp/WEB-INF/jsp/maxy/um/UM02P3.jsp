<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .large_popup {
        z-index: 25;
        width: 40%;
    }

    .popup_common .contents_header {
        margin-bottom: 16px;
    }

    .large_popup h4 {
        margin-bottom: 0;
    }

    .menu_role_divide {
        height: calc(100vh - 500px);
    }

    .menu_role_wrap .btn_wrap_center {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 5px;
    }

    .menu_role_detail_wrap .btn_wrap_right {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 15px;
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

    #settingAppPopup .app_list_wrap {
        height: calc(100vh - 500px);
        overflow-y: scroll;
        border-radius: var(--radius);
        border: 1px solid var(--color-border-in-light);
    }

    #settingAppPopup .app_list_wrap li {
        color: #2f2f2f;
        padding: 1em;
        user-select: none;
    }

    #settingAppPopup .app_list_wrap li:not(:last-child) {
        border-bottom: 1px solid var(--color-border-in-light);
    }

    .menu_role_divide {
        grid-template-columns: 32% 67%;
    }

    .tabulator .tabulator-row.tabulator-selectable:hover {
        background: none;
    }
</style>
<%-- 관리 > 사용자 > 등록/삭제 > 조회 가능 앱 지정 팝업 --%>
<div class="popup_common large_popup" id="settingAppPopup">
    <!-- 컨텐츠 헤더 -->
    <div class="contents_header">
        <div class="ctts_h_left">
            <h4 data-t="management.user.btn.appSelection"></h4>
        </div>
    </div>

    <div class="menu_role_divide">
        <!-- 메뉴 트리맵 영역 -->
            <ul class="enable_scrollbar app_list_wrap" id="userGroupListTree"></ul>
        <!-- 유저 리스트 영역 -->
        <div class="menu_role_detail_wrap">
            <div class="table-group">
                <div id="userPackageTable"></div>
            </div>
        </div>
    </div>
</div>
<div class="popup_dimmed" data-content="dimmed"></div>

<script>
    var UM02P3 = {
        v: {
            table: [],
            currentMenu: {},
            saveValue: {},
            packageInfo: {
                serverType: '',
                packageNm: ''
            },
            userNoList: [],

        },
        // 초기화 함수 모음
        init: {
            event() {
                const {func} = UM02P3
                $('#btnuUpdate').on('click', func.openModifyPopup)

                $('.dimmed').on('click', func.closePopup)
            },
            created() {
                const {func} = UM02P3

                func.createTable()
                func.setHandlebarsHelper()
            }
        },
        func: {
            open() {
                const {func} = UM02P3
                $("#settingAppPopup").show();
                $('#userGroupListTree').scrollTop(0)
                $(".dimmed").show();
                func.getUserGroupMenuList()
            },
            createTable() {
                const {v} = UM02P3
                const msg = i18next.tns('common.msg.noData')
                v.table = new Tabulator("#userPackageTable", {
                    height: 'calc(100vh - 500px)',
                    layout: 'fitDataFill',
                    placeholder: msg,
                    columnHeaderVertAlign: 'middle',
                    columns: [
                        {
                            title: "User ID",
                            field: "userId",
                            vertAlign: "middle",
                            width: "25%"
                        },
                        {
                            title: "User Name",
                            field: "userNm",
                            vertAlign: "middle",
                            width: "25%"
                        },
                        {
                            title: "Email",
                            field: "emailAddr",
                            vertAlign: "middle",
                            width: "49%"
                        }
                    ],
                });
            },
            // 목록 클릭 이벤트 설정
            setListEvent() {
                const {v, func} = UM02P3
                // 메뉴 클릭하면 상세 띄우기
                const $list = $('#userGroupListTree > li')
                $list.on('click', (e) => {
                    const $item = $(e.currentTarget)
                    func.createTable()
                    // 기존 선택된 요소 디자인 초기화
                    $list.removeClass('selected')

                    // 선택된 요소에 selected
                    $item.addClass('selected')

                    v.packageInfo = {
                        serverType: $item.data('serverType'),
                        packageNm: $item.data('packageNm')
                    }

                    func.getUserGroupList($item.text())
                })

                // 모든 유저 목록 요소에 selected 설정
                $('#userGroupListTree > li:eq(0)').trigger('click')
            },
            // 핸들바 헬퍼 함수 설정
            setHandlebarsHelper() {
                Handlebars.registerHelper('getDisplayNm', function (packageNm, serverType) {
                    let serverTypeNum
                    if (serverType === 'dev') {
                        serverTypeNum = 0
                    } else if (serverType === 'qa') {
                        serverTypeNum = 1
                    } else {
                        serverTypeNum = 2
                    }
                    return getDisplayNm(packageNm, serverTypeNum)
                })

                Handlebars.registerHelper('getServerNm', function (serverType) {
                    return i18next.tns('common.servertype.' +serverType)
                })

                Handlebars.registerHelper('getServerType', function (serverType) {
                    let target
                    switch (serverType) {
                        case 'dev' :
                            target = 0
                            break
                        case 'qa' :
                            target = 1
                            break
                        case 'prod' :
                            target = 2
                            break
                    }
                    return target
                })
            },
            // 목록 그리기
            async drawList(data) {
                const {func} = UM02P3
                if (data) {
                    const source = await fetch('/templates/userAppGroupList.html')
                        .then(response => response.text())
                    const template = Handlebars.compile(source)
                    const appUserServerList = template({appUserServerList: data})
                    $('#userGroupListTree').html(appUserServerList)

                    updateContent()

                    // 그리고 난 후 이벤트 추가
                    func.setListEvent()
                }
            },
            // 메뉴 목록 조회
            getUserGroupMenuList() {
                const {func} = UM02P3

                const appType = ((sessionStorage.getItem('maxyMode') || 'maxy') === 'maxy') ? '0' : '1'
                ajaxCall('/gm/0101/getAllAppList.maxy', {appType})
                    .then(data => {
                        func.drawList(data)
                    })
            },
            getUserGroupList() {
                const {v, func} = UM02P3
                const packageInfo = v.packageInfo
                ajaxCall('/gm/0101/getUserListByApp.maxy', {...packageInfo}
                ).then((data) => {
                    func.drawTable(data)
                }).catch((error) => {
                    console.log(error)
                    return false
                })
            },
            drawTable(data) {
                const {v} = UM02P3
                if (data) {
                    v.table.setData(data)
                }
            },

            closePopup() {
                $('#settingAppPopup').hide()
                $('.dimmed').hide()
            }
        }
    }
    UM02P3.init.event()
    UM02P3.init.created()
</script>