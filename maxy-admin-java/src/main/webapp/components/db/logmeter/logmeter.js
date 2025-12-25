'use strict'

let canvas, ctx

class MaxyLogmeter {
    constructor(options) {
        // 유니크 아이디
        this.id = options.id

        // 각 칸의 개수 객체
        this.weight = options.weight
        // 보정할 시간 초
        this.time = options.time ? options.time : 20

        // logmeter 의 사이즈는 기본 15 * 20 사이즈
        this.size = {
            x: 15,
            y: 20
        }

        // 갱신 함수
        this.timer = {}
        this.circles = []
        this.animationRunning = false
        this.speed = 450

        // resize 이벤트 리스너를 한 번만 등록
        this.resizeListenerAdded = false
        this.canvas = ''
        this.ctx = ''
        this.timeouts = {}

        this.addErrorLineClass = util.throttle(() => {
            const $logmeter = $('.logmeter')
            $logmeter.addClass('error_line')

            if (this.timeouts.errorLine) {
                clearTimeout(this.timeouts.errorLine)
            }

            this.timeouts.errorLine = setTimeout(() => {
                $logmeter.removeClass('error_line')
                this.timeouts.errorLine = null
            }, 1000)
        }, 1000) // 1초 동안 한 번만 실행

        this.addCrashLineClass = util.throttle(() => {
            const $logmeter = $('.logmeter')
            $logmeter.addClass('crash_line')

            if (this.timeouts.crashLine) {
                clearTimeout(this.timeouts.crashLine)
            }

            this.timeouts.crashLine = setTimeout(() => {
                $logmeter.removeClass('crash_line')
                this.timeouts.crashLine = null
            }, 1000)
        }, 1000); // 1초 동안 한 번만 실행

        this.animationFrameId = null
        this.lastTimeUpdate = 0
    }

