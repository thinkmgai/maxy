<%--suppress ELValidationInspection --%>
<%--suppress RequiredAttributes --%>
<%--suppress ELValidationInspection --%>
<%--suppress RequiredAttributes --%>
<%--suppress ELValidationInspection --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .dashboard_header {
        height: 75px;
        padding: 0 2em;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .dashboard_header .date_time {
        display: flex;
        flex-direction: column;
        gap: 0.7em;
        text-align: right;
        color: var(--color-subtitle-light);
    }

    .dark_mode .dashboard_header .date_time {
        color: white;
    }

    .dashboard_header .date_time p {
        font-size: 1.2em;
        font-weight: bold;
    }

    .dashboard_header .date_time span {
        font-size: 1.2em;
    }

    .dashboard_wrap {
        position: relative;
        width: 100%;
        height: calc(100% - 100px);
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 1.5em;
        padding: 0 2em;
    }

    .dashboard_wrap .no_app, .dashboard_wrap .error-message {
        text-align: center;
        position: absolute;
        line-height: normal;
        left: 50%;
        top: 40%;
        transform: translate(-50%, -50%);
        font-size: 1.2em;
        font-weight: bold;
        color: var(--color-subtitle-light);
    }
</style>
<%-- 통합 대시보드 --%>
<header class="dashboard_header">
    <img alt="">
    <div class="date_time">
        <p id="date"></p>
        <span id="time"></span>
    </div>
</header>

<div class="dashboard_wrap">
    <%-- 컴포넌트가 동적으로 생성되므로, 초기에는 비워둠 --%>
    <%-- 컴포넌트는 JS에서 동적으로 생성됨 --%>
</div>

<%--suppress ES6ConvertVarToLetConst, CssInvalidHtmlTagReference --%>
<script>
    var DB0200 = {
        v: {
            intervalId: null,
            timeIntervalId: null,
            apps: null,
            componentTemplate: null,
            dbTimeouts: {}
        },
        init: {
            created() {
                const { v, func } = DB0200
                $('#date').text(util.getDateToString(0))

                // 현재 시간을 설정
                func.setTime()

                // 1초마다 시간 업데이트
                v.timeIntervalId = setInterval(() => {
                    try {
                        func.setTime()
                    } catch (error) {
                        console.error('시간 업데이트 중 오류 발생:', error)
                        // 오류가 발생해도 인터벌은 계속 유지
                    }
                }, 1000)

                // 서버에서 내려온 값 안전하게 파싱
                let apps = []
                try {
                    apps = ${apps} || []
                } catch (error) {
                    console.error('앱 데이터 파싱 중 오류 발생:', error)
                    toast('앱 데이터를 불러오는 중 오류가 발생했습니다.')
                }

                if (apps && apps.length > 0) {
                    // 앱이 있다면 v.apps에 저장
                    v.apps = apps

                    // 앱이 있다면 getDashboardData 함수를 호출
                    // 컴포넌트 템플릿 불러오기
                    func.loadComponentTemplate()
                        .then(() => {
                            try {
                                func.createComponents(apps)
                                // 대시보드 데이터 가져오기
                                func.getDashboardData()
                            } catch (error) {
                                console.error('컴포넌트 생성 중 오류 발생:', error)
                                toast('대시보드 컴포넌트를 생성하는 중 오류가 발생했습니다.')
                            }
                    })
                    .catch(error => {
                        console.error('템플릿 로드 실패:', error)
                        toast('컴포넌트 템플릿을 불러오는 중 오류가 발생했습니다.')
                    })

                    // 5초마다 getDashboardData 함수를 호출하는 인터벌 설정
                    v.intervalId = setInterval(() => {
                        func.getDashboardData()
                    }, 5000)
                } else {
                    console.log('no app')
                    const noAppMsg = trl('dashboard.msg.noapp')
                    const appRegMsg = trl('dashboard.msg.appReg')
                    $('.dashboard_wrap').append('<div class="no_app"><span>' + noAppMsg + '<br>' + appRegMsg + '</span></div>')
                }
            },
            event() {

            }
        },
        func: {
            setTime() {
                try {
                    // #time 요소에 현재 시간(시:분:초) 설정
                    $('#time').text(util.nowTime())
                } catch (error) {
                    console.error('시간 설정 중 오류 발생:', error)
                    // 오류 발생 시 기본값 설정
                    $('#time').text('--:--:--')
                }
            },
            // 컴포넌트 템플릿 로드
            async loadComponentTemplate() {
                const { v } = DB0200
                try {
                    const response = await fetch('/components/db/integrated-db/integrated-db.html')

                    if (!response.ok) {
                        throw new Error(`HTTP 오류: ${response.status}`)
                    }

                    v.componentTemplate = await response.text()
                    return v.componentTemplate
                } catch (error) {
                    console.error('템플릿 로드 실패:', error)
                    // 오류 발생 시 기본 템플릿 제공
                    v.componentTemplate = '<div class="component"><div class="component_title" data-package="${packageNm}" data-server-type="${serverType}">${title}</div><div class="dv_content"><div class="dv_item"><div class="icon ${iconClass1}"></div><div class="label">${label1}</div><div class="data"><span>${value1}</span></div></div><div class="dv_item"><div class="icon ${iconClass2}"></div><div class="label">${label2}</div><div class="data"><span>${value2}</span></div></div><div class="dv_item"><div class="icon ${iconClass3}"></div><div class="label">${label3}</div><div class="data"><span>${value3}</span></div></div><div class="dv_item"><div class="icon ${iconClass4}"></div><div class="label">${label4}</div><div class="data"><span>${value4}</span></div></div></div></div>'
                    throw error
                }
            },
            // 컴포넌트 생성
            createComponents(apps) {
                const { v, func } = DB0200

                try {
                    if (!apps || !Array.isArray(apps)) {
                        throw new Error('유효하지 않은 앱 데이터')
                    }

                    const $dashboardWrap = $('.dashboard_wrap')
                    if ($dashboardWrap.length === 0) {
                        throw new Error('대시보드 래퍼 요소를 찾을 수 없음')
                    }

                    // 기존 컴포넌트 제거
                    $dashboardWrap.empty()

                    if (!v.componentTemplate) {
                        throw new Error('컴포넌트 템플릿이 로드되지 않음')
                    }

                    // 템플릿을 한 번만 컴파일
                    let template;
                    try {
                        template = Handlebars.compile(v.componentTemplate)
                    } catch (error) {
                        console.error('템플릿 컴파일 오류:', error)
                        throw new Error('템플릿 컴파일 실패')
                    }

                    // 모든 앱 데이터를 준비
                    const appsData = apps.map(app => {
                        try {
                            const appNm = getDisplayNm(app.packageNm, app.serverType) || '-'
                            const serverNm = trl('common.' + getServerNm(app.serverType)) || '-'
                            const displayNm = appNm + ' (' + serverNm + ')'

                            return {
                                title: displayNm,
                                iconClass1: 'icon_db_mau',
                                label1: 'MAU',
                                value1: '0',
                                iconClass2: 'icon_db_error',
                                label2: 'Error',
                                value2: '0',
                                iconClass3: 'icon_db_dau',
                                label3: 'DAU',
                                value3: '0',
                                iconClass4: 'icon_db_crash',
                                label4: 'Crash',
                                value4: '0',
                                packageNm: app.packageNm || '',
                                serverType: app.serverType || '0'
                            }
                        } catch (error) {
                            console.error('앱 데이터 처리 중 오류:', error)
                            // 오류 발생 시 기본 데이터 반환
                            return {
                                title: '오류',
                                iconClass1: 'icon_db_mau',
                                label1: 'MAU',
                                value1: '0',
                                iconClass2: 'icon_db_error',
                                label2: 'Error',
                                value2: '0',
                                iconClass3: 'icon_db_dau',
                                label3: 'DAU',
                                value3: '0',
                                iconClass4: 'icon_db_crash',
                                label4: 'Crash',
                                value4: '0',
                                packageNm: '',
                                serverType: '0'
                            }
                        }
                    })

                    // 템플릿에 데이터 적용하여 HTML 생성
                    let componentsHtml;

                    try {
                        componentsHtml = template({ apps: appsData })
                    } catch (error) {
                        console.error('템플릿 렌더링 오류:', error)
                        const msg = trl('dashboard.msg.createError')
                        componentsHtml = '<div class="error-message">' + msg + '</div>'
                    }

                    // 생성된 HTML을 대시보드에 추가
                    $dashboardWrap.html(componentsHtml)

                    // 컴포넌트 생성 후 이벤트 바인딩
                    try {
                        $('.dashboard_wrap .component').on('click', func.goDashboard)
                    } catch (error) {
                        console.error('이벤트 바인딩 오류:', error)
                    }
                } catch (error) {
                    const msg = trl('dashboard.msg.createError')
                    console.error('컴포넌트 생성 중 오류:', error)
                    // 오류 메시지 표시
                    $('.dashboard_wrap').append('<div class="error-message">' + msg + '</div>')
                    throw error
                }
            },
            // dashboard 데이터 조회
            getDashboardData() {
                const {v, func} = DB0200

                let apps = v.apps
                if (!apps || !Array.isArray(apps) || apps.length === 0) {
                    console.warn('유효한 앱 데이터가 없습니다.')
                    return
                }

                ajaxCall('/db/0100/getDashboardData.maxy', {
                    apps
                }, {disableCursor:true, json: true}).then(data => {
                    // 결과값으로 apps 에 해당 하는 apps, result 가 받아와 짐
                    // 결과값으로 받아온 데이터로 컴포넌트 업데이트

                    try {
                        if (data && data.result) {
                            func.updateComponents(data)
                        } else {
                            console.warn('유효한 대시보드 데이터가 없습니다.')
                        }
                    } catch (e) {
                        console.error('대시보드 데이터 처리 중 오류:', e)
                    }
                })
            },
            // 컴포넌트 데이터 업데이트
            updateComponents(data) {
                const {v} = DB0200

                // 서버에서 받아온 데이터로 각 컴포넌트의 값을 업데이트
                if (!data || !data.apps) return

                try {
                    const result = data.result
                    if (!result) return

                    // 각 앱에 대해 컴포넌트 업데이트
                    data.apps.forEach((app, index) => {
                        try {
                            // 앱 ID 또는 키 가져오기 (예: 'maxy:0', 'test:0')
                            const packageNm = app['packageNm'] || ''
                            const serverType = app['serverType'] || '0'

                            const appKey = packageNm + ':' + serverType

                            // 해당 앱의 데이터 가져오기
                            const appData = result[appKey]

                            if (appData) {
                                // 컴포넌트 선택 (인덱스 기반)
                                const $component = $('.dashboard_wrap .component').eq(index)
                                if ($component.length === 0) {
                                    console.warn(`인덱스 ${index}에 해당하는 컴포넌트를 찾을 수 없습니다.`)
                                    return
                                }

                                let {
                                    appMauCount = 0,
                                    appErrorCount = 0,
                                    appConnectCount = 0,
                                    appCrashCount = 0
                                } = appData

                                // 값이 숫자가 아닌 경우 기본값 0으로 설정
                                appMauCount = isNaN(appMauCount) ? 0 : appMauCount
                                appErrorCount = isNaN(appErrorCount) ? 0 : appErrorCount
                                appConnectCount = isNaN(appConnectCount) ? 0 : appConnectCount
                                appCrashCount = isNaN(appCrashCount) ? 0 : appCrashCount

                                // util.comma 한 번씩만 적용
                                appMauCount = util.comma(appMauCount)
                                appErrorCount = util.comma(appErrorCount)
                                appConnectCount = util.comma(appConnectCount)
                                appCrashCount = util.comma(appCrashCount)

                                // .find() 최소화 → 모든 .data 요소를 한 번에 가져오기
                                const $dataElements = $component.find('.dv_content .data > span')
                                if ($dataElements.length < 4) {
                                    console.warn('데이터 요소가 충분하지 않습니다.')
                                    return
                                }

                                // 값 업데이트 및 변경 효과 적용 함수
                                const updateWithEffect = ($element, newValue) => {
                                    try {
                                        // 이전 값 가져오기 (없으면 빈 문자열)
                                        const prevValue = $element.attr('data-prev-value') || $element.text() || '0';

                                        // 값이 변경되었고, 이전 값이 존재하면 효과 적용
                                        if (prevValue && prevValue !== newValue) {
                                            // 숫자 비교를 위해 콤마 제거
                                            const numericPrevValue = Number(prevValue.replace(/,/g, ''))
                                            const numericNewValue = Number(newValue.replace(/,/g, ''))

                                            // 변화량 계산
                                            const difference = Math.abs(numericNewValue - numericPrevValue)

                                            // 변화량에 따른 애니메이션 지속 시간 계산
                                            // 작은 변화량은 빠르게, 큰 변화량은 적절한 속도로 애니메이션
                                            let duration = 500; // 기본 최소 지속 시간 (500ms)

                                            if (difference > 0) {
                                                // 변화량이 클수록 지속 시간 증가, 최대 3000ms로 제한
                                                duration = Math.min(500 + Math.log10(difference) * 300, 3000);

                                                // 변화량이 매우 작은 경우 (10 미만) 더 빠르게 처리
                                                if (difference < 10) {
                                                    duration = 500;
                                                }
                                            }

                                            // 숫자 카운팅 애니메이션 적용
                                            $element.prop('Counter', numericPrevValue).animate({
                                                Counter: numericNewValue
                                            }, {
                                                duration: duration,
                                                easing: 'swing', // 'linear' 대신 'swing' 사용하여 더 자연스러운 효과
                                                step: function(now) {
                                                    $element.text(util.comma(Math.floor(now)))
                                                },
                                                complete: function() {
                                                    // 애니메이션 완료 후 최종 값 설정
                                                    $element.text(newValue)
                                                }
                                            });

                                            // 값이 증가했는지 확인
                                            if (numericNewValue > numericPrevValue) {
                                                // 부모 요소(.data)를 찾음
                                                const $parent = $element.parent()

                                                // 기존 up 아이콘이 있으면 제거
                                                $parent.find('.icon-count-up-container').remove()

                                                // 새로운 up 아이콘 추가
                                                const $upIcon = $('<span class="icon-count-up-container"</span>')
                                                $parent.append($upIcon)

                                                // 애니메이션 완료 후 아이콘 제거 (1.5초 후)
                                                // 고유 ID 생성 (요소 ID 또는 랜덤 ID)
                                                const timeoutId = 'icon_' + ($parent.attr('id') || Math.random().toString(36).substr(2, 9))
                                                // 애니메이션 완료 후 아이콘 제거 (1.5초 후)
                                                // 기존 타임아웃 제거 (같은 요소에 대한 타임아웃이 있을 경우)
                                                if (v.dbTimeouts[timeoutId]) {
                                                    clearTimeout(v.dbTimeouts[timeoutId])
                                                }

                                                // 새 타임아웃 설정 및 저장
                                                v.dbTimeouts[timeoutId] = setTimeout(() => {
                                                    try {
                                                        $upIcon.fadeOut(500, function() {
                                                            $(this).remove()
                                                        })
                                                    } catch (error) {
                                                        console.error('아이콘 제거 중 오류:', error)
                                                    }
                                                    // 타임아웃 완료 후 객체에서 제거
                                                    delete v.dbTimeouts[timeoutId]
                                                }, 1500)
                                            }
                                        } else {
                                            // 값이 변경되지 않았거나 이전 값이 없는 경우 그냥 텍스트 설정
                                            $element.text(newValue)
                                        }

                                        // 현재 값을 이전 값으로 저장
                                        $element.attr('data-prev-value', newValue)
                                    } catch (error) {
                                        console.error('값 업데이트 중 오류:', error)
                                        // 오류 발생 시 기본 텍스트 설정
                                        $element.text(newValue)
                                    }
                                }

                                // 각 값 업데이트 및 변경 효과 적용
                                try {
                                    // data-type 속성을 기준으로 요소 선택
                                    const $mauElement = $component.find('.data > span[data-type="mau"]')
                                    const $errorElement = $component.find('.data > span[data-type="error"]')
                                    const $dauElement = $component.find('.data > span[data-type="dau"]')
                                    const $crashElement = $component.find('.data > span[data-type="crash"]')

                                    // 각 요소에 해당하는 데이터 업데이트
                                    updateWithEffect($mauElement, appMauCount)
                                    updateWithEffect($errorElement, appErrorCount)
                                    updateWithEffect($dauElement, appConnectCount)
                                    updateWithEffect($crashElement, appCrashCount)
                                } catch (error) {
                                    console.error('데이터 요소 업데이트 중 오류:', error)
                                }
                            }
                        } catch (error) {
                            console.error(`앱 ${index} 업데이트 중 오류:`, error)
                            // 개별 앱 업데이트 실패 시 다른 앱은 계속 업데이트
                        }
                    })
                } catch (e) {
                    console.log(e)
                }
            },
            goDashboard() {
                const $target = $(this).find('.component_title')
                if ($target.length === 0) {
                    throw new Error('컴포넌트 제목 요소를 찾을 수 없습니다.')
                }

                const packageNm = $target.data('package')
                const serverType = $target.data('serverType')

                if (!packageNm) {
                    throw new Error('패키지 이름이 없습니다.')
                }

                try {
                    sessionStorage.setItem('packageNm', packageNm)
                    sessionStorage.setItem('serverType', serverType || '0')
                    sessionStorage.setItem('osType', 'A')

                    // 로그인시 최근 선택했던 패키지가 기본으로 선택되도록 쿠키에 저장
                    const maxyMode = sessionStorage.getItem('maxyMode') || 'maxy'
                    document.cookie = maxyMode + "CurrentPackage=" + sessionStorage.getItem('packageNm')
                        + ":" + sessionStorage.getItem('serverType')
                        + "; path=/; max-age=" + (60 * 60 * 24 * 30)
                } catch (storageError) {
                    console.error('세션 스토리지 저장 중 오류:', storageError)
                    // 세션 스토리지 오류 시 쿠키 사용 (대체 방법)
                    document.cookie = `packageNm=${packageNm}; path=/;`
                    document.cookie = `serverType=${serverType || '0'}; path=/;`
                }

                try {
                    ML0100.func.loadPage('DB0100')
                } catch (pageError) {
                    console.error('페이지 로드 중 오류:', pageError)
                    // 페이지 로드 실패 시 직접 이동
                    window.location.href = '/maxy/db/DB0100.maxy'
                }
            },
            stopDBInterval() {
                const {v} = DB0200

                try {
                    if (v.intervalId) {
                        clearInterval(v.intervalId)
                        v.intervalId = null
                    }
                } catch (error) {
                    console.error('데이터 갱신 인터벌 중지 중 오류:', error)
                }

                try {
                    if (v.timeIntervalId) {
                        clearInterval(v.timeIntervalId)
                        v.timeIntervalId = null
                    }
                } catch (error) {
                    console.error('시간 업데이트 인터벌 중지 중 오류:', error)
                }

                // 모든 타임아웃 정리
                try {
                    if (v.dbTimeouts) {
                        for (const id in v.dbTimeouts) {
                            if (v.dbTimeouts.hasOwnProperty(id)) {
                                clearTimeout(v.dbTimeouts[id])
                                delete v.dbTimeouts[id]
                            }
                        }
                    }
                } catch (error) {
                    console.error('타임아웃 정리 중 오류:', error)
                }
            }
        }
    }
    DB0200.init.event()
    DB0200.init.created()
</script>