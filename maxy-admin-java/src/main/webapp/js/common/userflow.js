$(function () {
    // Group By 버튼 클릭 시 그래프 내 flowOrder 가 checkbox로 바뀌고 선택한 flow의 로딩시간, 응답시간, 체류시간 합계 보여주기
    $(document).on('click', '#maxyUserFlowWrap .btn_userflow_group_by', function (event) {
        try {
            // 어떤 버튼을 클릭했는지 알기 위함 (group by || sum || cancel)
            const id = event.target.id
            // 몇 번째 flow의 버튼을 클릭했는지 알기 위함 (index)
            let idx = id.split('__')[1]

            const $target =  $('#pageWrap_' + idx).find('.content_idx')
            // group by 버튼 클릭 시
            if (!id.includes('Cancel') && !id.includes('Sum')) {
                // 이미 선택되어있으면 (flowOrder가 checkbox로 바뀐 상태라면)
                if ($(this).hasClass('hidden')) {
                    // group by 버튼에서 hidden class remove
                    $(this).removeClass('hidden')

                    $target.each(function (index, item) {
                        // 팝업 열리도록
                        $(this).parent().parent('.page').on('click', userflow.openPopup)
                        // flow order 보이도록
                        $(item).show()
                        // 체크박스 지움
                        $(this).parent().find('input[type="checkbox"], label').remove()
                    })
                } else {
                    // group by 버튼 숨기기
                    $(this).addClass('hidden')
                    // 로딩, 응답, 체류시간 보여주는 우측 폼 보여주기
                    $('#groupBySumWrap__' + idx).removeClass('hidden')
                    // Sum 및 Cancel 버튼 보여주기
                    $('#btnUserFlowGroupBySum__' + idx).removeClass('hidden')
                    $('#btnUserFlowGroupByCancel__' + idx).removeClass('hidden')

                    $target.each(function (index, item) {
                        $(this).parent().parent('.page').off('click')
                        $(item).hide()
                        $(this).parent().prepend('<input type="checkbox" class="check_' + idx + '" '
                            + 'id="check_' + idx + '_' + index + '">'
                            + '<label for="check_' + idx + '_' + index + '"></label>')
                    })
                }
            } else {
                // cancel 버튼 클릭 시 다시 group by 버튼 보이는 상태로 복구
                if (id.includes('Cancel')) {
                    // 로딩,응답,체류시간 초기화
                    $('#groupByLoadingTime__' + idx).text('-')
                    $('#groupByResponseTime__' + idx).text('-')
                    $('#groupByIntervalTime__' + idx).text('-')

                    // 버튼 숨기고 로딩,응답,체류시간 숨기기
                    $('#groupBySumWrap__' + idx).addClass('hidden')
                    $('#btnUserFlowGroupBySum__' + idx).addClass('hidden')
                    $('#btnUserFlowGroupByCancel__' + idx).addClass('hidden')
                    $('#btnUserFlowGroupBy__' + idx).removeClass('hidden')

                    // 클릭 시 팝업 열리도록 바꾸고 flowOrder 보이도록 바꾸고 체크박스 숨기기
                    $target.each(function (index, item) {
                        $(this).parent().parent('.page').on('click', userflow.openPopup)
                        $(item).show()
                        $(this).parent().find('input[type="checkbox"], label').remove()
                    })
                } else {
                    // sum 버튼 클릭 시 체크박스 1개이상 선택된지 검사
                    // 체크박스 추가 후 .length 확인
                    const checkedCheckboxes = $('.check_' + idx + ':checked')

                    if (checkedCheckboxes.length < 2) {
                        const msg = i18next.tns('common.msg.userflow')
                        toast(msg)
                        $('#groupByLoadingTime__' + idx).text('-')
                        $('#groupByResponseTime__' + idx).text('-')
                        $('#groupByIntervalTime__' + idx).text('-')
                        return
                    }

                    // 체크된 체크박스가 2개 이상 선택되었을 때
                    if (checkedCheckboxes.length >= 2) {
                        // checkedCheckboxes의 부모 요소들 중 두 단계 위의 부모 요소들을 선택
                        const $targetPages = checkedCheckboxes.parents('.page')

                        let totalLoadingTime = 0
                        let totalResponseTime = 0
                        let totalStayTime = 0
                        // $targetPages의 각 요소에서 data('interval-time') 값 꺼내옴
                        $targetPages.each(function (index, element) {
                            const loadingTime = $(element).data('loading-time')
                            const responseTime = $(element).data('response-time')
                            const stayTime = $(element).data('intervaltime')

                            if (!isNaN(loadingTime)) {
                                totalLoadingTime += parseInt(loadingTime, 10)
                            } else {
                                totalLoadingTime = 0
                            }

                            if (!isNaN(responseTime)) {
                                totalResponseTime += parseInt(responseTime, 10)
                            } else {
                                totalResponseTime = 0
                            }

                            if (!isNaN(stayTime)) {
                                totalStayTime += parseInt(stayTime, 10)
                            } else {
                                totalStayTime = 0
                            }
                        })

                        totalLoadingTime = util.convertTime(totalLoadingTime, true, false, false)
                        totalResponseTime = util.convertTime(totalResponseTime, true, false, false)
                        totalStayTime = util.convertTime(totalStayTime, true, false, false)

                        $('#groupByLoadingTime__' + idx).text(totalLoadingTime)
                        $('#groupByResponseTime__' + idx).text(totalResponseTime)
                        $('#groupByIntervalTime__' + idx).text(totalStayTime)
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
    })

    // 책갈피 버튼 클릭 이벤트 추가
    // 책갈피 버튼 클릭 시 해당 page 그래프가 접혀있으면 열고 열려있으면 닫기
    $(document).on(
        'click',
        '#maxyUserFlowWrap .user_behavior_analysis_wrap > .folding_btn', function () {

        const $pageWrap = $(this).siblings('.page_wrap_wrap')
        const isDisplay = $pageWrap.find('.page_content:eq(0)').css('visibility')
        const $page = $pageWrap.find('.page')
        const $pageContent = $pageWrap.find('.page_content')
        const $pageHeader = $pageWrap.find('.page_header')

        if (isDisplay === 'hidden') {
            // 열면 폴딩 버튼 이미지 변경
            $(this).addClass('unfolding_btn')
            $pageHeader.addClass('border_radius')
            $pageContent.addClass('act')
            $page.addClass('visible')
        } else {
            $(this).removeClass('unfolding_btn')
            $pageHeader.removeClass('border_radius')
            $pageContent.removeClass('act')
            $page.removeClass('visible')
            $page.addClass('hidden')
        }
    })
})

const userflow = {
    openPopup(event) {
        // 팝업에 보낼 파라미터 세팅
        const $target = $(event.currentTarget)

        const params = {
            searchFromDt: $target.data('page-start-tm'),
            searchToDt: $target.data('page-end-tm'),
            searchKey: $('#searchKey').val(),
            serverType: $('#packageNm option:checked').data('server-type'),
            packageNm: $('#packageNm').val(),
            deviceModel: $target.data('device-model'),
            searchValue: $target.data('device-id'),
            size: $target.data('event-count'),
            flowOrder: $target.data('flow-order'),
            osType: $target.data('os-type'),
            offSetIndex: 1,
            docId: $target.data('doc-id'),
            mxPageId: $target.data('mx-page-id'),
            logType: $target.data('log-type')
        }

        if (util.checkParam(params)) {
            return
        }

        const options = {
            appendId: 'maxyPopupWrap',
            id: 'userPageFlow',
            param: params,
            reqUrl: String($target.data('req-url')),
            title: String($target.data('alias-value'))
        }

        new MaxyPopupUserAnalysisWithList(options)
    },
    /**
     * user flow 차트 각 flow별 상세 툴팁 추가
     * @param {Array}  data - data 리스트
     * @param {Object} params - 특정 팝업에서 user flow 팝업으로 이동한 경우에만 존재함
     * @param {String} type - marketing insight인 경우에만 존재함 (팝업이 bounce 타입인지 reach 타입인지에 대한 여부)
     */
    addTooltip(data, params, type) {
        try {
            data.forEach((flow, i) => {
                flow.forEach((node, j) => {
                    node.index = String(i) + String(j)

                    if (params) {
                        const $pageWrap = $('.page_wrap_wrap .page_wrap').eq(j);
                        const $page = $('.page_wrap_wrap .page').eq(j);
                        const $title = $pageWrap.find('.content_title')

                        let $target = ''
                        let isBold = false;

                        // 시작점 핀 (marketing insight 팝업에서 이동한 경우에만 적용)
                        if (params.type || type) {
                            $target = $pageWrap.find('.content_title')

                            if (node.pageStartTm === params.preUrlTime) {
                                $target.append('<div class="page_location start"></div>');
                                isBold = true;
                            }

                            // 종료점(도달점 혹은 이탈점)핀 (marketing insight 팝업)
                            if (node.pageStartTm === params.pageStartTm) {
                                const locationClass = type === 'reach' ? 'page_location end' : 'page_location';
                                const arrowColor = type === 'reach' ? 'blue' : 'red';
                                $target.append(`<div class="${locationClass}"></div>`);
                                $target.closest('.page').prev('.arrow_next').addClass(arrowColor)
                                isBold = true;
                            }
                        }

                        // 로그 위치 핀 (사용자 분석 화면에서 사용)
                        else if (params.logTm && node.pageStartTm <= params.logTm && node.pageEndTm >= params.logTm) {
                            $target = $page.find('.content_idx')
                            $target.append('<div class="page_location"></div>');
                            isBold = true;
                        }

                        // 조건 중 하나라도 걸리면 bold 처리
                        if (isBold) {
                            $title.css('font-weight', 'bold');

                            // 핀 위치로 자동 스크롤 되도록
                            if (!$('.page_location.focused').length) {
                                const $lastPin = $target.find('.page_location').last();
                                $lastPin.addClass('focused'); // 한번만 스크롤 되도록 마킹

                                const $scrollContainer = $('.graph_wrap');

                                // pin의 전체 문서 기준 top - 컨테이너의 전체 문서 기준 top = 컨테이너 내부에서의 위치
                                const pinOffsetTop = $lastPin.offset().top;
                                const containerOffsetTop = $scrollContainer.offset().top;
                                const scrollTo = pinOffsetTop - containerOffsetTop + $scrollContainer.scrollTop() - 80;

                                // 핀 위치로 자동 스크롤 되도록 애니메이션 적용
                                $scrollContainer.animate({
                                    scrollTop: scrollTo
                                }, 500);
                            }
                        }
                    }

                    const tooltipMap = userflow.makeTooltipInfo(node)

                    tippy('#' + tooltipMap.itemId, {
                        content: tooltipMap.tooltipText,
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-large-tooltip'
                    })
                })
            })
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * user flow 차트 각 flow별 상세 툴팁에 값 넣어주는 함수
     * @param {node}  node - data 리스트
     */
    makeTooltipInfo(node) {
        const {func} = UA0000
        let {
            index,
            pageStartTm,
            loginYn,
            packageNm,
            serverType,
            reqUrl,
            pageEndTm,
            intervaltime,
            eventCount,
            eventIntervaltime,
            minMemUsage,
            maxMemUsage,
            minCpuUsage,
            maxCpuUsage,
            minComSensitivity,
            maxComSensitivity,
            minBatteryLvl,
            maxBatteryLvl,
            minStorageUsage,
            maxStorageUsage,
            crashCount,
            errorCount,
            requestCount,
            logType
        } = node

        const itemId = 'page' + index + '_' + pageStartTm
        if (loginYn == null || loginYn === '') {
            loginYn = 'N'
        }
        let tooltipText = ''
        let headerType = ''
        let deviceType = ''

        const text = {
            packageNm: i18next.tns('common.text.packageNm'),
            serverType: i18next.tns('common.text.serverType'),
            reqUrl: i18next.tns('common.text.requestedUrl'),
            startTime: i18next.tns('common.text.pageStartTm'),
            endTime: i18next.tns('common.text.pageEndTm'),
            loadingTime: i18next.tns('common.text.pageLoadTm'),
            eventCount: i18next.tns('common.text.eventCount'),
            eventLoadTime: i18next.tns('common.text.eventLoadTm'),
            storageCapacity: i18next.tns('common.text.storageCapacity'),
            crashCount: i18next.tns('common.text.crashCount'),
            errorCount: i18next.tns('common.text.errorCount'),
            requestCount: i18next.tns('common.text.requestCount'),
            loginYn: i18next.tns('common.text.loginYn'),
            memoryUsage: i18next.tns('common.text.memoryUsage'),
            cpuUsage: i18next.tns('common.text.cpuUsage'),
            comSensitivity: i18next.tns('common.text.comSensitivity'),
            batRemain: i18next.tns('common.text.batRemain'),
            pageFlow: i18next.tns('common.text.pageflow'),
            pageType: i18next.tns('common.text.pagetype')
        }

        const serverTypeNm = userflow.isEmpty(getServerNm(serverType)) ? '-' : i18next.tns('common.' + getServerNm(serverType))

        headerType = '<div class="sub_title">' + text.pageFlow + '</div>'
        deviceType = '<div class="content_title">' + (userflow.isEmpty(reqUrl) ? '-' : getPageList(packageNm, serverType, reqUrl)) + '</div>'

        tooltipText +=
            '<div class="maxy_tooltip_header">'
            + '<i class="icon-device-gray"></i>'
            + '<div>'
            + headerType
            + deviceType
            + '</div>'
            + '</div>'

        // 왼쪽 데이터
        tooltipText += '<div class="maxy_tooltip_content_wrap">'
        tooltipText += '<div class="maxy_tooltip_content">'
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.pageType + ': ' + '</span> <b>' +
            (userflow.isEmpty(logType) ? '-' : util.logTypeToPageType(logType)[1]) + '</b></div>'
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.startTime + ': ' + '</span> <b>' + (userflow.isEmpty(pageStartTm) ? '-' : util.timestampToDateTime(pageStartTm)) + '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.endTime + ': ' + '</span> <b>' + (userflow.isEmpty(pageEndTm) ? '-' : util.timestampToDateTime(pageEndTm)) + '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.loadingTime + ': ' + '</span> <b>' + (userflow.isEmpty(intervaltime) ? '-' : util.convertTime(intervaltime, true, false, true)) + '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.eventCount + ': ' + '</span> <b>' + (userflow.isEmpty(eventCount) ? '-' : util.comma(eventCount)) + '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.eventLoadTime + ': ' + '</span> <b>' + (userflow.isEmpty(eventIntervaltime) ? '-' : util.convertTime(eventIntervaltime, false)) + '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.requestCount + ': ' + '</span> <b>' + (userflow.isEmpty(requestCount) ? '-' : util.comma(requestCount)) + '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.loginYn + ': ' + '</span><b>' +
            (userflow.isEmpty(loginYn) ? '-' : loginYn) +
            '</b></div>'
        tooltipText += '</div>'

        // 오른쪽 데이터
        tooltipText += '<div class="maxy_tooltip_content">'
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.memoryUsage + ': ' + '</span> <b>' +
            (userflow.isEmpty(minMemUsage) ? '' : util.convertMem('kb', minMemUsage)) +
            ' - ' +
            (userflow.isEmpty(maxMemUsage) ? '' : util.convertMem('kb', maxMemUsage)) +
            '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.cpuUsage + ': ' + '</span> <b>' +
            (userflow.isEmpty(minCpuUsage) ? '' : minCpuUsage + '%') +
            ' - ' +
            (userflow.isEmpty(maxCpuUsage) ? '' : maxCpuUsage + '%') +
            '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.comSensitivity + ': ' + '</span> <b>' +
            (minComSensitivity === -1 ? 'unknown' : (userflow.isEmpty(minComSensitivity) ? '' : minComSensitivity + '%' + ' - ')) +
            (maxComSensitivity === -1 ? '' : (userflow.isEmpty(maxComSensitivity) ? '' : maxComSensitivity + '%')) +
            '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.batRemain + ': ' + '</span><b>' +
            (userflow.isEmpty(minBatteryLvl) ? '' : minBatteryLvl + '%') +
            ' - ' +
            (userflow.isEmpty(maxBatteryLvl) ? '' : maxBatteryLvl + '%') +
            '</b></div>';
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.storageCapacity + ': ' + '</span><b>' +
            (userflow.isEmpty(minStorageUsage) ? '' : util.convertMem('mb', minStorageUsage)) +
            ' - ' +
            (userflow.isEmpty(maxStorageUsage) ? '' : util.convertMem('mb', maxStorageUsage)) +
            '</b></div>'
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.crashCount + ': ' + '</span><b>' +
            (userflow.isEmpty(crashCount) ? '-' : util.comma(crashCount)) +
            '</b></div>'
        tooltipText += '<div><span class="maxy_tooltip_content_title">' + text.errorCount + ': ' + '</span><b>' +
            (userflow.isEmpty(errorCount) ? '-' : util.comma(errorCount)) +
            '</b></div>'
        tooltipText += '</div>'
        tooltipText += '</div>'

        return {tooltipText, itemId}
    },
    isEmpty(val) {
        return typeof val === "undefined" ||
            val === null ||
            val === "" ||
            val === "null" ||
            val.length === 0 ||
            (typeof val === "object" && !Object.keys(val).length);
    },
    setHandlebars() {
        Handlebars.registerHelper('alias', (packageNm, serverType, reqUrl) => {
            getPageList(packageNm, serverType, reqUrl)
            return getPageList(packageNm, serverType, reqUrl)
        })

        Handlebars.registerHelper('deviceInfo', function (val) {
            let result
            result = this[0][val]

            switch (val) {
                case 'deviceModel' :
                    result = getDeviceModel(result)
                    break
                case 'simOperatorNm':
                    result = util.simOperatorNmFormat(result)
                    break
                case 'osVer':
                    const osType = this[0]['osType'].toLowerCase()

                    const icon = '<img class="ic_sm_' + osType + '" alt=""><span>' + result + '</span>'
                    return new Handlebars.SafeString(icon)
                default:
                    break
            }

            return result
        })

        Handlebars.registerHelper('time', val => {
            return util.convertTime(val, true, false, true)
        })

        // 스토리지는 MB 단위로 변경
        Handlebars.registerHelper('storage', val => {
            return util.convertMem('mb', val)
        })

        Handlebars.registerHelper('total', function (type) {
            try {
                let result = 0

                if ((this || []).length < 1) return result

                this.forEach(function (item, index) {
                    // index 가 0인 경우 == app start인 경우
                    // app start의 데이터는 sum하지 않음
                    // if (index === 0) {
                    //     return
                    // }

                    let value
                    if (isNaN(item[type])) {
                        value = 0
                    } else {
                        value = Number(item[type])
                    }

                    result += value
                })

                // intervaltime인 경우는 형식에 맞게 변환해서 리턴해줌
                if (type === 'intervaltime') {
                    // console.log(result)
                    return util.convertTime(Math.round(result), true, false, true)
                } else {
                    return result
                }
            } catch (e) {

            }
        })

        Handlebars.registerHelper('startTm', function () {
            try {
                let result
                result = this[0].parentLogDate
                return util.timestampToDateTime(result)
            } catch (e) {

            }
        })

        Handlebars.registerHelper('point', function (val1, val2) {
            try {
                // crash가 error보다 우선순위 높음
                if (val1 >= 0 && val2 >= 0) {
                    // error만 있는 경우
                    if (val1 > 0 && val2 === 0) {
                        return 'error'
                        // crash만 있는 경우
                    } else if (val1 === 0 && val2 > 0) {
                        return 'crash'
                        // 둘 다 있는 경우
                    } else if (val1 > 0 && val2 > 0) {
                        return 'crash'
                    }
                }
            } catch (e) {

            }
        })

        Handlebars.registerHelper('avg', function (type1) {
            try {
                let comSensitivity = 0
                let lastIndex
                let $comSensitivityStatus = $('<span class="summary_network"></span>');

                if ((this || []).length < 1) return;

                this.forEach(function (item, index) {
                    comSensitivity += item[type1]
                    lastIndex = index
                })
                lastIndex = lastIndex + 1

                let avgComSensitivity = Number(comSensitivity) / Number(lastIndex)
                avgComSensitivity = Math.floor(avgComSensitivity)

                const convertComSensitivity = util.convertComSensitivity(avgComSensitivity, 'ua')
                $comSensitivityStatus.addClass(convertComSensitivity[1])
                $comSensitivityStatus.text(convertComSensitivity[0])

                return new Handlebars.SafeString($comSensitivityStatus.prop('outerHTML'))
            } catch (e) {

            }
        })

        Handlebars.registerHelper('inc', function (val) {
            try {
                return parseInt(val) + 1
            } catch (e) {

            }
        })

        Handlebars.registerHelper('avgIntervalTime', function (type) {
            try {
                // 평균 체류시간 구할 때는 app start의 flow는 빼고 계산한다.
                const length = this.length - 1
                let result = 0

                this.forEach(function (item, index) {
                    // index 가 0인 경우 == app start인 경우
                    // app start의 데이터는 sum하지 않음
                    if (index === 0) {
                        return
                    }

                    result += Number(item[type])
                })

                // 평균 체류시간 = 체류시간 총 합 / 전체 flow
                let avgIntervalTime = result / length
                return util.convertTime(Math.round(avgIntervalTime))
            } catch (e) {
            }
        })

        Handlebars.registerHelper("pageType", function (logType, reqUrl) {
            // AppStart, background/foreground 페이지 숫자 색상을 녹색으로 변경
            // foreground는 reqUrl이 foreground라고 들어오지 않아 logtype으로 판단 (1048581)
            if(reqUrl === 'AppStart' || reqUrl === 'Background'
                || logType === 1048581) {
                return 'nativeApp'
            }

            const pageType = util.logTypeToPageType(logType)
            return pageType[0] ? pageType[0] : ''
        })

        Handlebars.registerHelper("isEmpty", function (type) {
            if (isNaN(type)) {
                return '-'
            } else {
                return type
            }
        })
    }
}
