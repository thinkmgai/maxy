class SSEClient {
    constructor(options) {
        this.sseUrl = sessionStorage.getItem('sseUrl')
        this.packageNm = options.packageNm
        this.serverType = options.serverType
        this.maxyAibot = null

        this.init()
    }

    init(param) {
        // package name / server type / app version 바꾼 경우 -> sse.close() 해준 후 sse 객체 새로 생성
        if (param) {
            if (this.sse) {
                this.removeEventListener(this.sse)
                this.sse.close()
                this.sse = null
            }
            this.packageNm = param.packageNm
            this.serverType = param.serverType
        }

        this.sse = new EventSource(this.sseUrl + '/' + this.packageNm + '/' + this.serverType)
        this.addEventListener(this.sse)
    }

    close = (e) => {
        if (this.sse) {
            this.sse.close()
            this.sse = null
        }

    }

    // 정상적으로 연결되면 발생하는 이벤트
    connect = async (e) => {
        const {data: receivedConnectData} = e
    }

    // 메시지가 들어오면 발생하는 이벤트
    // aibot 메시지인지 일반 알림 메시지인지 구분해야함 (aibot이면 key가 bot이고 알림이면 키 없음)
    message = async (e) => {
        const {packageNm, isClose} = this

        // 이미 팝업이 떠있는 경우엔 무시
        if ($('.aibot_dimmed').css('display') !== 'none') {
            return
        }

        let data = e.data
        data = JSON.parse(data)

        // aibot 메시지일 때 메시지 객체를 어딘가에 저장해야한다.
        // 저장 후 aibot 버튼을 클릭했을 때 메시지 보일 수 있게 해야함
        if (Object.keys(data)[0] === 'bot') {
            if (isClose) {
                this.sse.close()
            } else {
                const aibotData = data.bot

                await util.sleep(1500)
                const options = {
                    id: 'maxyAibot',
                    appendId: 'maxyAiBotPopupWrap',
                    data: aibotData,
                    type: 'sse'
                }
                this.maxyAibot = new MaxyAibot(options)
            }
        }
        // 일반 알림일 때
        else {
            console.log('receive alarm message.')
        }

    }

    open = () => {

    }

    error = (e) => {
        if (e.readyState === EventSource.CLOSED) {
            // Connection was closed.
            this.sse.close()
        }
    }

    addEventListener() {
        const {sseUrl, packageNm, serverType} = this

        // 셋 중 하나라도 없으면 연결하지 않음
        if (sseUrl && packageNm && serverType) {
            this.sse.addEventListener('connect', this.connect)
            this.sse.addEventListener('message', this.message, false)
            this.sse.addEventListener('open', this.open, false)
            this.sse.addEventListener('error', this.error, false)
            this.sse.addEventListener('close', this.close)
        }
    }

    removeEventListener(sse) {
        sse.removeEventListener('connect', this.connect)
        sse.removeEventListener('message', this.message, false)
        sse.removeEventListener('open', this.open, false)
        sse.removeEventListener('error', this.error, false)
        sse.removeEventListener('close', this.close, false)
    }
}