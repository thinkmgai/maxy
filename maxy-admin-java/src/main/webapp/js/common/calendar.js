'use strict';

/**
 * add calendar
 * @param {id: string, type: string, fn: function, created: function=} params
 */
const calendar = {
    init(params) {
        const {id, type, checkedDate, fn, created} = params
        let {minDate, maxDate} = params // yyyy-MM-dd 형식
        let selector = '#' + id
        let timeSelector = 't__' + id
        const $selector = $(selector)
        $selector.attr('readonly', true)
        const checkDark = $('body').hasClass('dark_mode') ? 'dark' : 'light'

        // 보고서, 종합분석 > basicInformation 차트 내 캘린더인 경우 최대 선택 가능한 날짜를 어제로 설정!!
        if (id === 'rtCalendar'
            || id.includes('bi')
            || id.includes('Error')
            || id.includes('Crash')) {
            maxDate = util.getDateToString(util.getDate(-1))
        } else if (maxDate === undefined) {
            maxDate = util.getDateToString()
        }

        if (minDate === undefined) {
            minDate = ''
        }

        // 보고서, 종합분석의 Basic Information 상세 팝업인 경우 오늘이 아닌 최대 어제 날짜로 조회 가능하도록 수정
        const options = {
            settings: {
                range: {
                    min: minDate,
                    max: maxDate
                },
                iso8601: false,
                visibility: {
                    theme: checkDark,
                },
                selected: {
                    dates: checkedDate ? checkedDate : [maxDate],
                    time: timeSelector === 't__searchFromDtWrap' ? '00:00' : '',
                }
            },
            locale: {
                months: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
            },
            actions: {
                clickDay(e, self) {
                    let min = 0, max = 0
                    const dates = self.selectedDates
                    if (dates.length === 0 || dates[0] === undefined) {
                        return
                    }

                    // 종합분석 > Basic Information > CCU 팝업인 경우,
                    // 하루 선택은 당일 날짜 선택이 가능하지만, 범위 선택인 경우 당일이 포함될 수 없다
                    // max 날짜가 today와 같은 경우 dates.pop() 하여 오늘 날짜를 제거
                    if (id.includes('Ccu')) {
                        const today = util.getDateToString()

                        // max 날짜가 today와 같고, 범위 선택인 경우만 적용 (범위 선택이면 이틀 이상이니까 length가 2부터 시작)
                        if (today === dates[dates.length - 1]
                            && dates.length > 1) {
                            toast(trl('dashboard.msg.rangeSelection'))
                            dates.pop()
                        }
                    }

                    dates.forEach(date => {
                        const t = new Date(date).getTime()
                        if (min === 0 || t < min) {
                            min = t
                        }
                        if (max < t) {
                            max = t
                        }
                    })

                    min = util.getDateToString(new Date(min))
                    max = util.getDateToString(new Date(max))

                    if (fn) {
                        fn(dates, {min, max})
                    }

                    if (type !== 'single') {
                        $selector.val(min + ' ~ ' + max)
                    } else {
                        $selector.val(min)
                    }

                    $('.calendar_dimmed').hide()
                },
                changeToInput(e, self) {
                    const dates = self.selectedDates
                    // 선택한 날짜가 오늘 이후면 오늘날짜로 설정

                    const today = util.getDateToString(0)

                    const $searchFromDt = $('#searchFromDt')
                    const $searchToDt = $('#searchToDt')
                    const searchFromDt = $searchFromDt.val()
                    const searchToDt = $searchToDt.val()

                    // 시작일이 종료일보다 크면 종료일을 시작일과 같게 설정
                    if ($searchFromDt.length > 0) {
                        if (searchFromDt > searchToDt) {
                            const date = new Date(searchFromDt)
                            let hours = date.getHours()
                            let minutes = date.getMinutes()

                            if (hours < 10) {
                                hours = '0' + hours
                            }

                            if (minutes < 10) {
                                minutes = '0' + minutes
                            }

                            if (searchToDt === today) {
                                $('#searchToDtHH').val(hours)
                                $('#searchToDtmm').val(minutes)
                            } else {
                                $('#searchToDtHH').val('23')
                                $('#searchToDtmm').val('59')
                            }
                            $searchToDt.val(searchFromDt)
                            search.v.toCalendar.settings.selected.dates = []
                            search.v.toCalendar.settings.selected.dates.push(searchFromDt)
                            search.v.toCalendar.update({year: true, month: true, dates: true})
                        }
                    }

                    if (today === $searchToDt.val()
                        && $searchToDt.css('display') === 'block') {
                        const date = new Date()
                        let hours = date.getHours()
                        let minutes = date.getMinutes()

                        if (hours < 10) {
                            hours = '0' + hours
                        }
                        if (minutes < 10) {
                            minutes = '0' + minutes
                        }

                        $('#searchToDtHH').val(hours)
                        $('#searchToDtmm').val(minutes)
                    }

                    // single 타입인 경우 날짜 선택하면 캘린더 닫기
                    if (type === 'single' && dates[0]) {
                        self.hide()
                    }
                },
                changeTime(e, time, hour, minutes) {
                    const id = e.target.closest('.vanilla-calendar-time').parentNode.id
                    const $searchFromDtHH = $('#searchFromDtHH')
                    const $searchToDtHH = $('#searchToDtHH')
                    const $searchFromDtmm = $('#searchFromDtmm')
                    const $searchToDtmm = $('#searchToDtmm')

                    if (id === 't__searchFromDtWrap') {
                        $searchFromDtHH.val(hour)
                        $searchFromDtmm.val(minutes)
                    } else if (id === 't__searchToDtWrap') {
                        $searchToDtHH.val(hour)
                        $searchToDtmm.val(minutes)
                    }
                }
            },
            DOMTemplates: {
                default: `
							<div class="vanilla-calendar-header">
								<#ArrowPrev />
								<div class="vanilla-calendar-header__content ">
									 <#Year />.<#Month />
								</div>
								<#ArrowNext />
							</div>
							<div class="vanilla-calendar-wrapper">
								<div class="vanilla-calendar-content">
									<#Week />
									<#Days />
									<div id=` + timeSelector + `>
									<#ControlTime />
                                    </div>
								</div>
							</div>
						`,
                month: `
							<div class="vanilla-calendar-header">
								<div class="vanilla-calendar-header__content">
									 <#Year />.<#Month />
								</div>
							</div>
							<div class="vanilla-calendar-wrapper">
								<div class="vanilla-calendar-content">
									<#Months />
								</div>
							</div>
						`,
                year: `
							<div class="vanilla-calendar-header">
								<#ArrowPrev />
								<div class="vanilla-calendar-header__content">
									 <#Year />.<#Month />
								</div>
								<#ArrowNext />
							</div>
							<div class="vanilla-calendar-wrapper">
								<div class="vanilla-calendar-content">
									<#Years />
								</div>
							</div>
						`
            }
        }

        // input이 있는 경우는 id가 calendar인 경우
        // ex) 보고서는 input이 필요 없음 -> id가 rtCalendar임
        if (id !== 'rtCalendar' && id !== 'scheduledStartDateCalendar') {
            options.input = true
        }
        // searchToDt가 없는 당일 검색의 경우 달력 선택을 막음.
        if ($('#searchToDt').css('display') === 'none' && timeSelector === 't__searchToDtWrap') {
            options.settings.selection.day = false
        }
        // single type 이 아니면 다중 선택 활성화
        if (type !== 'single') {
            options.settings.selection = {
                day: 'multiple-ranged'
            }
        }

        // 캘린더 생성
        const cal = new VanillaCalendar(selector, options)
        cal.init()

        $('#' + id + 'Btn').on('click', function () {
            $(selector).trigger('click')
        })

        if (created) {
            created()
        }

        return cal
    }
}