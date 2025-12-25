<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<style>
    .dashboard .dash_wrap {
        width: 100%;
        height: calc(100% - 160px);
        display: grid;
        grid-template-columns: 24.5% 24.5% 24.5% 24.5%;
        gap: 0.65%;
    }

    .dash_wrap .component .maxy_box.top {
        height: 38.5vh;
        min-height: 295px;
        margin-bottom: 1vh;
    }

    @media screen and (max-width: 1441px) {

        .dash_wrap .component .maxy_box.top,
        .dash_wrap .component .maxy_box.bot {
            height: 28vh;
            min-height: 254px;
        }
    }

    @media screen and (min-width: 1441px) {
        .dash_wrap .component .maxy_box.bot {
            height: 38.5vh;
            min-height: 295px;
        }
    }

    .dark_mode .dashboard .contents_header h1 {
        color: white;
    }

    .dash_wrap canvas {
        width: 100%;
        height: 100%;
    }

    @media screen and (max-width: 1441px) {
        .dash_wrap .user_session_wrap {
            height: 70.5vh !important;
        }
    }

    .dash_wrap .user_session_wrap {
        position: relative;
        height: 78vh;
        max-height: 100%;
        margin: 0 1.5em 0 1.5em;
        border-right: 1px solid #e3e5e8;
        border-left: 1px solid #e3e5e8;
        border-bottom: 1px solid #e3e5e8;
    }

    .dark_mode .dash_wrap .user_session_wrap {
        border-right: 1px solid #484848;
        border-left: 1px solid #484848;
        border-bottom: 1px solid #484848;
    }

    .user_session_wrap .feeldex_tooltip {
        display: flex;
        flex-direction: column;
        gap: .3em;
    }

    .user_session_wrap .lsv_title_wrap {
        color: #3D3D3D;
        font-size: 12px;
        position: absolute;
        left: 10px;
        top: .4em;
        user-select: none;
    }

    .feeldex_tooltip > div {
        text-align: left;
    }

    img.btn_setting {
        content: url('/images/maxy/icon-session-setting.svg');
        position: absolute;
        right: 10px;
        width: 25px;
    }

    .contents_header {
        margin-bottom: 7px;
    }

    .contents_header h1 {
        font-size: 16px;
        font-weight: 500;
        line-height: 20px;
        color: rgb(83, 84, 87);
    }
</style>
<%-- Maxy Front Dashboard --%>
<div class="dashboard">
    <!-- 컨텐츠 헤더 -->
    <div class="contents_header">
        <div class="ctts_h_left">
            <h1 data-t="dashboard.bi.title"></h1>
            <img class="ic_question" alt="?">
        </div>

        <div class="ctts_h_right">
            <span class="app_icon">A</span>
            <select id="packageNm" class="app_info_select"></select>
        </div>
    </div>

    <!-- 최상단 원그래프 13-->
    <ul class="dsb_radial_wrap">
        <li>
            <canvas id="countNew"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>New</span>
        </li>
        <li>
            <canvas id="countDau"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>DAU</span>
<%--            <i><img id="appConnectCountTri" class="img_arrow" alt=""></i>--%>
        </li>
        <li>
            <canvas id="countMau"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>MAU</span>
