// noinspection JSUnusedGlobalSymbols

'use strict';

/**
 * jquery function overwriting
 * 특정 문자로 시작하는 모든 class 삭제
 * @param filter 삭제할 class 문자
 * @return {$}
 */
$.fn.removeClassStartingWith = function (filter) {
    $(this).removeClass(function (index, className) {
        return (className.match(new RegExp("\\S*" + filter + "\\S*", 'g')) || []).join(' ')
    });
    return this;
};

/**
 * toast message 추가
 * @param text {string}
 * @param isHtml {boolean=}
 * @param duration {number=}
 */
const toast = async (text, isHtml, duration) => {
    let delay = 1000
    let $body = $('body')

    // body에 #maxyToastMsg 요소가 없으면 생성
    if ($body.find('#maxyToastMsg').length === 0) {
        $body.append($('<div class="toast_msg" id="maxyToastMsg">'))
    }

    const $toast = $('#maxyToastMsg')
    const currentText = $toast.is(':visible') ? $toast.html() : ''

    // 새로운 텍스트가 기존 텍스트와 같다면 아무 작업도 하지 않음
    if (!text || currentText === text) {
        return
    }

    // 현재 토스트가 보여지고 있다면 숨기고 텍스트 비우기
    if ($toast.is(':visible')) {
        $toast.stop(true, true).hide().html('')
    }

    // 새로운 텍스트 설정 (HTML 여부에 따라 다르게 처리)
    if (isHtml) {
        $toast.html(text)
    } else {
        $toast.text(text)
    }

    // duration 값이 있으면 delay 값 업데이트
    if (duration && duration > 0) {
        delay = duration
    }

    // 토스트 메시지 보여주기 (기존 애니메이션 멈추고 시작하기, 간헐적으로 빈 값 노출되는 현상 방지)
    $toast.stop(true, true).fadeIn(400).delay(delay).fadeOut(400, function () {
        $toast.html(''); // 텍스트 초기화
    })

    await util.sleep(delay + 800)
};

/**
 * deviceModel 로 osType 판단 함수
 *
 * @param deviceModel
 * @return {string} iOS / Windows / Android
 */
const osTypeParser = deviceModel => {
    if (deviceModel.startsWith('iP')) {
        return 'iOS'
    } else if (deviceModel.startsWith('Windows')) {
        return 'Windows'
    } else {
        return 'Android'
    }
}

const cursor = {
    show(disableDimmed, dimmedAreaSelector) {
        const $body = $('body')
        // dimmed 있는지 확인, disableDimmed 가 false인 경우만 dimmed 추가
        if (!disableDimmed) {
            if (dimmedAreaSelector) {
                // 고유한 키 값 생성 (dimmedAreaSelector가 있을 때만)
                const dimmedKey = dimmedAreaSelector.replace(/[^a-zA-Z0-9]/g, '_')

                // 이미 같은 키를 가진 dimmed가 있는지 확인
                const $existingDimmed = $(`.cursor_dimmed[data-dimmed-key="${dimmedKey}"]`)

                // 같은 키를 가진 dimmed가 없으면 새로 생성
                if ($existingDimmed.length === 0) {
                    // dimmed 추가 (data-dimmed-key 속성 추가)
                    $body.append($(`<div class="cursor_dimmed" data-dimmed-key="${dimmedKey}"></div>`))

                    // 지정한 dimmed영역이 있다면 영역에 맞춰서 dimmed를 그려줌
                    const $dimmedArea = $(dimmedAreaSelector)
                    if ($dimmedArea.length > 0) {
                        const $dimmed_tmp = $(`.cursor_dimmed[data-dimmed-key="${dimmedKey}"]`)
                        const offset = $dimmedArea.offset();  // 문서(document) 기준 위치

                        $dimmed_tmp.css('left', offset.left)
                        $dimmed_tmp.css('top', offset.top)
                        $dimmed_tmp.css('width', $dimmedArea.outerWidth())
                        $dimmed_tmp.css('height', $dimmedArea.outerHeight())
                    }
                }
            } else {
                // dimmedAreaSelector가 없는 경우 기본 dimmed 추가 (키 없음)
                if ($('.cursor_dimmed:not([data-dimmed-key])').length === 0) {
                    $body.append($('<div class="cursor_dimmed"></div>'))
                }
            }
        }

        if (dimmedAreaSelector) {
            // 고유한 키 값 생성 (dimmedAreaSelector가 있을 때만)
            const cursorKey = dimmedAreaSelector.replace(/[^a-zA-Z0-9]/g, '_')

            // 이미 같은 키를 가진 cursor가 있는지 확인
            const $existingCursor = $(`.maxy_cursor_dots[data-cursor-key="${cursorKey}"]`)

            // 같은 키를 가진 cursor가 없으면 새로 생성
            if ($existingCursor.length === 0) {
                // cursor 추가 (data-cursor-key 속성 추가)
                $body.append($(`<div class="maxy_cursor_dots" data-cursor-key="${cursorKey}"><div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div></div>`))

                // 지정한 dimmed영역이 있다면 dots 위치 조정
                const $dimmedArea = $(dimmedAreaSelector)
                if ($dimmedArea.length > 0) {
                    const dimmedKey = dimmedAreaSelector.replace(/[^a-zA-Z0-9]/g, '_')
                    const $dimmed_tmp = $(`.cursor_dimmed[data-dimmed-key="${dimmedKey}"]`)
                    const $cursor_tmp = $(`.maxy_cursor_dots[data-cursor-key="${cursorKey}"]`)

                    const left = parseInt($dimmed_tmp.css('left'))
                    const top = parseInt($dimmed_tmp.css('top'))
                    const width = parseInt($dimmed_tmp.css('width'))
                    const height = parseInt($dimmed_tmp.css('height'))

                    $cursor_tmp.css('left', left + (width / 2) - 50)
                    $cursor_tmp.css('top', top + (height / 2) - 50)
                }
            }
        } else {
            // dimmedAreaSelector가 없는 경우 기본 cursor 추가 (키 없음)
            if ($('.maxy_cursor_dots:not([data-cursor-key])').length === 0) {
                $body.append($('<div class="maxy_cursor_dots"><div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div></div>'))
            }
        }
    },
    hide(dimmedAreaSelector) {
        if (dimmedAreaSelector) {
            // 특정 키를 가진 dimmed와 cursor만 제거
            const dimmedKey = dimmedAreaSelector.replace(/[^a-zA-Z0-9]/g, '_')
            const cursorKey = dimmedKey

            $(`.cursor_dimmed[data-dimmed-key="${dimmedKey}"]`).remove()
            $(`.maxy_cursor_dots[data-cursor-key="${cursorKey}"]`).remove()
        } else {
            // 모든 dimmed와 cursor 제거
            $('.cursor_dimmed').remove()
            $('.maxy_cursor_dots').remove()
        }
    }
}

