<%--suppress ELValidationInspection --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%-- 메인 화면 --%>
<html>
<head>
    <title>MAXY Dashboard</title>
</head>

<jsp:include page="../common/import.jsp"/>
<jsp:include page="../common/import-hc.jsp"/>
<jsp:include page="../common/import-components.jsp"/>
<jsp:include page="../common/commonScript.jsp"/>
<jsp:include page="../common/chartScript.jsp"/>
<jsp:include page="../common/sessionHandler.jsp"/>
<body>
<div>
    <%--suppress HtmlFormInputWithoutLabel --%>
    <input type="password" id="MAXY" style="display: none;"/>
    <!-- 헤더 -->
    <header class="main_header">
        <div class="h_left">
            <span class="logo_img">
                <img class="maxy_logo_dk" alt="">
            </span>
        </div>
        <div class="h_center">
            <nav>
                <ul class="menu_wrap" id="maxyTopMenu"></ul>
            </nav>
        </div>
        <div class="h_right">
            <button class="default_btn maxy_mode front">Front<img class="img_icon_toggle" style="height: 50%"></button>
            <button class="default_btn maxy_mode maxy"><img class="img_icon_toggle" style="height: 50%">MAXY</button>
            <span id="showSearchPopupWrapper">
                <button id="btnShowSearchPopup" class="default_btn"></button>
            </span>
            <button class="default_btn inte_db" id="btnGoInteDb"></button>
            <button class="default_btn day_night_btn dark"></button>
            <button id="btnShowUserInfo"
                    class="default_btn user"
            ></button>
            <button id="btnTranslate" class="default_btn global"><span></span></button>
            <button id="btnMaximize" class="default_btn full"></button>
        </div>
    </header>

    <!-- 메인 영역 -->
    <section class="main_wrap">
        <!-- 본문 -->
        <article class="contents_wrap"></article>
        <!-- 마스크-->
        <div class="dimmed" data-content="dimmed"></div>
        <div class="search_dimmed" data-content="dimmed"></div>
        <div class="account_dimmed" data-content="dimmed"></div>
        <div class="calendar_dimmed" data-content="dimmed"></div>
        <div class="aibot_dimmed" data-content="dimmed"></div>
        <div class="s_replay_dimmed" data-content="dimmed"></div>
        <div class="toast_msg" id="maxyToastMsg"></div>
    </section>

</div>
<jsp:include page="ML01P1.jsp"/>
<div class="i18n_select_wrap">
    <ul>
        <li data-lang="ko">한국어</li>
        <li data-lang="en">English</li>
        <li data-lang="ja">日本語</li>
    </ul>
