'use strict'

const popup = {
    /**
     *  팝업 여는 함수
     *
     * @param id 어떤 팝업을 열지 (대상)
     */
    async open(id) {
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()
    },

    /**
     *  팝업 닫는 함수
     *
     * @param target 어떤 팝업을 닫을지 (대상)
     */
    close(target) {
        const popup = '#' + target.id + '__popup'
        const span = popup + ' span'
        const $dimmed = $('.dimmed')

        util.removeMaxyCursor()

        if(typeof target.table !== 'undefined'){
            target.table.clearData()
        }
        $(span).text('')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    },

    /**
     *  esc로 팝업 닫는 함수
     *
     */
    escClose(){
        // esc로 팝업 닫기
        $(document).on('keyup', function(e){
            const $visibleDimmed = $('[data-content="dimmed"]:visible')
            // 예외
            // dimmed가 모두 hide, esc키가 아님
            if($visibleDimmed.length === 0
                || e.key !== "Escape") return

            let $dimmed, zIndex = 0
            // zIndex가 제일 높은 dimmed를 찾기
            $visibleDimmed.each(function(){
                const $this = $(this);
                if(zIndex < $this.css('z-index')){
                    zIndex = Number($this.css('z-index'))
                    $dimmed = $this
                }
            })

            // dimmed click event로 팝업 닫기
            $dimmed.trigger('click')
            $(':focus').blur()
            // 팝업이 여러개 떠있을때 상위 팝업만 닫기
            e.stopImmediatePropagation()
        })
    },

    /**
     *  사용자 행동 분석 화면으로 이동하는 함수 (새 창으로 띄움)
     *
     * @param target 파라미터 객체
     */
    goUserFlowPage(param) {
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')
        const deviceId = param.deviceId
        const logTm = param.logTm ? param.logTm : param.pageStartTm

        const params = {
            packageNm,
            serverType,
            deviceId,
            logTm,
        }

        sessionStorage.setItem('ua0400Params', JSON.stringify(params))
        // 사용자 행동분석 버튼을 눌러 사용자 분석 화면으로 이동할 떄는 새창으로 열도록 변경
        const targetUrl = '/ua/0000/goMenuUserAnalysisView.maxy'
        window.open(targetUrl, '_blank')
    },

    dataFormat(value, type) {
        if (!value && type !== 'comSensitivity' && type !== 'feeldex' && type !== 'interval') {
            return '-'
        }

        let result
        switch (type) {
            case 'interval' :
                result = util.convertTime(value, false, true, false)
                break

            case 'date' :
                result = util.timestampToDateTimeMs(value)
                break

            case 'comSensitivity' :
                const comSensitivityFormatArr = util.convertComSensitivity(value, false)
                const networkStatusEl = "<span class='network_status " + comSensitivityFormatArr[1] + "'></span>"
                const sttsTxtEl = "<span class='txt'>" + comSensitivityFormatArr[0] + "</span>"

                result = networkStatusEl + sttsTxtEl + ''
                break

            case 'feeldex' :
                if (value < 0) {
                    result = '-'
                }
                result = util.getFeeldex(value)[0]
                break
        }

        return result
    },

    rowClick(e, row, target, fn) {
        if (target.selectedRow) {
            target.selectedRow.getElement().classList.remove('selected_row')
        }
        row.getElement().classList.add('selected_row')
        target.selectedRow = row

        target.selectedData = row.getData()

        $('.graph_title button').removeClass('selected')
        $('#btnAll').addClass('selected')

        fn(target.selectedData)
    },

    tooltip: {
        loadingTimePopup() {
            const tooltipTxt = [
                trl('common.msg.deviceIdCopy'),
                trl('common.text.appVersion'),
                trl('common.text.osVersion'),
                trl('common.text.networkType'),
                trl('common.text.carrier'),
                trl('common.text.location'),
                trl('common.tableColumn.pageType'),
                'IP'
            ]

            // 상단 타이틀 옆 회색 아이콘에 툴팁 추가
            $('.sub_title_wrap .sub_title:not(#pUserId)').each(function (idx) {
                const id = $(this).attr('id')
                tippy('#' + id, {
                    content: tooltipTxt[idx],
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            })

            tippy('#btnPageFlow', {
                content: i18next.tns('common.text.userBehavior'),
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip'
            })
        },
        subTitle($elements) {
            // 서브 타이틀 요소에 툴팁을 추가하는 함수
            // $elements: class="sub_title"을 가진 요소들

            // 툴팁에 표시할 텍스트 매핑 객체
            const tooltipTextMap = {
                'deviceName': i18next.tns('common.msg.deviceIdCopy'),
                'appVer': i18next.tns('common.text.appVersion'),
                'osVer': i18next.tns('common.text.osVersion'),
                'comType': i18next.tns('common.text.networkType'),
                'simOperator': i18next.tns('common.text.carrier'),
                'location': i18next.tns('common.text.location'),
                'logType': i18next.tns('common.tableColumn.pageType'),
                'userId': i18next.tns('common.text.userId')
            };

            // 각 서브 타이틀 요소에 대해 반복
            $elements.each(function() {
                // data-subtitle 속성 값을 가져옴
                const subtitleType = $(this).data('subtitle');

                // userId는 특별한 처리가 필요하므로 건너뜀
                if (subtitleType === 'userId' && $(this).hasClass('user_id')) {
                    return;
                }

                // 툴팁 텍스트 결정 (매핑된 텍스트가 없으면 data-subtitle 값 사용)
                const tooltipText = tooltipTextMap[subtitleType] || subtitleType;

                // 요소에 tippy 툴팁 적용
                tippy(this, {
                    content: tooltipText,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                });
            });
        }
    }
}
