'use strict'

class MaxyPageAnalysis {

    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment
        this.data = options.data
        this.delay = options.delay ? options.delay : 5000
        this.box = 6
        this.func = options.func

        if (!this.id || !this.title) {
            console.log('check parameter')
            return false
        }

        this.interval = null
    }

    async init() {
        const {id, comment} = this
        const source = await fetch(
            '/components/db/page-analysis/page-analysis.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)

        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        const fmtTitle = trl('dashboard.component.title.favorites')

        $target.empty()
        $target.append(template({id, fmtTitle}))
        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })

        this.setBoxNum()

        this.$target = $target
        this.setButtonEvent()
    }

    setSwiper() {
        this.swiper = new Swiper('#maxyComponent__FAVORITESSwiper', {
            autoplay: {
                delay: this.delay,
                pauseOnMouseEnter: true
            },
            pagination: {
                el: '.swiper-pagination'
            },
            spaceBetween: 20
        })
    }

    setBoxNum() {
        const chart = this
        const $chart = $('.maxy_box#' + chart.id)
        const componentWidth = $chart.width()
        if (componentWidth > 430) {
            chart.box = 6
        } else {
            chart.box = 4
        }
    }

    setGridRepeatNum() {
        const chart = this
        const $chart = $('.maxy_box#' + chart.id)
        const componentWidth = $chart.width()
        const $pageWrap = $chart.find('.page_wrap')

        if (componentWidth > 430) {
            $pageWrap.css('grid-template-columns', 'repeat(3, 1fr)')
        } else {
            $pageWrap.css('grid-template-columns', 'repeat(2, 1fr)')
        }
    }

    setRedrawEvent() {
        const v = this
        util.debounce(function () {
            v.setBoxNum()
            v.setGridRepeatNum()
            v.draw()
        }, 100, this)()
    }

    setButtonEvent() {
        const {id} = this

        $('#' + id + ' .maxy_component_btn').off('click').on('click', function () {
            // All 팝업 열기
            new MaxyPopupFavoritesAnalysis({
                appendId: 'maxyPopupWrap',
                id: 'favoritesAnalysis'
            })
        })
    }

    async draw(data) {
        const v = this
        const {id} = v

        const $pageAnalysisWrap = $('#' + id + '__chart')
        const $btnAll = $('#maxyComponent__FAVORITESBtn__all')

        try {
            await v.reset(true)
            v.set(data)
        } catch (e) {
            console.log(e)

            if (!$pageAnalysisWrap.hasClass('no_data')) {
                $pageAnalysisWrap.addClass('no_data')
            }
            $btnAll.hide()
        }
    }

    set(data) {
        const v = this
        const {id, box} = v
        const $btnAll = $('#maxyComponent__FAVORITESBtn__all')
        const $pageAnalysisWrap = $('#' + id + '__chart')

        const $swiper = $('<div class="swiper" id="' + id + 'Swiper">')
        const $swiperWrapper = $('<div class="swiper-wrapper" id="' + id + '__SwiperWrapper">')

        if (data) {
            v.data = data
            $btnAll.show()
            $pageAnalysisWrap.removeClass('no_data')
        } else if (this.data) {
            data = v.data
            $btnAll.show()
            $pageAnalysisWrap.removeClass('no_data')
        } else if (util.isEmpty(data)) {
            $btnAll.hide()
            return
        }

        data.forEach((d, idx) => {
            const nth = idx + 1
            if (nth === 1 || ((nth % box === 0) && nth !== data.length)) {
                const $swiperSlide = $('<div class="swiper-slide">')
                const $pageWrap = $('<div>', {
                    'class': 'page_wrap',
                    'data-idx': Math.ceil(idx / box) + 1
                })
                $swiperSlide.append($pageWrap)
                $swiperWrapper.append($swiperSlide)
            }
        })

        $swiper.append($swiperWrapper)
        $swiper.append($('<div class="swiper-pagination">'))
        $pageAnalysisWrap.append($swiper)
        v.setGridRepeatNum()

        const packageNm = DB0100.v.packageNm
        const serverType = DB0100.v.serverType

        data.forEach((d, idx) => {
            if (!d) {
                return
            }

            // const color = idx % 2 === 0 ? 'blue' : 'green'
            const pageType = util.logTypeToPageType(d.logType)[0]
            const classNm = pageType ? '_' + pageType : ''

            const $page = $('<div>', {
                'class': 'page ' + pageType,
            })
            const $pageHeader = $('<div>', {
                'class': 'page_header ' + pageType,
            })
            const $pageHeaderTop = $('<div class="page_header_top">')
            const $pageHeaderImg = $('<i>', {
                'class': 'check' + classNm
            })

            const $pageHeaderTitle = $('<div>', {
                'class': 'page_header_title',
                'text': getPageList(packageNm, serverType, d.reqUrl)
            })
            $pageHeaderTop.append($pageHeaderImg)
            $pageHeaderTop.append($pageHeaderTitle)

            const $pageHeaderCount = $('<div>', {
                'class': 'page_header_count',
                'text': util.convertNum(d.count)
            })
            $pageHeader.append($pageHeaderTop)
            $pageHeaderTop.append($pageHeaderCount)
            $page.append($pageHeader)

            const $pageContents = $('<div class="page_contents">')
            const contents = d.contents
            contents.forEach(c => {
                const {type, value} = c
                const $pageContentsRow = $('<div>', {
                    'class': 'page_contents_row',
                    'data-type': type,
                    'data-value': value
                })
                const $pageContentsSub = $('<div>', {
                    'class': 'page_contents_sub',
                    'text': trl(c.key) ? trl(c.key) : c.key
                })
                const $pageContentsValue = $('<div>', {
                    'class': 'page_contents_value',
                    'text': !type ? value : util.comma(value)
                })

                if (type) {
                    let color = '#FCB500'
                    if ('crash' === type) {
                        color = '#FF6969'
                    }
                    $pageContentsSub.prepend(
                        '<svg width="10" height="10" fill="' + color + '">'
                        + '<ellipse cx="4" cy="6" rx="3" ry="3" />'
                        + '</svg>')
                    $pageContentsValue.addClass(type)
                    $pageContentsValue.data('logType', type)
                }
                $pageContentsRow.append($pageContentsSub)
                $pageContentsRow.append($pageContentsValue)
                $pageContents.append($pageContentsRow)
            })
            $page.append($pageContents)

            const nth = Math.ceil((idx + 1) / box)
            const $pageWrap = $pageAnalysisWrap
                .find('.page_wrap[data-idx="' + nth + '"]')
            $pageWrap.append($page)

            const title = getPageList(packageNm, serverType, (d.title ? d.title : d.reqUrl))
            const aliasValue = d.aliasValue
            const reqUrl = d.reqUrl

            $page.find('.page_contents_row').off('click').on('click', function () {
                const count = $(this).data('value')
                const type = $(this).data('type')

                const options = {
                    appendId: 'maxyPopupWrap',
                    id: 'favorite',
                    title: title,
                    aliasValue: aliasValue,
                    reqUrl: reqUrl,
                    from: util.dateToTimestamp(util.getDate(0), true),
                    to: util.dateToTimestamp(util.getDate(0), false),
                    logType: type,
                    'popupType': 'Favorites'
                }

                if (count > 0) {
                    v.popup = new MaxyPopupLogListByUser(options)
                } else {
                    toast(trl('dashboard.msg.errorNcrashPopup'))
                }
            })
        })

        this.setSwiper()
        this.setTooltip()
    }

    setTooltip() {
        const $titles = $('.page_header_top').find('.page_header_title');
        $titles.each(function (idx, element) {
            if (element._tippy) {
                // 기존 인스턴스 제거
                element._tippy.destroy();
                element._tippy = null; // 명시적으로 null 할당
            }

            const tooltipContent = $(this).text();

            // 새로운 tippy 인스턴스 생성
            tippy(element, {
                content: tooltipContent,
                placement: 'bottom',
                allowHTML: true,
                arrow: false,
                theme: 'maxy-tooltip',
            });
        });
    }

    // 모든 tippy, swiper, chart element가 다 제거된 후에 새로 그려야 함
    async reset(isReset) {
        const v = this;
        const $titles = $('.page_header_top').find('.page_header_title');
        const $chart = $('#' + v.id + '__chart')

        // 1. Tippy 인스턴스 제거
        $titles.each(function (idx, element) {
            if (element._tippy) {
                // 기존 인스턴스 제거
                element._tippy.destroy()
                element._tippy = null // 명시적으로 null 할당
            }
        })

        // 2. Swiper 인스턴스 제거
        if (v.swiper) {
            v.swiper.destroy(true, true) // Swiper 인스턴스 완전 제거
            v.swiper = null

            // Swiper destroy가 완전히 적용되도록 잠깐 대기
            await new Promise(resolve => setTimeout(resolve, 0))
        }

        // 3. 이벤트 제거
        $chart.off('click')
        $chart.find('.page_contents_row').off('click')

        // 3. DOM 초기화
        if (isReset) {
            const $chart = $('#' + v.id + '__chart')
            $chart.find('.swiper').remove() // Swiper 관련 클래스 제거
            $chart.empty() // 기존 DOM 완전 초기화
        }
    }

}