</div>
<div class="i18n_dimmed" data-content="dimmed"></div>
</body>
<script>
    // 메인 레이아웃 객체
    const ML0100 = {
        // 전역 변수 모음
        v: {
            menu: {}
        },
        // 초기값 세팅 함수 모음
        init: {
            event() {
                const {func} = ML0100
                $('.logo_img').on('click', func.goDashboard)
            //    $('.logo_img').on('click', func.goIntegratedDashboard)

                // 최대화 버튼
                $('#btnMaximize').on('click', func.fullScreen)
                $('#btnShowUserInfo').on('click', func.showUserInfo)

                onpopstate = event => {
                    console.log(`location: ` + document.location + `, state: ` + JSON.stringify(event.state),)
                    func.loadPage(event.state.page, true)
                }

                $(document).on('fullscreenchange', function () {
                    if (!document.fullscreenElement) {
                        $('.main_header').show()
                        // Left fullscreen; run your code here
                        $('.dash_top, .dash_bottom').removeClass('no_maximize_btn')
                        $('.logmeter .ht_col').removeClass('no_maximize_btn')
                        $('.maxy_component_wrap .maxy_component_item').removeClass('no_maximize_btn')
                        $('.maxy_component_wrap .page_header').removeClass('no_maximize_btn')
                    }
                });

                $('#btnTranslate').on('click', func.toggleI18nPopup)

                // 맥시 제품선택 toggle 버튼
                $('.maxy_mode').on('click', function () {
                    const $this = $(this)
                    const $maxyModeMaxy = $('.maxy_mode.maxy')
                    const $maxyModeFront = $('.maxy_mode.front')
                    const $dayNightBtn = $('.day_night_btn')

                    if ($this.hasClass('front')) {
                        // Maxy에서 Front로 mode 변경
                        $maxyModeFront.hide()
                        $maxyModeMaxy.show()
                     //   $dayNightBtn.hide()

                        $('.logo_img').append('<img class="maxy_logo_front">')
                        $('#btnGoInteDb').hide()

                        sessionStorage.setItem('maxyMode', 'front')
                        sessionStorage.setItem('currentMenu', 'MF0000')
                    } else {
                        // Front에서 Maxy로 mode 변경
                        $maxyModeMaxy.hide()
                        $maxyModeFront.show()
                        $dayNightBtn.show()

                        $('.maxy_logo_front').remove()
                        if (sessionStorage.getItem('integrationDashboard') + '' === 'true') {
                            $('#btnGoInteDb').show()
                        }

                        sessionStorage.setItem('maxyMode', 'maxy')
                        sessionStorage.setItem('currentMenu', 'DB0100')
                    }

                    // mode가 바뀌어 세션에 저장된 패키지정보 초기화
                    sessionStorage.removeItem('packageNm')
                    sessionStorage.removeItem('serverType')

                    // 패키지목록 재설정
                    getSessionInfo()

                    func.drawMenu()
                })

                $('#btnGoInteDb').on('click', function(){
                    const {func} = ML0100
                    const integrationDashboard = sessionStorage.getItem('integrationDashboard')
                    if (integrationDashboard + '' === 'true') {
                        func.loadPage('DB0200')
                    } else {
                        func.loadPage('DB0100')
                    }
                })
            },
            created() {
                const {v, func} = ML0100
                func.initMenuList().then(func.drawMenu)
                func.initLang()

                if (${integrationDashboard} && sessionStorage.getItem('maxyMode') === 'maxy') {
                    $('#btnGoInteDb').show()
                }

                <%-- admin YN --%>
                sessionStorage.setItem('ay', '${loginUser.adminYn}')

                // 사용자분석 > 검색 필터에 추가할 검색 옵션 값들
                sessionStorage.setItem('optionalSearchFields', '${optionalSearchFields}')
                // 통합대시보드 사용여부
                sessionStorage.setItem('integrationDashboard', '${integrationDashboard}')

                // MAXY Mode (maxy: only use maxy, front: only use front, all: use both)
                // maxyMode가 all이 아닌 경우, maxy mode 아이콘 숨기기 (우상단)
                const sessionMaxyMode = sessionStorage.getItem('maxyMode')
                const $maxyModeMaxy = $('.maxy_mode.maxy')
                const $maxyModeFront = $('.maxy_mode.front')

                if ('${maxyMode}' === 'all') {
                    if (sessionMaxyMode === 'maxy') {
                        $maxyModeMaxy.hide()
                        $maxyModeFront.show()
                    } else if (sessionMaxyMode === 'front') {
                        $('.logo_img').append('<img class="maxy_logo_front">')
                        $maxyModeFront.hide()
                        $maxyModeMaxy.show()
                    }
                } else {
                    $('.maxy_mode').hide()

                    if (sessionMaxyMode === 'front') {
                        $('.logo_img').append('<img class="maxy_logo_front">')
                    }
                }
            }
        },
        // 함수 모음
        func: {
            initLang() {
                const {func} = ML0100
                let lang = localStorage.getItem('lang')
                $('#btnTranslate > span').text(lang)
                $('.i18n_select_wrap li').on('click', function (e) {
                    const $target = $(e.target)
                    $('.i18n_select_wrap li').removeClass('on')
                    $target.addClass('on')
                    func.changeLanguage($target.data('lang'))
                })
                $('.i18n_dimmed').on('click', function (e) {
                    $('.i18n_select_wrap').removeClass('on')
                    $(e.target).hide()
                })
            },
            toggleI18nPopup() {
                let lang = localStorage.getItem('lang')
                $('#btnTranslate > span').text(lang)
                $('.i18n_select_wrap li').removeClass('on')
                $('.i18n_select_wrap li[data-lang="' + lang + '"]').addClass('on')
                $('.i18n_dimmed').show()
                $('.i18n_select_wrap').toggleClass('on')
            },
            changeLanguage(lang) {
                localStorage.setItem('lang', lang)
                location.reload()
            },
            initSSE() {
                const {v} = ML0100

                try {
                    const url = '${sse}'
                    const userNo = '${loginUser.userNo}'
                    const sseUrl = url + '/' + userNo
                    sessionStorage.setItem('sseUrl', sseUrl)

                    // 세션에 저장된 package name, server type, version을 가져온다
                    const packageNm = sessionStorage.getItem('packageNm')
                    const serverType = sessionStorage.getItem('serverType')

                    if (packageNm && serverType && sseUrl && !v.sse) {
                        v.sse = new SSEClient({
                            packageNm: packageNm,
                            serverType: serverType,
                            sseUrl: sseUrl + '/' + packageNm + '/' + serverType
                        })
                    }
                } catch (e) {
                    console.error(e)
                }
            },
            /**
             * 로그인 유저 정보 팝업 열기
             */
            showUserInfo() {
                const {func} = ML01P1
                const $popup = $('#acct_popup')
                const $dimmed = $('.account_dimmed')
                if ($popup.css('display') !== 'none') {
                    // hide 시 input reset 및 클릭 이벤트 제거(사이드이펙트 방지)
                    func.resetInput()
                    $popup.hide()
                    $dimmed.hide()
                    $dimmed.off('click')
                } else {
                    $popup.show()
                    $dimmed.show()
                    $dimmed.on('click', () => {
                        // dimmed 클릭 시 input reset 및 클릭 이벤트 제거(사이드이펙트 방지)
                        func.resetInput()
                        $popup.hide()
                        $dimmed.hide()
                        $dimmed.off('click')
                    })
                }
            },
            fullScreen() {
                const element = document.querySelector('body')
                if (!element.fullscreenElement) {
                    if (element.requestFullscreen) {
                        $('.main_header').hide()
                        $('.dash_top, .dash_bottom').addClass('no_maximize_btn')
                        $('.logmeter .ht_col').addClass('no_maximize_btn')
                        $('.maxy_component_wrap .maxy_component_item').addClass('no_maximize_btn')
                        return element.requestFullscreen()
                    }
                    if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen()
                    if (element.mozRequestFullScreen) return element.mozRequestFullScreen()
                    if (element.msRequestFullscreen) return element.msRequestFullscreen()
                } else {
                    if (document.exitFullscreen) return document.exitFullscreen()
                    if (document.webkitCancelFullscreen)
                        return document.webkitCancelFullscreen()
                    if (document.mozCancelFullScreen) return document.mozCancelFullScreen()
                    if (document.msExitFullscreen) return document.msExitFullscreen()
                }
            },
            // 로고 클릭 시 대시보드 이동
            goDashboard() {
                const {func} = ML0100

                const maxyMode = sessionStorage.getItem('maxyMode')

                if (maxyMode === 'front') {
                    func.loadPage('MF0000')
                } else  {
                    func.loadPage('DB0100')
                }
            },
            goIntegratedDashboard() {
                const {func} = ML0100
                const integrationDashboard = sessionStorage.getItem('integrationDashboard')
                if (integrationDashboard + '' === 'true') {
                    func.loadPage('DB0200')
                } else {
                    func.loadPage('DB0100')
                }

            },
            /**
             * 메뉴 목록을 세션에서 가져와 파싱
             */
            async initMenuList() {
                const {v} = ML0100
                const menuList = JSON.parse('${loginUser.menuList}')
                if (menuList.length <= 0) {
                    console.log('menuList is empty')
                }

                const menuMap = new Map()
                for (let x of menuList) {
                    const {menuId, grpLevel} = x
                    if (grpLevel > 1) {
                        continue
                    }
                    menuMap.set(menuId, x)
                }

                v.menu = menuMap
            },
            // 페이지 비우고 로드하기
            loadPage(menuId, flag) {
                const {v, func} = ML0100

                const {menu} = v
                if (!menu) {
                    console.log('no menu')
                    return
                }

                const $sReplayDimmed = $('.s_replay_dimmed')
                if ($sReplayDimmed.css('display') === 'block') {
                    $sReplayDimmed.hide()
                }

                try {
                    if (menuId !== 'DB0100') {
                        if (ML0100.v.sse) {
                            ML0100.v.sse.close()

                            // maxyAiBot 내 setTimeout, swiper 모두 초기화
                            const maxyAiBot = ML0100.v.sse.maxyAibot
                            if (maxyAiBot) {
                                if (maxyAiBot.aibotSwiper) {
                                    maxyAiBot.aibotSwiper.destroy(true, true) // Swiper 인스턴스 완전 제거
                                    maxyAiBot.aibotSwiper = null
                                }
                                if (maxyAiBot.firstNextSlideTimeout) {
                                    clearTimeout(maxyAiBot.firstNextSlideTimeout)
                                    maxyAiBot.firstNextSlideTimeout = null
                                }
                                if (maxyAiBot.typingTimeout) {
                                    clearTimeout(maxyAiBot.typingTimeout)
                                    maxyAiBot.typingTimeout = null
                                }
                            }
                            ML0100.v.sse = null
                        }

                        // 종합분석에서 ai bot popup이 켜져있고, 텍스트 알림이 덜 끝난 상태에서 다른 화면으로 이동하는 경우
                        // popup dimmed 없애주고, 타이핑 관련 setTimeout 모두 clear 해줘야 한다.
                        const $aibotDimmed = $('.aibot_dimmed')
                        if ($aibotDimmed.css('display') === 'block') {
                            $aibotDimmed.hide()
                        }
                    } else {
                        if (!v.sse) {
                            func.initSSE()
                        }
                    }
                } catch (e) {
                    console.log(e)
                }


                let menuNm, menuUrl;

                // menuId가 DB0200이 아닌 경우 menuNm, menuUrl get해서 저장
                if (menuId !== 'DB0200') {
                    ({menuNm, menuUrl} = menu.get(menuId))
                }
                // menuId가 DB0200이면 (통합 대시보드) 통합 대시보드 화면으로 이동하도록 하드코딩
                else {
                    menuUrl = '/db/0100/goIntegrationDashboardView.maxy'
                }
                // 로그분석에서 error, crash, pv 탭 이동 시 시간/날짜 유지를 위해 만든 변수 값 초기화
                // 초기화 안 하면 로그분석에서 바꾼 날짜가 성능분석 검색팝업 내 캘린더에 세팅돼서 안됨.
                search.v.fromDate = ''
                search.v.fromHour = ''
                search.v.fromMinute = ''
                search.v.toDate = ''
                search.v.toHour = ''
                search.v.toMinute = ''

                // 다크모드 체크는 최우선으로 진행
                func.checkDarkMode(menuId)
                func.checkMaximize(menuId)

                // 페이지 비우기
                func.clearPage()
                // 세션 비우기
                func.clearSession()
                // 이벤트 초기화
                func.clearEvent()
                // esc로 팝업닫기
                popup.escClose()
                $('.dimmed').off('click')

                // 메뉴명이 있으면 탭 바의 title 변경
                if (menuNm) {
                    document.title = i18next.tns(menuNm)
                }

                $('#maxyTopMenu .menu_group.menu_item').removeClass('selected')
                $('#' + menuId).addClass('selected')

                const $contentsWrap = $('.contents_wrap')
                // 페이지 호출
                $contentsWrap.load(menuUrl)

                sessionStorage.removeItem('ua0400Params')
                if (menuId === 'UA0000') {
                    $contentsWrap.attr('id', 'ua0000');
                } else {
                    if ($contentsWrap.attr('id') === 'ua0000') {
                        $contentsWrap.removeAttr('id');
                    }
                }

                // 이전화면에서 선택한 캘린더가 초기화 안된경우 지워줌
                const $vanillaCalendar = $('body').find('.vanilla-calendar')
                if ($vanillaCalendar.length > 0) {
                    $vanillaCalendar.remove()
                }

                sessionStorage.setItem('currentMenu', menuId)
                if (!flag) {
                    history.pushState({page: menuId}, '', '')
                }
            },
            /**
             *  화면 이동 시 현재 다크모드 상태 체크
             * @param menuId
             */
            checkDarkMode(menuId) {
                const $darkMode = $('.day_night_btn')

                // dark mode white list 는 문자열 비교가 아닌 include, iterator 를 사용하면 반짝거리게 되므로
                // 하드코딩을 할 수 밖에 없음
                if (menuId !== 'GM0000' && menuId !== 'RT0000' && menuId !== 'SM0000') {
                    $darkMode.show()
                }

                $darkMode.attr('id', '')
                $darkMode.off('click.draw')

                const $body = $('body')
                if (sessionStorage.getItem('maxyDarkYn') === 'Y'
                    && !$body.hasClass('dark_mode')) {
                    $body.addClass('dark_mode')
                }
            },
            /**
             * 화면 이동 시 현재 전체 화면 아이콘 상태 체크
             * @param menuId
             */
            checkMaximize(menuId) {
                const $btnMaximize = $('#btnMaximize')
                if (menuId === 'DB0100') {
                    $btnMaximize.show()
                } else {
                    $btnMaximize.hide()
                }
            },
            /**
             * 화면 초기화
             */
            clearPage() {
                if (typeof DB0200 !== 'undefined') {
                    DB0200.func.stopDBInterval()
                }

                // 한국어 주석: DB0100/MF0000 미정의 시 에러로 인해 WS 종료가 스킵되지 않도록 방어
                const db0100Exists = (typeof DB0100 !== 'undefined' && DB0100 && DB0100.func)
                const mf0000Exists = (typeof MF0000 !== 'undefined' && MF0000 && MF0000.func && MF0000.func.ws)

                const v = db0100Exists ? DB0100.v : {}
                const func = db0100Exists ? DB0100.func : {}
                // content 비우기
                $('.contents_wrap').empty()

                // 화면 이동 시 기존 있던 dimmed 제거
                $('.dimmed').hide()
                $('.search_dimmed').hide()
                $('.account_dimmed').hide()
                $('.calendar_dimmed').hide()
                // 화면 이동 시 기존 팝업 제거
                $('.popup_common').hide()
                $('.popup_account').hide()
                $('#btnShowSearchPopup').hide()

                // 화면 이동 시 커서 제거
                cursor.hide()

                // 페이지 이동 시 대시보드의 WebSocket 정지
                try {
                    const mode = sessionStorage.getItem('maxyMode')
                   // console.log('mode: ', mode)

                    if (mf0000Exists && typeof MF0000.func.ws.disconnect === 'function') {
                        MF0000.func.ws.disconnect()
                    }

                    if (db0100Exists && typeof func.wsDisconnect === 'function') {
                        func.wsDisconnect()
                    }

                } catch (e) {
                    console.warn('웹소켓 종료 처리 중 오류:', e)
                }

                // 페이지 이동 시 대시보드의 Interval 정지
                try {
                    if (db0100Exists && typeof func.stopInterval === 'function') {
                        func.stopInterval()
                        document.removeEventListener("visibilitychange", func.toggleVisible)
                    }

                    if (mf0000Exists) {
                        document.removeEventListener("visibilitychange", MF0000.func.toggleVisible)
                    }
                } catch (e) {
                }

                // 페이지 이동 시 pageAnalysis 의 resize 이벤트 제거
                try {
                    window.removeEventListener('resize', v.pageAnalysis.setRedrawEvent)
                } catch (e) {
                }
            },
            clearSession() {
                sessionStorage.setItem('searchText', "")
                sessionStorage.setItem('textType', "")
            },
            clearEvent() {
                $(document).off('keyup')
                $('input[type="text"]').off('keyup')
            },
            // 사이드 메뉴 그리기 함수
            drawMenu() {
                const {v, func} = ML0100
                const {menu} = v
                if (!menu) {
                    console.log('no menu')
                    return
                }

                const $ul = $('#maxyTopMenu')
                $ul.empty()
                menu.forEach(m => {
                    const {grpLevel, menuUrl, menuNm, menuId, appType} = m

                    if (grpLevel !== 1) {
                        return
                    }

                    const $li = $('<li>')
                    $li.addClass('menu_group')
                    $li.attr('data-page', menuUrl)
                    $li.attr('data-nm', menuNm)
                    $li.attr('data-t', menuNm)
                    $li.attr('id', menuId)
                    $li.attr('data-apptype', appType)

                    // 메뉴 URL 이 있으면 클릭되는 요소를 가르는 menu_item 클래스 추가
                    if (menuUrl) {
                        $li.addClass('menu_item')
                    }

                    // 리스트 객체를 사이드 메뉴에 붙임
                    $ul.append($li)
                })

                // MAXY, MAXY Front에 따라서 보여주는 메뉴 변경
                const targetType = sessionStorage.getItem('maxyMode') === 'front' ? 1 : 0
                $('.menu_group').each(function () {
                    $(this).toggle($(this).data('apptype') === targetType)
                });

                // 동적으로 리스트를 그렸으므로 그리고 난 다음 click 이벤트 작성
                $('#maxyTopMenu .menu_item').on('click', func.openMenu)

                // menu 그렸으니 언어 바꾸기
                i18next.changeLanguage(getLang()).then(() => {
                    // sessionStorage 에 현재 보여지고 있는 메뉴 있으면 해당 메뉴 열도록 설정
                    func.getFirstMenuContent()
                })

            },
            // 첫 화면 진입 / 새로고침 시 화면 로드 함수
            getFirstMenuContent() {
                const {func} = ML0100
                const currentId = sessionStorage.getItem('currentMenu')

                if ('null' !== currentId && currentId) {
                    // 세션 스토리지에 저장된 메뉴 아이디가 있을 때 해당 메뉴 선택
                    func.loadPage(currentId)
                } else {
                    // 세션 스토리지에 저장된 메뉴 아이디가 없을 때는 대시보드로 이동
                    if (sessionStorage.getItem('maxyMode') === 'front') {
                        func.loadPage('MF0000', true)
                    } else {
                        func.loadPage('DB0100', true)
                    }
                }
            },
            // 페이지 이동 함수 (click)
            openMenu(el) {
                const {func} = ML0100

                // 그룹, 시스템 관리자 페이지 관련 키 삭제
                sessionStorage.setItem('currentGroupManagementMenu', '')
                sessionStorage.setItem('currentSystemManagementMenu', '')

                const id = $(el.currentTarget).attr('id')
                sessionStorage.removeItem('ua0000Params')
                func.loadPage(id)
            }
        }
    }
    ML0100.init.event()
    ML0100.init.created()
</script>
</html>
