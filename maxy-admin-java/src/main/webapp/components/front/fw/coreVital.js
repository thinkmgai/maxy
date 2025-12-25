class MaxyFrontCoreVital {
    constructor(props) {
        this.id = props.id
        this.targetPage = props.targetPage
        this.from = null
        this.to = null
    }

    setData(data) {
        let {lcp, inp, cls} = data

        const $lcpAvg = $('#lcpAvg')
        const $inpAvg = $('#inpAvg')
        const $clsAvg = $('#clsAvg')

        if (!lcp || !inp || !cls) {
            $lcpAvg.text('-'); // LCP 평균값 초기화
            $inpAvg.text('-'); // INP 평균값 초기화
            $clsAvg.text('-'); // CLS 평균값 초기화
            return
        }

        // 데이터 형식 변환 (소수점 처리)
        lcp = Number(lcp.toFixed(0))
        inp = Number(inp.toFixed(0))
        cls = Number(cls.toFixed(4))

        // 평균값 텍스트 업데이트 (차트 아래 표시되는 값)
        // LCP가 1초 미만인 경우엔 ms로 표기
        if (lcp < 1000) $lcpAvg.text(lcp + ' ms')
        else $lcpAvg.text(lcp / 1000 + ' s')

        // INP는 항상 ms로 표기 (천 단위 콤마 추가)
        $inpAvg.text(util.comma(inp) + ' ms')

        // CLS는 단위 없이 그대로 표기
        $clsAvg.text(cls)
    }

    clear() {
        // 평균값 텍스트 초기화 (차트 아래 표시되는 값들 초기화)
        $('#lcpAvg').text('-'); // LCP 평균값 초기화
        $('#inpAvg').text('-'); // INP 평균값 초기화
        $('#clsAvg').text('-'); // CLS 평균값 초기화
    }
}
