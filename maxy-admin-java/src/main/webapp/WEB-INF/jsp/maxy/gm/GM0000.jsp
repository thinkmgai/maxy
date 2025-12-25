<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .contents_wrap {
        padding: 0;
    }
</style>

<%-- 관리 사이드 메뉴 --%>
<div class="maxy_gm_wrap">
    <div class="left_side_wrap">
        <div class="gm_title">
            <h1>Configuration</h1>
            <h4 data-t="management.title.sideMenu"></h4>
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
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM0000 = {
        v: {
            menuId: '#managementSideMenu',
            ssKey: 'currentGroupManagementMenu'
        },
        init: {
            event() {

            },
            created() {
                const {func} = GM0000
                $('.day_night_btn').hide()
                $('body').removeClass('dark_mode')
                func.initMenuList().then(func.drawSideMenu)
                // if (!ML0100.v.sse) {
                //     ML0100.func.initSSE()
                // }
                updateContent()
            }
        },
        func: {
            getFirstMenuContent() {
                const {v, func} = GM0000
                // sessionStorage 에 현재 보여지고 있는 메뉴 있으면 해당 메뉴 열도록 설정
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
                const {func} = GM0000
                // content 비우고 load 하기
                const $current = $(el.currentTarget)
                const menuId = $current.attr('id')

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

                func.loadPage(menuId)
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
                const {v} = GM0000
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
                const {v} = GM0000
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
                    //document.title = menuNm
                    document.title = i18next.tns(menuNm)
                }
                // 현재 메뉴 기억용
                sessionStorage.setItem(v.ssKey, menuId)
            },
            drawSideMenu() {
                const {v, func} = GM0000
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

                        // 메뉴 URL 이 있으면 클릭되는 요소를 가르는 menu_item 클래스 추가
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
                            'text': menuNm,
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
    GM0000.init.created()
    GM0000.init.event()
</script>