'use strict';

const alarm = {
    append(message, title) {
        // 알람은 1분에 한 번씩 오고 한번에 최대 7개 까지 올 수 있음
        // 알람이 오면 내용을 보여줄 element 생성
        const $alarmMsgWrap = $('<div>').addClass('alarm_msg_wrap')
        const $alarmMsgTitle = $('<div>').addClass('alarm_msg_title')
        const $img = $('<img class="dark_icon_mark_error" alt="">')
        const $span = $('<span>').text(title)
        const $alarmMsgContent = $('<div>').addClass('alarm_msg_content')
        const $alarmMsg = $('<div>')

        $alarmMsgTitle.append($img, $span)
        $alarmMsgContent.append($alarmMsg)
        $alarmMsgWrap.append($alarmMsgTitle, $alarmMsgContent)

        $alarmMsgWrap.addClass('show')
        $alarmMsg.text(message)

        let translateY = alarm.translateSetting()

        $('.alarm_msg_container').append($alarmMsgWrap)

        setTimeout(function(){
            $alarmMsgWrap.css('transform', 'translateY(-' +translateY+ 'px)')
        }, 1);

        // // 4초 뒤 숨김
        setTimeout(function(){
            $alarmMsgWrap.removeClass('show')
            $alarmMsgWrap.addClass('hide')
            $alarmMsgWrap.css('transform', 'translateY(' +translateY+ 'px)')
        }, 4010);

        // 숨기고 난 후엔 엘리먼트 제거
        setTimeout(function(){
            $alarmMsgWrap.remove()
        }, 5010)
    },
    translateSetting(){
        // .alarm_msg_wrap에서 bottom의 마이너스된 값
        let translateY = 100
        translateY = translateY + 2;

        // 보여지고 있는 마지막 알람요소
        const lastAlarm = document.querySelectorAll('.alarm_msg_wrap.show:last-child')

        // 알림이 하나도 없으면
        if(lastAlarm.length === 0) {
            return translateY
        } else {
            // 마지막 알람요소의 실제 top 위치값을 찾기위함
            const lastAlarmRect = lastAlarm[0].getBoundingClientRect()
            // 마지막 알람요소의 top
            const lastAlarmRectTop = 100 + Number(lastAlarmRect.bottom) + 85
            // 보여지고 있는 알람 Elements
            const alarmEl = document.querySelectorAll('.alarm_msg_wrap.show')
            // 알람 Elements 개수로 top 계산
            const alarmElTop = translateY + (alarmEl.length * 85)

            // 더 큰 top을 위치값으로 사용
            // lastAlarmRectTop는 알람이 나오는 애니메이션 중에 top의 최대값을 뽑기 어려움
            //  alarmElTop은 다수의 알람이 뜬 경우, 먼저 사라진 alarm이 있을때에 위치를 특정하기 어려움
            if(lastAlarmRectTop < alarmElTop){
                return lastAlarmRectTop
            } else {
                return alarmElTop
            }
        }
    }
}