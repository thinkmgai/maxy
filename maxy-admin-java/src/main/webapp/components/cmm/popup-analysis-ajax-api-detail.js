/*
    성능분석 > AJAX 분석 > API 리스트 상세 팝업 > 슬라이드 팝업

    이 파일은 API 상세 정보를 표시하는 슬라이드 팝업을 관리합니다.
    popup-analysis-ajax-api-detail.html 파일을 로드하여 상세 정보를 표시하고,
    차트(timeChart, jenniferChart)를 초기화하고 데이터를 업데이트합니다.

    이 클래스는 MaxyPopupAnalysisAjaxApi 클래스에서 생성되어 사용됩니다.
 */

class MaxyPopupAnalysisAjaxApiDetail {
    constructor(options) {
        this.id = options.id
        this.reqUrl = options.reqUrl
        this.selectedRow = null

        if (!this.id) {
            console.log('check parameter')
            return false
        }

        this.init().then(() => {
            this.addEventListener()
        })
    }

    // HTML 템플릿을 로드하는 초기화 함수
    async init() {
        const {id} = this

        try {
            // 분리된 HTML 파일 로드
            const source = await fetch(
                '/components/cmm/popup-analysis-ajax-api-detail.html'
            ).then(response => response.text())

            const template = Handlebars.compile(source)
            const $target = $('#' + id)

            if (!($target.length > 0)) {
                throw 'can\'t find #' + id
            }

            $target.empty()
            $target.append(template({id}))

            // 차트 초기화
            await this.initCharts()

            // 다국어 텍스트 적용
            updateContent()
        } catch (e) {
            console.error('Error initializing detail view:', e)
        }
    }


    addEventListener() {
        const v = this;

        // 공통 유틸리티 사용
        // 두 차트 객체를 배열로 직접 전달
        ChartSyncUtils.setupCrosshairSync(
            [this.timeChart, this.jenniferChart], // 소스 차트 (두 차트 모두 이벤트 소스로 설정)
            () => {
                // 동기화할 차트 배열 반환
                return [this.timeChart, this.jenniferChart];
            }
        )

        // Jennifer 차트 열기 버튼 이벤트
        $('#' + this.id + ' #btnJnfOpen').on('click', function () {
            // 제니퍼 차트 영역 펼치기
            const $jenniferChartWrap = $('#' + v.id + '__jenniferChartWrap')
            $jenniferChartWrap.removeClass('collapse').addClass('expand')

            // 알람 메시지 숨기기
            $('#' + v.id + ' .jennifer_alarm_wrap').hide();
        });

        // Jennifer 차트 닫기 버튼 이벤트
        $('#' + this.id + ' #btnJnfClose').on('click', function () {
            // 제니퍼 차트 영역 접기
            const $jenniferChartWrap = $('#' + v.id + '__jenniferChartWrap')
            $jenniferChartWrap.removeClass('expand').addClass('collapse')

            // 알람 메시지는 애니메이션이 끝난 후에 보이도록 설정
            setTimeout(function () {
                $('#' + v.id + ' .jennifer_alarm_wrap').show();
            }, 300); // transition 시간과 동일하게 설정
        });
    }