const util = {
    /**
     * osType 에 따른 icon img 로 변환
     * @param osType
     * @returns {*|string}
     */
    convertOsIcon(osType) {
        if ('Android' === osType) {
            return '<img class="h20" src="/images/maxy/icon-android-purple.svg"/>'
        } else if ('iOS' === osType) {
            return '<img class="h20" src="/images/maxy/icon-ios-blue.svg"/>'
        } else {
            return osType
        }
    },
    /**
     * ellipsis text
     * @param text {string} 문자열
     * @param length {number} 보여줄 문자열 수
     * @returns {string} 문자열...
     */
    ellipsis(text, length) {
        if (text === null || text === undefined) {
            return ''
        }
        return text.length > length ? text.substring(0, length) + '...' : text
    },
    /**
     * 통신 전 packageNm 체크
     * @param param {Object}
     * @returns {boolean} packageNm이 있으면 false 없으면 true
     */
    checkParam(param) {
        return param.packageNm === null || param.packageNm === "" || param.packageNm === undefined
    },

    toUpperCaseFirstChar(c) {
        if (c) {
            return c.substring(0, 1).toUpperCase() + c.substring(1, c.length)
        }
    },
    /**
     * 바이트 값을 적절한 단위로 변환
     * @param {number} bytes 바이트 값
     * @param {number} [decimals=0] 소수점 자리수
     * @returns {string} 변환된 값과 단위 (예: "1GB", "512MB", "2.5KB", "1024byte")
     */
    convertBytes(bytes, decimals = 0) {
        if (bytes === null || bytes === undefined || isNaN(bytes)) {
            return '0byte'
        }

        const numBytes = Number(bytes)
        if (numBytes < 0) {
            return '0byte'
        }

        const units = [
            { size: 1073741824, label: 'GB' },
            { size: 1048576, label: 'MB' },
            { size: 1024, label: 'KB' },
            { size: 1, label: 'byte' }
        ];

        for (const { size, label } of units) {
            if (numBytes >= size) {
                const value = numBytes / size
                return value.toFixed(decimals) + label
            }
        }

        return '0byte'
    },
    /**
     * 클립보드에 복사
     *
     * @param target element || string
     * @param {function=} callback -- 클립보드에 복사 후 실행할 함수
     */
    copy(target, callback) {
        // const copyText = typeof target === 'string' ? target : $(target).val()
        const copyText = (typeof target === 'string' || typeof target === 'number')
            ? target
            : ($(target).val() ? $(target).val() : $(target).text());
        if (navigator.clipboard) {
            navigator.clipboard.writeText(copyText).then(() => {
                const msg = i18next.tns('common.msg.copy')
                toast(msg).then(() => {
                    if (typeof callback === "function")
                        callback()
                })
            })
        } else {
            const textarea = document.createElement("textarea");
            document.body.appendChild(textarea);
            textarea.value = copyText;
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            toast(i18next.tns('common.msg.copy'))
        }
    },
    addCopyButton(txt) {
        if (txt === null || txt === undefined) {
            return ''
        }
        const str = txt.trim()
        if (str.length <= 0) {
            return ''
        }
        if (str === '-') {
            return str
        }
        return '<div class="flex_center"><button class="btn_copy" data-str="' + str + '"></button>' + str + '</div>'
    },
    /**
     * 다음과 같이 table.setData() 뒤에 비동기로 붙인다
     * ```
     * table.setData(data).then(() => {
     *   util.addCopyEventToTable(v.table)
     * })
     * ```
     * @param table
     */
    addCopyEventToTable(table) {
        console.log('table', table)
        // Tabulator에서 렌더링이 완료된 후 이벤트 등록
        table.on("renderComplete", () => {
            const $btnCopy = $('.btn_copy');
            console.log($btnCopy)
            $btnCopy.off(); // 이전 이벤트 제거
            $btnCopy.on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                console.log(e)
                util.copy($(e.target).data('str'));
            });
        });
    },
    /**
     * 공백체크
     * @param data String
     * @returns {boolean} is empty: true / is not empty : false
     */
    isEmpty(data) {
        if (!data) {
            return true
        }
        if (typeof data === 'number') {
            return false
        }
        if (typeof data === 'object') {
            return data.length <= 0
        }
        return '' === data.replace(/\s/g, '')
    },
    /**
     * input box 에러 처리
     * @param el $('input')
     */
    emptyInput(el) {
        el.addClass('input_error_shake')
        el.focus()
        setTimeout(() => {
            el.removeClass('input_error_shake')
        }, 400)
    },
    /**
     * select box 에서 selected 된 option 의 val, text 가져오기
     * @param id
     * @return {{val: *, text: string}|null}
     */
    getSelectedItem(id) {
        if (!id) {
            return null
        }
        const $select = $('#' + id + ' > option:selected')
        if ($select.length < 1) {
            return null
        }
        const text = $select.text()
        const val = $select.val()
        return {text, val}
    },
    nowMonthDate() {
        const now = new Date()

        return String(util.padding(now.getMonth() + 1))
            + String(util.padding(now.getDate()))
    },
    /**
     * 현재 일시를 yyyyMMddHHmmss 형식으로 리턴
     * @returns 'yyyyMMddHHmmss'
     */
    nowDateTime() {
        const now = new Date()

        return '' + now.getFullYear()
            + util.padding(now.getMonth() + 1)
            + util.padding(now.getDate())
            + util.padding(now.getHours())
            + util.padding(now.getMinutes())
            + util.padding(now.getSeconds())
    },
    /**
     * 현재 일시를 yyyyMMdd 형식으로 리턴
     * @returns 'yyyyMMdd'
     */
    nowDate() {
        const now = new Date()

        return '' + now.getFullYear()
            + util.padding(now.getMonth() + 1)
            + util.padding(now.getDate())
    },
    /**
     * yyyyMMdd 형식의 날짜를 yyyy-MM-dd, yyyy-MM 로 변환
     * @param date yyyyMMdd
     * @returns "yyyy-MM-dd", "yyyy-MM"
     */
    dateFormat(date) {
        if (!date) {
            date = util.nowDateTime();
        }
        if (date.length < 6) {
            throw new Error("Invalid date format. Expected 'yyyyMMdd' or 'yyyyMM'.");
        }

        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        return date.length >= 8 ? `${year}-${month}-${date.substring(6, 8)}` : `${year}-${month}`;
    }
    ,
    today(start) {
        const today = new Date();
        if (start) {
            today.setHours(0, 0, 0, 0);  // 시, 분, 초, 밀리초를 0으로 설정
        }
        return today.getTime();
    },
    isBeforeOrToday(dateStr) {
        // 주어진 날짜를 Date 객체로 변환
        const givenDate = new Date(dateStr);

        // 오늘 날짜의 자정 시각을 얻기 위해 현재 날짜를 생성
        const today = new Date();
        today.setHours(23, 59, 59, 999); // 시간, 분, 초, 밀리초를 0으로 설정

        // 비교하여 오늘 미만인지 확인
        return givenDate < today;
    },
    /**
     * yyyyMMddHHmmss 형식의 날짜를 yyyy-MM-dd HH:mm:ss 로 변환
     * @param date yyyyMMddHHmmss
     * @returns String "yyyy-MM-dd HH:mm:ss"
     */
    datetimeFormat(date) {
        if (date) {
            const year = date.substring(0, 4)
            const month = date.substring(4, 6)
            const day = date.substring(6, 8)
            const hour = date.substring(8, 10)
            const min = date.substring(10, 12)
            const sec = date.substring(12, 14)

            return (year + '-' + month + '-' + day
                + ' ' + hour + ':' + min + ':' + sec)
        }
    },
    /**
     * 현재 일자에서 매개변수 만큼 더하거나 뺀 날짜 리턴
     * @param day 더하거나 뺄 날짜 (정수)
     * @returns {Date} Date \+ day
     */
    getDate(day) {
        const now = new Date()
        return new Date(now.setDate(now.getDate() + day))
    },
    getDateDiff(d1, d2) {
        const date1 = new Date(d1)
        const date2 = new Date(d2)

        const diffDate = date1.getTime() - date2.getTime()

        return Math.abs(diffDate / (1000 * 60 * 60 * 24)) // 밀리세컨 * 초 * 분 * 시 = 일
    },
    getHoursDiff(d1, d2) {
        const date1 = new Date(d1)
        const date2 = new Date(d2)

        const diffDate = date1.getTime() - date2.getTime()

        return Math.abs(diffDate / (1000 * 60 * 60)) // 밀리세컨 * 초 * 분 = 시
    },
    /**
     * 현재 시간을 HH:mm:ss 로 리턴
     * @returns "HH:mm:ss"
     */
    nowTime() {
        const time = new Date()
        const hour = util.padding(time.getHours())
        const min = util.padding(time.getMinutes())
        const sec = util.padding(time.getSeconds())
        return (hour + ":" + min + ":" + sec)
    },
    /**
     * 한 자리 숫자일 경우 앞에 0 채워넣어 리턴
     * @param str int
     * @return {string|*} 00 01 ...
     */
    padding(str) {
        return String(str).length === 1 ? '0' + str : str
    },
    /**
     * Date 타입의 매개변수를 yyyy-mm-dd 형식으로 리턴
     * @returns {string}
     * @param {Object=} date
     * @param type
     */
    getDateToString(date, type) {
        if (!date) {
            date = new Date();
        }

        const year = date.getFullYear();
        const month = util.padding(date.getMonth() + 1);
        const day = util.padding(date.getDate());

        if (type === 'none') {
            return `${year}${month}${day}`;
        }

        const separator = type === 'slash' ? '/' : '-';

        return `${year}${separator}${month}${separator}${day}`;
    },
    /**
     * Date 타입의 매개변수를 yyyy-MM-dd HH:mm:ss형식으로 리턴
     * @param date {Date}
     * @param noDivider {boolean=}
     * @returns {string}
     */
    getDateTimeToString(date, noDivider) {
        if (date) {
            return date.getFullYear()
                + (noDivider ? '' : '-') + util.padding(date.getMonth() + 1)
                + (noDivider ? '' : '-') + util.padding(date.getDate())
                + (noDivider ? '' : ' ') + util.padding(date.getHours())
                + (noDivider ? '' : ':') + util.padding(date.getMinutes())
                + (noDivider ? '' : ':') + util.padding(date.getSeconds())
        }
    },
    /**
     * 특정 날짜를 unix timestamp 로 변환
     * @param date Date()
     * @param start boolean(true: 00:00:00.000, false: 23:59:59.999)
     */
    dateToTimestamp(date, start) {
        let f = 0
        if (!start) {
            f = 1
        }
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + f)
        let ts = d.getTime()
        return start ? ts : ts - 1
    },
    /**
     * yyyyMMddHHmm -> timestamp
     * @param dateString
     * @param isEnd boolean(true: 23:59:59.999, false: 00:00:00.000)
     * @returns {number}
     */
    dateStringToTimestamp(dateString, isEnd) {
        // 문자열에서 '-', 공백 제거
        const cleanedString = String(dateString).replace(/[-\s]/g, "");
        // yyyyMMddHHmmss 형식을 Date 객체로 변환
        const year = parseInt(cleanedString.slice(0, 4), 10);
        const month = parseInt(cleanedString.slice(4, 6), 10) - 1; // JavaScript에서 월은 0부터 시작
        const day = parseInt(cleanedString.slice(6, 8), 10);
        const hour = parseInt(cleanedString.slice(8, 10), 10);
        const minute = parseInt(cleanedString.slice(10, 12), 10);

        // Date 객체 생성
        let date
        if (!isEnd) {
            // 0초로 설정하여 해당 분의 시작 시간으로 설정
            date = new Date(year, month, day, hour, minute)
        } else {
            // 59초 999밀리초로 설정하여 해당 분의 마지막 시간으로 설정
            date = new Date(year, month, day, hour, minute, 59, 999)
        }

        // Unix 타임스탬프 (밀리초 단위)
        return date.getTime();
    },
    /**
     * timestamp 를 format에 맞는 HHmm, HH:mm을 반환
     * @param timestamp unix timestamp
     * @param format HHmm, HH:mm
     *  * @returns {string} - 지정된 형식의 시간 문자열
     */
    timestampToHourMin(timestamp, format) {
        if (!['HHmm', 'HH:mm'].includes(format)) {
            throw new Error("Invalid format. Use 'HHmm' or 'HH:mm'.");
        }

        // Date 객체 생성
        const date = new Date(timestamp);

        // 시, 분 추출
        const hours = date.getHours().toString().padStart(2, '0'); // 두 자리 수로 패딩
        const minutes = date.getMinutes().toString().padStart(2, '0'); // 두 자리 수로 패딩

        // 형식에 따른 반환
        return format === 'HHmm' ? `${hours}${minutes}` : `${hours}:${minutes}`;
    },
    /**
     * timestamp 를 yyyy-MM-dd 형식으로 리턴
     * @param timestamp
     * @param type
     * @returns {string} yyyy-MM-dd
     */
    timestampToDate(timestamp, type) {
        try {
            if (timestamp) {
                if (typeof timestamp === 'string') {
                    timestamp = Number(timestamp)
                }
                return util.getDateToString(new Date(timestamp), type)
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * timestamp 를 yyyy-MM-dd  HH:mm:ss 형식으로 리턴
     * @param timestamp
     * @returns {string} yyyy-MM-dd  HH:mm:ss
     */
    timestampToDateTime(timestamp) {
        try {
            if (timestamp) {
                if (typeof timestamp === 'string') {
                    timestamp = Number(timestamp)
                } else if (typeof timestamp === 'object') {
                    // tabulator 객체
                    timestamp = Number(timestamp.getValue())
                }
                const dateTime = new Date(timestamp)
                let offset = new Date().getTimezoneOffset() * 60
                offset = String(timestamp).length === 13 ? offset * 1000 : offset
                const date = new Date(timestamp - offset).toISOString().split('T')[0]
                const time = dateTime.toTimeString().split(' ')[0]
                return date + ' ' + time
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * timestamp 를 HH:mm:ss 형식으로 리턴
     * @param timestamp
     * @param  {boolean} short
     * @returns {string} HH:mm:ss
     */
    timestampToTime(timestamp, short) {
        try {
            if (timestamp) {
                if (typeof timestamp === 'string') {
                    timestamp = Number(timestamp)
                } else if (typeof timestamp === 'object') {
                    // tabulator 객체
                    timestamp = Number(timestamp.getValue())
                }
                const dateTime = new Date(timestamp)
                let offset = new Date().getTimezoneOffset() * 60
                offset = String(timestamp).length === 13 ? offset * 1000 : offset
                if (short) {
                    return dateTime.toTimeString().slice(0, 5)
                }
                return dateTime.toTimeString().split(' ')[0]
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * timestamp 를 HH:mm:ss 형식으로 리턴
     * @param timestamp
     * @returns {string} HH:mm:ss.SSS
     */
    timestampToTimeMs(timestamp) {
        try {
            if (timestamp) {
                const stringTs = String(timestamp)
                if (typeof timestamp === 'string') {
                    timestamp = Number(timestamp)
                } else if (typeof timestamp === 'object') {
                    // tabulator 객체
                    timestamp = Number(timestamp.getValue())
                }
                const dateTime = new Date(timestamp)
                const ms = stringTs.length === 13 ? stringTs.slice(10, 13) : '000'
                return dateTime.toTimeString().split(' ')[0] + '.' + ms
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * timestamp 를 yyyy-MM-dd  HH:mm:ss.sss 형식으로 리턴
     * @param timestamp
     * @returns {string} yyyy-MM-dd  HH:mm:ss.sss
     */
    timestampToDateTimeMs(timestamp) {
        try {
            if (timestamp) {
                if (typeof timestamp === 'string') {
                    timestamp = Number(timestamp)
                } else if (typeof timestamp === 'object') {
                    // tabulator 객체
                    timestamp = Number(timestamp.getValue())
                }
                const dateTime = new Date(timestamp)
                let offset = new Date().getTimezoneOffset() * 60
                const strTs = String(timestamp)
                offset = strTs.length === 13 ? offset * 1000 : offset
                const date = new Date(timestamp - offset).toISOString().split('T')[0]
                const time = dateTime.toTimeString().split(' ')[0]
                const ms = strTs.slice(10, 13)
                return date + ' ' + time + '.' + ms
            } else {
                return '-'
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * yyyy-MM-ddTHH:mm:ss 형식의 UTC DateTime 을 yyyy-MM-dd HH:mm:ss 로 변환
     * @param utc yyyy-MM-ddTHH:mm:ss
     * @returns {string} yyyy-MM-dd HH:mm:ss
     */
    utcToDateTime(utc) {
        try {
            if (utc) {
                return utc.split('T').join(' ')
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * Object 형식의 객체를 Array 로 변환
     * @param param Object
     * @returns {*[]}
     */
    objectToArray(param) {
        if (typeof param === 'object') {
            const keys = Object.keys(param)
            const array = []
            for (const i in keys) {
                array.push(param[keys[i]])
            }
            return array
        } else {
            return []
        }
    },
    /**
     * ms 만큼 sleep, async 함수 내에서 `await util.sleep(1000)` 으로 사용
     * @param ms milliseconds
     * @returns {Promise<unknown>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },
    /**
     * kB, MB 값을 MB, GB로 변환
     * @param type kb / mb
     * @param val value
     * @returns {string} 00.0GB, 000.0MB
     */
    convertMem(type, val) {
        try {
            let result = 0
            if (util.isEmpty(val) || val === 0) {
                return '0MB'
            }
            val = Number(val)

            if (isNaN(val)) {
                return '0MB'
            }
            switch (type) {
                case 'kb':
                    result = (val / 1024).toFixed(1)
                    return result + 'MB'
                case 'mb':
                    result = (val / 1024).toFixed(1)
                    return result + 'GB'
                default:
                    return 0 + 'GB'
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * Network status converter
     * @param val
     * @param type
     * @returns {string[]}
     */
    convertComSensitivity(val, type) {
        val = Number(val)
        if (!type) {
            if (isNaN(val) || val < 0) {
                return ['Unknown', 'unknown']
            } else if (val >= 0 && val <= 20) {
                return ['Too Bad', 'too_bad']
            } else if (val > 20 && val <= 40) {
                return ['Bad', 'bad']
            } else if (val > 40 && val <= 60) {
                return ['Normal', 'normal']
            } else if (val > 60 && val <= 80) {
                return ['Good', 'good']
            } else {
                return ['Very Good', 'very_good']
            }
            // 사용자 분석 화면에서만 사용
        } else if (type) {
            if (isNaN(val) || val < 0) {
                return ['Unknown', 'grey']
            } else if (val >= 0 && val <= 20) {
                return ['Too Bad', 'purple']
            } else if (val > 20 && val <= 40) {
                return ['Bad', 'red']
            } else if (val > 40 && val <= 60) {
                return ['Normal', 'green']
            } else if (val > 60 && val <= 80) {
                return ['Good', 'blue']
            } else {
                return ['Very Good', 'indigo']
            }
        }

    },
    /**
     * Network type converter
     * @param val
     * @returns {string}
     */
    convertComType(val) {
        val = Number(val)
        switch (val) {
            case 1 :
                return 'WiFi'
            case 2 :
                return '2G'
            case 3 :
                return '3G'
            case 4 :
                return 'LTE'
            case 5 :
                return '5G'
            case 9 :
            case 0 :
            case -1 :
                return 'ETC'
        }
    },
    convertByLogType(val) {
        if (val === null || val === undefined || val === '') {
            console.log('not allowed logType: ' + val);
            return ['', ''];
        }

        const numVal = Number(val);

        if (Number.isNaN(numVal)) {
            console.log('invalid number logType: ' + val);
            return ['', ''];
        }

        // crash 인 경우
        if (numVal === 2097152) {
            return ['bp_blue', 'mk_crash'];
        }

        const logTypeMappings = [
            {
                range: [65536, 131071],
                badge: 'bp_yellow',
                errors: [65538],
                custom: {65540: 'bp_purple'}
            },
            {
                range: [131072, 196608],
                badge: 'bp_yellow',
                errors: [131076, 131077, 131109],
            },
            {
                range: [262144, 327679],
                badge: 'bp_yellow',
                errors: [262148],
            },
            {
                range: [524288, 589823],
                badge: 'bp_green',
                errors: [524292, 524293],
            },
            {
                range: [1048576, 1114111],
                badge: 'bp_blue',
                errors: [1048579, 1048594],
            },
            {
                range: [4194304, 4259839],
                badge: 'bp_purple',
                errors: [4194306],
            },
            {
                range: [8388608, 8454143],
                badge: 'bp_purple',
                errors: [8388613, 8388614],
            },
            {
                range: [5242881, 5242883],
                badge: 'bp_purple',
                errors: [],
            },
        ];

        for (const type of logTypeMappings) {
            const [min, max] = type.range;
            if (numVal >= min && numVal <= max) {
                const badge = type.custom?.[numVal] ?? type.badge;
                const marker = type.errors?.includes(numVal) ? 'mk_error' : 'mk_check';
                return [badge, marker];
            }
        }

        console.log('not allowed logType: ' + val);
        return [val, val];
    },
    /**
     * logType 을 page type 으로 변환
     *
     * @param val
     */
    logTypeToPageType(val) {
        if (val) {
            // 2097152 == native crash
            if (val.toString().startsWith('10') || val.toString().startsWith('20')) {
                return ['native', 'Native']
            } else {
                return ['webview', 'Web View']
            }
        } else {
            return ['', '-']
        }
    },
    /**
     * 네트워크 감도에 맞는 아이콘을 리턴받아서 각 셀에 넣어줌
     *
     * @param val
     */
    comSensitivityFormat(val) {
        const comSensitivityFormatArr = util.convertComSensitivity(val, false)
        const $networkStatus = $('.network_status')

        $networkStatus.removeClass().addClass('network_status')
        $networkStatus.addClass(comSensitivityFormatArr[1])

        $('#pComSensitivity').text(comSensitivityFormatArr[0])
    },
    /**
     * Byte 값을 kB, MB 로 변환
     *
     * @param val
     */
    convertFileSize(val, decimal) {
        let num = Number(val)
        if (typeof decimal === "undefined") decimal = 2

        if (num > 1024) {
            if (num > (1024 * 1024)) {
                return (num / (1024 * 1024)).toFixed(decimal) + ' MB'
            } else {
                return (num / 1024).toFixed(decimal) + ' KB'
            }
        } else {
            return num + ' Byte'
        }
    },
    /**
     * 숫자값에 천 단위 comma 기입
     * @param val
     * @return string
     */
    comma(val) {
        try {
            if (typeof val === 'object') {
                val = val.getValue()
            }
            return Number(val).toLocaleString('ko-KR')
        } catch (e) {
            console.log(e)
            return '0'
        }
    },
    /**
     * Millisecond 를 second 로 변환
     * @param val
     * @returns string
     */
    convertSec(val) {
        if (typeof val === 'string') {
            val = Number(val);
        } else if (typeof val === 'object') {
            val = Number(val.getValue())
        }
        val = (val / 1000).toFixed(2)
        val = util.comma(val)

        const sec = i18next.tns('common.text.sec')
        return val + sec;
    },
    /**
     * Math.floor(a / b * 100)
     * @param a
     * @param b
     * @return number
     */
    percent(a, b) {
        try {
            if (b === 0 || a === 0) {
                return 0;  // b 또는 a가 0이면 0을 반환
            }

            let result = Math.round(a / b * 100);
            if (isNaN(result)) {
                result = 0;
            }

            return result > 100 ? 100 : result;
        } catch (e) {
            console.log(e);
            return 0;
        }
    },
    /**
     * 단위 변환 (1,000 -> K, 1,000,000 -> M)
     * @param num
     * @return {string}
     */
    convertNum(num) {
        try {
            if (num === undefined) {
                return '0'
            }
            if (typeof num === 'string') {
                num = num.replace(',', '')
                num = Number(num)
            }
            if (num < 1000) {
                return num
            } else if (num >= 1000 && num < 1000000) {
                return Math.floor(num / 1000) + 'K'
            } else if (num >= 1000000 && num < 1000000000) {
                return Math.floor(num / 1000000) + 'M'
            } else if (num >= 1000000000 && num < 1000000000000) {
                return Math.floor(num / 1000000000) + 'B'
            } else {
                return Math.floor(num / 1000000000000) + 'T'
            }
        } catch (e) {
            return num
        }
    },
    /**
     * 단위 변환, convertNum된 값을 숫자로 변환 (1K -> 1000, 1M -> 1000000)
     * @param num
     * @return number
     */
    reconvertNum(num) {
        try {
            if (typeof num === 'number') {
                return num
            } else if (typeof num !== 'string') {
                return 0
            }

            if (num.includes('K')) {
                num = num.replace('K', '000')
                return Number(num)
            } else if (num.includes('M')) {
                num = num.replace('M', '000000')
                return Number(num)
            } else if (num.includes('B')) {
                num = num.replace('B', '000000000')
                return Number(num)
            } else if (num.includes('T')) {
                num = num.replace('T', '000000000000')
                return Number(num)
            } else {
                return Number(num)
            }
        } catch (e) {
            return num
        }
    },
    /**
     * CA 형식("yyyy^MM^dd")의 문자열을 쉼표 구분 형식("yyyy,MM,dd")으로 변환합니다.
     *
     * - 입력값이 `null` 또는 `undefined`인 경우, `defaultStr`이 설정되어 있다면 그것을 반환합니다.
     * - 입력값에 `^`가 포함되지 않은 경우, 문자열로 변환만 하고 그대로 반환합니다.
     *
     * @param {*} str - 변환할 입력값. 문자열이 아니어도 자동으로 문자열로 변환됩니다.
     * @param {string} [defaultStr=''] - 입력값이 `null` 또는 `undefined`일 경우 반환할 기본 문자열.
     * @returns {string} 변환된 문자열 또는 기본 문자열.
     *
     * @example
     * convertCaToComma("2025^08^04");        // "2025,08,04"
     * convertCaToComma(12345);               // "12345"
     * convertCaToComma(null, "-");           // "-"
     * convertCaToComma(undefined);           // ""
     * convertCaToComma("2025-08-04");        // "2025-08-04"
     */
    convertCaToComma(str, defaultStr = '') {
        if (str === null || str === undefined) return defaultStr;
        const s = String(str);
        return s.includes('^') ? s.replace(/\^/g, ',') : s;
    },
    /**
     * debounce 지원
     *
     * util.debounce()()로 사용
     *
     * @param callback 실행할 함수
     * @param limit debounce 될 시간
     * @param _this this 객체를 넘기기 위함
     * @return {(function(...[*]): void)|*}
     */
    debounce(callback, limit = 100, _this) {
        const v = _this
        return function (...args) {
            clearTimeout(v.timeout)
            v.timeout = setTimeout(function () {
                callback.apply(v, args)
            }, limit)
        }
    },
    /**
     * throttle 지원
     *
     * util.throttle()로 사용
     *
     * @param {Function} callback 실행할 함수
     * @param {number} delay throttle 될 시간(ms)
     * @return {Function} 제한된 호출 빈도로 실행되는 함수
     */
    throttle(callback, delay) {
        let timer
        return function () {
            if (!timer) {
                timer = setTimeout(_ => {
                    callback.apply(this, arguments)
                    timer = undefined
                }, delay)
            }
        }
    },
    /**
     * ms 단위 변환 min / hour
     * @param ms
     * @param decimalPrecision true면 소숫점 둘째자리까지 표시할지 여부
     * @param isPopup duration time들의 변환 여부 (0~59초: ms, 1분 이상: sec) / true면 최대 단위가 sec임!
     * @param isDetail 분 단위인 경우 3m이 아닌 3m 5s 로 상세히 보여줄지 여부 (사용자 분석에서 사용 됨)
     * @return {string}
     */
    convertTime(ms, decimalPrecision, isPopup, isDetail) {
        try {
            if (ms === undefined) {
                return '0ms';
            }
            ms = Math.round(Number(ms));

            if (isNaN(ms)) {
                return '0ms';
            }

            const sec = 1000;
            const min = 60 * sec;
            const hour = 60 * min;

            if (ms < sec) {
                return ms + 'ms';
            }

            if (isPopup) {
                // If isPopup is true, process up to seconds
                if (ms < min) {
                    return util.comma(ms) + 'ms';
                } else {
                    if (decimalPrecision) {
                        return (ms / sec).toFixed(2) + 's';
                    } else {
                        return util.comma(Math.round(ms / sec)) + 's';
                    }
                }
            } else {
                // Process all if conditions if isPopup is false
                if (ms >= sec && ms < min) {
                    if (decimalPrecision) {
                        let result = (ms / sec).toFixed(2); // 소수점 2자리까지 변환
                        return (result.endsWith('.00') ? parseInt(result) : result) + 's';
                    } else {
                        return util.comma(Math.round(ms / sec)) + 's';
                    }
                } else if (ms >= min && ms < hour) {
                    if (isDetail) {
                        const totalMinutes = ms / min;
                        const wholeMinutes = Math.floor(totalMinutes);
                        const remainingSeconds = Math.floor((totalMinutes - wholeMinutes) * 60);
                        return `${wholeMinutes}m ${remainingSeconds}s`;
                    } else {
                        return Math.round(ms / min) + 'm';
                    }
                } else {
                    if (isDetail) {
                        const totalHours = ms / hour;
                        const wholeHours = Math.floor(totalHours);
                        const remainingMinutes = Math.floor((totalHours - wholeHours) * 60);
                        return `${wholeHours}h ${remainingMinutes}m`;
                    } else {
                        return Math.round(ms / hour) + 'h';
                    }
                }
            }
        } catch (e) {
            return ms;
        }
    },

    /**
     * 단위 변환, convertTime된 값을 숫자로 변환 (1ms -> 1, 1s -> 1000, 1m -> 60000)
     * @param time convertTime으로 변환됐던 시간값
     * @return number
     */
    reConvertTime(time) {
        try {
            if (time === undefined) {
                return 0;
            }

            if (typeof time === 'number') {
                return time
            } else if (typeof time !== 'string') {
                return 0
            }

            time = time.replace(/ /g, '')
            time = time.replace('ms', 'x') // ms가 m과 s와 문자가 겹쳐서 x로 변환

            let ms, s, m, h
            ms = Number(time.substring(0, time.indexOf('x')))
            s = Number(time.substring(0, time.indexOf('s'))) * 1000
            m = Number(time.substring(0, time.indexOf('m'))) * 60000
            h = Number(time.substring(0, time.indexOf('h'))) * 3600000

            return ms + s + m + h
        } catch (e) {
            return time;
        }
    },

    setTablePct(memoryValue, storageValue) {
        $('.mini_progress_wrap').each(function () {
            const $v = $(this)
            $v.empty();

            const $wrap = $v.parent('.percentage_wrap')
            const $barWrap = $wrap.children()
            $barWrap.remove('.pct_txt')
            $barWrap.remove('.pct_mem_text')

            $v.append('<span class="bar"></span>');

            let type;
            const id = $wrap.prevObject[0].id
            if (['pMemoryUsage', 'tMemoryUsage', 'pMemUsage'].includes(id)) {
                type = 'memory'
                $wrap.append('<span class="pct_mem_text"></span>');
            } else if (['tStorageUsage', 'pStorageUsage'].includes(id)) {
                type = 'storage'
                $wrap.append('<span class="pct_mem_text"></span>');
            } else {
                $wrap.append('<span class="pct_txt"></span>');
            }

            let val = $v.attr('data-pct');
            if (val > 100) {
                val = 100
            }

            let color = $v.data('bgcolor');
            $v.css('border-color', color);
            const $bar = $v.find('.bar')
            $bar.animate({
                'background-color': color,
                width: val + '%'
            }, 1000);

            const $parent = $v.parent()
            $parent.find('.pct_txt').animate({val}, {
                duration: 1000,
                step: function () {
                    let number = Math.ceil(this.val);
                    $(this).text(number + '%');
                }
            });
            $parent.find('.pct_mem_text').animate({val}, {
                duration: 1000,
                step: function () {
                    let number = Math.ceil(this.val);
                    const $inner = $(this)
                    if (type === 'memory') {
                        $inner.text(memoryValue + ' (' + number + '%' + ')');
                    } else if (type === 'storage') {
                        $inner.text(storageValue + ' (' + number + '%' + ')');
                    }
                }
            });
        })
    },
    /**
     * '|' 문자열 -> 개행
     */
    convertToNewlines(str) {
        if (str) {
            return str.replace(/\|/g, '\n');
        }
    },
    splitByEscapeN(str) {
        if (str) {
            return str.replace(/\\n/g, '\n');
        }
    },
    upperCaseFirstChar(str) {
        if (!str) {
            return
        }
        const t = str.substring(0, 1).toUpperCase()
        const t2 = str.substring(1, str.length)
        return t + t2
    },
    // { key: value, key: value ~~ } 형식의 문자열을 개행/들여쓰기 해줌
    beautifyJson(str) {
        if (str) {
            try {
                str = JSON.parse(str)
                // 두 칸 들여쓰기
                str = JSON.stringify(str, null, 2)
                str = str.replace(/\\n/g, '\n');
                return str
            } catch (e) {
                return 'invalid json'
            }
        } else {
            return ''
        }
    },
    // JSON 형식의 문자열이면 true 리턴, 일반 문자열이면 false 리턴
    isJSONString(str) {
        try {
            const sanitizedJsonStr = str.replace(/\s+/g, '');
            JSON.parse(sanitizedJsonStr);
            return true;
        } catch (e) {
            return false;
        }
    },
    simOperatorNmFormat(cell) {
        let simOperatorNm = ''

        let val
        if (typeof cell === 'string') {
            val = cell.toLowerCase()
        } else {
            val = cell.getValue()
        }

        if (val.includes('skt')) {
            simOperatorNm = 'SKT'
        } else if (val.includes('kt')) {
            simOperatorNm = 'KT'
        } else if (val.includes('lg')) {
            simOperatorNm = 'LG U+'
        } else {
            simOperatorNm = '-'
        }
        return simOperatorNm
    },
    getEngMonth(val) {
        let month
        switch (val) {
            case '01':
                month = 'Jan'
                break;
            case '02':
                month = 'Feb'
                break;
            case '03':
                month = 'Mar'
                break;
            case '04':
                month = 'Apr'
                break;
            case '05':
                month = 'May'
                break;
            case '06':
                month = 'Jun'
                break;
            case '07':
                month = 'Jul'
                break;
            case '08':
                month = 'Aug'
                break;
            case '09':
                month = 'Sep'
                break;
            case '10':
                month = 'Oct'
                break;
            case '11':
                month = 'Nov'
                break;
            case '12':
                month = 'Dec'
                break;
        }
        return month
    },
    // tabulator에서 보여줄 앱명을 가져오는 함수
    getAppName(row) {
        if (row) {
            return getDisplayNm(row.getData().packageNm, row.getData().serverType)
        }
    },

    /**
     * Tabulator like 검색
     * @param tabluator 객체 (ex: v.table, TA0000.v.table...)
     * 함수를 사용하기 위해서 id가 'filter-field' selectBox 와 id가 'filter-value' 인 type이 'text'인 'input' 추가가 선행되어야함.
     * filter-field (검색할 헤더명), filter-value (검색어)
     */
    likeSearchTable(tabluator) {
        let fieldEl = document.getElementById("filter-field");
        let valueEl = document.getElementById("filter-value");
        let clearEl = document.getElementById("filter-clear");

        function updateFilter() {
            let filterVal = fieldEl.options[fieldEl.selectedIndex].value;

            if (filterVal) {
                tabluator.setFilter(filterVal, 'like', valueEl.value);
            }
        }

        fieldEl.addEventListener("change", updateFilter)
        valueEl.addEventListener("keyup", updateFilter)
        if (clearEl) {
            clearEl.addEventListener("click", function () {
                fieldEl.selectedIndex = 0;
                valueEl.value = "";

                tabluator.clearFilter();
            });
        }
    },
    tooltipFormatter(e, cell) {
        const rowData = cell.getRow().getData()

        // userId가 있는 경우만 툴팁 표시
        if (util.isEmpty(rowData.userId)
            || rowData.userId === '-'
            || util.isEmpty(rowData.clientNm)
            || rowData.clientNm === '-') {
            return
        }

        const userId = rowData.userId
        const clientNm = util.isEmpty(rowData.clientNm) ? '-' : rowData.clientNm
        const userNm = util.isEmpty(rowData.userNm) ? '-' : rowData.userNm
        const birthDay = util.isEmpty(rowData.birthDay) ? '-' : rowData.birthDay

        // user id에 mouseover 시 "clientNm, userNm, userId, birthday" 정보 툴팁에 표시
        return clientNm + ' / ' + userNm + ' / ' + userId + ' / ' + birthDay
    },
    toCamelCase(str) {
        return str.toLowerCase().replace(/[-_](.)/g, function (match, group1) {
            return group1.toUpperCase();
        })
    },
    /**
     * 현재 response time or rendering time이 평균 대비 몇 % 빠르고 느린지를 표정으로 나타내주는 함수
     * @param value
     * @return {string[]}
     */
    getFeeldex(value) {
        try {
            if (value === 0) {
                return ['<span class="feeldex very_good">', 'Very Good', 'very_good']
            } else if (value === 1) {
                return ['<span class="feeldex good">', 'Good', 'good']
            } else if (value === 2) {
                return ['<span class="feeldex normal">', 'Normal', 'normal']
            } else if (value === 3) {
                return ['<span class="feeldex bad">', 'Bad', 'bad']
            } else if (value === 4) {
                return ['<span class="feeldex very_bad">', 'Very Bad', 'very_bad']
            } else {
                return ['<span class="feeldex very_bad">', 'Very Bad', 'very_bad']
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * os type 별 loading / response time avg와 현재 duration time을 비교하여 얼마나 느리고 빠른지에 대한 값을 리턴해주는 함수
     * @param avg object
     * @param time number
     * @param osType string
     * @return {number}
     */
    getFeeldexCode(avg, time, osType) {
        let targetData
        // ostype에 맞는 데이터만 target data에 저장
        targetData = avg[osType]

        if (time <= targetData * 0.6) {
            return 0;
        } else if (time <= targetData * 0.8) {
            return 1;
        } else if (time <= targetData * 1.0) {
            return 2;
        } else if (time <= targetData * 1.2) {
            return 3;
        } else {
            return 4;
        }
    },
    /**
     * 로그분석, 성능분석, 사용자분석 화면 상단의 time stamp 세팅해주는 함수
     * @param isSearchClick 우측상단 search 팝업에서 시간이나 날짜를 바꾼지에 대한 여부
     * @param date 각 화면에서 사용하는 fromDate, toDate 객체
     * @param v 각 화면에서 사용하는 searchToDtHH 객체
     */
    initTimeBox(isSearchClick, date, v) {
        // 오늘날짜의 00:00:00를 timestamp로 변환
        const today = util.dateToTimestamp(util.getDate(0), true)
        // calendar의 시작날짜 + 00:00:00를 timestamp로 변환
        const prevParam = util.dateToTimestamp(new Date(date.from), true)
        // calendar의 종료날짜 + 00:00:00를 timestamp로 변환
        const nextParam = util.dateToTimestamp(new Date(date.to), true)
        // 현재 시간 (09:43 이면 09)
        const currentHour = Number(util.nowTime().substr(0, 2))

        // timestamp 찍어줄 그래프
        const $timeGraph = $('.time_line .graph_box li')

        // 종료날짜에 오늘이 포함된 경우 (오늘~오늘 또는 며칠 전~오늘 인 경우)
        if ((today === nextParam && today === prevParam)
            || (today === nextParam && today !== prevParam)) {
            $timeGraph.removeClass('on')
            $timeGraph.removeClass('last')
            for (let i = 0; i <= currentHour; i++) {
                $timeGraph.eq(i).addClass('on')
            }
            // 현재 시간에 진하게 칠해줌
            $timeGraph.eq(currentHour).addClass('last')

            if (!isSearchClick) {
                if (v) {
                    v.searchToDtHH = util.padding(currentHour)
                }
                $('#searchToDtHH').val(util.padding(currentHour))
            }
            // 시작, 종료날짜 모두 오늘 날짜가 포함이 안 된 경우 (며칠 전 ~ 며칠 전인 경우)
        } else if (today !== nextParam && today !== prevParam) {
            $timeGraph.removeClass('on')
            $timeGraph.removeClass('last')
            for (let i = 0; i < 24; i++) {
                $timeGraph.eq(i).addClass('on')
            }
        } else {
            const msg = i18next.tns('common.msg.incorrect')
            toast(msg)
        }
    },
    /**
     * 로그분석, 성능분석, 사용자분석 화면 상단의 time stamp 그려주는 함수
     */
    async createTimeStamp() {
        const $graphBoxs = $(".graph_box")
        for (let i = 1; i <= 24; i++) {
            if (i === 1 || i % 6 === 0) {
                $graphBoxs.append('<li><span class="time_no">' + i + '</span></li>')
            } else {
                $graphBoxs.append('<li></li>')
            }
        }
    },
    /**
     * 현재 feeldex cell에 상세 설명을 툴팁으로 나타내주는 함수
     * @param e
     * @param cell
     * @param avg (rendering avg 또는 response avg)
     * @return {string}
     */
    setFeeldexTooltip(e, cell, avg) {
        let feeldexValue = util.getFeeldex(avg)[1]
        const tmpFeeldex = feeldexValue.replace(/\s+/g, '').toLowerCase()
        const feeldexDetail = i18next.tns('common.tooltip.feeldex.' + tmpFeeldex)

        return '<div class="feeldex_tooltip">' + '<span class="' + tmpFeeldex + '">' + feeldexValue + '</span><br>' +
            '<span class="detail">' + feeldexDetail + '</span>' + '</div>'
    },
    /**
     * response time popup 하단의 차트를 그려주기 위한 데이터를 세팅해주는 함수
     * @param chartData 차트 x축, y축에 표시해줄 데이터 객체
     * @param detail 상위 5% , 하위 5% 를 담고있는 객체
     * @param responseTime
     * @return []
     */
    setResponseTimeChartData(chartData, detail, responseTime) {
        // top, detail, response time 값이 chartData 범위 바깥에 있는 경우 그래프에 표시가 안 되므로
        // 그래프에 표시해주기 위한 작업
        const chartDataToArray = Object.keys(chartData)
        const chartDataLength = chartDataToArray.length
        // 가장 첫번째 데이터
        const firstChartData = Number(chartDataToArray[0])
        // 가장 마지막 데이터
        const lastChartData = Number(chartDataToArray[chartDataLength - 1])

        // response time이 차트 데이터 중 가장 큰 값보다 더 크거나 가장 작은 값보다 더 작은 경우 그래프에 표시가 안되므로 차트에 넣어줌
        if (responseTime > lastChartData
            || responseTime < firstChartData) {

            const k = Math.floor(responseTime / 10) * 10
            if (!chartData[k]) {
                chartData[k] = 0
            }
        }

        // 차트에 보여줄 데이터에 맞는 형식으로 변환
        let seriesData = []
        for (let key in chartData) {
            if (chartData.hasOwnProperty(key)) {
                const value = chartData[key]
                seriesData.push({
                    x: +key,
                    y: +value
                });
            }
        }

        return seriesData
    },
    removeMaxyCursor() {
        const $cursor = $('.maxy_cursor_dots')
        if ($cursor.css('display') === 'block') {
            cursor.hide()
        }
    },
    /**
     * packageNm 객체에 따른 packageNm, serverType 반환
     * @param selector '#packageNm' string
     * @param osTypeSelector= '#osType' string
     * @returns {{serverType: (*|string), packageNm: (*|string), osType: (*|string)}}
     */
    getAppInfo(selector, osTypeSelector) {
        const packageNm = $(selector).val()
        const serverType = $(selector + ' option:checked').data('server-type')
        let osType = undefined
        if (osTypeSelector) {
            osType = $(osTypeSelector).val()
        }
        return {packageNm, serverType, osType}
    },
    chartLoading(chart, flag) {
        try {
            if (!chart) {
                console.log('no chart')
                return
            }
            if (flag) {
                chart.showLoading('<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>')
            } else {
                chart.hideLoading()
            }
        } catch (e) {
            console.log(e)
        }
    },
    /**
     * uuid 문자열 반환
     * @returns {string}
     */
    uuid() {
        return Math.random().toString()
    },
    /**
     * Calculates date-related parameters based on the provided timestamps.
     *
     * @param {number} from - The starting timestamp.
     * @param {number} to - The ending timestamp.
     * @returns {{yesterdayFrom: number, yesterdayTo: number, totalFrom: number, totalTo: (number|number), from: number, to: number}} An object containing calculated date parameters.
     */
    calculateDateRanges(from, to) {
        const toDate = (timestamp) => new Date(timestamp); // 타임스탬프를 Date 객체로 변환
        const startOfDay = (date) => new Date(date.setHours(0, 0, 0, 0)).getTime(); // 00:00:00.000 타임스탬프
        const endOfDay = (date) => new Date(date.setHours(23, 59, 59, 999)).getTime(); // 23:59:59.999 타임스탬프

        const fromDate = toDate(from);
        const toDateObj = toDate(to);

        // 어제 날짜 계산
        const yesterday = new Date(fromDate);
        yesterday.setDate(yesterday.getDate() - 1);

        const yesterdayFrom = startOfDay(new Date(yesterday));
        const yesterdayTo = endOfDay(new Date(yesterday));

        // 총 시간 계산
        const totalFrom = startOfDay(new Date(fromDate));
        const today = new Date();
        const totalTo = toDateObj.toDateString() === today.toDateString()
            ? to
            : endOfDay(new Date(toDateObj));

        // from: from timestamp
        // to: to timestamp

        // yesterdayFrom: from 이 속해 있는 날짜의 어제 일자의 00시 00분 00.000초의 timestamp
        // yesterdayTo: to 가 속해 있는 날짜의 어제 일자의 23시 59분 59.999초의 timestamp

        // totalFrom: from 이 속해 있는 날짜의 00시 00분 00.000초의 timestamp
        // totalTo: to 가 오늘이면 to, 오늘이 아니라면 to 가 속해 있는 날짜의 23시 59분 59.999초의 timestamp

        return {yesterdayFrom, yesterdayTo, totalFrom, totalTo, from, to};
    },
    /**
     * 로그 상세에서 logType을 카테고리로 변환하는 유틸 함수
     * @param logType
     * @returns {string}
     */
    logTypeToCategory(logType) {
        switch (+logType) {
            // WebNavigation,Error
            case 131076:
            // WebNavigation,Script Error
            case 131077:
                return 'Web'
            // HttpRequest,Error,
            case 524292:
                return 'Network'
            // NativeAction,Error
            case 1048579:
                return 'In App'
            // Native,Crash
            case 2097152:
                return 'Crash'
            // Custom Tag,Error
            case 4194306:
                return 'Etc.'
            default:
                return 'Unknown'
        }
    },
    /**
     * 문자열을 특수 문자 및 공백 없애서 반환
     * @param str
     */
    cleanString(str) {
        if (typeof str !== "string") return ""
        return str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    },
    isError(logType) {
        const validNumbers = new Set([
            // T_WebNav_Error, T_WebNav_Java_Error, T_Http_Error, T_Native_Action_Error,
            131076, 131077, 524292, 1048579,
        ]);

        // 숫자로 변환 가능한 경우 변환 후 체크
        return validNumbers.has(Number(logType));
    },
    isCrash(logType) {
        const validNumbers = new Set([
            2097152
        ]);

        // 숫자로 변환 가능한 경우 변환 후 체크
        return validNumbers.has(Number(logType));
    },
    maskDeviceId(deviceId) {
        const parts = deviceId.split('-');
        return `${parts[0]}-****-${parts[parts.length - 1]}`
    },
    getCookie(name) {
        const cookies = document.cookie.split("; ")
        for (const cookie of cookies) {
            const [key, value] = cookie.split("=")
            if (key === name) {
                return decodeURIComponent(value)
            }
        }
        return null
    }
}

const valid = {
    /**
     * 이메일 검증
     * @param $email email jquery 객체
     */
    email($email) {
        const email = $email.val()
        if (util.isEmpty(email)) {
            util.emptyInput($email)
            return false
        }
        const regExp = /^[\da-zA-Z]([-_.]?[\da-zA-Z])*@[\da-zA-Z]([-_.]?[\da-zA-Z])*.[a-zA-Z]{2,3}$/i

        if (email.match(regExp) != null) {
            return true
        } else {
            util.emptyInput($email)
            return false
        }
    },
    /**
     * 숫자 검증
     * @param str
     * @returns {boolean}
     */
    number(str) {
        const regex = /^[0-9]+$/
        return regex.test(str + '')
    },
    /**
     * 한글 제외 검증
     * @param str
     * @returns {boolean}
     */
    noKorean(str) {
        const regex = /^[a-zA-Z0-9\-_.]+$/
        return regex.test(str + '')
    },
    /**
     * Validates if the provided `uuid` matches the `uuid` in the headers.
     *
     * @param {string} uuid - The UUID to validate.
     * @param {Object} headers - The headers object containing a `uuid` field.
     * @param {string} headers.uuid - The UUID from the headers to compare.
     * @returns {boolean} `true` if the `uuid` matches the headers' `uuid`, otherwise `false`.
     */
    uuid(uuid, headers) {
        if (!uuid) {
            console.error('No UUID provided.');
            return false;
        }

        if (!headers || typeof headers.uuid !== 'string') {
            console.error('Invalid or missing headers.');
            return false;
        }

        return headers.uuid === uuid;
    }
}

const checkNaN = (value) => {
    if (isNaN(value) || value < 0) {
        return 0
    } else {
        return value
    }
}

/**
 * 차트 간 크로스헤어(crosshair) 동기화를 위한 유틸리티 클래스
 */
const ChartSyncUtils = {
    /**
     * 차트 간 크로스헤어 동기화 설정
     * @param {Object|Array} sourceCharts - 이벤트 소스가 될 차트 객체 또는 배열
     * @param {Array|Function} getSyncCharts - 동기화할 차트 배열 또는 차트 배열을 반환하는 함수
     */
    setupCrosshairSync(sourceCharts, getSyncCharts) {
        // 배열이 아니면 배열로 변환
        const sources = Array.isArray(sourceCharts) ? sourceCharts : [sourceCharts];

        // 모든 차트의 크로스헤어 숨기는 함수
        function hideCrosshairs() {
            // 동기화할 차트 목록 가져오기 (함수 또는 배열)
            const syncCharts = typeof getSyncCharts === 'function'
                ? getSyncCharts()
                : getSyncCharts;

            // 모든 차트의 크로스헤어 숨기기
            syncCharts.forEach(chart => {
                if (chart && chart.xAxis && chart.xAxis[0]) {
                    // 크로스헤어 숨기기
                    chart.xAxis[0].hideCrosshair();
                }
            });
        }

        // 차트 간 crosshair 동기화 함수
        function syncCrosshairs(e, chart) {
            // e.chartX는 마우스 포인터의 X 좌표
            const xValue = chart.xAxis[0].toValue(e.chartX);

            // 동기화할 차트 목록 가져오기 (함수 또는 배열)
            const syncCharts = typeof getSyncCharts === 'function'
                ? getSyncCharts()
                : getSyncCharts;

            syncCharts.forEach(syncChart => {
                if (syncChart && syncChart !== chart) {
                    const point = syncChart.xAxis[0].toPixels(xValue);

                    // crosshair 위치 업데이트
                    if (typeof syncChart.xAxis[0].drawCrosshair === 'function') {
                        syncChart.xAxis[0].drawCrosshair({chartX: point, chartY: e.chartY});
                    }
                }
            });
        }

        // 각 소스 차트에 이벤트 리스너 등록
        sources.forEach(chart => {
            if (chart && chart.container) {
                // mousemove 이벤트 리스너 등록 (크로스헤어 동기화)
                chart.container.addEventListener('mousemove', function (e) {
                    // 차트의 좌표계로 변환
                    const coords = chart.pointer.normalize(e)
                    syncCrosshairs(coords, chart)
                })

                // mouseout 이벤트 리스너 등록 (크로스헤어 제거)
                chart.container.addEventListener('mouseout', function () {
                    hideCrosshairs()
                })

                // 추가적인 안전장치로 mouseleave 이벤트도 처리
                chart.container.addEventListener('mouseleave', function () {
                    hideCrosshairs()
                })
            }
        });
    }
}

const emailUtils = {
    /**
     * 이메일 유효성 검사 함수
     * 이메일 주소가 올바른 형식인지 확인합니다.
     *
     * @param {string} email - 검사할 이메일 주소
     * @returns {boolean} - 유효성 검사 결과 (유효하면 true, 아니면 false)
     */
    validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },

    /**
     * 이메일 입력 유효성 검사
     * 입력된 이메일 주소가 유효한지 확인합니다.
     *
     * @param {string} email - 검사할 이메일 주소
     * @returns {boolean} - 유효성 검사 결과
     */
    validateEmailInput(email) {
        if (!email) return true;
        return emailUtils.validateEmail(email);
    },

    /**
     * 이메일 목록 유효성 검사
     * 쉼표로 구분된 이메일 목록이 모두 유효한지 확인합니다.
     *
     * @param {string} emailStr - 쉼표로 구분된 이메일 문자열
     * @param {string} errorElementId - 오류 메시지를 표시할 요소의 ID
     * @returns {boolean} - 유효성 검사 결과
     */
    validateEmailList(emailStr, errorElementId) {
        if (!emailStr) return true; // 빈 문자열은 유효함 (필수 아닌 경우)

        const emails = emailStr.split(',').map(e => e.trim());
        const invalidEmails = emails.filter(email => email && !emailUtils.validateEmail(email));

        if (invalidEmails.length > 0) {
            $('#' + errorElementId).text(trl('common.msg.invalid.email') + ': ' + invalidEmails.join(', ')).show();
            return false;
        }

        $('#' + errorElementId).hide();
        return true;
    },

    /**
     * 이메일 태그 시스템 초기화
     * 이메일 입력 필드와 태그 컨테이너를 초기화하고 이벤트 핸들러를 설정합니다.
     *
     * @param {Object} config - 설정 객체
     * @param {string} config.containerSelector - 태그 컨테이너 선택자
     * @param {string} config.inputSelector - 입력 필드 선택자
     * @param {string} config.hiddenFieldSelector - 히든 필드 선택자
     * @param {string} config.errorSelector - 오류 메시지 요소 선택자
     * @param {Function} config.addTagFunction - 태그 추가 함수
     */
    initEmailTagsSystem(config) {
        const $container = $(config.containerSelector);
        const $input = $(config.inputSelector);
        const $hiddenField = $(config.hiddenFieldSelector);
        const $errorElement = $(config.errorSelector);

        // 기존 태그 및 입력값 초기화
        $container.find('.email-tag').remove();
        $input.val('');
        $hiddenField.val('');
        $errorElement.hide();

        // 이메일 입력 이벤트 처리 - Enter 키 또는 쉼표 키 입력 시 태그 생성
        $input.off('keydown').on('keydown', function (e) {
            const key = e.which || e.keyCode;

            // Enter 키 또는 쉼표 키 입력 시
            if (key === 13 || key === 188) {
                e.preventDefault();

                const input = $(this).val().trim();
                if (input) {
                    // 쉼표로 구분된 여러 이메일 처리
                    const emails = input.split(',');

                    emails.forEach(email => {
                        const trimmedEmail = email.trim();
                        if (trimmedEmail) {
                            config.addTagFunction(trimmedEmail, config);
                        }
                    });

                    // 입력 필드 초기화
                    $(this).val('');
                }
            }
        });

        // 이메일 태그 컨테이너 클릭 시 입력 필드에 포커스 - 사용자 편의성 향상
        $container.on('click', function (e) {
            if (e.target === this) {
                $input.focus();
            }
        });

        // 붙여넣기 이벤트 처리 - 여러 이메일을 한 번에 붙여넣을 수 있도록 지원
        $input.on('paste', function (e) {
            // 붙여넣기 후 약간의 지연을 두고 처리
            setTimeout(() => {
                const input = $(this).val().trim();
                if (input.includes(',')) {
                    e.preventDefault();

                    const emails = input.split(',');
                    emails.forEach(email => {
                        const trimmedEmail = email.trim();
                        if (trimmedEmail) {
                            config.addTagFunction(trimmedEmail, config);
                        }
                    });

                    // 입력 필드 초기화
                    $(this).val('');
                }
            }, 100);
        });

        // 포커스 아웃 시 입력된 이메일 처리 - 입력 중인 이메일이 있으면 태그로 변환
        $input.on('blur', function () {
            const input = $(this).val().trim();
            if (input) {
                // 쉼표로 구분된 여러 이메일 처리
                const emails = input.split(',');

                emails.forEach(email => {
                    const trimmedEmail = email.trim();
                    if (trimmedEmail) {
                        config.addTagFunction(trimmedEmail, config);
                    }
                });

                // 입력 필드 초기화
                $(this).val('');
            }
        });
    },

    /**
     * 이메일 태그 추가 함수
     * 유효한 이메일 주소를 태그로 추가합니다.
     *
     * @param {string} email - 추가할 이메일 주소
     * @param {Object} config - 설정 객체
     */
    addEmailTag(email, config) {
        const $container = $(config.containerSelector);
        const $input = $(config.inputSelector);
        const $errorElement = $(config.errorSelector);

        // 이메일 유효성 검사
        if (!emailUtils.validateEmailInput(email)) {
            // 유효하지 않은 이메일 주소는 추가하지 않음
            $errorElement.text(trl('common.msg.invalid.email') + ': ' + email).show();
            setTimeout(() => {
                $errorElement.hide();
            }, 3000); // 3초 후 에러 메시지 숨김
            return;
        }

        // 이미 존재하는 태그인지 확인
        let isDuplicate = false;
        $container.find('.email-tag').each(function () {
            if ($(this).data('email') === email) {
                isDuplicate = true;
                return false; // each 루프 종료
            }
        });

        if (isDuplicate) return;

        // 새 태그 생성
        const $tag = $('<div class="email-tag" data-email="' + email + '">' +
            email +
            '<span class="remove-tag">&times;</span></div>');

        // 태그 삭제 이벤트
        $tag.find('.remove-tag').on('click', function () {
            $(this).parent().remove();
            emailUtils.updateHiddenEmailField(config);
        });

        // 태그 추가
        $tag.insertBefore($input);

        // 히든 필드 업데이트
        emailUtils.updateHiddenEmailField(config);

        // 에러 메시지 숨김
        $errorElement.hide();
    },

    /**
     * 히든 이메일 필드 업데이트 함수
     * 현재 태그 컨테이너에 있는 모든 이메일 태그를 수집하여 히든 필드에 설정합니다.
     *
     * @param {Object} config - 설정 객체
     */
    updateHiddenEmailField(config) {
        const $container = $(config.containerSelector);
        const $hiddenField = $(config.hiddenFieldSelector);

        const emails = [];
        $container.find('.email-tag').each(function () {
            emails.push($(this).data('email'));
        });

        $hiddenField.val(emails.join(','));
    }
}

const idDisplay = {
    /**
     * 표시할 ID를 결정하는 내부 헬퍼 함수.
     * @param {string | number | null | undefined} userId
     * @param {string | number | null | undefined} clientNo
     * @returns {string | number} 표시할 ID 또는 '-'
     * @private
     */
    _getDisplayId(userId, clientNo) {
        // ID가 유효한지 확인하는 함수 (null, undefined, '', '-'가 아니어야 함)
        const isValidId = (id) => id != null && id !== '' && id !== '-';

        if (isValidId(userId)) {
            return userId;
        }
        if (isValidId(clientNo)) {
            return clientNo;
        }
        return '-';
    },

    // userId 또는 clientNo 중 표시할 ID 결정
    getId(cell) {
        // 1. cell 객체나 getData 메소드가 없는 경우 방어
        if (!cell?.getData) {
            return '-';
        }
        const data = cell.getData();

        // 2. getData()의 반환 값이 null/undefined인 경우 방어
        if (!data) {
            return '-';
        }

        return idDisplay._getDisplayId(data.userId, data.clientNo);
    },

    // DOM에 표시
    apply(userId, clientNo) {
        const displayId = idDisplay._getDisplayId(userId, clientNo);
        const $label = $('div:has(#pUserId) > p');

        $('#pUserId').text(displayId);

        // ID 값에 따라 레이블을 동적으로 변경
        if (displayId !== '-' && displayId === userId) {
            $label.text('User ID');
        } else if (displayId !== '-' && displayId === clientNo) {
            $label.text('Client No');
        }
    }
}
