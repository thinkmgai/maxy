class MaxyLogDetailSlide {
    constructor(options) {
        this.id = options.id
        this.logDetailData = null

        if (!this.id) {
            console.log('check parameter', this)
            return false
        }

        this.init().then(() => {
            this.addEventListener()
        })
    }

    async init() {
        const {id} = this

        const source = await fetch('/templates/logDetailSlide.html').then(res => res.text())
        const template = Handlebars.compile(source)

        const $target = $('#' + id)
        if (!$target.length) {
            console.warn('Missing element for id:', id)
            return
        }

        $target.empty().append(template({id}))
    }

    addEventListener() {
        // 다국어 적용
        updateContent()
    }

    async setData(logDetailContentsData) {
        const v = this

        // 전달받은 log_detail_contents_wrap 데이터를 저장
        v.logDetailData = logDetailContentsData

        // 슬라이드 팝업에 데이터 표시
        v.displayLogDetailContents()
    }

    displayLogDetailContents() {
        const v = this
        const {id} = this

        if (!v.logDetailData) {
            console.warn('No log detail data available')
            return
        }

        const $container = $('#' + id)
        const $contentWrap = $container.find('.source_map_content_wrap')

        // log_detail_contents_wrap의 자식 요소들만 복사해서 표시
        $contentWrap.empty()
        v.logDetailData.children().each(function() {
            $contentWrap.append($(this).clone(true))
        })

        // 슬라이드 팝업 표시
        v.showSlidePopup()

        // 요소들의 배치를 넓어진 공간에 맞춰 재정렬
        v.adjustLayoutForExpandedSpace()
    }

    adjustLayoutForExpandedSpace() {
        const v = this
        const {id} = this
        const $container = $('#' + id)
        const $contentWrap = $container.find('.source_map_content_wrap')

        // textarea 요소들의 높이를 확장된 공간에 맞춰 조정
        $contentWrap.find('textarea').each(function() {
            const $textarea = $(this)
            const $parent = $textarea.closest('.textarea_wrap')
            
            // 부모 컨테이너의 높이에 맞춰 textarea 높이 조정
            if ($parent.length > 0) {
                $textarea.css({
                    'height': '100%',
                    'resize': 'vertical'
                })
            }
        })

        // stack-trace-container가 있는 경우 높이 재조정
        const $stackTraceContainers = $contentWrap.find('.stack-trace-container')
        if ($stackTraceContainers.length > 0) {
            // sourceMapHandler 인스턴스 생성 (전역에 있다면 재사용)
            const sourceMapHandler = new SourceMapHandler()
            
            $stackTraceContainers.each(function() {
                const $stackContainer = $(this)
                const $parentContainer = $stackContainer.closest('.textarea_wrap, .log_type_details')
                
                if ($parentContainer.length > 0) {
                    sourceMapHandler.adjustStackTraceHeight($parentContainer)
                }
            })
        }
    }

    showSlidePopup() {
        const $slidePopup = $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap.log_detail_slide')
        $slidePopup.removeClass('hidden').addClass('show')
    }

    closeSlidePopup() {
        $('.source_map_content_wrap').empty()
        const $slidePopup = $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap.log_detail_slide')
        $slidePopup.removeClass('show').addClass('hidden')
    }

    /**
     * 슬라이드 팝업이 열려있는 상태에서 내용을 업데이트
     * @param {jQuery} logDetailContentsData - 새로운 log_detail_contents_wrap 데이터
     */
    updateContentIfOpen(logDetailContentsData) {
        const v = this
        const $slidePopup = $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap.log_detail_slide')
        
        // 슬라이드 팝업이 열려있는 경우에만 업데이트
        if ($slidePopup.hasClass('show')) {
            v.logDetailData = logDetailContentsData
            v.displayLogDetailContents()
        }
    }

    /**
     * 슬라이드 팝업이 현재 열려있는지 확인
     * @returns {boolean} 열려있으면 true, 닫혀있으면 false
     */
    isSlidePopupOpen() {
        const $slidePopup = $('.maxy_popup_gray_bg_wrap.popup_right_side_wrap.log_detail_slide')
        return $slidePopup.hasClass('show')
    }
}