<%--            <i><img id="appMauCountTri" class="img_arrow" alt=""></i>--%>
        </li>
        <li>
            <canvas id="countCcu"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>CCU</span>
        </li>
        <li>
            <canvas id="countPv"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>PV</span>
        </li>
        <li>
            <canvas id="avgUseTime"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span data-t="dashboard.bi.stayTime"></span>
        </li>
        <li>
            <canvas id="countRevisit"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span data-t="dashboard.bi.reconnect"></span>
            <span class="sm-text">%</span>
        </li>
        <li>
            <canvas id="avgLcp"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>LCP</span>
        </li>
        <li>
            <canvas id="avgFcp"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>FCP</span>
        </li>
        <li>
            <canvas id="avgInp"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>INP</span>
        </li>
        <li>
            <canvas id="avgCls"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>CLS</span>
        </li>
        <li>
            <canvas id="avgTtfb"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>TTFB</span>
        </li>
        <li>
            <canvas id="countError"></canvas>
            <div class="counter" data-cnt-values="">
                <div class="counter-unit" data-cnt-loc="0" data-cnt-value="">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="1" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="2" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
                <div class="counter-unit" data-cnt-loc="3" data-cnt-value="" style="display: none">
                    <div class="counter-number" data-cnt-js="prev"></div>
                    <div class="counter-number" data-cnt-js="current"></div>
                    <div class="counter-number" data-cnt-js="next"></div>
                </div>
            </div>
            <span>Error</span>
        </li>
    </ul>

    <div class="dash_wrap">
        <!-- 좌측 그래프 영역 -->
        <div class="component">
            <div class="maxy_box top" id="pageLoading"></div>
            <div class="maxy_box bot" id="pageRequested"></div>
        </div>
        <!-- 중앙 그래프 영역 -->
        <div class="user_session_wrap" id="liveSessionView">
            <div class="lsv_title_wrap">
                <span class="lsv_title">
                        Live Session View
                </span>
                <img class="ic_question"
                     alt="?"
                >
            </div>
            <img class="btn_setting" id="btnSetting" alt="" src="">
            <canvas id="sessionChart"></canvas>
        </div>
        <!-- 우측 그래프 영역 -->
        <div class="component">
            <div class="maxy_box top" id="responseTime"></div>
            <div class="maxy_box bot" id="ajaxResponse"></div>
        </div>
        <div class="component">
            <div class="maxy_box top" id="error"></div>
            <div class="maxy_box bot" id="area"></div>
        </div>
    </div>

    <div class="maxy_popup_common_wrap" id="maxyPopupWrap"></div>
    <div class="maxy_popup_common_wrap" id="maxyBiPopupWrap"></div>
    <div class="maxy_popup_common_wrap" id="maxySessionReplayPopupWrap"></div>
</div>