    /**
     * 컴포넌트 template 가져오기
     * @returns {Promise<void>}
     */
    async getTemplates() {
        const {id} = this
        const source = await fetch('/components/db/logmeter/logmeter.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $logmeter = $('#' + id)
        $logmeter.empty()
        $logmeter.append(template)

        this.canvas = document.getElementById('logWrap')
        this.ctx = this.canvas.getContext('2d')
    }

    /**
     * 스택 틀 만들기
     */
    addStackChart() {
        $('.ht_type_text').remove()
        // error, crash 2개를 만든다
        for (let type of ['error', 'crash']) {
            $('.ht_' + type + '_wrap').empty()
            this.makeStackChart(type)
        }
    }

    /**
     * class 매개변수에서 가져온 y축 사이즈 개수만큼 stack 틀을 만든다
     * @param type
     */
    makeStackChart(type) {
        const {size} = this
        const $wrap = $('.ht_' + type + '_wrap')

        // stack 하단의 Error, Crash 텍스트
        $wrap.after($('<span>', {
            'class': 'ht_type_text',
            'text': type === 'error'
                ? 'Error' : type === 'crash'
                    ? 'Crash' : ''
        }))

        // 빈 스택을 y축 개수만큼 그린다
        for (let i = 1; i <= size.y; i++) {
            const $row = $('<span>', {
                'class': 'ht_col',
                'id': 'st_' + type + '_' + i
            })
            $wrap.append($row)
        }

        // stack 을 클릭하면 로그 목록 팝업 open (logmeter 데이터가 웹소켓에서 정상적으로 수신되는 경우에만 클릭되도록 함)
        $wrap.off('click').on('click', this.openLogListPopup)
    }

    /**
     * stack 클릭했을 때 해당 타입에 맞는 로그 목록 팝업을 생성
     * @param e
     */
    openLogListPopup(e) {
        const {id, className} = e.target

        let type
        if (id.includes('error') || className.includes('error')) {
            type = 'error'
        } else if (id.includes('crash') || className.includes('crash')) {
            type = 'crash'
        }

        let options = {
            appendId: 'maxyPopupWrap',
            flow: true,
            id: type + 'Logmeter',
            logType: type,
            title: util.upperCaseFirstChar(type),
            popupType: 'Logmeter'
        }
        new MaxyPopupLogListByUser(options)
    }

    /**
     * 우측 real time 차트 격자 생성
     */
    makeRealTimeChart() {
        const {size} = this
        const $wrap = $('.ht_rt_wrap')
        const $timeWrap = $('.ht_header')
        // x 축 wrapper
        const $xWrap = $('<div>', {
            'class': 'ht_rt_x_wrap'
        })
        // 시간이 들어갈 span
        $timeWrap.append($('<span>', {
            'class': 'ht_rt_x',
            'id': 'logTimeText'
        }))
        $wrap.append($xWrap)

        // size 의 x * y 만큼의 격자 생성
        for (let i = 1; i <= size.y; i++) {
            const $row = $('<div>', {
                'class': 'ht_row'
            })
            $wrap.append($row)
            for (let j = 1; j <= (size.x * 3); j++) {
                const opt = {
                    'id': 'rt_' + j + '_' + i,
                    'class': 'ht_col',
                    'data-x': j,
                    'data-y': i
                }
                if (size.x <= j) {
                    opt.class = 'ht_col'
                }
                // (1, 10) 좌표 예시 <span id="rt_1_10" class="ht_col" data-x="1" data-y="10"></span>
                const $col = $('<span>', opt)
                $row.append($col)
            }
        }
    }

    /**
     * websocket 에서 받아온 데이터(객체)를 logmeter 에서 사용할 수 있는 Array 데이터로 변환
     * @param param `{timestamp: value, timestamp: value, ...}`
     * @returns `[{"logTm": timestamp, "value": value},
     * {"logTm": timestamp, "value": value},
     * {"logTm": timestamp, "value": value}, ...]`
     */
    convert(param) {
        if (!param) {
            console.log('no logmeter data')
            return {}
        }
        const result = {}
        // Object 순회
        for (let key of Object.keys(param)) {
            const logs = param[key]
            const tmpArray = []
            // object to list
            for (let log in logs) {
                tmpArray.push({logTm: Number(log), value: logs[log]})
            }

            result[key] = tmpArray
        }
        return result
    }

    /**
     * 스택 마우스 오버 시 count, 평균 툴팁 추가
     * @param data
     */
    addStackTooltip(data) {
        const v = this
        const types = ['error', 'crash']
        types.forEach(type => {
            const cnt = data[type]
            const avg = data.avg[type]

            const cntText = isNaN(cnt) ? 0 : util.comma(cnt);
            const avgText = isNaN(avg) ? 0 : util.comma(avg);
            const todayText = i18next.tns('dashboard.bi.today')
            const averageText = i18next.tns('dashboard.bi.avgTooltip')

            const text = todayText + ': ' + '<b>' + cntText + '</b><br>' + averageText + ': ' + '<b>' + avgText + '</b>';
            const target = type + 'Tooltip'
            if (v[target] !== undefined) {
                // query selector 로 가져온 tippy 객체는 배열로 반환된다
                v[target][0].setContent(text)
            } else {
                v[target] = tippy('.ht_' + type + '_wrap', {
                    content: text,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip',
                    followCursor: true
                })
            }
        })
    }

    /**
     * stack 그리기
     * stack 데이터는 websocket 에서 받아온 bi info 의 error, crash 데이터를 가지고 그린다.
     * @param data
     */
    drawStack(data) {
        const v = this
        const {weight, size} = this
        const {y} = size
        const {error, crash} = data

        const typeList = []
        // error, crash 별 스택 그리기 함수
        const setData = (d, type) => {

            // DB0100.v.isBack은 종합분석에서 다른 탭 갔다왔을 때만 true임
            // 다른 탭 갔다와도 oldValue === d 인 경우가 많고 이 경우에는 stack을 안 쌓기 때문에 v.isBack이 false일때만 안 쌓는다
            // v.isBack이 true일때는 oldValue && oldValue === d와 상관없이 항상 실행되어야함

            // 기존에 가지고 있던 값과 들어온 값 비교
            const oldValue = v[type + 'Num']

            if (oldValue >= 0 && oldValue === d && !DB0100.v.isBack) {
                // 만약 동일 한 값이면 return
                return
            }

            if (type) {
                typeList.push(type)
                // type이 error, crash이면 crash까지 들어온 이후에 false로 바꿈
                if (typeList.length === 2 && type === 'crash') {
                    DB0100.v.isBack = false
                }
            }

            // this 의 가중치 object 에서 가져올 key
            const w = type + 'Weight'
            // 한 줄의 스택이 가지고 있는 가중치 값
            const stackNum = weight[w] * y
            // 몇 칸의 block 을 쌓을 것인지
            let block = Math.ceil((d % stackNum) / weight[w])
            // 몇 번 중첩되었는지
            // let over = Math.floor(d / stackNum)

            // 기존 block 들에서 color 관련 class 제거
            const $allBlock = $('.ht_' + type + '_wrap .ht_col')
            $allBlock.removeClassStartingWith('blink')
            $allBlock.removeClassStartingWith('move')
            $allBlock.removeClassStartingWith(type)

            for (let i = 0; i <= block; i++) {
                const $i = $('#st_' + type + '_' + i)
                $i.addClass(type + '__d' + 0)

                // 맨 위 블럭은 move + blink 이벤트 추가
                if (i === block) {
                    $i.addClass('move blink')
                }
            }

            // 여기에 새로운 코드 추가 - block 갯수에 따라 상태 표시 업데이트
            // block 갯수에 따라 상태 텍스트와 배경색 설정
            let statusClass = ''

            // block 갯수에 따른 상태 결정
            if (type === 'error') {
                // error 타입일 때의 기준
                if (block === 0) {
                    statusClass = 'very_good'
                } else if (block <= 2) {
                    statusClass = 'good'
                }  else if (block <= 5) {
                    statusClass = 'normal'
                } else if (block <= 10) {
                    statusClass = 'bad'
                } else {
                    statusClass = 'very_bad'
                }
            } else {
                // crash 타입일 때의 기존 기준 유지
                if (block === 0) {
                    statusClass = 'very_good'
                } else if (block === 1) {
                    statusClass = 'good'
                } else if (block === 2) {
                    statusClass = 'normal'
                } else if (block <= 4) {
                    statusClass = 'bad'
                } else {
                    statusClass = 'very_bad'
                }
            }

            // 해당 타입(error 또는 crash)에 맞는 상태 표시 요소 업데이트
            const $statusElement = $('#hc__' + type)
            $statusElement.addClass(statusClass)

            // 기존 값 최신화
            v[type + 'Num'] = d
        }

        setData(error, 'error')
        setData(crash, 'crash')
    }

    resizeCanvas() {
        if (this.canvas) {
            const div = this.canvas.parentElement // canvas가 속한 div를 가져옴
            this.canvas.width = div.clientWidth
            this.canvas.height = div.clientHeight
        }

    }

    // 시간 표시를 업데이트하는 메서드
    updateTimeDisplay() {
        const nowTime = util.nowTime()
        $('.ht_rt_x#logTimeText').text(nowTime)
    }

    // 원을 그리는 함수
    draw(circles, ctx) {
        // 캔버스 전체를 지워 이전 프레임 잔상을 없앰
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        circles.forEach(circle => {
            // 현재 위치를 원의 '잔상(trail)'에 추가하고 길이를 제한
            circle.trail.push({ x: circle.x, y: circle.y })
            if (circle.trail.length > 10) circle.trail.shift()

            // 원의 본체를 완전한 불투명도로 그림
            ctx.globalAlpha = 0.5
            ctx.beginPath()
            // 원 대신 타원 그리기
            // 타원 그리기
            const radiusX = circle.radius * 1.5; // x축 반지름 (늘림)
            const radiusY = circle.radius; // y축 반지름 (기본 값)
            const rotation = 0; // 회전 없음
            ctx.ellipse(circle.x, circle.y, radiusX, radiusY, rotation, 0, Math.PI * 2)
            ctx.fillStyle = circle.color
            ctx.fill()
            ctx.closePath()
        })
    }

    // 애니메이션을 처리하는 함수
    animateFrame(currentTime) {
        const {canvas} = this

        if (!this.lastTime) {
            this.lastTime = currentTime // 이전 시간 기록
        }

        // 경과 시간(deltaTime)을 초 단위로 계산
        const deltaTime = (currentTime - this.lastTime) / 1000
        this.lastTime = currentTime // 현재 시간을 이전 시간으로 업데이트

        // 1초마다 시간 표시 업데이트
        const secondsSinceLastUpdate = (currentTime - this.lastTimeUpdate) / 1000;
        if (secondsSinceLastUpdate >= 1 || this.lastTimeUpdate === 0) {
            this.updateTimeDisplay()
            this.lastTimeUpdate = currentTime
        }

        // 움직일 거리 계산 (시간 기반 속도)
        const moveAmount = this.speed * deltaTime

        this.circles.forEach(circle => {
            circle.x -= moveAmount

            if (circle.color === '#FFC700') {
                this.addErrorLineClass()
            } else if (circle.color === '#FF6969') {
                this.addCrashLineClass()
            }
        })

        // 화면 밖으로 나간 원 제거 (버퍼 추가)
        const offScreenBuffer = Math.min(-0.2 * canvas.width, -100)
        this.circles = this.circles.filter(circle => circle.x + circle.radius > offScreenBuffer)

        // 배열 크기 제한 추가
        const maxCircles = 1000; // 적절한 최대 크기 설정
        if (this.circles.length > maxCircles) {
            this.circles = this.circles.slice(-maxCircles);
        }

        // 캔버스에 그리기
        this.draw(this.circles, this.ctx)

        // 애니메이션이 실행 중이면 다음 프레임 요청
        // 애니메이션이 실행 중이면 다음 프레임 요청
        if (this.animationRunning) {
            this.animationFrameId = requestAnimationFrame(this.animateFrame.bind(this))
        }
    }

    // 원을 추가하는 함수
    addData(data) {
        let { circles, canvas } = this
        const circleRadius = 5

        for (let i = 0; i < data.length; i++) {
            let circleColor, circleY

            if (data[i] == 0) {
                circleColor = '#7CB9FF'
                circleY = Math.random() * (canvas.height / 2 - circleRadius) + (canvas.height / 2)
            } else if (data[i] == 1) {
                circleColor = '#FFC700'
                // 상단 절반에 표시
                circleY = Math.random() * (canvas.height / 2 - circleRadius - 2) + 2
            } else if (data[i] == 2) {
                circleColor = '#FF6969'
                // 상단 절반에 표시
                circleY = Math.random() * (canvas.height / 2 - circleRadius -2 ) + 2
            }

            // 새 원 추가
            circles.push( {
                x: canvas.width + circleRadius, // 오른쪽 끝에서 시작
                y: circleY,
                radius: circleRadius,
                color: circleColor,
                trail: [] // 이전 위치들
            })
        }
        // resize 이벤트 리스너를 한 번만 등록
        if (!this.resizeListenerAdded) {
            window.addEventListener('resize', this.resizeCanvas.bind(this))
            this.resizeCanvas()
            this.resizeListenerAdded = true  // 리스너 등록 여부 표시
        }

        // 애니메이션이 실행 중이지 않으면 시작
        if (!this.animationRunning) {
            this.animationRunning = true
            requestAnimationFrame(time => this.animateFrame(time, performance.now(), circles))
        }
    }

    /**
     * 조회 앱 정보가 바뀌었을 때 초기화 함수
     */
    reset() {
        const $col = $('.ht_col')
        $col.removeClass('log')
        $col.removeClass('error')
        $col.removeClass('crash')

        this.circles = []
        // 스택을 아예 삭제 후 다시 그린다.
        this.addStackChart()

        // 타이머 정리
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // 모든 타이머 정리
        for (const key in this.timeouts) {
            if (this.timeouts[key]) {
                clearTimeout(this.timeouts[key])
                this.timeouts[key] = null
            }
        }

        // 애니메이션 중지
        this.animationRunning = false
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }

        // 마지막 시간 초기화
        this.lastTime = null;
        this.lastTimeUpdate = 0; // 시간 업데이트 초기화 추가
    }

}