    async initCharts() {
        const commonOptions = {
            boost: {
                enabled: true, // 대량 데이터 처리 시 성능 향상
                useGPUTranslations: true
            },
            plotOptions: {
                series: {
                    animation: false, // 모든 애니메이션 비활성화
                    turboThreshold: 0 // 대량 데이터 처리 최적화
                }
            },
            tooltip: {
                enabled: true,
                style: {zIndex: 99999},
                shared: false
            },
        }

        const elapsedTime = trl('common.text.elapsedTime')
        const reqWaitingTime = trl('common.text.reqWaitingTime')
        const downloadTime = trl('common.text.downloadTime')

        // time chart 생성
        this.timeChart = Highcharts.chart(this.id + '__timeChart',
            Highcharts.merge(commonOptions, {
                chart: {
                    type: 'xrange',
                    spacingRight: 20 // 오른쪽 여유 공간 확보
                },
                exporting: {
                    enabled: false
                },
                title: null,
                legend: {
                    enabled: false
                },
                xAxis: [{
                    type: 'datetime',
                    lineWidth: 0,
                    tickLength: 0,
                    labels: {enabled: false},
                    crosshair: {
                        enabled: true,
                        snap: false,
                        zIndex: 4
                    },
                    animation: false
                }],
                tooltip: {
                    headerFormat: '',
                    enabled: true,
                    formatter: function () {
                        let tooltip = `<div class="tooltip_waterfall">`
                        if (this.point) {
                            const duration = util.comma(this.point.x2 - this.point.x) + 'ms'
                            if (this.point.y === 0) {
                                tooltip += `<div>${elapsedTime}: <b>${duration}</b></div>`
                            } else if (this.point.y === 1) {
                                tooltip += `<div>${reqWaitingTime}: <b>${duration}</b></div>`
                            } else if (this.point.y === 2) {
                                tooltip += `<div>${downloadTime}: <b>${duration}</b></div>`
                            }
                            tooltip += `</div>`;
                        }
                        return tooltip;
                    }
                },
                plotOptions: {
                    series: {
                        animation: false,
                        turboThreshold: 0,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        states: {
                            inactive: {
                                enabled: false  // ✅ 흐려지는 효과 제거!
                            }
                        }
                    }
                },
                series: [
                    {
                        type: 'xrange',
                        borderRadius: 2,
                        minPointLength: 3,
                        data: []
                    }
                ]
            })
        )

        // jennifer data chart 생성
        this.jenniferChart = Highcharts.chart(this.id + '__jenniferChart',
            Highcharts.merge(commonOptions, {
                chart: {
                    type: 'xrange',
                    height: '100%',
                    spacingRight: 20 // 오른쪽 여유 공간 확보
                },
                exporting: {
                    enabled: false
                },
                title: null,
                legend: {
                    enabled: false
                },
                xAxis: [{
                    type: 'datetime',
                    lineWidth: 0,
                    tickLength: 0,
                    labels: {enabled: false},
                    crosshair: {
                        enabled: true,
                        snap: false,
                        zIndex: 4
                    },
                    animation: false
                }],
                tooltip: {
                    enabled: true,
                    formatter: function () {
                        let tooltip = `<div class="tooltip_waterfall">`
                        if (this.point) {
                            const duration = util.comma(this.point.x2 - this.point.x) + 'ms'
                            if (this.point.y === 0) {
                                tooltip += `<div>WAS: <b>${duration}</b></div>`
                            } else if (this.point.y === 1) {
                                tooltip += `<div>Network: <b>${duration}</b></div>`
                            } else if (this.point.y === 2) {
                                tooltip += `<div>SQL Fetch: <b>${duration}</b></div>`
                            } else if (this.point.y === 3) {
                                tooltip += `<div>External: <b>${duration}</b></div>`
                            }
                            tooltip += `</div>`
                        }
                        return tooltip
                    }
                },
                plotOptions: {
                    series: {
                        animation: false,
                        turboThreshold: 0,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        states: {
                            inactive: {
                                enabled: false  // ✅ 흐려지는 효과 제거!
                            }
                        }
                    }
                },
                series: [
                    {
                        type: 'xrange',
                        borderRadius: 2,
                        minPointLength: 3,
                        data: []
                    }
                ]
            })
        )
    }