<%--suppress ES6ConvertVarToLetConst, CssInvalidHtmlTagReference --%>
<script>
    var MF0000 = {
        v: {
            flag: {
                frf: false, // firstF receive flag
                draw: false // component draw
            },
            chart: {},
            ws: {},
            data: {
                pageLine: [],
                networkLine: [],
                errorLine: [],
                pageScatter: [],
                networkScatter: []
            },
            // 차트 툴팁 동기화 관리자 인스턴스
            tooltipSynchronizer: null
        },
        init: {
            event() {
                const {v, func} = MF0000
                sessionStorage.setItem('frontToggleVisible', 'null')

                // 종합분석에서 다른 탭을 open 한 경우
                if (sessionStorage.getItem('frontToggleVisible') === 'null') {
                    document.addEventListener("visibilitychange", func.toggleVisible)
                    sessionStorage.setItem('frontToggleVisible', 1)
                }

                $('#btnSetting').on('click', function () {
                    const options = {
                        id: 'userSessionSetting',
                        appendId: 'maxyPopupWrap'
                    }

                    new MaxyFrontPopupUserSessionSetting(options)
                })

                // 패키지 명 select 변경 이벤트
                $('#packageNm').on('change', () => {
                    v.packageNm = $('#packageNm').val()
                    v.serverType = $('#packageNm option:checked').data('server-type')

                    sessionStorage.setItem('packageNm', v.packageNm)
                    sessionStorage.setItem('serverType', v.serverType)
                    sessionStorage.setItem('appVer', "A")

                    // 로그인시 최근 선택했던 패키지가 기본으로 선택되도록 쿠키에 저장
                    const maxyMode = sessionStorage.getItem('maxyMode') || 'maxy'
                    document.cookie = maxyMode + "CurrentPackage=" + sessionStorage.getItem('packageNm')
                        + ":" + sessionStorage.getItem('serverType')
                        + "; path=/; max-age=" + (60 * 60 * 24 * 30)

                    func.changeAppInfoCallback()
                })

                $(window).off('beforeunload.dashboard').on('beforeunload.dashboard', function() {
                    func.ws.disconnect()
                })
            },
            created() {
                const {v, func} = MF0000

                // 다국어 적용
                updateContent()

                // bi 차트 그리기
                func.db.initDashboard().then(() => {
                    v.chart.basicInformation.resetData()
                    v.chart.basicInformation.drawBiInfoChart()

                    //  웹소켓 수신 시작
                    func.ws.initWebSocket()
                })

                // 페이지 언로드 시 정리 (중복 제거)
                $(window).off('beforeunload.dashboardCleanup').on('beforeunload.dashboardCleanup', function () {
                    if (v.chart) {
                        v.chart.basicInformation.destroy()
                        v.chart.userSession.destroy()
                    }

                    // 차트 툴팁 동기화 관리자 정리
                    if (v.tooltipSynchronizer) {
                        v.tooltipSynchronizer.destroy()
                        v.tooltipSynchronizer = null
                    }

                    // WebSocket 연결 정리
                    func.ws.disconnect()
                })

                appInfo.append({pId: 'packageNm', targetPage: 'dashboard'}).then(() => {

                })

                tippy('.contents_header .ic_question', {
                    content: trl('dashboard.front-dash-info'),
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip',
                })
            }
        },
        func: {
            toggleVisible() {
                const {func} = MF0000

                // 다른 탭으로 이동했을때 websocket 수신 중지 및 컴포넌트 초기화
                if (document.visibilityState === 'visible') {
                    func.ws.initWebSocket()
                } else {
                    func.ws.disconnect()
                    func.db.resetDashboard()
                }
            },
            changeAppInfoCallback() {
                location.reload(true)
            },
            // 차트 동기화 상태 확인 및 재활성화 함수
            ensureChartSynchronization(chartName) {
                const {v} = MF0000

                if (!v.tooltipSynchronizer || !v.chart[chartName]) {
                    return
                }

                const chart = v.chart[chartName]

                // 차트가 동기화 관리자에 등록되어 있는지 확인
                const registeredCharts = v.tooltipSynchronizer.getRegisteredCharts()
                const isRegistered = registeredCharts.some(regChart => regChart.id === chartName)

                if (!isRegistered) {
                    // 등록되지 않은 경우 재등록
                    //console.log(`[대시보드] 차트 ${chartName} 동기화 재등록 시도`)
                    const success = v.tooltipSynchronizer.registerChart(chartName, chart)

                    if (success && typeof chart.enableTooltipSync === 'function') {
                        chart.enableTooltipSync(v.tooltipSynchronizer)
                        //console.log(`[대시보드] 차트 ${chartName} 동기화 재등록 및 활성화 완료`)
                    }
                } else {
                    // 이미 등록된 경우 동기화 기능만 재활성화
                    if (typeof chart._reactivateTooltipSync === 'function') {
                        chart._reactivateTooltipSync()
                        //console.log(`[대시보드] 차트 ${chartName} 동기화 재활성화 완료`)
                    } else if (typeof chart.enableTooltipSync === 'function') {
                        // 재활성화 메서드가 없는 경우 전체 동기화 재설정
                        chart.enableTooltipSync(v.tooltipSynchronizer)
                        //console.log(`[대시보드] 차트 ${chartName} 동기화 전체 재설정 완료`)
                    }
                }
            },
            cmm: {
                filterData(data, type) {
                    try {
                        if (!Array.isArray(data)) return []; // 데이터가 배열이 아니면 빈 배열 반환

                        // 현재 시간 계산 (util.today() 안전성 검사)
                        let now, fiveMinutesAgo;
                        try {
                            now = util.today();
                            fiveMinutesAgo = now - (5 * 60 * 1000);

                            if (isNaN(now) || isNaN(fiveMinutesAgo)) {
                               console.log('시간 계산 오류');
                            }
                        } catch (timeError) {
                            console.error('[filterData] 시간 계산 중 오류:', timeError);
                            // 대체 시간 계산
                            now = Date.now();
                            fiveMinutesAgo = now - (5 * 60 * 1000);
                        }

                        // page loading scatter, response time scatter 차트인 경우
                        if (type === 'scatter') {
                            try {
                                // 5분 전까지의 데이터만 필터링
                                let filtered = data.filter(item => {
                                    try {
                                        if (!item || item.x == null) return false;
                                        const timeNum = Number(item.x);
                                        return !isNaN(timeNum) && timeNum >= fiveMinutesAgo && timeNum <= now;
                                    } catch (itemError) {
                                        console.warn('[filterData] 아이템 필터링 중 오류:', itemError, item);
                                        return false;
                                    }
                                });

                                // 필터링 후 데이터가 없을 때 안전 처리
                                if (!filtered || filtered.length === 0) {
                                    return [
                                        { logType: null, x: fiveMinutesAgo, y: 0, isDummy: true },
                                        { logType: null, x: now, y: 0, isDummy: true }
                                    ];
                                }

                                // 최소/최대 x값 구하기
                                let maxX, minX, maxfiveMinutesAgo;
                                try {
                                    const xValues = filtered.map(item => Number(item.x)).filter(x => !isNaN(x));

                                    if (xValues.length === 0) {
                                        console.log('유효한 x값이 없습니다');
                                    }

                                    maxX = Math.max(...xValues);
                                    minX = Math.min(...xValues);
                                    maxfiveMinutesAgo = maxX - (5 * 60 * 1000);

                                    if (isNaN(maxX) || isNaN(minX) || isNaN(maxfiveMinutesAgo)) {
                                        console.log('최소/최대값 계산 오류');
                                    }
                                } catch (minMaxError) {
                                    console.error('[filterData] 최소/최대값 계산 중 오류:', minMaxError);
                                    return filtered; // 원본 필터링된 데이터 반환
                                }

                                // 최소 x가 5분 전보다 크면 → 맨 앞에 5분 전 더미 추가
                                try {
                                    if (minX > fiveMinutesAgo) {
                                        filtered.unshift({
                                            logType: null,
                                            x: fiveMinutesAgo,
                                            y: 0,
                                            isDummy: true
                                        });
                                    }

                                    // maxX가 현재시간보다 과거이면, 현재시간 x값을 강제로 추가
                                    if (maxX < now) {
                                        filtered.push({
                                            logType: null,
                                            x: now,
                                            y: 0,
                                            isDummy: true
                                        });
                                    }
                                } catch (dummyError) {
                                    console.warn('[filterData] 더미 데이터 추가 중 오류:', dummyError);
                                    // 오류가 발생해도 기존 필터링된 데이터는 반환
                                }

                                return filtered
                            } catch (scatterError) {
                                console.error('[filterData] scatter 타입 처리 중 오류:', scatterError);
                                return data.slice(); // 원본 데이터 복사본 반환
                            }

                        } else if (type === 'line') {
                            try {
                                // key 기준 필터링
                                let filtered = data.filter(item => {
                                    try {
                                        if (!item) return false;
                                        const targetTime = item.key;
                                        if (targetTime == null) return false;
                                        const timeNum = Number(targetTime);
                                        return !isNaN(timeNum) && timeNum >= fiveMinutesAgo && timeNum <= now;
                                    } catch (itemError) {
                                        console.warn('[filterData] line 아이템 필터링 중 오류:', itemError, item);
                                        return false;
                                    }
                                });

                                // 필터링 후 데이터가 없을 수도 있으므로 안전 처리
                                if (!filtered || filtered.length === 0) {
                                    console.log('[filterData] line 필터링 후 데이터가 없습니다. 더미 데이터 생성');
                                    return [
                                        { key: fiveMinutesAgo, count: 0 },
                                        { key: now, count: 0 }
                                    ];
                                }

                                // 최소, 최대 key 구하기
                                try {
                                    const keyValues = filtered.map(d => Number(d.key)).filter(k => !isNaN(k));

                                    if (keyValues.length === 0) {
                                        throw new Error('유효한 key값이 없습니다');
                                    }

                                    const minKey = Math.min(...keyValues);
                                    const maxKey = Math.max(...keyValues);

                                    if (isNaN(minKey) || isNaN(maxKey)) {
                                        throw new Error('key 최소/최대값 계산 오류');
                                    }

                                    // 최소 key가 5분 전보다 크면 → 5분 전 데이터를 맨 앞에 추가
                                    if (minKey > fiveMinutesAgo) {
                                        filtered.unshift({ key: fiveMinutesAgo, count: 0 });
                                    }

                                    // 최대 key가 현재 시간보다 작으면 → 현재 시간 데이터를 맨 끝에 추가
                                    if (maxKey < now) {
                                        filtered.push({ key: now, count: 0 });
                                    }

                                } catch (keyError) {
                                    console.warn('[filterData] line key 처리 중 오류:', keyError);
                                    // 오류가 발생해도 필터링된 데이터는 반환
                                }
                                return filtered;

                            } catch (lineError) {
                                console.error('[filterData] line 타입 처리 중 오류:', lineError);
                                return data.slice(); // 원본 데이터 복사본 반환
                            }

                        } else {
                            // type이 다른 경우 원본 반환
                            return data;
                        }
                    } catch (e) {
                        console.log(e)
                    }
                }
            },
            ws: {
                initWebSocket() {
                    const {v, func} = MF0000

                    v.ws = new WebSocket('${websocket}')

                    // Websocket 이 open 된 이후부터 data 받아오도록
                    v.ws.onopen = () => {
                        func.ws.startGetData()
                    }

                    if (v.ws.readyState === WebSocket.CONNECTING) {
                        // 메시지 수신 시작
                        v.ws.onmessage = msg => {
                            if (!v.flag.frf) {
                                v.flag.frf = true
                            }
                            try {
                                func.ws.receiveData(msg.data)
                            } catch (e) {
                                console.log(e)
                            }
                        }
                    } else {
                        console.log('WebSocket is not Connected')
                    }

                    v.ws.onClose = event => {
                        if (event.wasClean) {
                            console.log('Connection Clean Close: ' + event.code)
                        } else {
                            console.log('Connection Abnormal Close: ' + event.code)
                        }
                    }

                    v.ws.onerror = error => {
                        console.error(error)
                    }
                },
                disconnect() {
                    const {v} = MF0000

                    try {
                        if (v.ws) {

                            if (v.ws.readyState === WebSocket.OPEN || v.ws.readyState === WebSocket.CONNECTING) {
                                v.ws.close(1000, 'Manual disconnect')
                                console.log('WebSocket disconnected manually')
                            }

                            // 이벤트 핸들러 정리
                            v.ws.onopen = null
                            v.ws.onmessage = null
                            v.ws.onclose = null
                            v.ws.onerror = null
                            v.ws = null
                        }
                    } catch (error) {
                        console.error('Error during WebSocket disconnect:', error)
                    }
                },
                async startGetData() {
                    const {v} = MF0000

                    const packageNm = sessionStorage.getItem('packageNm')
                    const serverType = sessionStorage.getItem('serverType')
                    const osType = sessionStorage.getItem('osType')
                    const type = 'f'

                    if (v.ws.readyState === WebSocket.OPEN) {
                        var ts = new Date().getTime() - window.debugTs

                        v.ws.send(JSON.stringify({
                            packageNm,
                            serverType,
                            osType,
                            components: [
                                {
                                    name: 'BI_INFO'
                                }, {
                                    name: 'BI_YDA_INFO'
                                }, {
                                    name: 'FEELDEX_STACK'
                                }, {
                                    name: 'PAGE_SCATTER'
                                }, {
                                    name: 'PAGE_LINE'
                                }, {
                                    name: 'NETWORK_SCATTER'
                                }, {
                                    name: 'NETWORK_LINE'
                                }, {
                                    name: 'ERROR_LINE'
                                }, {
                                    name: 'AREA_DISTRIBUTION'
                                }],
                            type
                        }))
                    } else {
                        console.log('Websocket is not opened')
                    }
                },
                receiveData(param) {
                    const {v, func} = MF0000

                    const data = JSON.parse(param)
                    const {
                        fs,
                        bi,
                        biy,
                        pageScatter,
                        networkScatter,
                        pageLine,
                        networkLine,
                        errorLine,
                        area
                    } = data

                    if (fs) {
                        try {
                            v.chart.userSession.setData(fs)
                        } catch (e) {

                        }
                    }
                    // 어제 일자 bi info 를 먼저 세팅 한다. (setBiInfo 위에 있어야 한다.)
                    if (biy) {
                        try {
                            v.chart.basicInformation.setBiInfoBaseData(biy)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    // bi info 를 어제 일자 데이터를 기반으로 그린다.
                    if (bi) {
                        try {
                            v.chart.basicInformation.setBiInfoChart(bi)
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    try {
                        const {data, avg} = pageScatter || {}

                        // 데이터가 있는 경우 기존 로직 실행 (배열만 존재해도 있다고 판단)
                        if (pageScatter?.data) {
                            v.data.pageScatter = func.cmm.filterData(data, 'scatter')
                            v.chart.pageLoading.setData(v.data.pageScatter, avg)

                            // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                            func.ensureChartSynchronization('pageLoading')
                        }
                        // 이전 pageScatter 데이터도 없고 현재 들어온 데이터도 없을 때, 시간축만 현재 -5분으로 이동하게
                        else if (!pageScatter?.data?.length && !v.data.pageScatter?.length) {
                            // 데이터가 없을 때도 차트 시간축 이동을 위한 더미 데이터 추가
                            const currentTime = new Date().getTime()
                            const futureTime = currentTime - (5 * 60 * 1000) // 현재 시간 + 5분

                            // 시간축만 유지하는 더미 데이터
                            const timeAxisData = [
                                {x: currentTime, y: 0, logType: null, isDummy: true},    // null 값으로 점이 표시되지 않음
                                {x: futureTime, y: 0, logType: null, isDummy: true}   // null 값으로 점이 표시되지 않음
                            ]

                            // 차트에 시간축만 업데이트
                            v.chart.pageLoading.setData(timeAxisData, 0)
                            func.ensureChartSynchronization('pageLoading')
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (networkScatter?.data) {
                            const {data, avg} = networkScatter
                            v.data.networkScatter = func.cmm.filterData(data, 'scatter')
                            v.chart.responseTime.setData(v.data.networkScatter, avg)

                            // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                            func.ensureChartSynchronization('responseTime')
                        }
                        // 이전 pageScatter 데이터도 없고 현재 들어온 데이터도 없을 때, 시간축만 현재 -5분으로 이동하게
                        else if (!networkScatter?.data?.length && !v.data.networkScatter?.length) {
                            // 데이터가 없을 때도 차트 시간축 이동을 위한 더미 데이터 추가
                            const currentTime = new Date().getTime()
                            const futureTime = currentTime - (5 * 60 * 1000) // 현재 시간 + 5분

                            // 시간축만 유지하는 더미 데이터
                            const timeAxisData = [
                                {x: currentTime, y: 0, logType: null, isDummy: true},    // null 값으로 점이 표시되지 않음
                                {x: futureTime, y: 0, logType: null, isDummy: true}   // null 값으로 점이 표시되지 않음
                            ]

                            // 더미 데이터로 차트 업데이트 (avg는 0으로 설정)
                            v.chart.responseTime.setData(timeAxisData, 0)

                            // 동기화 상태 확인
                            func.ensureChartSynchronization('responseTime')
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (pageLine && pageLine?.data?.length > 0) {
                            // key값 (시간)을 배열로 변환
                            if (v.data.pageLine.length === 0) {
                                const {data, total} = pageLine
                                v.data.pageLine = func.cmm.filterData(data, 'line')

                                v.chart.pageRequested.setData(v.data.pageLine, total || 0)

                                // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                                func.ensureChartSynchronization('pageRequested')
                            } else if (v.data.pageLine.length > 0) {
                                const {data, total} = pageLine

                                v.data.pageLine = func.cmm.filterData(data, 'line')
                                v.chart.pageRequested.setData(v.data.pageLine, total || 0)

                                // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                                func.ensureChartSynchronization('pageRequested')
                            }
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (networkLine && networkLine?.data?.length > 0) {
                            const isAllZero = networkLine.data.every(item => item.count === 0);

                            if (isAllZero) {
                                $('#responseTime__chartWrap #value').text('0')
                            }

                            if (v.data.networkLine.length === 0) {
                                const {data, total} = networkLine
                                v.data.networkLine = func.cmm.filterData(data, 'line')
                                v.chart.ajaxResponse.setData(v.data.networkLine, total || 0)

                                // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                                func.ensureChartSynchronization('ajaxResponse')
                            } else if (v.data.networkLine.length > 0) {
                                const {data, total} = networkLine
                                v.data.networkLine = func.cmm.filterData(data, 'line')
                                v.chart.ajaxResponse.setData(v.data.networkLine, total || 0)

                                // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                                func.ensureChartSynchronization('ajaxResponse')
                            }
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    try {
                        if (errorLine && errorLine?.data?.length > 0) {
                            const isAllZero = errorLine.data.every(item => item.count === 0);

                            if (isAllZero) {
                                $('#error__chartWrap #total').text('0')
                            }

                            if (v.data.errorLine.length === 0) {
                                const {data, total} = errorLine
                                v.data.errorLine = func.cmm.filterData(data, 'line')
                                v.chart.error.setData(v.data.errorLine, total || 0)

                                // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                                func.ensureChartSynchronization('error')
                            } else if (v.data.errorLine.length > 0) {
                                const {data, total} = errorLine

                                v.data.errorLine = func.cmm.filterData(data, 'line')
                                v.chart.error.setData(v.data.errorLine, total || 0)

                                // 데이터 업데이트 후 동기화 상태 확인 및 재활성화
                                func.ensureChartSynchronization('error')
                            }
                        }
                    } catch (e) {
                        console.log(e)
                    }

                    if (area) {
                        try {
                            v.chart.area.setData(area)
                        } catch (e) {
                            console.log(e)
                        }
                    }
                }
            },
            db: {
                async initDashboard() {
                    const {v} = MF0000
                    const chartPromises = []

                    try {
                        // 차트 툴팁 동기화 관리자 초기화
                        v.tooltipSynchronizer = new ChartTooltipSynchronizer()
                        const charts = [
                            {
                                key: 'BASIC_INFORMATION',
                                name: 'basicInformation',
                                instance: () => new MaxyFrontBasicInformationChart({
                                    id: 'basicInformationChart'
                                })
                            },
                            {
                                key: 'USER_SESSION',
                                name: 'userSession',
                                instance: () => new MaxyFrontUserSession({
                                    id: 'userSessionChart'
                                })
                            },
                            {
                                key: 'LOADING_SCATTER',
                                name: 'pageLoading',
                                instance: () => new MaxyFrontIntervalScatter({
                                    id: 'pageLoading',
                                    title: 'Page Loading',
                                    type: 'loading'
                                })
                            },
                            {
                                key: 'RESPONSE_SCATTER',
                                name: 'responseTime',
                                instance: () => new MaxyFrontIntervalScatter({
                                    id: 'responseTime',
                                    title: 'Response Time',
                                    type: 'response'
                                })
                            },
                            {
                                key: 'PAGE_REQUESTED',
                                name: 'pageRequested',
                                instance: () => new MaxyFrontPerformanceTimeLine({
                                    id: 'pageRequested',
                                    title: 'Page Requested',
                                    type: 'loading'
                                })
                            },
                            {
                                key: 'AJAX_RESPONSE',
                                name: 'ajaxResponse',
                                instance: () => new MaxyFrontPerformanceTimeLine({
                                    id: 'ajaxResponse',
                                    title: 'AJAX Response',
                                    type: 'response'
                                })
                            },
                            {
                                key: 'ERROR',
                                name: 'error',
                                instance: () => new MaxyFrontPerformanceTimeLine({
                                    id: 'error',
                                    title: 'Error',
                                    type: 'error'
                                })
                            },
                            {
                                key: 'AREA_DISTRIBUTION',
                                name: 'area',
                                instance: () => new MaxyFrontAreaDistribution({
                                    id: 'area',
                                    title: 'Regional Analysis'
                                })
                            }
                        ]

                        for (const chart of charts) {
                            const createChart = async () => {
                                let instance
                                try {
                                    // 인스턴스 생성
                                    instance = chart.instance()

                                    // 공통 초기화 처리
                                    if (instance?.init) {
                                        await instance.init()
                                    }
                                    if (instance?.addEventListener) {
                                        await instance.addEventListener()
                                    }

                                    // 대시보드 v.chart 에 저장
                                    v.chart[chart.name] = instance

                                    // 동기화 대상 차트인지 확인하고 등록
                                    if (v.tooltipSynchronizer && instance &&
                                        (instance.constructor.name === 'MaxyFrontIntervalScatter' ||
                                            instance.constructor.name === 'MaxyFrontPerformanceTimeLine')) {

                                        // 차트를 동기화 관리자에 등록
                                        const registrationSuccess = v.tooltipSynchronizer.registerChart(chart.name, instance);

                                        if (registrationSuccess) {
                                            // 차트별 동기화 기능 활성화
                                            if (typeof instance.enableTooltipSync === 'function') {
                                                instance.enableTooltipSync(v.tooltipSynchronizer);
                                            } else {
                                                console.warn(`[대시보드] 차트 ${chart.name}에 enableTooltipSync 메서드가 없습니다.`);
                                            }
                                        } else {
                                            console.error(`[대시보드] 차트 ${chart.name} 동기화 등록 실패`);
                                        }
                                    }
                                } catch (err) {
                                    console.error(`[${chart.key}] chart init error:`, err)
                                }
                            }

                            chartPromises.push(createChart())
                        }

                        // 모든 chart 초기화가 끝날 때까지 대기
                        await Promise.all(chartPromises)

                        // 차트 생성 완료 후 동기화 상태 확인 및 로깅
                        if (v.tooltipSynchronizer) {
                            const registeredCharts = v.tooltipSynchronizer.getRegisteredCharts();

                            // 동기화 대상 차트가 제대로 등록되었는지 확인
                            const expectedCharts = ['pageLoading', 'responseTime', 'pageRequested', 'ajaxResponse', 'error'];
                            const registeredIds = registeredCharts.map(chart => chart.id);
                            const missingCharts = expectedCharts.filter(id => !registeredIds.includes(id));

                            if (missingCharts.length > 0) {
                                console.warn('[대시보드] 동기화 등록되지 않은 차트:', missingCharts);

                                // 누락된 차트 재등록 시도
                                missingCharts.forEach(chartName => {
                                    const chartInstance = v.chart[chartName];
                                    if (chartInstance &&
                                        (chartInstance.constructor.name === 'MaxyFrontIntervalScatter' ||
                                            chartInstance.constructor.name === 'MaxyFrontPerformanceTimeLine')) {

                                        const retrySuccess = v.tooltipSynchronizer.registerChart(chartName, chartInstance);
                                        if (retrySuccess && typeof chartInstance.enableTooltipSync === 'function') {
                                            chartInstance.enableTooltipSync(v.tooltipSynchronizer);
                                            console.log(`[대시보드] 차트 ${chartName} 재등록 및 동기화 활성화 완료`);
                                        }
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        console.error(e)
                    }
                },
                resetDashboard() {
                    try {
                        const { v } = MF0000 || {}
                        if (!v || !v.chart) return

                        // 전역변수에 저장해둔 데이터 초기화
                        const key = ['errorLine', 'networkLine', 'networkScatter', 'pageLine', 'pageScatter']
                        for (const k of key) {
                            if (v.data[k].length > 0) {
                                v.data[k] = []
                            }
                        }

                        const {
                            chart: {
                                userSession,
                                pageLoading,
                                responseTime,
                                pageRequested,
                                ajaxResponse,
                                error,
                                area
                            } = {}
                        } = v

                        const safelyReset = (target, name) => {
                            try {
                                if (target && typeof target.reset === 'function') {
                                    target.reset()
                                }
                            } catch (err) {
                                console.warn(`[resetDashboard] ${name} reset 중 오류 발생:`, err)
                            }
                        }

                        // 각각 안전하게 reset 시도
                        safelyReset(userSession, 'userSession')
                        safelyReset(pageLoading, 'pageLoading')
                        safelyReset(responseTime, 'responseTime')
                        safelyReset(pageRequested, 'pageRequested')
                        safelyReset(ajaxResponse, 'ajaxResponse')
                        safelyReset(error, 'error')
                        safelyReset(area, 'area')

                    } catch (e) {
                        console.error('[resetDashboard] 전체 초기화 중 오류 발생:', e)
                    }
                }
            }
        }
    }

    MF0000.init.event()
    MF0000.init.created()

</script>