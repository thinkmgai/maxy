class MaxyEventTimeLine {
    constructor(options) {
        this.id = options.id
        this.data = null

        this.init().then(() => {
        })
    }

    async init() {
        const {id} = this

        const source = await fetch(
            '/templates/eventTimeLine.html'
        ).then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()

        $target.append(template({id}))
    }

    callGetLogListByPage(param){
        ajaxCall('/ua/0000/getLogListByPage.maxy', param, {disableCursor: true}).then(data => {
            const {logList} = data

            if (!logList || logList.length === 0) return

            this.setData(logList)
        }).catch(error => {
            console.log(error)
        })
    }

    setData(logList) {
        const {id} = this

        const $userFlowGraphicChart = $('#' + id + ' .user_flow_graphic_chart')

        $userFlowGraphicChart.removeClass('no_data')

        if (!logList || logList.length === 0) {
            $userFlowGraphicChart.addClass('no_data')
            return
        }

        // filter 검색조건으로 사용할 필드
        logList.map(item => {
            item.logClass = getLogTypeGroup(item.logType)
            item.logTypeDetail = getLogTypeDetail(item.logType)
        })

        $('#' + id + ' .user_flow_graphic').empty()

        this.makeData(logList)
        this.draw(this.graph)
    }

    makeData(data) {
        const v = this;
        v.graph = {
            graphInfo: '',
            graphData: []
        };
        const graphStartTime = data[0].logTm
        const graphEndTime = data[data.length - 1].logTm
        v.graph.graphInfo = {
            startTime: graphStartTime,
            endTime: graphEndTime
        };
        for (const item of data) {
            const logType = item.logType
            const logTypeDetail = getLogTypeDetail(item.logType)
            if (logType !== 65536 && logType !== 65537 && logType !== 65538 && // 그래프에 표시 하지 않을 logType 제거
                logType !== 65539 && logType !== 131072 && logType !== 131073 &&
                logType !== 131074 && logType !== 131079 && logType !== 131080 &&
                logType !== 262144 && logType !== 262145 && logType !== 262146 &&
                logType !== 262147 && logType !== 262148 && logType !== 524288 &&
                logType !== 524289 && logType !== 524290 && logType !== 1048576 &&
                logType !== 1048577 && logType !== 4194304 && logType !== 8388608 &&
                logType !== 8388610 && logType !== 8388611) {
                let startTime;
                if (logTypeDetail === "End" ||
                    logTypeDetail === "Response"
                ) {
                    startTime = item.logTm - item.intervaltime // End, Response는 구간으로 그린다
                } else {
                    startTime = 0 // 그 외엔 점으로 그린다
                }
                const info = {
                    logType: item.logType,
                    startTime: startTime,
                    endTime: item.logTm,
                    runtime: item.intervaltime,
                    aliasValue: item.aliasValue,
                    resMsg: item.resMsg
                }
                v.graph.graphData.push(info)
            }
        }
    }

    draw(data) {
        const {id} = this
        const $user_graph_wrap = $('#' + id + ' .user_flow_graphic')
        const endTime = data.graphInfo.endTime                   // 그래프 마지막 시간(timestamp)
        let firstTime = Infinity                                 // 그래프 시작 시간(timestamp)

        for (const item of data.graphData) {
            const value = item.endTime - item.runtime
            if (value < firstTime) {
                firstTime = value                                 // 더 작은 값이 나오면 minValue 업데이트
            }
        }

        const timeDifference = endTime - firstTime; // 시간차
        const timeArr = [firstTime];
        const interval = timeDifference / 4; // 구간 갯수

        // 그래프에 데이터가 있을 때만 timeArr[firstTime] 외에 추가
        if (data.graphData.length !== 0) {
            for (let i = 1; i < 4; i++) { // 시간 5등분
                const time = firstTime + interval * i;
                timeArr.push(Math.round(time))
            }
            timeArr.push(endTime)
        } else {
            return
        }

        // 그래프 데이터가 있을 때만 그래프에 시간 append
        if (timeArr.length !== 1) {
            timeArr.forEach((text, index) => {
                $(`#${id} .user_flow_graphic_time_wrap .time${index + 1}`).text(util.timestampToTime(text))
            });
        }

        for (const item of data.graphData) {
            let left
            let width
            let right

            if (item.startTime !== 0) { // End, Response 구간 그래프
                width = (((item.endTime - item.startTime) / (endTime - firstTime)) * 100).toFixed(2);
                left = (((item.startTime - firstTime) / (endTime - firstTime)) * 100).toFixed(2);
                width = width + '%'
            } else { // 그 외의 점 그래프
                width = 0 + '%'
                left = (((item.endTime - firstTime) / (endTime - firstTime)) * 100).toFixed(2);
                left = isNaN(left) ? 0 : left; // NaN이면 0을 반환
            }

            if (left > 97) { // 글자 짤림 방지
                right = 0 + '%'
                left = 'auto'
            }
            if (left < 0) {
                left = 0 + '%'
                right = 'auto'
            } else if (left !== 'auto') {
                left = left + '%'
                right = 'auto'
            }

            let type
            let logType = getLogTypeGroup(item.logType)
            let logTypeDetail = getLogTypeDetail(item.logType)

            if (logTypeDetail.includes('Error') || logTypeDetail.includes('Crash')) {
                if (logTypeDetail.includes('Error')) {
                    type = "error"
                    width = 20
                } else if (logTypeDetail.includes('Crash')) {
                    type = "crash"
                    width = 20
                }
            } else {
                if (logType === "HttpRequest") {
                    type = "httpRequest"
                } else if ((logType === "Native"
                    || logType === "NativeAction")) {
                    type = "native"
                } else if (logType === 'Ajax') {
                    type = "ajax"
                } else {
                    type = "other"
                }
            }

            const $graph_wrap = $('<div class="flow_popup_graph_wrap">')
            const $graph_head = $('<div class="flow_popup_graph_head">')
            let $graph_type = $('<div class="flow_popup_graph_type">')
            let $user_graph

            if (item.startTime !== 0) { // End, Response 구간 그래프
                $graph_type = $('<div class="log_type">' + logType + '</div>')
                $user_graph = $('<div class="flow_popup_graph_data' + " " + type + '" style="width: ' + width + '; left: ' + left + '; right: ' + right + ';" ' +
                    'id = "' + logTypeDetail + item.endTime + item.runtime + '"></div>')
            } else { // 그 외 점 그래프
                let logTypeTxt
                if (logType === 'WebNavigation' || logType === 'NativeAction') {
                    logTypeTxt = logTypeDetail
                } else {
                    logTypeTxt = logType + ' / ' + logTypeDetail
                }
                $graph_type = $('<div class="log_type">' + logTypeTxt + '</div>')
                //      $graph_detail.append('<div>' + logType + ' / ' + logTypeDetail + '</div>')
                $user_graph = $('<div class="flow_popup_graph_data' + " " + type + '" style="width: ' + width + '; left: ' + left + '; right: ' + right + ';" ' +
                    'id = "' + logTypeDetail + item.endTime + item.runtime + '"></div>')
            }

            $graph_head.append($user_graph)
            $graph_wrap.append($graph_type)
            $graph_wrap.append($graph_head)
            $user_graph_wrap.append($graph_wrap)
        }

        // 그래프 안 타임라인 위치 및 값 설정
        $user_graph_wrap.on('mousemove', function (e) {
            const $lineText = $('#' + id + ' .user_flow_graphic_time_line_text')
            const $line = $('#' + id + ' .user_flow_graphic_time_line')

            // .log_type의 가로크기 + gap 크기
            const logTypeOffWidth = $('#' + id + ' .log_type').get(0).offsetWidth + Number($('#' + id + ' .flow_popup_graph_wrap').css('gap').replace('px', ''))
            // 시간선이 있어야할 실제 크기 = .user_flow_graphic의 가로크기 - .log_type의 가로크기
            const timeLineWrapWidth = $user_graph_wrap.get(0).offsetWidth - logTypeOffWidth
            // 가로 1px 당 증가해야할 시간값 (시간 정확도를 위해 1000을 곱하고 나누고 지지고 볶음)
            let tick = Math.round(timeDifference / timeLineWrapWidth * 1000)
            // 시간선이 있어야할 공간에 대한 마우스 위치값
            let x = e.clientX - Math.round($user_graph_wrap.get(0).getBoundingClientRect().left) //x position within the element.

            // 마우스 위치값이 시간선이 있어야할 공간에서 벗어날때(.log_type 으로 마우스 가면...)
            if (x < logTypeOffWidth) {
                $line.hide()
                return
            }

            // 시간선 보여주기
            // 첫시간값 + 마우스위치값 * 1px당 시간값
            $line.show()
            $lineText.text(util.timestampToTimeMs(firstTime + Math.round((x - logTypeOffWidth) * tick / 1000)))

            // 시간선이 오른쪽 끝부분에 위치해서 시간값이 안보일때 시간값의 위치를 바꿔줌
            if (timeLineWrapWidth < x + $lineText.get(0).offsetWidth) {
                let left = $lineText.get(0).offsetWidth + 10
                $lineText.css('left', '-' + left + 'px')
            } else {
                $lineText.css('left', '10px')
            }

            // 시간선의 위치 설정
            $line.css('left', x + parseInt($('#' + id + ' .user_flow_graphic_chart').css('paddingLeft'), 10) - 1)
        })

        $user_graph_wrap.on('mouseenter', function () {
            $('#' + id + ' .user_flow_graphic_time_line').show()
        })

        $user_graph_wrap.on('mouseleave', function (e) {
            // 타임라인때문에 mouseleave 이벤트가 호출됐으면 return
            if (e.toElement !== null && e.toElement.classList.contains('user_flow_graphic_time_line')) return
            $('#' + id + ' .user_flow_graphic_time_line').hide()
        })

        $('#' + id + ' .user_flow_graphic_time_wrap').on('mouseenter', function () {
            $('#' + id + ' .user_flow_graphic_time_line').hide()
        })

        for (const item of data.graphData) {
            this.makeTooltipData(item)
        }
    }

    makeTooltipData(data) {
        const logType = data.logType
        let normalContent;
        if (logType === 131076 || logType === 131077 || logType === 524292 || logType === 1048579 ||
            logType === 2097152 || logType === 4194306) {
            let msg
            const line = data.resMsg.split('\n')
            if (util.isCrash(logType)) {
                // crash일 경우 : 이후의 내용은 제외하고 툴팁만들기
                const colonIndex = line[0].indexOf(':')
                if (colonIndex !== -1)  msg = line[0].substring(0, colonIndex)
                else msg = line[0]
            }else{
                msg = data.resMsg
            }
            normalContent = ('<div>' + msg + '</div><div><b>' + util.comma(data.runtime) + 'ms</b></div>')
        } else {
            normalContent = ('<div>' + data.aliasValue + '</div><div><b>' + util.comma(data.runtime) + 'ms</b></div>')
        }
        tippy('#' + CSS.escape(getLogTypeDetail(data.logType)) + data.endTime + data.runtime, {
            content: normalContent,
            arrow: false,
            placement: 'top',
            allowHTML: true,
            theme: 'maxy-tooltip'
        })
    }
}