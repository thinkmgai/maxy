<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .contents_wrap {
        padding: 0;
    }

    <c:if test="${prod ne true}">
    #popupLog {
        width: 98%;
    }

    #popupLog h5 {
        font-size: 1.2em;
        font-weight: bold;
    }

    #popupLog .popup_log_header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1em;
    }

    #popupLog .popup_log_btn_wrap {
        display: flex;
        align-items: center;
        gap: .5em;
    }

    #popupLog .popup_chk_wrap {
        display: flex;
        align-items: center;
        gap: .5em;
    }

    #popupLog .popup_chk_wrap label {
        cursor: pointer;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    #popupLog .popup_log_close {
        height: 2em;
        padding: 0 .5em;
    }

    #popupDetailLogModal {
        width: 600px;
        max-height: 60vh;
        overflow: auto;
    }

    #popupLog .btn_log {
        height: 32px;
    }

    </c:if>
</style>
<!-- 시스템 관리 > 사이드 메뉴 -->
<div class="maxy_gm_wrap">
    <div class="left_side_wrap">
        <div class="gm_title">
            <h1>System Configuration</h1>
            <h4 data-t="menu.system.management"></h4>
        </div>
        <nav>
            <ul class="maxy_side_menu" id="managementSideMenu"></ul>
        </nav>
        <div class="ci_wrap" title="${version}">
            <h5>Powered by&nbsp;</h5>
            <img src="<c:url value="/images/maxy/THINKM_CI.svg"/>" alt="THINKM">
        </div>
    </div>
    <div class="right_side_wrap">
        <article class="maxy_contents_wrap"></article>
    </div>
    <c:if test="${prod ne true}">
        <div class="maxy_popup_common" id="popupLog">
            <div class="popup_log_header">
                <h5 class="popup_title">Log</h5>
                <button class="popup_log_close btn_common">X</button>
            </div>
            <div class="popup_log_header">
                <div class="popup_log_btn_wrap">
                    <span class="app_icon">A</span>
                        <%--suppress HtmlFormInputWithoutLabel --%>
                    <select id="log__packageNm" class="app_info_select"></select>
                </div>
                <div class="popup_log_btn_wrap">
                    <div class="popup_chk_wrap">
                        <div class="popup_chk_wrap">
                            <label for="chk_err">Error</label>
                            <input type="checkbox" id="chk_err" name="chk_log"/>
                            <label for="chk_err"></label>
                        </div>
                        <div class="popup_chk_wrap">
                            <label for="chk_custom">Custom</label>
                            <input type="checkbox" id="chk_custom" name="chk_log"/>
                            <label for="chk_custom"></label>
                        </div>
                        <div class="popup_chk_wrap">
                            <label for="chk_net">Network</label>
                            <input type="checkbox" id="chk_net" name="chk_log"/>
                            <label for="chk_net"></label>
                        </div>
                        <div class="popup_chk_wrap">
                            <label for="chk_nav">Page</label>
                            <input type="checkbox" id="chk_nav" name="chk_log"/>
                            <label for="chk_nav"></label>
                        </div>
                    </div>

                    <label for="indexBox">
                        <select class="select_common" id="indexBox">
                            <c:forEach items="${indices}" var="index">
                                <option value="${index}">${index}</option>
                            </c:forEach>
                        </select></label>
                    <button class="btn_common btn_log">Search</button>
                </div>
            </div>
            <div class="popup_log_table" id="popupLogTable"></div>
        </div>
        <div class="dimmed"></div>
    </c:if>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var SM0000 = {
        v: {
            menuId: '#managementSideMenu',
            ssKey: 'currentSystemManagementMenu',
            table: {},
            logPopupStatus: false,
        },
        init: {
            event() {
                const {v, func} = SM0000
                <c:if test="${prod ne true}">
                $('.ci_wrap').on('click', function () {
                    func.logPopup.open()
                })
                $('.popup_log_close').on('click', function () {
                    func.logPopup.close()
                })
                </c:if>
            },
            created() {
                const {func} = SM0000
                $('.day_night_btn').hide()
                $('body').removeClass('dark_mode')
                func.initMenuList().then(func.drawSideMenu)
                // if (!ML0100.v.sse) {
                //     ML0100.func.initSSE()
                // }

                <c:if test="${prod ne true}">
                func.logPopup.init()
                </c:if>
            }
        },
        func: {
            <c:if test="${prod ne true}">
            logPopup: {
                init() {
                    const {v, func} = SM0000
                    v.table = new Tabulator("#popupLogTable", {
                        columns: [
                            {
                                title: "Time",
                                field: "timestamp",
                                width: '12%',
                                formatter: function (cell) {
                                    return util.timestampToDateTimeMs(cell.getValue())
                                }
                            },
                            {
                                title: "DID",
                                field: "deviceId",
                                width: '10%',
                                formatter: function (cell) {
                                    return util.ellipsis(cell.getValue(), 15)
                                }
                            },
                            {
                                title: "User",
                                field: "userId",
                                width: '10%',
                                formatter: function (cell) {
                                    return util.ellipsis(cell.getValue(), 15)
                                }
                            },
                            {
                                title: "Type",
                                field: "logType",
                                width: '12%',
                                formatter: function (cell) {
                                    const logType = cell.getValue()
                                    return logType ? getLogTypeGroup(logType) + '/' + getLogTypeDetail(logType) : ''
                                }
                            },
                            {
                                title: "Duration",
                                field: "duration",
                                width: '6%',
                                formatter: function (cell) {
                                    return util.convertTime(cell.getValue(), false, true)
                                }
                            },
                            {
                                title: "Call",
                                field: "reqUrl",
                                width: '25%',
                            },
                            {
                                title: "Return",
                                field: "resMsg",
                                width: '25%',
                            },
                        ],
                        height: "91%",
                        width: "100%",
                        // 성능 최적화
                        virtualDom: true,
                        placeholder: "No data",
                        rowFormatter: function (row) {
                            func.logPopup.coloringRow(row)
                        },
                    });

                    v.table.on("rowClick", (e, row) => {
                        modal.show({
                            id: 'popupDetailLogModal',
                            msg: JSON.stringify(row.getData(), null, 4),
                            title: 'Detail',
                            pre: true
                        })
                    })

                    $('.btn_log').on('click', function () {
                        const {packageNm, serverType} = util.getAppInfo('#log__packageNm')
                        ajaxCall('/sm/0000/log/' + $('#indexBox').val() + '.maxy', {
                            packageNm, serverType
                        }).then(data => {
                            func.logPopup.render(data)
                        })
                    })

                    v.table.on('tableBuilt', function () {
                        // 테이블 생성 이후 한 번만 바인딩
                        $('input[name="chk_log"]').on('change', () => {
                            // 전체 리렌더 → rowFormatter 재실행
                            v.table.redraw(true);
                        });
                    });

                    appInfo.append({pId: 'log__packageNm'})
                },
                coloringRow(row) {
                    const {logType} = row.getData();
                    if (!logType) {
                        return;
                    }
                    const chkError = $('#chk_err').prop('checked')
                    const chkCustom = $('#chk_custom').prop('checked')
                    const chkNav = $('#chk_nav').prop('checked')
                    const chkNetwork = $('#chk_net').prop('checked')
                    console.log('yo', logType, chkError, chkCustom, chkNav, chkNetwork)
                    row.getElement().style.backgroundColor = 'rgb(255,255,255)';
                    if (chkNav) {
                        if ([131073, 131074, 131075, 131078].includes(logType)) {
                            row.getElement().style.backgroundColor = 'rgba(204,255,156,0.4)';
                        }
                    }
                    if (chkNetwork) {
                        if ([8388610, 8388611, 8388612, 524291].includes(logType)) {
                            row.getElement().style.backgroundColor = 'rgba(58,190,131,0.4)';
                        }
                    }
                    if (chkCustom) {
                        if ([4194304, 4194305, 4194306].includes(logType)) {
                            row.getElement().style.backgroundColor = 'rgba(255,255,153,0.4)';
                        }
                    }
                    if (chkError) {
                        if ([131076, 131077, 4194306, 8388614, 8388613].includes(logType)) {
                            row.getElement().style.backgroundColor = 'rgba(255,126,126,0.4)';
                        }
                    }
                },
                open() {
                    $('#popupLog').show()
                },
                close() {
                    $('#popupLog').hide()
                },
                render(data) {
                    const {v, func} = SM0000;
                    if (!Array.isArray(data) || data.length === 0) {
                        v.table.setData([])
                        return;
                    }
                    v.table.setData(data)
                }
            },
            </c:if>
            getFirstMenuContent() {
                const {v, func} = SM0000
                const currentId = sessionStorage.getItem(v.ssKey)
                let menuUrl, menuNm, $current
                if ('null' !== currentId && currentId) {
                    // 세션 스토리지에 저장된 메뉴 아이디가 있을 때 해당 메뉴 선택

                    // 해당 메뉴 찾기
                    $current = $('.maxy_side_menu .menu_item[id*=' + currentId + ']')
                    // URL 찾기
                    menuUrl = $current.data('page')
                    menuNm = $current.data('nm')
                } else {
                    // 첫 번째 메뉴 찾기
                    $current = $('.maxy_side_menu .menu_item:nth-child(1)')

                    // 메뉴 페이지 URL 찾기
                    menuUrl = $current.data('page')
                    menuNm = $current.data('nm')
                }
                if ($current.hasClass('menu_item')) {
                    $('.maxy_side_menu .menu_group').removeClass('selected');
                    $current.addClass('selected');
                }

                // 상위 / 자매 객체 찾아 open
                const upMenuId = $current.data('parent')
                let menuId = $current.attr('id')

                // 메뉴 열기 실행
                func.openSideMenu(menuId, upMenuId)

                // 해당 페이지 로드
                func.loadPage(menuId)
            },
            openSideMenu(menuId, parentId) {
                // 부모가 객체가 없을 때 (하위 분류가 없을 때)
                if (parentId === undefined) {
                    // 부모 id 도 자신의 id 로 대체 한다.
                    parentId = menuId
                }

                const $menu_detail = $('.maxy_side_menu .menu_detail')
                $('.maxy_side_menu .menu_group').removeClass('selected')
                $menu_detail.removeClass('open')
                $('.maxy_side_menu .menu_item').removeClass('active')

                // 부모 객체 selected
                const $parent = $('#' + parentId)
                $parent.addClass('selected')
                $parent.find('i').removeClass('off')

                // list group 객체 open
                const $listGroup = $('.maxy_side_menu .menu_detail[data-group*="' + parentId + '"]')
                $listGroup.addClass('open')

                // 해당 객체 active
                $('#' + menuId).addClass('active')
            },
            openPage(el) {
                const {func} = SM0000
                // content 비우고 load 하기
                const $current = $(el.currentTarget)

                if ($current.hasClass('menu_item')) {
                    $('.maxy_side_menu .menu_group').removeClass('selected');
                    $('.maxy_side_menu .menu_item').removeClass('active');

                    // 만약 a 태그면
                    if ($current[0].tagName === 'A') {
                        // 부모 selected 추가
                        $('#' + $current.data('parent')).addClass('selected');

                        // a 태그 active 추가
                        $current.addClass('active');
                    } else {
                        // a 태그가 아니면 본인 selected 추가
                        $current.addClass('selected');
                    }
                }

                func.loadPage($current.attr('id'))
            },
            openDetailMenu() {
                const $v = $(this)
                const $menuGroup = $('.maxy_side_menu .menu_group')
                $menuGroup.removeClass('selected');
                $menuGroup.find('i').addClass('off')
                const $menuDetail = $v.next('.maxy_side_menu .menu_detail')
                if ($menuDetail.hasClass('open')) { //세부 메뉴가 열렸을때
                    $v.removeClass('selected');
                    $menuDetail.removeClass('open').hide();
                } else { //세부 메뉴가 닫혔을때
                    $v.find('i').removeClass('off')
                    $v.addClass('selected');
                    $('.maxy_side_menu .menu_detail.open').removeClass('open').hide();
                    $menuDetail.addClass('open').show();
                }
            },
            /**
             * 메뉴 목록을 세션에서 가져와 파싱
             */
            async initMenuList() {
                const {v} = SM0000
                const menuList = JSON.parse('${menuList}')
                if (menuList.length <= 0) {
                    console.log('menuList is empty')
                }

                const menuMap = new Map()
                for (let x of menuList) {
                    const {menuId, grpLevel} = x
                    if (grpLevel === 1) {
                        continue
                    }
                    menuMap.set(menuId, x)
                }

                v.menu = menuMap
            },
            loadPage(menuId) {
                const {v} = SM0000
                const {menu} = v
                if (!menu) {
                    console.log('no menu')
                    return
                }
                const {menuNm, menuUrl} = menu.get(menuId)
                // 화면 이동 시 기존 있던 dimmed 제거
                $('.dimmed').hide()
                $('#btnShowSearchPopup').hide()

                let $content = $('.maxy_contents_wrap')
                // content 비우고 load 하기
                $content.empty()
                $content.load(menuUrl)

                if (menuNm) {
                    // document.title = menuNm
                    document.title = trl(menuNm)
                }
                // 현재 메뉴 기억용
                sessionStorage.setItem(v.ssKey, menuId)
            },
            drawSideMenu() {
                const {v, func} = SM0000
                const {menu} = v

                if (!menu) {
                    console.log('no menu')
                    return
                }

                const $ul = $(v.menuId)

                menu.forEach(m => {
                    const {
                        grpLevel,
                        menuUrl,
                        menuNm,
                        menuId,
                        iconOn,
                        upMenuId
                    } = m
                    const $li = $('<li>')

                    if (grpLevel === 2) {
                        // 대분류
                        $li.addClass('menu_group')
                        $li.attr('data-page', menuUrl)
                        $li.attr('data-nm', menuNm)
                        $li.attr('id', menuId)

                        // 메뉴 URL이 있으면 클릭되는 요소를 가르는 menu_item 클래스 추가
                        if (menuUrl) {
                            $li.addClass('menu_item')
                        }

                        // 메뉴 이름을 리스트에 붙임
                        const $menuNmWrap = $('<div class="menu_nm_wrap">')
                        $menuNmWrap.append($('<i class="' + iconOn + ' off">'))
                        $menuNmWrap.append($('<h4>', {text: menuNm, 'data-t': menuNm}))
                        $li.append($menuNmWrap)
                        const $barWrap = $('<div class="bar_wrap">')
                        $barWrap.append($('<span>', {'class': 'bar'}))
                        $barWrap.append($('<span>', {'class': 'bar'}))
                        $li.append($barWrap)

                        // 리스트 객체를 사이드 메뉴에 붙임
                        $ul.append($li)
                    } else if (grpLevel === 3) {
                        const parentLi = 'li[data-group*="' + upMenuId + '"]'

                        // 소분류
                        const $menuNm = $('<a>', {
                            'id': menuId,
                            'text': trl(menuNm),
                            'class': 'menu_item',
                            'data-nm': menuNm,
                            'data-t': menuNm,
                            'data-parent': upMenuId,
                            'data-page': menuUrl
                        })

                        // data-parent li 검색
                        if ($ul.find(parentLi).length > 0) {
                            // 본인 부모 li가 있으면 부모에 append
                            const $child = $(parentLi)
                            $child.append($menuNm)
                        } else {
                            // 본인 부모 li가 없으면
                            $li.addClass('menu_detail')
                            $li.attr('data-group', upMenuId)

                            // 부모를 만들고
                            $li.append($menuNm)

                            // 만든 부모에 append
                            $ul.append($li)
                        }
                    }


                })
                // menu 그렸으니 언어 바꾸기
                i18next.changeLanguage(getLang()).then(() => {
                    // sessionStorage 에 현재 보여지고 있는 메뉴 있으면 해당 메뉴 열도록 설정
                    func.getFirstMenuContent()
                })

                // 동적으로 리스트를 그렸으므로 그리고 난 다음 click 이벤트 작성
                $('.maxy_side_menu .menu_item').on('click', func.openPage)
                $('.maxy_side_menu .menu_group').on('click', func.openDetailMenu)
            }
        }
    }
    SM0000.init.created()
    SM0000.init.event()
</script>