    setDetailData(data) {
        const v = this
        const {
            appVer,
            timezone,
            statusCode,
            comType,
            simOperatorNm,
            logType,
            deviceModel,
            deviceId,
            osType,
            osVer,
            userId,
            userNm,
            clientNo,
            clientNm,
            birthDay,
            ip
        } = data

        const normal = trl('common.text.normal')

        if (!statusCode) { // null 또는 undefined 처리
            $('#statusTxt')
                .removeClass('success')
                .removeClass('error')
                .removeClass('exception')
                .text('No')
        } else if (statusCode.toString().startsWith('2')) {
            $('#statusTxt')
                .removeClass('success')
                .removeClass('error')
                .addClass('success')
                .text(normal + ' (' + statusCode + ')')
        } else if (statusCode.toString() === '0') {
            $('#statusTxt')
                .removeClass('success')
                .removeClass('error')
                .addClass('exception')
                .text('Exception')
        } else if (!statusCode) {
            $('#statusTxt')
                .removeClass('success')
                .removeClass('error')
                .removeClass('exception')
                .text('-')
        } else {
            $('#statusTxt')
                .removeClass('success')
                .removeClass('error')
                .addClass('error')
                .text('Error (' + statusCode + ')')
        }

        $('#pComTypeTxt').text(util.convertComType(comType))
        $('#pSimOperatorNm').text(util.simOperatorNmFormat(simOperatorNm))
        $('#ip').text(util.isEmpty(ip) ? '-' : ip)

        // logType 처리 추가
        const $logTypeNm = $('#pLogTypeNm')
        if (logType) {
            const $iconLogType = $('.icon_log_type')
            $iconLogType.removeClass('native webview')

            if ($iconLogType.hasClass('native')) {
                $iconLogType.removeClass('native')
            } else if ($iconLogType.hasClass('webview')) {
                $iconLogType.removeClass('webview')
            }

            let pageType
            if (logType) {
                pageType = util.logTypeToPageType(logType)
                $iconLogType.addClass(pageType[0])
                $logTypeNm.text(pageType[1])
            } else {
                pageType = 'Web View'
                $iconLogType.addClass('webview')
                $logTypeNm.text(pageType)
            }

            this.deviceId = deviceId

            // pDeviceName 클릭 시 deviceId 복사 기능 추가
            // 상단에 deviceId
            const $pDeviceName = $('#pDeviceName')

            $pDeviceName.off('click')
            $pDeviceName.on('click', () => {
                util.copy(deviceId)
            })

            // 수정된 코드: osType에 따라 icon_os 클래스에 android 또는 ios 클래스 추가
            $('#pDeviceName > span').text(getDeviceModel(deviceModel))

            // 앱 버전
            $('#pAppVer > span').text(appVer)

            // Se osType, osVer
            const $pOsIcon = $('#pOsVer .icon_os')
            $pOsIcon.removeClass('ios android')
            $pOsIcon.addClass( osType.toLowerCase())
            $('#pOsVer > span').text(osVer)

            $('#pComType > span').text(util.convertComType(comType))
            $('#pSimOperator > span').text(simOperatorNm ? util.simOperatorNmFormat(simOperatorNm) : '-')
            $('#pTimeZone').text(timezone)

            // 추가적인 데이터 처리가 필요한 경우 여기에 작성
            if (logType) {
                const logTypeGroup = getLogTypeGroup(logType)
                const logTypeDetail = getLogTypeDetail(logType)
                $('#errorType').text(logTypeGroup + ' / ' + logTypeDetail)
            }

            // userId 있는 경우만 툴팁 표시
            if (!util.isEmpty(userId) && userId !== '-') {
                $('#pUserId').css('display', 'flex')
                $('#pUserIdTxt').text(userId)

                const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                    ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                    ' / ' + (util.isEmpty(userId) ? '-' : userId) +
                    ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                if (v.userInfoTooltip) {
                    v.userInfoTooltip[0].setContent(userInfo)
                } else {
                    v.userInfoTooltip = tippy('#pUserId', {
                        content: userInfo,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                }
            } else if (!util.isEmpty(clientNo) && clientNo !== '-') {
                // userId가 없거나 -인데, clientNo가 있고 -가 아닌 경우
                $('#pUserId').css('display', 'flex')
                $('#pUserIdTxt').text(clientNo)

                const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                    ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                    ' / ' + (util.isEmpty(clientNo) ? '-' : clientNo) +
                    ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                if (v.userInfoTooltip) {
                    v.userInfoTooltip[0].setContent(userInfo)
                } else {
                    v.userInfoTooltip = tippy('#pUserId', {
                        content: userInfo,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip'
                    })
                }
            } else {
                $('#pUserIdTxt').text('')
                $('#pUserId').hide()
            }
        }
    }

    setData(data) {
        const {id} = this
        const {detail, dummy, jenniferObj} = data

        const {
            reqUrl,
            pageUrl,
            deviceId,
            logType,
            userId,
            resMsg,
            intervaltime,
            downloadTime,
            waitTime,
            logTm,
            responseSize,
            requestSize,
            webviewVer,
            appBuildNum,
            storageTotal,
            storageUsage,
            batteryLvl,
            memUsage,
            cpuUsage,
            jtxid,
            clientNo
        } = detail

        const packageNm = sessionStorage.getItem('packageNm')
        const serverType = sessionStorage.getItem('serverType')

        const startTime = util.timestampToDateTimeMs(logTm - intervaltime)

        const alias = convertAliasWithUrl(packageNm, serverType, reqUrl)
        const pageNm = convertAliasWithUrl(packageNm, serverType, pageUrl)

        $('#' + id + ' #apiUrl').text(alias || '-')
        $('#' + id + ' #pageUrl').text(pageNm || '-')
        $('#' + id + ' #deviceId').text(deviceId || '-')
        $('#' + id + ' #errorType').text(getLogTypeGroup(logType) || '-')

        const $userId = $('#' + id + ' #userId')
        const $label = $('#' + id + ' .detail_row:has(#userId) .title') // userId 필드의 라벨 선택

        if (!util.isEmpty(userId) && userId !== '-') {
            $userId.text(userId)
            $label.text('User ID')
        } else if (!util.isEmpty(clientNo) && clientNo !== '-') {
            $userId.text(clientNo)
            $label.text('Client No')
        } else {
            $userId.text('-');
            $label.text('User ID') // 기본값은 User ID로 설정
        }

        $userId.text(userId || '-')
        $('#' + id + ' #resMsg').text(util.convertCaToComma(resMsg, '-'))
        $('#' + id + ' #webviewVer').text(webviewVer || '-')
        $('#' + id + ' #appBuildNum').text(appBuildNum || '-')
        $('#' + id + ' #storageUsage').text(util.isEmpty(storageUsage) ? '-' : util.convertMem('mb', storageTotal) + ' (' + util.percent(storageUsage, storageTotal) + '%' + ')')
        $('#' + id + ' #pBatteryUsage').attr('data-pct', util.isEmpty(batteryLvl) ? '0' : batteryLvl)
        $('#' + id + ' #memoryUsage').text(util.isEmpty(memUsage) ? '-' : util.convertMem('kb', memUsage))
        $('#' + id + ' #pCpuUsage').attr('data-pct', util.isEmpty(cpuUsage) ? '0' : cpuUsage)

        $('#' + id + ' #intervalTime').text(util.comma(intervaltime) + 'ms' || '-')
        $('#' + id + ' #startTime').text(startTime || '-')
        $('#' + id + ' #endTime').text(util.timestampToDateTimeMs(logTm) || '-')
        $('#' + id + ' #requestSize').text(requestSize === undefined ? '-' : util.convertFileSize(requestSize))
        $('#' + id + ' #responseSize').text(responseSize === undefined ? '-' : util.convertFileSize(responseSize))

        $('#' + id + ' #duration').text(util.comma(intervaltime) + 'ms' || '-')

        // txid 있으면 세팅
        $('#' + id + '__jenniferChartWrap' + ' #txid').text(jtxid || '-')
        util.setTablePct(util.convertMem('mb', storageUsage))

        // 기존 resMsg 처리 코드 대신 함수 호출로 변경
        this.addTooltipAndCopy(id, 'resMsg', resMsg, 'resMsgCopy');
        this.addTooltipAndCopy(id, 'apiUrl', reqUrl, 'apiUrlCopy');
        this.addTooltipAndCopy(id, 'pageUrl', pageUrl, 'pageUrlCopy');

        const time = {
            intervaltime: intervaltime,
            waitTime: waitTime,
            downloadTime: downloadTime
        }

        // 더미 데이터로 xrange 차트 업데이트
        this.updateChart(time)

        let jenniferData = {}

        if (dummy && Object.keys(dummy).length > 0) {
            jenniferData = dummy
            this.updateJenniferChart(jenniferData, intervaltime, true)
        } else if (jenniferObj && Object.keys(jenniferObj).length > 0) {
            jenniferData = jenniferObj
            this.updateJenniferChart(jenniferData, intervaltime, false)
        } else {
            // dummy와 jenniferObj가 둘 다 비어있을 때 처리

            // yAxis 항목에 시간 표시를 '-'로 업데이트
            $('#' + id + '__jenniferChartWrap .yaxis:eq(0) .duration').text('-')
            $('#' + id + '__jenniferChartWrap .yaxis:eq(1) .duration').text('-')
            $('#' + id + '__jenniferChartWrap .yaxis:eq(2) .duration').text('-')
            $('#' + id + '__jenniferChartWrap .yaxis:eq(3) .duration').text('-')

            // 하이차트에 "데이터 없음" 표시를 위한 빈 객체 전달
            this.updateJenniferChart({
                responseTime: 0,
                externalcallTime: 0,
                sqlTime: 0,
                fetchTime: 0,
                noData: true  // 데이터 없음 표시를 위한 플래그
            }, intervaltime)
        }
    }

    updateChart(time) {
        try {
            // 총 시간이 없으면 기본값 설정
            const total = time.intervaltime || 0

            // 각 단계별 시간 계산 (더미 데이터)
            const waitingTime = time.waitTime || 0 // 요청 대기 시간 (30%)
            const downloadTime = time.downloadTime || 0 // 다운로드 시간 (70%)

            // 시작 시간을 0으로 설정
            const startPoint = 0

            // 각 단계별 시작 및 종료 시간 계산
            const waitingStart = startPoint
            const waitingEnd = waitingStart + waitingTime
            const downloadStart = waitingEnd
            const downloadEnd = downloadStart + downloadTime

            // 행 높이 및 차트 높이 설정
            const rowHeight = 30 // 한 줄당 높이 (px)
            const categories = ['경과 시간', '요청 대기 시간', '다운로드 시간']
            const totalHeight = Math.max(categories.length * rowHeight, 90) // 최소 높이 90px 보장

            // 차트 데이터 생성
            const chartData = [
                // 경과 시간 (전체 시간)
                {
                    x: startPoint,
                    x2: total,  // downloadEnd 대신 total 사용
                    y: 0,
                    color: total - startPoint === 0 ? 'transparent' : '#4285F499'
                },
                // 요청 대기 시간
                {
                    x: waitingStart,
                    x2: waitingEnd,
                    y: 1,
                    color: waitingEnd - waitingStart === 0 ? 'transparent' : '#FBBC0599'
                },
                // 다운로드 시간
                {
                    x: downloadStart,
                    x2: downloadEnd,
                    y: 2,
                    color: downloadEnd - downloadStart === 0 ? 'transparent' : '#34A85399'
                }
            ];

            // 차트 업데이트 옵션
            const chartUpdateOptions = {
                chart: {
                    height: totalHeight,
                    scrollablePlotArea: {
                        minHeight: totalHeight
                    }
                },
                xAxis: {
                    min: 0,
                    max: total
                },
                yAxis: {
                    reversed: true,
                    staticScale: rowHeight, // 고정 높이 설정
                    labels: {enabled: false},
                    categories: categories,
                    gridLineWidth: 1
                },
                plotOptions: {
                    series: {
                        pointWidth: rowHeight - 5, // 행 높이보다 약간 작게 설정
                        grouping: false
                    }
                },
                series: [{
                    data: chartData
                }]
            };

            // 차트 업데이트
            if (this.timeChart) {
                this.timeChart.update(chartUpdateOptions, true, false, false)
            }

            // yAxis 항목에 시간 표시 업데이트
            $('#' + this.id + ' .yaxis:eq(0) .duration').text(util.comma(total) + 'ms')
            $('#' + this.id + ' .yaxis:eq(1) .duration').text(util.comma(waitingTime) + 'ms')
            $('#' + this.id + ' .yaxis:eq(2) .duration').text(util.comma(downloadTime) + 'ms')
        } catch (e) {
            console.log(e)
        }
    }

    updateJenniferChart(data, intervaltime, isDummyYn) {
        try {
            // 데이터가 없는 경우 "데이터 없음" 메시지 표시
            if (data.noData) {
                // 차트 업데이트 옵션 - 데이터 없음 표시
                const noDataOptions = {
                    chart: {
                        height: 120,
                        scrollablePlotArea: {
                            minHeight: 120
                        }
                    },
                    series: [{
                        data: []  // 빈 데이터 배열
                    }]
                }

                // 차트 업데이트
                if (this.jenniferChart) {
                    this.jenniferChart.update(noDataOptions, true, false, false)
                }

                return  // 여기서 함수 종료
            }

            // 데이터 객체에서 필요한 값 추출
            const totalTime = intervaltime || 1000

            const jenniferResponseTime = data.responseTime || 0
            const externalTime = data.externalcallTime || 0
            const sqlTime = data.sqlTime || 0
            const fetchTime = data.fetchTime || 0

            let txid
            if (data.txid) {
                txid = data.txid
            } else if (data.jtxid) {
                txid = data.jtxid
            } else {
                txid = '-'
            }

            // jennifer.js 참고하여 계산
            const sqlFetchTime = Math.max(0, sqlTime + fetchTime)
            const networkTime = Math.max(0, totalTime - jenniferResponseTime)
            const wasTime = Math.max(0, totalTime - (networkTime + externalTime + sqlFetchTime))

            // 시작 시간을 0으로 설정
            const startPoint = 0

            // 각 단계별 시작 및 종료 시간 계산
            let currentPosition = startPoint

            // WAS 시간
            const wasStart = currentPosition
            const wasEnd = wasStart + wasTime
            currentPosition = wasEnd

            // Network 시간
            const networkStart = currentPosition
            const networkEnd = networkStart + networkTime
            currentPosition = networkEnd

            // SQL Fetch 시간
            const sqlFetchStart = currentPosition
            const sqlFetchEnd = sqlFetchStart + sqlFetchTime
            currentPosition = sqlFetchEnd

            // External 시간
            const externalStart = currentPosition
            const externalEnd = externalStart + externalTime

            // 행 높이 및 차트 높이 설정
            const rowHeight = 30 // 한 줄당 높이 (px)
            // 전체 시간 카테고리 제거
            const categories = ['WAS 시간', 'Network 시간', 'SQL Fetch 시간', 'External 시간']
            const totalHeight = Math.max(categories.length * rowHeight, 120) // 최소 높이 조정

            // 차트 데이터 생성 - 전체 시간 항목 제거
            const chartData = [
                // WAS 시간
                {
                    x: wasStart,
                    x2: wasEnd,
                    y: 0, // y 값 조정 (0부터 시작)
                    color: wasTime === 0 ? 'rgba(154, 170, 216, 0.1)' : '#9587ff99' // 0ms일 경우 투명하게 설정
                },
                // Network 시간
                {
                    x: networkStart,
                    x2: networkEnd,
                    y: 1, // y 값 조정
                    color: networkTime === 0 ? 'rgba(255, 211, 132, 0.1)' : '#4FCFA099' // 0ms일 경우 투명하게 설정
                },
                // SQL Fetch 시간
                {
                    x: sqlFetchStart,
                    x2: sqlFetchEnd,
                    y: 2, // y 값 조정
                    color: sqlFetchTime === 0 ? 'rgba(171, 133, 212, 0.1)' : '#FFD74A99' // 0ms일 경우 투명하게 설정
                },
                // External 시간
                {
                    x: externalStart,
                    x2: externalEnd,
                    y: 3, // y 값 조정
                    color: externalTime === 0 ? 'rgba(179, 207, 149, 0.1)' : '#DFDCFF99' // 0ms일 경우 투명하게 설정
                },
            ];

            // 차트 업데이트 옵션
            const chartUpdateOptions = {
                chart: {
                    height: totalHeight,
                    scrollablePlotArea: {
                        minHeight: totalHeight
                    }
                },
                xAxis: {
                    min: 0,
                    max: totalTime
                },
                yAxis: {
                    reversed: true,
                    staticScale: rowHeight, // 고정 높이 설정
                    labels: {enabled: false},
                    categories: categories,
                    gridLineWidth: 1
                },
                plotOptions: {
                    series: {
                        pointWidth: rowHeight - 5, // 행 높이보다 약간 작게 설정
                        grouping: false
                    }
                },
                series: [{
                    data: chartData
                }]
            };

            // 차트 업데이트
            if (this.jenniferChart) {
                this.jenniferChart.update(chartUpdateOptions, true, false, false)
            }

            if (isDummyYn) {
                $('#' + this.id + '__jenniferChartWrap' + ' #txid').text(txid || '-')
            }
            // yAxis 항목에 시간 표시 업데이트 - 전체 시간 항목 제거
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(0) .duration').text(util.comma(wasTime) + 'ms')
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(1) .duration').text(util.comma(networkTime) + 'ms')
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(2) .duration').text(util.comma(sqlFetchTime) + 'ms')
            $('#' + this.id + '__jenniferChartWrap' + ' .yaxis:eq(3) .duration').text(util.comma(externalTime) + 'ms')
        } catch (e) {
            console.log(e)
        }
    }

    addTooltipAndCopy(id, elementId, value, translationKey) {
        const element = $('#' + id + ' #' + elementId);
        const tippyInstance = element[0]?._tippy;

        if (value) {
            // 값이 있는 경우
            const text = trl('common.msg.' + translationKey);

            // 이미 툴팁이 존재하는지 확인
            if (!tippyInstance) {
                // 툴팁이 없는 경우에만 새로 생성
                tippy('#' + id + ' #' + elementId, {
                    content: text,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                });

                // 클릭 시 복사 기능 추가
                element.on('click', function () {
                    util.copy(this);
                });
            }
        } else {
            // 값이 없는 경우 기존 툴팁과 클릭 이벤트 제거
            if (tippyInstance) {
                tippyInstance.destroy();
            }

            // 클릭 이벤트 제거
            element.off('click');
        }
    }

    setPercentileChart(perData){
        const $percentileGaugeContainer = $('#percentileGaugeContainer')

        if (!perData || typeof perData.percent === 'undefined') {
            // 데이터가 없으면 게이지바 숨기기
            $percentileGaugeContainer.hide()
            return
        }

        const { percent, top5, top95 } = perData
        
        // 게이지바 컨테이너 보이기
        $percentileGaugeContainer.show()
        
        // 퍼센트 값으로 게이지 채우기 (0-100% 범위로 제한)
        const fillPercent = Math.max(0, Math.min(100, percent))
        $('#percentileGaugeFill').css('width', fillPercent + '%')
        $('#percentileGaugeLabel').text(fillPercent + '%')

        // 퍼센트에 따른 색상 클래스 적용
        const colorClasses = ['green', 'yellow', 'red']
        const elements = ['#percentileGaugeFill', '.percentile_gauge_wrap', '.percentile_gauge_label']

        // 모든 색상 클래스 제거
        elements.forEach(selector => {
            $(selector).removeClass(colorClasses.join(' '))
        })

        // 퍼센트에 따른 색상 결정
        let colorClass
        if (Number(fillPercent) < 33) {
            colorClass = 'green'
        } else if (Number(fillPercent) < 66) {
            colorClass = 'yellow'
        } else {
            colorClass = 'red'
        }

        // 결정된 색상 클래스 적용
        elements.forEach(selector => {
            $(selector).addClass(colorClass)
        })

        // 기존 툴팁 제거
        if ($percentileGaugeContainer[0]._tippy) $percentileGaugeContainer[0]._tippy.destroy()
        
        // 새 툴팁 추가
        const txtSection = trl('common.text.section')
        let txtApiTopPercent = trl('common.text.apiTopPercent')
        txtApiTopPercent = txtApiTopPercent.replace('{percent}', percent)
        const tooltipContent = `
            <div style="font-size: 1.2em;">5% ${txtSection}: <b>${util.comma(top5)}ms</b></div>
            <div style="font-size: 1.2em;">95% ${txtSection}: <b>${util.comma(top95)}ms</b></div>
            <div style="font-size: 1.2em;">${txtApiTopPercent}</div>
        `
        tippy('#percentileGaugeContainer', {
            content: tooltipContent,
            arrow: false,
            placement: 'bottom',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const input = popup + ' input'
        const textarea = popup + ' textarea'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        // 팝업 닫을 때 커서가 보이면 없애주도록
        util.removeMaxyCursor()

        $(input, textarea).val('')
        $(span).text('')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }
}
