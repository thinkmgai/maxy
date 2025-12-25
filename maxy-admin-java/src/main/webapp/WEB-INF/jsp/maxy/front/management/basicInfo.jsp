<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ page contentType="text/html;charset=UTF-8" %>
<style>
    .gm_contents {
        width: 100%;
        border-radius: var(--radius);
    }

    .gm_contents .gm_grid_wrap {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 1vw;
        margin-bottom: 1.6em;
    }

    .gm_grid_wrap .gm_grid {
        height: 250px;
        border: 1px solid var(--color-border-out-light);
        border-radius: var(--radius);
        padding: 0.7em 1em 0.7em 1em;
        display: grid;
        grid-template-rows: repeat(2, 1fr);
    }

    .gm_wrap .gm_text_wrap {
        display: flex;
        justify-content: space-between;
        margin-bottom: 14px;
    }

    .gm_wrap .gm_text {
        color: var(--color-subtitle-light);
        line-height: 32px;
    }

    .gm_text .gm_essential {
        margin-left: 5px;
        vertical-align: text-bottom;
    }

    .gm_grid .gm_grid_top {
        display: grid;
        grid-template-rows: 45% 55%;
    }

    .gm_grid_top .gm_grid_title {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .gm_grid_title .gm_title {
        color: var(--color-grid-title-light);
        font-weight: 500;
        font-size: 18px;
    }

    .gm_title .gm_sub_title {
        font-size: 12px;
    }

    .gm_grid_top .gm_grid_detail {
        line-height: 18px;
        word-break: keep-all;
    }

    .gm_grid_wrap .gm_grid_bottom {
        display: flex;
        justify-content: center;
    }

    .gm_title .gm_essential {
        vertical-align: bottom;
    }

    .gm_radial_wrap {
        position: relative;
    }

    .gm_radial_wrap p {
        font-size: 24px;
        font-weight: 500;
        position: absolute;
        width: 100%;
        top: 45px;
        text-align: center;
        color: #2F2F2F;
        cursor: default;
    }

    .gm_radial_wrap > .gm_radial_title {
        position: absolute;
        display: block;
        text-align: center;
        bottom: 10px;
        left: 0;
        width: 100%;
        color: #808080;
        font-size: 12px;
        cursor: default;
    }

    .gm_radial_wrap .sm-text {
        position: absolute;
        display: block;
        width: 100%;
        text-align: center;
        top: 28px;
        font-size: 14px;
        font-weight: 500;
    }

    .gm_radial_wrap .gm_radial_crash {
        color: var(--point-red)
    }

    .gm_radial_wrap .gm_radial_error {
        color: var(--yellow-2)
    }

    .gm_radial_title img {
        width: 15px;
    }

    .gm_header {
        margin-bottom: 10px;
    }

    .gm_header .gm_filter_group .app_info_wrap select:not(:last-child) {
        margin-right: 8px !important;
    }
</style>
<%-- 관리 > Basic Information --%>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <h4 class="gm_menu_title" data-t="menu.management.bi"></h4>
            <h5 class="gm_menu_desc" data-t="management.title.desc.basicInformation"></h5>
        </div>
        <div class="gm_filter_group">
            <div class="app_info_wrap">
                <label for="packageNm" class="app_icon">A</label>
                <select id="packageNm" class="app_info_select"></select>
            </div>
        </div>
    </div>

    <div class="gm_text_wrap">
        <div class="gm_text">
            <span data-t="management.title.desc.requiredField"></span>
            <img class="gm_essential" src="<c:url value="/images/maxy/icon-star-on-gold.svg"/>" alt="">
        </div>
        <div class="gm_btn_wrap">
            <button id="btnSave" class="btn_common">
                <span data-t="common.btn.save"></span>
                <img class="img_save" alt="">
            </button>
        </div>
    </div>

    <div class="gm_contents">
        <div class="gm_grid_wrap">

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title" data-t="dashboard.bi.install"></span>
                        <input id="installUseYn" type="checkbox"><label for="installUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.install"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appInstallCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title" data-t="dashboard.bi.install"></span>
                        <span class="sm-text">%</span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            <img src="<c:url value="/images/maxy/icon-ios.svg"/>" alt="">
                            <span class="gm_sub_title" data-t="common.text.share"></span>
                        </span>
                        <input id="iosuserUseYn" type="checkbox"><label for="iosuserUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.ios"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appIosConnectCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title">
                            <img src="<c:url value="/images/maxy/icon-ios.svg"/>" alt="">
                        </span>
                        <span class="sm-text">%</span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            <img src="<c:url value="/images/maxy/icon-android.svg"/>" alt="">
                            <span class="gm_sub_title" data-t="common.text.share"></span>
                        </span>
                        <input id="anduserUseYn" type="checkbox"><label for="anduserUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.android"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appAndroidConnectCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title">
                            <img src="<c:url value="/images/maxy/icon-android.svg"/>" alt="">
                        </span>
                        <span class="sm-text">%</span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            MAU
                        </span>
                        <input id="mauCountUseYn" type="checkbox"><label for="mauCountUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.mau"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appMauCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title">MAU</span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            DAU
                        </span>
                        <input id="userUseYn" type="checkbox"><label for="userUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.dau"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appConnectCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title">DAU</span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            CCU
                        </span>
                        <input id="ccuCountUseYn" type="checkbox"><label for="ccuCountUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.ccu"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appCcuCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title">CCU</span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">PV</span>
                        <input id="runUseYn" type="checkbox"><label for="runUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.pv"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appUseCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title">
                            PV
                        </span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title" data-t="dashboard.bi.reconnect"></span>
                        <input id="reconnectUseYn" type="checkbox"><label for="reconnectUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.revisit"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appReconnectCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title" data-t="dashboard.bi.reconnect"></span>
                        <span class="sm-text">%</span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title" data-t="dashboard.bi.sleep"></span>
                        <input id="sleepUseYn" type="checkbox"><label for="sleepUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.sleep"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appSleepUserCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title" data-t="dashboard.bi.sleep"></span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title" data-t="dashboard.bi.login"></span>
                        <input id="loginUseYn" type="checkbox"><label for="loginUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.login"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appLoginUserCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title" data-t="dashboard.bi.login"></span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title" data-t="dashboard.bi.staytime"></span>
                        <input id="intervaltimeUseYn" type="checkbox"><label for="intervaltimeUseYn"></label>
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.stay"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appAvgUseTime"></canvas>
                        <p></p>
                        <span class="gm_radial_title" data-t="dashboard.bi.staytime"></span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            Log <img class="gm_essential" src="<c:url value="/images/maxy/icon-star-on-gold.svg"/>"
                                     alt="">
                        </span>
                        <input id="logUseYn" type="hidden" value="Y">
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.log"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appLogCount"></canvas>
                        <p></p>
                        <span class="gm_radial_title">
                            Log
                        </span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            Error <img class="gm_essential" src="<c:url value="/images/maxy/icon-star-on-gold.svg"/>"
                                       alt="">
                        </span>
                        <input id="errorUseYn" type="hidden" value="Y">
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.error"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appErrorCount"></canvas>
                        <p class="gm_radial_error"></p>
                        <span class="gm_radial_title">
                            Error
                        </span>
                    </div>
                </div>
            </div>

            <div class="gm_grid">
                <div class="gm_grid_top">
                    <div class="gm_grid_title toggle_wrap">
                        <span class="gm_title">
                            Crash <img class="gm_essential" src="<c:url value="/images/maxy/icon-star-on-gold.svg"/>"
                                       alt="">
                        </span>
                        <input id="crashUseYn" type="hidden" value="Y">
                    </div>
                    <div class="gm_grid_detail" data-t="management.bi.crash"></div>
                </div>
                <div class="gm_grid_bottom">
                    <div class="gm_radial_wrap">
                        <canvas id="appCrashCount"></canvas>
                        <p class="gm_radial_crash"></p>
                        <span class="gm_radial_title">Crash</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM0301 = {
        v: {},
        init: {
            event() {
                // 패키지 명 select 변경 이벤트
                $('#packageNm').on('change', () => {
                    GM0301.func.getData()
                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')
                })
                // 서버 타입 select 변경 이벤트
                $('#appVer').on('change', () => {
                    GM0301.func.getData()
                })

                $('#btnSave').on('click', GM0301.func.save)
                GM0301.func.resetData()
            },
            created() {
                updateContent()
                appInfo.append({pId: 'packageNm'}).then(() => {
                    GM0301.func.getData()
                })
            }
        },
        func: {
            async save() {
                const $checkboxes = $('.gm_grid input[type="checkbox"]')
                const param = {
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type'),
                    appVer: $('#appVer').val(),
                    logUseYn: 'Y',
                    errorUseYn: 'Y',
                    crashUseYn: 'Y'
                }
                for (let i = 0; i < $checkboxes.length; i++) {
                    const $checkbox = $($checkboxes[i])
                    param[$checkbox.attr('id')] = $checkbox.prop('checked') ? 'Y' : 'N'
                }

                await ajaxCall('/gm/0301/modifyDashboardBasicConfig.maxy', param)
                    .then(data => {
                        const msg = i18next.tns('common.msg.success')
                        toast(msg)
                        GM0301.func.setData(data.basicConfig)
                    })
                    .catch(() => {
                        const msg = i18next.tns('common.msg.serverError')
                        toast(msg)
                    })
            },
            setData(data) {
                const allKeys = Object.keys(data)
                allKeys.forEach(key => {
                    const value = data[key]
                    if (value) {
                        const $el = $('#' + key)
                        if ($el.length > 0 && value === 'Y') {
                            $el.prop('checked', true)
                        } else {
                            $el.prop('checked', false)
                        }
                    }
                })
            },
            async getData() {
                const param = {
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type')
                }

                if (util.checkParam(param)) {
                    return;
                }

                await ajaxCall('/gm/0301/getDashboardBasicConfig.maxy', param)
                    .then(data => {
                        GM0301.func.setData(data.basicConfig)
                    })
                    .catch(() => {
                        const msg = i18next.tns('common.msg.serverError')
                        toast(msg)
                    })
            },
            resetData() {
                const {v, func} = GM0301
                v.base = {
                    gauge: {
                        'appInstallCount': {num: 40, text: '40'},
                        'appDeleteCount': {num: 3, text: '3'},
                        'appIosConnectCount': {num: 50, text: '50'},
                        'appAndroidConnectCount': {num: 50, text: '50'},
                        // 'appIosUserRating': {num: -1, text: '-'},
                        // 'appAndroidUserRating': {num: -1, text: '-'},
                        'appMauCount': {num: 100, text: '1K'},
                        'appCcuCount': {num: 100, text: '168'},
                        'appUseCount': {num: 100, text: '2K'},
                        'appReconnectCount': {num: 25, text: '25'},
                        'appConnectCount': {num: 100, text: '2K'},
                        'appSleepUserCount': {num: 100, text: '2K'},
                        'appLoginUserCount': {num: 100, text: '1K'},
                        'appAvgUseTime': {num: 100, text: '7m'},
                        'appLogCount': {num: 100, text: '430K'},
                        'appErrorCount': {num: 100, text: '250'},
                        'appCrashCount': {num: 13, text: '23'}
                    }
                }
                v.gauge = {}
                func.drawBiInfoChart()
            },
            drawBiInfoChart() {
                const {v, func} = GM0301
                // resetData() 이후에 작동되어야 함
                const data = v.base.gauge
                // 그래프 그리기
                const dataKeys = Object.keys(data)
                dataKeys.forEach(d => func.drawArc(d, data[d]))

                // 다크모드 변환시 그래프 새로 그리기 이벤트 추가
                $('.day_night_btn').on('click', () => {
                    dataKeys.forEach(d => func.drawArc(d, data[d]))
                })
            },
            // biInfo 그리기

            // BiInfo 차트 그리기
            drawArc(key, data) {

                // 다크모드 체크
                const isDark = $("body").hasClass("dark_mode")
                let el = key

                let {num, value, text} = data
                const canvas = document.getElementById(el)
                if (!canvas) {
                    return;
                }
                canvas.width = 100
                canvas.height = 100
                const ctx = canvas.getContext('2d')
                const radian = Math.PI / 180

                // ctx 초기화 (지우기)
                ctx.clearRect(0, 0, canvas.width, canvas.height)

                // 밑 바탕 그리기
                ctx.beginPath()
                ctx.arc(50, 50, 40, radian * 135, radian * 45, false)

                if (isDark) {
                    ctx.strokeStyle = '#313233'
                } else {
                    ctx.strokeStyle = '#ebebeb'
                }
                ctx.lineWidth = 8
                ctx.lineCap = 'round'
                ctx.stroke()
                ctx.closePath()

                //그래프 중앙 텍스트 값 삽입
                if (typeof text === 'string') {
                    if (text.indexOf('ms') > -1) {
                        text = text.split('ms')[0] + '<span class="sm-text">ms</span>'
                    }
                }

                // 게이지 내부 값
                const $text = $('#' + el).siblings('p')
                $text.html(text)

                // 값이 정상 범위 내에 있는 경우만 그림

                // p 상위의 li 에 disabled 클래스 삭제
                $text.parent().removeClass('disabled')
                //그래프의 점 그리기
                //라디안 계산
                let pct = num  // 0 - 100
                let deg = 135 // 0퍼센트 라디안

                // ios, android 는 그래프 내 점 그리지 않음
                if (key === 'appIosConnectCount'
                    || key === 'appAndroidConnectCount'
                    || key === 'appCcuCount'
                ) {
                    return
                }

                //그래프의 점 그리기
                //라디안 계산
                if (!(pct >= 0)) {
                    pct = 0
                }
                if (pct !== 0) {
                    deg = deg + (pct * 2.7)
                    if (deg > 359) {
                        deg = deg - 360
                    }
                }
                ctx.beginPath()
                // 0퍼센트(135,135), 50퍼센트(270,270), 100퍼센트(45,45)
                ctx.arc(50, 50, 40, radian * deg, radian * (deg + 1), false)
                if (isDark) {
                    ctx.strokeStyle = '#6560FF' // dark mode
                } else {
                    ctx.strokeStyle = '#7277FF'
                }
                ctx.lineWidth = 14
                ctx.lineCap = 'round'
                ctx.stroke()
                ctx.closePath()
            }
        }
    }
    GM0301.init.event()
    GM0301.init.created()
</script>