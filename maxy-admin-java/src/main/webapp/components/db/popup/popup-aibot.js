/*
    종합 분석 > Aibot > 팝업
 */
class MaxyAibot {
    constructor(options) {
        this.id = options.id
        this.appendId = options.appendId
        this.typingTimeout = null
        this.data = options.data
        this.packageNm = options.packageNm
        this.type = options.type

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    addEventListener() {
        const v = this
        $('.aibot_dimmed, #btnSkip').on('click', () => {
            v.closePopup(v)
        })

        v.aibotSwiper = new Swiper('#aibotSwiper', {
            pagination: {
                el: '.swiper-pagination',
                clickable: false // 페이지네이션 클릭 비활성화
            },
            allowTouchMove: false, // 터치 슬라이드 비활성화
            simulateTouch: false,  // 데스크톱에서 드래그 비활성화
        })
    }

    async init() {
        const v = this
        const {id, appendId} = v

        const source = await fetch(
            '/components/db/popup/popup-aibot.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }

        $target.empty()
        $target.append(template({id, appendId}))
    }

    async openPopup() {
        const {id} = this
        /* ai bot 아이콘 누르면
            1. 아이콘 확장
            2. 확장된 위치 위에서만큼 팝업 열려야함
       */
        const $aibotDimmed =  $('.aibot_dimmed')

        $('#btnAibot').hide()
        $aibotDimmed.show()

        const $target = $('#' + id + '__popup')
        // $target.show()
        $target.addClass('show')
        $('#iconAibot').show()
        await util.sleep(200)

        this.setData()
    }

    setData() {
        const v = this

        try {
            // 슬라이드가 추가될 타겟 요소
            const $target = $('.aibot_swiper_wrapper .swiper-wrapper')
            // 데이터를 가져옴
            let data = v.data

            let result
            // v.type이 없을때만 체크함. (종합분석에서 aibot 누른경우), 시간돼서 자동으로 뜨면 v.type이 sse임
            if (!v.type) {
                // 서버에 보낸 패키지명과 받은 패키지명이 같은 경우만 보여준다.
                const packageNm = v.packageNm ? v.packageNm : sessionStorage.getItem('packageNm')
                result = data.filter(item => item.packageNm === packageNm)
            } else {
                result = data
            }

            try {
                // 데이터를 순회하며 슬라이드 추가
                for (let i = 0; i < result.length; i++) {
                    const msg = result[i]['msg'] + 'popup'    // 메시지 텍스트와 'popup' 추가
                    const parameter = result[i]['parameter'] // 파라미터 값 가져오기

                    // 슬라이드 HTML 생성 후 추가
                    $target.append('<div class="swiper-slide">' +
                        '<div class="aibot_data_wrap">' +
                        '<div class="aibot_data">' +
                        '<div class="top" id="slide' + i + '">' + trl(msg, parameter) +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>')
                }

                // 총 슬라이드 개수 표시
                $('#allPage').text(result.length)
                // 현재 페이지 번호 초기화
                $('#pageNo').text('1')
                // 첫 슬라이드에 텍스트 타이핑 효과 시작
                v.typeText('slide0', trl(result[0].msg + 'popup', result[0].parameter), () => {
                    // 다음 슬라이드로 이동하는 타이머 설정
                    v.firstNextSlideTimeout = setTimeout(() => {
                        if(v.aibotSwiper == null) return
                        v.aibotSwiper.slideNext() // 다음 슬라이드로 이동
                    }, 2000) // 2초 대기 후 이동
                })

                // slideChange 이벤트 핸들러 추가
                v.aibotSwiper.on('slideChange', () => {
                    const currentIndex = v.aibotSwiper.realIndex // 현재 슬라이드 인덱스 가져오기
                    $('#pageNo').text(currentIndex + 1) // 현재 페이지 번호 갱신

                    // 두 번째 페이지로 넘어간 경우 첫번째 페이지의 setTimeout 제거
                    if (currentIndex === 1) {
                        clearTimeout(v.firstNextSlideTimeout)
                        v.firstNextSlideTimeout = null
                    }
                    // 기존 타이핑 타이머 제거
                    clearTimeout(v.typingTimeout)
                    v.typingTimeout = null

                    // 현재 슬라이드의 메시지 가져오기
                    const currentMessage = result[currentIndex].msg + 'popup'
                    const currentParameter = result[currentIndex].parameter

                    // 모든 슬라이드의 top 텍스트 초기화
                    $('.top').html('')

                    // 슬라이드 변경 시 애니메이션 재시작
                    v.typeText(`slide${currentIndex}`, trl(currentMessage, currentParameter), function () {

                        // 마지막 슬라이드에서 팝업 닫기
                        if (currentIndex === v.aibotSwiper.slides.length - 1) {
                            v.popupTimeout = setTimeout(function () {
                                v.closePopup(v)
                            }, 2000) // 2초 후 팝업 닫기
                        } else {
                            // 다음 슬라이드로 이동하는 타이머 설정
                            v.typingTimeout = setTimeout(() => {
                                v.aibotSwiper.slideNext() // 다음 슬라이드로 이동
                            }, 2000) // 2초 대기 후 이동
                        }
                    })
                })
            } catch (e) {
                console.log(e)
                console.log(data)
            }

        } catch (e) {
            console.log(e)
        }
    }

    typeText(elementId, htmlContent, callback) {
        try {
            const $element = $(`#${elementId}`)
            $element.html('') // 기존 내용 초기화

            // 태그와 일반 텍스트를 분리하여 배열로 저장
            const parts = htmlContent.split(/(<[^>]+>[^<]*<\/[^>]+>|<[^>]+>)/g).filter(part => part)
            let partIndex = 0

            // 타이핑 시작
            this.typeNextPart($element, parts, partIndex, 80, callback)
        } catch (e) {
            console.log(e)
        }
    }

    typeNextPart($element, parts, partIndex, typingSpeed, callback) {
        try {
            if (partIndex < parts.length) {
                const currentPart = parts[partIndex] // 현재 처리 중인 부분 가져오기

                if (currentPart === '<br>') {
                    // 개행 처리
                    $element.append('<br>') // `<br>` 태그 추가
                    partIndex++
                    this.typeNextPart($element, parts, partIndex, typingSpeed, callback) // 다음 부분 처리
                } else if (currentPart.startsWith('<') && currentPart.includes('</')) {
                    // 태그 내부의 텍스트와 함께 처리 (e.g., <span>text</span>)
                    const match = currentPart.match(/(<[^>]+>)([^<]+)(<\/[^>]+>)/)
                    const openingTag = match[1] // 시작 태그
                    const innerText = match[2] // 내부 텍스트
                    const closingTag = match[3] // 종료 태그

                    // 시작 태그 추가
                    $element.append(openingTag)

                    // 내부 텍스트를 한 글자씩 타이핑
                    this.typeNextChar($element, innerText, 0, char => {
                        $element.find('span.highlight').last().append(char)
                    }, () => {
                        // 종료 태그 추가 후 다음 부분 처리
                        $element.append(closingTag)
                        partIndex++
                        this.typeNextPart($element, parts, partIndex, typingSpeed, callback)
                    }, typingSpeed)
                } else {
                    // 일반 텍스트 처리
                    this.typeNextChar($element, currentPart, 0, char => {
                        $element.append(char)
                    }, () => {
                        partIndex++
                        this.typeNextPart($element, parts, partIndex, typingSpeed, callback)
                    }, typingSpeed)
                }
            } else if (callback) {
                callback() // 모든 타이핑 완료 후 콜백 실행
            }
        } catch (e) {
            console.log(e)
        }
    }

    typeNextChar($element, text, charIndex, appendCharCallback, onComplete, typingSpeed) {
        const v = this

        try {
            if (charIndex < text.length) {
                appendCharCallback(text.charAt(charIndex)) // 한 글자 추가
                v.typingTimeout = setTimeout(() => {
                    v.typeNextChar($element, text, charIndex + 1, appendCharCallback, onComplete, typingSpeed)
                }, typingSpeed) // 다음 글자 추가를 위한 타이머 설정
            } else if (onComplete) {
                onComplete() // 완료 콜백 실행
            }
        } catch (e) {
            console.log(e)
        }
    }

    // 팝업 닫기 함수
    closePopup(v) {
        const popup = '#' + v.id + '__popup'
        const div = popup + ' div'
        const span = popup + ' span'

        $('#btnAibot').show()
        const $dimmed = $('.aibot_dimmed')

        clearTimeout(v.typingTimeout)
        v.typingTimeout = null

        clearTimeout(v.popupTimeout)
        v.popupTimeout = null

        util.removeMaxyCursor()

        $(div).text('')
        $(span).text('')

        if (v.aibotSwiper) {
            v.aibotSwiper.destroy(true, true)
            v.aibotSwiper = null
        }

        $dimmed.off('click')
        $dimmed.hide()

        $(popup).removeClass('show')
        $(popup).addClass('hidden')

        // 애니메이션이 끝난 후 실행
        $(popup).on('animationend', function () {
            if ($(this).hasClass('hidden')) {
                $('#iconAibot').hide() // 아이콘 숨기기
                $(this).off('animationend') // 이벤트 핸들러 제거 (중복 방지)
            }
        })
    }
}