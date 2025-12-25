// noinspection JSUnusedGlobalSymbols

'use strict';

const waterfall = {
    setElementStyle(target, params) {
        try {
            if (!target || !params) {
                return
            }

            for (let i = 0; i < params.length; i++) {
                if (isNaN(params[i]) || params[i] < 0) {
                    params[i] = 0
                }
            }

            let left = 0
            let width = 0

            // left는 0,1번째 데이터로 계산하고 width는 2,3번째 데이터로 계산한다
            let leftValue = isNaN((params[0] / params[1]) * 100) ? 0 : (params[0] / params[1]) * 100
            let widthValue = isNaN((params[2] / params[3]) * 100) ? 0 : (params[2] / params[3]) * 100

            // left와 width는 0보다 작으면 안되고 100보다 크면 안된다
            if (leftValue > 100) {
                left = 100
            } else if (leftValue < 0) {
                left = 0
            } else {
                left = leftValue
            }

            if (widthValue > 100) {
                width = 100
            } else if (widthValue < 0) {
                width = 0
            } else {
                width = widthValue
            }

            return target.css({
                'left': left + '%',
                'width': width + '%'
            });

        } catch (e) {
            console.log(e)
        }
    },

    setDocumentRequestEl(params) {
        if (Object.keys(params).length < 0) {
            return
        }

        const $waiting = $('<div class="navigation_waiting">')
        const $dnsLookup = $('<div class="navigation_dnslookup">')
        const $tcpConnect = $('<div class="navigation_tcpconnect">')
        const $initialRequestDelay = $('<div class="navigation_initial_request">')
        const $responseWaiting = $('<div class="navigation_response_waiting">')
        const $htmlDownload = $('<div class="navigation_html_download">')
        const $domProcessing = $('<div class="navigation_dom_processing">')
        const $domLoad = $('<div class="navigation_dom_load">')

        // 전체 데이터는 documentDuration
        // 각각 비율을 구해서 width를 정해줘야한다 !
        let dnsLookupWidth = 0
        let dnsLookupLeft = 0

        let tcpConnectWidth = 0
        let tcpConnectLeft = 0

        let initialRequestDelayWidth = 0
        let initialRequestDelayLeft = 0

        let responseWaitingTimeWidth = 0
        let responseWaitingTimeLeft = 0

        let htmlDownloadTimeWidth = 0
        let htmlDownloadTimeLeft = 0

        let domProcessingWidth = 0
        let domProcessingLeft = 0

        let domLoadWidth = 0
        let domLoadLeft = 0

        let waitingWidth = 0


        // First element starts at 0
        let currentPosition = 0;
        if (params['waiting']) {
            waitingWidth = util.percent(Math.max(0, params['waiting']), params['serverEnd']);
            currentPosition = waitingWidth
        }

        if (params['dnsLookup']) {
            dnsLookupWidth = util.percent(Math.max(0, params['dnsLookup']), params['serverEnd']);
            dnsLookupLeft = currentPosition + waitingWidth;
            currentPosition = dnsLookupLeft;
        }

        if (params['tcpConnect']) {
            tcpConnectWidth = util.percent(Math.max(0, params['tcpConnect']), params['serverEnd']);
            tcpConnectLeft = currentPosition + dnsLookupWidth;
            currentPosition = tcpConnectLeft;
        }

        if (params['initialRequestDelay']) {
            initialRequestDelayWidth = util.percent(Math.max(0, params['initialRequestDelay']), params['serverEnd']);
            initialRequestDelayLeft = currentPosition + tcpConnectWidth;
            currentPosition = initialRequestDelayLeft;
        }

        if (params['responseWaitingTime']) {
            responseWaitingTimeWidth = util.percent(Math.max(0, params['responseWaitingTime']), params['serverEnd']);
            responseWaitingTimeLeft = currentPosition + initialRequestDelayWidth;
            console.log(responseWaitingTimeLeft)
            currentPosition = responseWaitingTimeLeft;
        }

        if (params['htmlDownloadTime']) {
            htmlDownloadTimeWidth = util.percent(Math.max(0, params['htmlDownloadTime']), params['serverEnd']);
            htmlDownloadTimeLeft = currentPosition + responseWaitingTimeWidth;
            currentPosition = htmlDownloadTimeLeft;
        }

        if (params['domProcessing']) {
            domProcessingWidth = util.percent(Math.max(0, params['domProcessing']), params['serverEnd']);
            domProcessingLeft = currentPosition + htmlDownloadTimeWidth;
            currentPosition = domProcessingLeft;
        }

        if (params['domLoad']) {
            domLoadWidth = util.percent(Math.max(0, params['domLoad']), params['serverEnd']);
            domLoadLeft = currentPosition + domProcessingWidth;
        }

        $waiting.css({
            'width': waitingWidth + '%',
            'left': 0 + '%'
        })

        $dnsLookup.css({
            'width': dnsLookupWidth + '%',
            'left': dnsLookupLeft + '%'
        })

        $tcpConnect.css({
            'width': tcpConnectWidth + '%',
            'left': tcpConnectLeft + '%'
        })

        $initialRequestDelay.css({
            'width': initialRequestDelayWidth + '%',
            'left': initialRequestDelayLeft + '%'
        })

        $responseWaiting.css({
            'width': responseWaitingTimeWidth + '%',
            'left': responseWaitingTimeLeft + '%'
        })

        $htmlDownload.css({
            'width': htmlDownloadTimeWidth + '%',
            'left': htmlDownloadTimeLeft + '%'
        })

        $domProcessing.css({
            'width': domProcessingWidth + '%',
            'left': domProcessingLeft + '%'
        })

        $domLoad.css({
            'width': domLoadWidth + '%',
            'left': domLoadLeft + '%'
        })

        return {$waiting, $dnsLookup, $tcpConnect, $initialRequestDelay, $responseWaiting, $htmlDownload, $domProcessing, $domLoad}
    },
    /**
     *  water fall graph draw 함수
     *
     * @param data 그래프를 그리기 위해 필요한 데이터
     * @param types 사용자가 클릭한 waterfall graph의 tab (All, Fetch, JS, CSS 등)
     * @param $target '그래프 그려줄 대상 엘리먼트
     */
    drawWaterfallGraph(data, types, $target) {
        let pageloadStart = 0;
        let pageloadEnd = 0;
        let firstStartTime = 0;
        let netWorkStart = 0;
        let serverStart = 0;
        let serverEnd = 0;
        let domStart = 0;
        let domEnd = 0;
        let loadingStart = 0;
        let loadingEnd = 0;
        let maxStartTime = 0;
        let maxResourceTime = 0;
        let maxResponseEnd = 0;
        let requestStart = 0;
        let responseStart = 0;
        let responseEnd = 0;
        let resourceSize = 0;
        let resourceRedirectStart = 0;
        let resourceRedirectEnd = 0;
        let resourceRedirectTime = 0;
        let resourceFetchStart = 0;
        let resourceFetchEnd = 0;
        let resourceDomainLookupStart = 0;
        let resourceDomainLookupEnd = 0;
        let resourceConnectStart = 0;
        let resourceConnectEnd = 0;
        let resourceRequestStart = 0;
        let resourceRequestEnd = 0;
        let resourceResponseStart = 0;
        let resourceResponseEnd = 0;
        let documentDuration = 0;
        let processingStart = 0;
        let fidStart = 0;
        let duration = 0;
        let tcpConnect = 0;
        let responseWaitingTime = 0
        let dnsLookup = 0
        let htmlDownloadTime = 0
        let initialRequestDelay = 0
        let domProcessing = 0
        let domLoad = 0
        let loadEventEnd = 0
        let waiting = 0

        let resTimeArr = []
        let name;
        const initiatorTypeList = ["All"]
        const dataArr = []

        try {
            const graphTitleDiv = document.querySelector('.graph_title');
            const buttons = graphTitleDiv.querySelectorAll('button');

            buttons.forEach(button => {
                button.disabled = false;
                $(button).removeClass('exist')
            })

            $('.graph_content_w').remove()

            for (const x of data) {
                const {resMsg} = x

                if (!resMsg) {
                    return
                }

                try {
                    const parsedResMsg = JSON.parse(resMsg)
                    const {initiatorType, entryType} = parsedResMsg

                    console.log(parsedResMsg)
                    if (!initiatorType) {
                        continue
                    }

                    // 파싱된 startTime을 객체에 넣어줌
                    x.pageStartTime = parsedResMsg.startTime

                    if (entryType === 'resource') {
                        dataArr.push(x)

                        if (initiatorType === "css") {
                            initiatorTypeList.push("CSS")
                        } else if (initiatorType === "script") {
                            initiatorTypeList.push("JS")
                        } else if (initiatorType === "xmlhttprequest" || initiatorType === "fetch") {
                            initiatorTypeList.push("Fetch/XHR")
                        } else if (initiatorType === "image" || initiatorType === 'img') {
                            initiatorTypeList.push("IMG")
                        } else if (initiatorType === 'link') {
                            initiatorTypeList.push("LINK")
                        } else {
                            initiatorTypeList.push("Other")
                        }
                    } else {
                        // entryType이 resource 가 아니라 navigation 이 들어올 수 있는데,
                        // 그 경우에는 항목이 추가 되는것이 아니라 `Document Request` 항목의 시간 값을 설정하도록 되어 있다.
                       // console.log(entryType)
                    }

                } catch (error) {
                    console.log('resource parsing error')
                }
            }

            // 위에서 파싱해서 넣어준 startTime 값으로 리스트 정렬한다. (sort 함수 안에서 startTime 꺼내와서 재파싱 안해도 됨)
            dataArr.sort((a, b) =>
                a.pageStartTime - b.pageStartTime)

            // startTime으로 정렬 된 데이터에서 시간 값 가져오기 (maxStartTime 정상적으로 가져올 수 있음)
            for (const x of data) {
                try {
                    const parsedResMsg = JSON.parse(x.resMsg);

                    if (parsedResMsg.entryType === "navigation") {
                        // 0. 요청 전 대기시간
                        // requestStart 이전에 대기하는 시간
                        waiting = parsedResMsg.requestStart - parsedResMsg.startTime

                        // 1. DNS Lookup 시간: 첫 번째 실행
                        // DNS 조회 (Domain Lookup)
                        // 도메인 주소(example.com)를 IP 주소로 변환하는 과정
                        dnsLookup = parsedResMsg.domainLookupEnd - parsedResMsg.domainLookupStart

                        // duration보다 크면 보정
                        if (dnsLookup > parsedResMsg.duration) {
                            dnsLookup = 0
                        }

                        // 2. TCP 연결 (TCP Handshake): DNS 조회 이후 실행
                        // 서버와의 연결을 설정 (3-way handshake)

                        // domainLookupEnd과 connectStart가 같은 경우라면, DNS 이후 TCP 연결이 바로 시작된 것이므로 tcpConnect에서 DNS 시간을 빼야 함.
                        // 만약 connectStart가 domainLookupEnd보다 늦게 시작됐다면, DNS와 TCP 연결이 별도 단계로 동작한 것이라 그대로 둬야 함.
                        if (parsedResMsg.domainLookupEnd === parsedResMsg.connectStart
                            || parsedResMsg.connectEnd < parsedResMsg.requestStart) {
                            tcpConnect = 0
                        } else {
                            tcpConnect = parsedResMsg.connectEnd - parsedResMsg.connectStart
                        }


                        // 3. 서버 요청 대기 시간 (TTFB 전까지 기다리는 시간)
                        // 서버가 요청을 받아들이고 응답을 시작하기까지 걸리는 시간
                        // responseWaitingTime에는 tcpConnect와 dnsLookup 시간이 포함될 수 있으므로 중복제거 해야함!!
                        responseWaitingTime = parsedResMsg.responseStart - parsedResMsg.requestStart
                        responseWaitingTime = responseWaitingTime - (dnsLookup + tcpConnect)

                        // 4. HTML 다운로드 시간
                        // 첫 번째 바이트를 받은 이후, 전체 HTML 파일을 다운로드하는 시간
                        htmlDownloadTime = parsedResMsg.responseEnd - parsedResMsg.responseStart

                        // 5. 응답 완료 후 DOMContentLoaded 이벤트까지의 시간 (HTML 파싱 및 스크립트 실행 시간 포함, dom 생성)
                        domProcessing = parsedResMsg.domContentLoadedEventEnd - parsedResMsg.responseEnd

                        // 6. DOMContentLoaded 이후 이미지, CSS, JS 등 모든 외부 리소스가 로드될 때까지의 시간
                        domLoad = parsedResMsg.loadEventEnd - parsedResMsg.domContentLoadedEventEnd

                        //  총 Document Request 시간 = DNS 조회 + TCP 연결 + 서버 요청 대기 + TTFB + HTML 다운로드
                        documentDuration = parsedResMsg.responseEnd - parsedResMsg.requestStart;
                        netWorkStart = parsedResMsg.connectStart - parsedResMsg.startTime;
                        serverStart = parsedResMsg.requestStart;
                        // serverEnd = parsedResMsg.responseEnd - parsedResMsg.requestStart;
                        serverEnd = parsedResMsg.loadEventEnd - parsedResMsg.startTime;
                        domStart = parsedResMsg.domInteractive - parsedResMsg.startTime;
                        domEnd = parsedResMsg.domComplete - parsedResMsg.domInteractive;
                        loadingStart = parsedResMsg.loadEventStart - parsedResMsg.startTime;
                        loadingEnd = parsedResMsg.loadEventEnd - parsedResMsg.loadEventStart;
                        pageloadStart = parsedResMsg.startTime;
                        pageloadEnd = parsedResMsg.loadEventEnd - parsedResMsg.startTime;
                        responseStart = parsedResMsg.responseStart;
                        name = parsedResMsg.name;
                        responseEnd = parsedResMsg.responseEnd;
                        duration = parsedResMsg.duration;
                        maxStartTime = maxStartTime && maxStartTime < parsedResMsg.loadEventEnd ? parsedResMsg.loadEventEnd : maxStartTime;
                        loadEventEnd = parsedResMsg.loadEventEnd

                        if (waiting > serverEnd || waiting < 0) {
                            waiting = 0
                        }
                        if (dnsLookup > serverEnd || dnsLookup < 0) {
                            dnsLookup = 0
                        }
                        if (tcpConnect > serverEnd || tcpConnect < 0) {
                            serverEnd = 0
                        }
                        if (initialRequestDelay > serverEnd || initialRequestDelay < 0) {
                            initialRequestDelay = 0
                        }
                        if (responseWaitingTime > serverEnd || responseWaitingTime < 0) {
                            responseWaitingTime = 0
                        }
                        if (htmlDownloadTime > serverEnd || htmlDownloadTime < 0) {
                            htmlDownloadTime = 0
                        }
                        if (domProcessing > serverEnd || domProcessing < 0) {
                            domProcessing = 0;
                        }
                        if (domLoad > serverEnd || domLoad < 0) {
                            domLoad = 0;
                        }

                    } else if (parsedResMsg.entryType === "first-input") {
                        fidStart = parsedResMsg.startTime;
                        processingStart = parsedResMsg.processingStart;
                    }

                    if (parsedResMsg.responseEnd > maxStartTime) {
                        maxStartTime = parsedResMsg.responseEnd;
                        maxResourceTime = parsedResMsg.responseEnd;
                        maxResponseEnd = parsedResMsg.responseEnd;
                    }

                } catch (error) {
                    console.log('resource parsing error')
                }
            }

            const fidVal = processingStart - fidStart
            if (fidVal !== 0) {
                $('#setFid').text(Math.floor(fidVal).toLocaleString() + 'ms')
            } else {
                $('#setFid').text(' - ')
            }
            // maxStartTime = maxStartTime > fidStart ? maxStartTime : fidStart

            // 상단 필터 바 버튼 활성화 여부
            const initiatorArray = Array.from(new Set(initiatorTypeList));
            buttons.forEach(button => {
                const buttonText = button.textContent;

                if (!initiatorArray.includes(buttonText)) {
                    button.disabled = true;
                } else {
                    $(button).addClass('exist')
                }
            });

            // 그래프 상단 시간 간격 설정
            // const tabNum = Math.floor(((maxStartTime / 1000) / 9) * 1000) / 1000
            const tabNum = ((maxStartTime / 1000) / 10).toFixed(3)

            $('.graph_content_t').remove()
            $('.graph_content_d').remove()
            $('.graph_content').remove()
            if (data.length === 0) {
                $('#setResource').text('-')
                $('#setRenderingTime').text('-')
                $('#setFid').text('-')
                $('#requestsCount').text('0')
                $('#tabRequestCount').text('')
                for (let i = 0; i <= 10; i++) {
                    $('#' + 'tab' + i).text('')
                }
            } else {
                const $graphTime = $('.graph_time')
                // graph_time 안에 시간 탭이 없는 경우
                if ($graphTime.find('#tab0').length === 0) {
                    for (let i = 0; i <= 10; i++) {
                        $graphTime.append('<span id="tab' + i + '"></span>')
                    }
                }
                for (let i = 1; i <= 10; i++) {
                    $('#tab0').text('0s');
                    let tabNumber = Math.floor(((tabNum * i * 1000) / 1000) * 1000)

                    if (tabNumber > 10000) {
                        $('#' + 'tab' + i).text(tabNumber / 1000 + 's')
                    } else {
                        $('#' + 'tab' + i).text(tabNumber.toLocaleString() + 'ms')
                    }
                    // $('#' + 'tab' + i).text(((tabNum * i * 1000) / 1000).toFixed(1) + 's')
                }
                const $graphtimeWrap = $('.graph_time_wrap');
                const $graphPageLoad = $('.graph_page_load');
                const $graphResource = $('.graph_resource');
                const $pageLoadDiv = $('<div class="graph_content">')
                const $pageLoadContent = $('<span>', {
                    'text': 'Loading Time'
                })
                const $pageDiv = $('<div class="waterfall_graph">')
                const $pageGraph = $('<div class="redirect">')
                const $titleDataDiv = $('<div class="graph_content_d">')
                const $titleContent = $('<span>', {
                    'class': 'title_data',
                    'text': 'Document Request'
                })
                const $titleGraph = $('<div class="waterfall_graph">')
                const $titleGraphEl = $('<div class="waterfall_el">')

                const params = {
                    'waiting': waiting,
                    'dnsLookup': dnsLookup,
                    'tcpConnect': tcpConnect,
                    'initialRequestDelay': initialRequestDelay,
                    'responseWaitingTime': responseWaitingTime,
                    'htmlDownloadTime': htmlDownloadTime,
                    'domProcessing' : domProcessing,
                    'domLoad' : domLoad,
                    'serverEnd': serverEnd
                }
                // Document Request width, left 정해줘야함
                const documentRequestEl = waterfall.setDocumentRequestEl(params)
                $titleGraphEl.append(documentRequestEl.$waiting)
                $titleGraphEl.append(documentRequestEl.$dnsLookup)
                $titleGraphEl.append(documentRequestEl.$tcpConnect)
                $titleGraphEl.append(documentRequestEl.$initialRequestDelay)
                $titleGraphEl.append(documentRequestEl.$responseWaiting)
                $titleGraphEl.append(documentRequestEl.$htmlDownload)
                $titleGraphEl.append(documentRequestEl.$domProcessing)
                $titleGraphEl.append(documentRequestEl.$domLoad)

                const $documentLoading = $('<div class="document_loading">')
                const $resourceGraph = $('<div class="waterfall_graph">')
                const $resourceGraphColor = $('<div class="waterfall_el">')
                const $resourceDiv = $('<div class="graph_content_t">')
                const $resourceContent = $('<span>', {
                    'class': 'title_data',
                    'text': 'Resource'
                })

                // documentServer에 밑에거처럼 append 해야함
                // 1. dns lookup    2. tcp 연결   3. 요청 대기시간  4. 콘텐츠 다운로드 5. DOM 로드완료 6. 전체 페이지 로드완료

                $graphPageLoad.append($pageLoadDiv)
                $pageLoadDiv.append($pageLoadContent)
                $pageLoadDiv.append($pageDiv)
                $pageDiv.append($pageGraph)
                $titleDataDiv.append($titleContent)
                $titleDataDiv.append($titleGraph)
                $titleGraph.append($titleGraphEl)
                $graphPageLoad.append($titleDataDiv)
                $resourceDiv.append($resourceContent)
                $resourceDiv.append($resourceGraph)
                $resourceGraph.append($resourceGraphColor)
                $graphtimeWrap.append($resourceDiv)

                // 스크롤 가장 상단으로 이동
                $('.graph_content_wrap.enable_scrollbar').scrollTop(0)

                const resourceWidth = Number(maxResponseEnd - firstStartTime)

                tippy($pageDiv[0], {
                    content: Math.round(Number(pageloadEnd - pageloadStart)).toLocaleString() + 'ms',
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip',
                    followCursor: true
                })

                if (Number(pageloadEnd - pageloadStart) !== 0) {
                    const pageLoad = util.convertTime(Number(pageloadEnd - pageloadStart), false, true)
                    $('#setRenderingTime').text(pageLoad)
                } else {
                    $('#setRenderingTime').text('-')
                }

                // 각 그래프의 left, width 속성 지정
                waterfall.setElementStyle($pageDiv, [pageloadStart, maxStartTime, pageloadEnd, maxStartTime])
                waterfall.setElementStyle($titleGraphEl, [serverStart, maxStartTime, serverEnd, maxStartTime])
                console.log(serverStart, maxStartTime, serverEnd)
                waterfall.setElementStyle($documentLoading, [loadingStart, documentDuration, loadingEnd, documentDuration])

                const serverTooltip = {
                    'waitingTime': waiting,
                    'dnsLookup': dnsLookup,
                    'tcpConnect': tcpConnect,
                    'initialRequestDelay': initialRequestDelay,
                    'responseWaitingTime': responseWaitingTime,
                    'htmlDownloadTime': htmlDownloadTime,
                    'responseStart': responseStart,
                    'requestStart': serverStart,
                    'responseEnd': responseEnd,
                    'duration': serverEnd,
                    'domProcessing': domProcessing,
                    'domLoad': domLoad,
                    'loadEventEnd': loadEventEnd,
                    'name': name
                }

                const tooltipMap = waterfall.makeWaterfallTooltip(serverTooltip, "document")

                tippy($titleGraphEl[0], {
                    content: tooltipMap.tooltipText,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-resource-tooltip'
                })

                for (const x of dataArr) {
                    if (x.resMsg !== '') {
                        try {
                            const parsedResMsg = JSON.parse(x.resMsg);
                            if ((types.includes(parsedResMsg.initiatorType) || types === 'All')
                                && parsedResMsg.entryType !== "navigation") {
                                resTimeArr.push(parsedResMsg.startTime)
                                let startNumPercentage = (parsedResMsg.startTime / maxStartTime) * 100;
                                const $graphContentW = $('<div class="graph_content_w">')
                                let image;
                                if (parsedResMsg.initiatorType === "img") {
                                    image = '<i class="waterfall_type_img">'
                                } else if (parsedResMsg.initiatorType === "script") {
                                    image = '<i class="waterfall_type_script">'
                                } else if (parsedResMsg.initiatorType === "xmlhttprequest"
                                    || parsedResMsg.initiatorType === "fetch") {
                                    image = '<i class="waterfall_type_fetch">'
                                } else if (parsedResMsg.initiatorType === "css") {
                                    image = '<i class="waterfall_type_css">'
                                } else if (parsedResMsg.initiatorType === "link") {
                                    image = '<i class="waterfall_type_link">'
                                } else {
                                    image = '<i class="waterfall_type_other">'
                                }
                                const $contentWrap = $('<div>', {
                                    'class': 'content_wrap'
                                })

                                const resourceFileName = waterfall.extractFileName(parsedResMsg.name)
                                const $contentData = $('<span>', {
                                    'class': 'content_data',
                                    'text': resourceFileName
                                })

                                const $divWrap = $('<div>', {
                                    'class': 'waterfall_graph',
                                    'id': parsedResMsg.name
                                })

                                const $elWrap = $('<div class="waterfall_el">')
                                const $resourceRedirect = $('<div class="resource_redirect">')
                                const $resourceFetch = $('<div class="resource_fetch">')
                                const $resourceDomain = $('<div class="resource_domain">')
                                const $resourceConnect = $('<div class="resource_connect">')
                                const $resourceRequest = $('<div class="resource_request">')
                                const $resourceResponse = $('<div class="resource_response">')
                                const {
                                    duration,
                                    redirectStart,
                                    redirectEnd,
                                    requestStart,
                                    fetchStart,
                                    startTime,
                                    domainLookupStart,
                                    domainLookupEnd,
                                    connectStart,
                                    connectEnd,
                                    responseStart,
                                    responseEnd,
                                    transferSize
                                } = parsedResMsg
                                // let pct = (Math.floor(Number(parsedResMsg.duration)) / maxStartTime) * 100;
                                let pctValue = ((Number(duration / maxStartTime) * 100).toFixed(1))
                                let pct = pctValue === "0.0" ? 1 : pctValue;
                                resourceSize = duration

                                resourceRedirectStart = redirectStart - startTime
                                resourceRedirectEnd = redirectEnd - redirectStart

                                resourceFetchStart = fetchStart - startTime
                                resourceFetchEnd = domainLookupStart - fetchStart

                                resourceDomainLookupStart = domainLookupStart - startTime
                                resourceDomainLookupEnd = domainLookupEnd - domainLookupStart

                                resourceConnectStart = connectStart - startTime
                                resourceConnectEnd = connectEnd - connectStart

                                resourceRequestStart = requestStart - startTime
                                resourceRequestEnd = responseStart - requestStart

                                if (transferSize === 0) {
                                    resourceResponseStart = fetchStart - startTime
                                    resourceResponseEnd = responseEnd - fetchStart
                                } else {
                                    resourceResponseStart = responseStart - startTime
                                    resourceResponseEnd = responseEnd - responseStart
                                }

                                if (isNaN(startNumPercentage) || startNumPercentage < 0) {
                                    startNumPercentage = 0
                                } else if (startNumPercentage > 100) {
                                    startNumPercentage = 100
                                }

                                if (isNaN(pct) || pct < 1) {
                                    pct = 1
                                } else if (pct > 100) {
                                    pct = 100
                                }

                                $elWrap.css({
                                    'left': startNumPercentage + '%',
                                    'width': pct + '%'
                                })

                                waterfall.setElementStyle($resourceRedirect, [resourceRedirectStart, duration, resourceRedirectTime, resourceRedirectTime])
                                waterfall.setElementStyle($resourceFetch, [resourceFetchStart, duration, resourceFetchEnd, duration])
                                waterfall.setElementStyle($resourceDomain, [resourceDomainLookupStart, duration, resourceDomainLookupEnd, duration])
                                waterfall.setElementStyle($resourceConnect, [resourceConnectStart, duration, resourceConnectEnd, duration])
                                waterfall.setElementStyle($resourceRequest, [resourceRequestStart, duration, resourceRequestEnd, duration])
                                waterfall.setElementStyle($resourceResponse, [resourceResponseStart, duration, resourceResponseEnd, duration])

                                $divWrap.append($elWrap)
                                if (transferSize === 0) {
                                    $elWrap.append($resourceResponse)
                                } else {
                                    $elWrap.append($resourceRedirect)
                                    $elWrap.append($resourceFetch)
                                    $elWrap.append($resourceDomain)
                                    $elWrap.append($resourceConnect)
                                    $elWrap.append($resourceRequest)
                                    $elWrap.append($resourceResponse)
                                }

                                const tooltipMap = waterfall.makeWaterfallTooltip(parsedResMsg, "resource")

                                tippy($elWrap[0], {
                                    content: tooltipMap.tooltipText,
                                    arrow: false,
                                    placement: 'bottom',
                                    allowHTML: true,
                                    theme: 'maxy-resource-tooltip'
                                })

                                tippy($contentData[0], {
                                    content: parsedResMsg.name,
                                    arrow: false,
                                    placement: 'bottom',
                                    allowHTML: true,
                                    theme: 'maxy-tooltip'
                                })

                                $contentWrap.prepend(image)
                                $contentWrap.append($contentData)
                                $graphContentW.append($contentWrap);
                                $graphContentW.append($divWrap);
                                $graphResource.append($graphContentW);
                            } else {

                            }
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                        }
                    }
                }

                if (resTimeArr.length === 0) {
                    resTimeArr.push(0)
                }

                // 첫번째 데이터가 파싱 에러난 경우 resTimeArr의 0번째 index 값은 undefined, 이런 경우엔 1번 인덱스의 값을 가져다 쓰도록 함
                let resourceExecutionTime;
                if (!isNaN(resTimeArr[0])) {
                    resourceExecutionTime = Number(maxResponseEnd - resTimeArr[0]);
                } else if (!isNaN(resTimeArr[1])) {
                    resourceExecutionTime = Number(maxResponseEnd - resTimeArr[1]);
                } else {
                    resourceExecutionTime = maxResponseEnd;
                }

                // const resourceExecutionTime = !(isNaN(resTimeArr[0])) ? Number(maxResponseEnd - resTimeArr[0]) : Number(maxResponseEnd - resTimeArr[1])
                const resourceExecutionTimeToMs = Math.round(resourceExecutionTime).toLocaleString() + 'ms'

                tippy($resourceDiv[0], {
                    content: resourceExecutionTimeToMs,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip',
                    followCursor: true
                })

                if (resourceExecutionTime !== 0) {
                    const resourceTime = util.convertTime(resourceExecutionTime, false, true)
                    $('#setResource').text(resourceTime)
                } else {
                    $('#setResource').text('-')
                }

                // $resourceGraphColor.css({
                //     'left': (resTimeArr[0] / maxStartTime) * 100 + '%',
                //     'width': ((resourceWidth - resTimeArr[0]) / maxStartTime) * 100 + '%'
                // })

                let resourceStartTime;
                if (!isNaN(resTimeArr[0])) {
                    resourceStartTime = resTimeArr[0]
                } else if (!isNaN(resTimeArr[1])) {
                    resourceStartTime = resTimeArr[1]
                } else {
                    resourceStartTime = 0;
                }

                waterfall.setElementStyle($resourceGraphColor, [resourceStartTime, maxStartTime, (resourceWidth - resourceStartTime), maxStartTime])

                let allLength
                if (types === 'All') {
                    allLength = $('.graph_resource .graph_content_w').length
                    $('#requestsCount').text(allLength)
                    $('#tabRequestsCount').text('')
                } else {
                    const resourceLength = $('.graph_resource .graph_content_w').length
                    $('#tabRequestsCount').text(resourceLength + ' /')
                }
            }
        } catch (e) {
            // Unterminated string in JSON at position 996 (line 1 column 997) at JSON.parse (<anonymous>) error 일 경우가 대부분임
            console.log(e)
            // 에러날 시 버튼 모두 disable 처리
            const graphTitleDiv = document.querySelector('.graph_title')
            const buttons = graphTitleDiv.querySelectorAll('button')

            buttons.forEach(button => {
                button.disabled = true
            })

            // no_data 없을 시 추가해주고 그래프 모두 비워주기
            if (!$target.hasClass('no_data')) {
                $target.find('.graph_time').empty()
                $target.find('.graph_page_load').empty()
                $target.find('.graph_content').remove()
                $target.find('.graph_content_t').remove()
                $target.find('.graph_content_d').remove()
                $target.find('.graph_content_w').remove()
                $target.addClass('no_data')
            }
            // 상단에 시간 모두 - 처리
            $target.find('#setRenderingTime').text('-')
            $target.find('#setFid').text('-')
            $target.find('#setResource').text('-')
            $target.find('#requestsCount').text('0')
            $target.find('#tabRequestCount').text('')
        }
    },
    makeWaterfallTooltip(node, type) {
        let dataArr = []
        let waiting, redirect, fetch, domain, connect, request, response = 0;
        let {
            connectEnd,
            connectStart,
            domainLookupEnd,
            domainLookupStart,
            fetchStart,
            name,
            redirectEnd,
            redirectStart,
            requestStart,
            responseEnd,
            responseStart,
            startTime,
            processingStart,
            transferSize,
            duration,
            dnsLookup,
            tcpConnect,
            initialRequestDelay,
            responseWaitingTime,
            htmlDownloadTime,
            domLoad,
            domProcessing,
            loadEventEnd,
            waitingTime
        } = node

        let title = ''
        if (transferSize === 0) {
            title = 'Content download'
        } else {
            title = 'Response'
        }

        /*
            type이 document인 경우 (navigation인 경우임) 는
            소요시간이 loadEventEnd - requestStart이다.
        */
        if (type === "document") {
            duration = loadEventEnd - requestStart
            startTime = requestStart
            waiting = waitingTime
        } else {
            loadEventEnd = responseEnd
            waiting = processingStart ? checkNaN(processingStart - startTime) : checkNaN(requestStart - startTime)

        }

        redirect = checkNaN(redirectEnd - redirectStart)
        fetch = checkNaN(domainLookupStart - fetchStart)
        domain = checkNaN(domainLookupEnd - domainLookupStart)
        connect = checkNaN(connectEnd - connectStart)
        request = checkNaN(responseStart - requestStart)
        response = checkNaN(responseEnd - responseStart)
        dataArr.push(checkNaN(waiting))
        dataArr.push(checkNaN(redirect))
        dataArr.push(checkNaN(fetch))
        dataArr.push(checkNaN(domain))
        dataArr.push(checkNaN(connect))
        dataArr.push(checkNaN(request))
        dataArr.push(checkNaN(response))

        let maxData = Math.max(...dataArr)

        const itemId = 'page' + name
        let tooltipText = ''

        const startTitle = trl('common.text.start')
        const endTitle = trl('common.text.end')
        const stayTitle = trl('common.text.duration')

        tooltipText +=
            '<div class="maxy_tooltip_header">'
            + '<div>'
        if (transferSize === 0) {
            tooltipText += '<div class="sub_title cache">Cache</div>'
        }
        tooltipText += '<div class="sub_title request">Requested</div>'
            + '<div class="content_title">' + name + '</div>'
            + '</div>'
            + '</div>'

        tooltipText +=
            '<div class="maxy_tooltip_sub_header">'
            + '<div>'
            + '<div class="sub_title"><span>' + startTitle + '</span>: ' + parseFloat(startTime.toFixed(2)).toLocaleString() + 'ms</div>'
            + '</div>'
            + '<div>'
            + '<div class="sub_title"><span>' + endTitle + '</span>: ' + parseFloat(loadEventEnd.toFixed(2)).toLocaleString() + 'ms</div>'
            + '</div>'
            + '<div>'
            + '<div class="sub_title"><span>' + stayTitle + '</span>: ' + parseFloat(duration.toFixed(2)).toLocaleString() + 'ms</div>'
            + '</div>'
            + '</div>'

        tooltipText += '<div class="maxy_tooltip_content_wrap">'
        tooltipText += '<div class="maxy_tooltip_content">'
        if (type === "resource") {
            if (transferSize === 0) {
                let widthStyle = ((responseEnd - fetchStart) === 0) ? "width:0%" : "width:100%";
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Content download</span>' + '</div>'
                tooltipText += '</div>'
                tooltipText += '<div class="maxy_tooltip_graph_content">'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="' + widthStyle + '" class="waterfall_response"></div></div>';
                tooltipText += '</div>'
                tooltipText += '<div class="maxy_tooltip_time_content">'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + parseFloat((responseEnd - fetchStart).toFixed(2)) + 'ms</div>'
            } else {
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Waiting</span>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Redirect</span>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Fetch</span>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Domain Lookup</span>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Connect</span>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Request Sent</span>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">' + title + '</span>' + '</div>'
                tooltipText += '</div>'
                tooltipText += '<div class="maxy_tooltip_graph_content">'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(waiting / maxData) * 100 + '%' + '" class="waterfall_waiting" id="waterfallWaiting"></div>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(redirect / maxData) * 100 + '%' + '" class="waterfall_redirect"></div>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(fetch / maxData) * 100 + '%' + '" class="waterfall_fetch"></div>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(domain / maxData) * 100 + '%' + '" class="waterfall_domain"></div>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(connect / maxData) * 100 + '%' + '" class="waterfall_connect"></div>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(request / maxData) * 100 + '%' + '" class="waterfall_request"></div>' + '</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(response / maxData) * 100 + '%' + '" class="waterfall_response"></div>' + '</div>'
                tooltipText += '</div>'
                tooltipText += '<div class="maxy_tooltip_time_content">'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + waiting.toLocaleString() + 'ms</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + redirect.toLocaleString() + 'ms</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + fetch.toLocaleString() + 'ms</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + domain.toLocaleString() + 'ms</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + connect.toLocaleString() + 'ms</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + request.toLocaleString() + 'ms</div>'
                tooltipText += '<div class="maxy_waterfall_tooltip">' + response.toLocaleString() + 'ms</div>'
            }

        } else if (type === "document") {
            console.log(waiting, duration)
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Waiting</span>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">DNS Lookup</span>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">TCP Connect</span>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Request Delay</span>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Response Waiting</span>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Html Download</span>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Dom Processing</span>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><span class="maxy_tooltip_content_title">Dom Load</span>' + '</div>'
            tooltipText += '</div>'
            tooltipText += '<div class="maxy_tooltip_graph_content">'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(waiting / duration) * 100 + '%' + '" class="waterfall_waiting" id=""></div>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(dnsLookup / duration) * 100 + '%' + '" class="waterfall_dnslookup" id=""></div>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(tcpConnect / duration) * 100 + '%' + '" class="waterfall_tcpconnect" id=""></div>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(initialRequestDelay / duration) * 100 + '%' + '" class="waterfall_requestdelay" id=""></div>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(responseWaitingTime / duration) * 100 + '%' + '" class="waterfall_responsewaiting" id=""></div>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(htmlDownloadTime / duration) * 100 + '%' + '" class="waterfall_htmldownload" id=""></div>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(domProcessing / duration) * 100 + '%' + '" class="waterfall_domprocessing" id=""></div>' + '</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip"><div style="width: ' + checkNaN(domLoad / duration) * 100 + '%' + '" class="waterfall_domload" id=""></div>' + '</div>'
            tooltipText += '</div>'
            tooltipText += '<div class="maxy_tooltip_time_content">'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + waiting.toLocaleString() + 'ms</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + dnsLookup.toLocaleString() + 'ms</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + tcpConnect.toLocaleString() + 'ms</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + initialRequestDelay.toLocaleString() + 'ms</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + responseWaitingTime.toLocaleString() + 'ms</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + htmlDownloadTime.toLocaleString() + 'ms</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + domProcessing.toLocaleString() + 'ms</div>'
            tooltipText += '<div class="maxy_waterfall_tooltip">' + domLoad.toLocaleString() + 'ms</div>'
        }

        return {tooltipText, itemId}
    },
    extractFileName(url) {
        const base = url.split('?')[0]
        return base.substring(base.lastIndexOf('/') + 1) + (url.includes('?') ? '?' + url.split('?')[1] : '')
    }
}