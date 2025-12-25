'use strict'
class MaxyPageViewEqualizer {
    constructor(options) {
        this.id = options.id
        this.title = options.title
        this.comment = options.comment
        this.data = options.data
        this.func = options.func
        this.template = ''
        this.delay = options.delay ? options.delay : 5000

        if (!this.id || !this.title) {
            console.log('check parameter')
            return false
        }

        this.setHandlebars()
        this.timer = null
    }

    setSwiper() {
        const v = this
        const { id } = this

        this.swiper = new Swiper('#' + id + '__Swiper', {
            autoplay: {
                delay: this.delay,
                pauseOnMouseEnter: true
            },
            pagination: {
                el: '.swiper-pagination'
            },
            spaceBetween: 20,
            on: {
                slideChange: function () {
                    // 현재 컴포넌트의 tippy 인스턴스만 제거
                    if (v.tippyInstances && Array.isArray(v.tippyInstances)) {
                        v.tippyInstances.forEach(inst => {
                            if (inst && inst.destroy) {
                                inst.destroy();
                                // 수동으로 DOM 요소 제거
                                if (inst.popper && inst.popper.parentNode) {
                                    inst.popper.parentNode.removeChild(inst.popper);
                                }
                            }
                        });
                        v.tippyInstances = [];  // 배열 초기화
                    }

                    // 슬라이드 변경 후 새로운 툴팁 설정
                    setTimeout(() => {
                        v.setTooltip()
                    }, 0);
                }
            }
        })
    }

    setButtonEvent() {
        const {id} = this

        $('#' + id + ' .maxy_component_btn').off('click').on('click', function () {
            // All 팝업 열기
            new MaxyPopupPvAnalysis({
                appendId: 'maxyPopupWrap',
                id: 'pvAnalysis'
            })
        })
    }

    setHandlebars() {
        Handlebars.registerHelper('stackAppend', function (value, maxValue) {
            const pv = Number(value)
            const maxPv = Number(maxValue)

            let percentage
            let length = 0

            // maxPv는 최대로 고정
            if(pv === maxPv) {
                percentage = 100
            } else {
                percentage = (pv / maxPv) * 100
                percentage = Math.floor(percentage)
            }

            if(percentage >= 0 && percentage <= 20) {
                length = 2
            }
            else if(percentage >= 21 && percentage <= 30) {
                length = 3
            }
            else if(percentage >= 31 && percentage <= 40) {
                length = 4
            }
            else if(percentage >= 41 && percentage <= 50) {
                length = 5
            }
            else if(percentage >= 51 && percentage <= 60) {
                length = 6
            }
            else if(percentage >= 61 && percentage <= 70) {
                length = 7
            }
            else if(percentage >= 71 && percentage <= 80) {
                length = 8
            }
            else if(percentage >= 81 && percentage <= 90) {
                length = 9
            }
            else if(percentage >= 91 && percentage <= 100) {
                length = 10
            }

            let result = ''
            for (let i = 0; i < length; i++) {
                // 각 stack에 인라인 스타일로 애니메이션 딜레이와 클래스 적용
                result += `<div class="stack delay-${i}" id="stack-${i}"></div>`
            }

            return new Handlebars.SafeString(result)
        })

        Handlebars.registerHelper("slideGroupOpen", function(index){
            let result = ''

            if(index % 10 === 0){
                result += '<div class="equalizer_wrap swiper-slide">';
            }

            return new Handlebars.SafeString(result)
        })

        Handlebars.registerHelper("slideGroupClose", function(index){
            let result = ''

            if(index % 10 === 9){
                result += '</div>';
            }

            return new Handlebars.SafeString(result)
        })

        Handlebars.registerHelper("pageType", function(logType){
            const pageType = util.logTypeToPageType(logType)
            return pageType[0] ? pageType[0] : ''
        })

        Handlebars.registerHelper('alias', (packageNm, serverType, reqUrl) => {
            return getPageList(packageNm, serverType, reqUrl)
        })
    }

    async init() {
        const { id, comment } = this
        const source = await fetch(
            '/components/db/page-view/page-view-equalizer.html')
            .then(response => response.text())
        const template = Handlebars.compile(source)
        const $target = $('#' + id)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        $target.empty()
        const fmtTitle = i18next.tns('dashboard.component.title.pvequalizer')

        $target.append(template({ id, fmtTitle }))

        tippy('#' + id + ' .ic_question', {
            content: comment,
            placement: 'bottom',
            allowHTML: true,
            arrow: false,
            theme: 'maxy-tooltip'
        })
    }

    async getTemplate() {
        try {
            const pvEqualizer = await fetch(
                '/templates/pageViewEqualizer.html')
                .then(response => response.text())
            this.template = Handlebars.compile(pvEqualizer)
        }
        catch (e) {
            console.error('Error loading template:', e);
        }
    }

    async draw(data) {
        const { id } = this

        // 완전 초기화
        await this.reset(true)  // 반드시 draw 시작 전에 호출

        // 타이머 제거
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }

        const $allBtn = $('#maxyComponent__PV_EQUALIZERBtn__all')
        const $target = $('#' + id + '__chart')

        if (!($target.length > 0)) {
            throw 'can\'t find #' + id
        }

        try {
            // 템플릿이 없다면 불러오기
            if (!this.template) {
                await this.getTemplate()
            }

            this.set(data)
        } catch (e) {
            console.error(e);
            $allBtn.hide();
            $target.addClass('no_data');
        }
    }

    set(data) {
        const { id } = this

        const $allBtn = $('#maxyComponent__PV_EQUALIZERBtn__all')
        const $target = $('#' + id + '__chart')

        // 데이터 유효성 검사
        if (data && data.length > 0) {
            $allBtn.show()
            $target.removeClass('no_data')
        } else if (this.data && this.data.length > 0) {
            data = this.data
            $allBtn.show()
            $target.removeClass('no_data')
        } else {
            $allBtn.hide()
            $target.addClass('no_data')
            return
        }

        // 최대값 계산 및 데이터 보강
        let maxValue = Math.max(...data.map(d => d.value))
        const packageNm = $('#packageNm').val()
        const serverType = $('#packageNm option:checked').data('server-type')

        data.forEach(item => {
            item.maxValue = maxValue;
            item.packageNm = packageNm;
            item.serverType = serverType;
        });

        // 템플릿 렌더링 및 Swiper 구조 생성
        const html = this.template(data)
        const $swiper = $(`<div class="swiper-container" id="${id}__Swiper">`)
        const $swiperWrapper = $(`<div class="swiper-wrapper" id="${id}__SwiperWrapper">`)

        $swiper.append('<div class="swiper-pagination">')
        $swiper.append($swiperWrapper)

        $target.append($swiper)
        $swiperWrapper.append(html)

        // 마지막 stack에 pv count 표시
        $target.find('div.pb_stack_wrap').each(function () {
            const pvText = util.comma($(this).data('value'))
            const $lastStack = $(this).find('.stack:last-child')
            $lastStack.append(`<div class="pv_count">${pvText}</div>`)
        })

        updateContent();
        this.openPopup();
        this.setSwiper();
        this.setTooltip();
    }

    // stack 클릭 시 팝업 open
    openPopup() {
        const {id} = this
        const $target = $('#' + id + '__chart')

        $target.off('click')

        // stack click event
        $target.find('div.pb_stack_wrap').off('click').on('click', function() {
            const pv = $(this).data('value')
            const user = $(this).data('user-count')
            const name = $(this).data('name')
            const reqUrl = $(this).data('req-url')

            const params = {
                name,
                reqUrl,
                view: pv,
                viewer: user,
                dateType: 'DAY'
            }

            const options = {
                appendId: 'maxyPopupWrap',
                id: 'pageView',
                param: {
                    data: params
                },
                popupType: 'Page View',
                isDashboard: true
            }

            new MaxyPopUpPvList(options)
        })
    }

    setTooltip() {
        const v = this;

        // 기존 툴팁 제거 + 수동으로 DOM cleanup
        if (v.tippyInstances && Array.isArray(v.tippyInstances)) {
            v.tippyInstances.forEach(inst => {
                if (inst && inst.destroy) inst.destroy();
                if (inst.popper && inst.popper.parentNode) {
                    inst.popper.parentNode.removeChild(inst.popper); // 팝업 DOM 제거
                }
            });
        }
        v.tippyInstances = [];

        const $pvWrap = $('.equalizer_wrap .page_view_equalizer_wrap .pb_stack_wrap');

        $pvWrap.each((idx, element) => {
            // 강제 삭제
            if (element._tippy) {
                element._tippy.destroy();
                element._tippy = null;
            }

            const $el = $(element);
            const aliasValue = $el.data('alias-value')
            const reqUrl = $el.data('req-url')

            const requested = aliasValue ? aliasValue : reqUrl
            const value = $el.data('value');
            const userCount = $el.data('user-count');
            const avg = (value === 0 || userCount === 0) ? 0 : Math.floor(value / userCount)

            // 툴팁 내용 설정
            const userText = i18next.tns('dashboard.bi.userTooltip');
            const avgText = i18next.tns('dashboard.bi.avgTooltip');
            const tooltipContent = `${requested}<br>${userText}: <b>${util.comma(userCount)}</b><br>${avgText}: <b>${avg}</b>`;

            const appendTarget = document.querySelector(`#${v.id}__chart`) || document.body;

            const instances = tippy(element, {
                content: tooltipContent,
                arrow: false,
                placement: 'bottom',
                allowHTML: true,
                theme: 'maxy-tooltip',
                followCursor: true,
                appendTo: appendTarget
            });

            const list = Array.isArray(instances) ? instances : [instances];
            list.forEach(inst => v.tippyInstances.push(inst));
        });
    }

    async reset(isReset) {
        const { id } = this;
        const $chart = $('#' + id + '__chart');

        // 1. Tippy 툴팁 제거
        if (this.tippyInstances && Array.isArray(this.tippyInstances)) {
            this.tippyInstances.forEach(inst => {
                if (inst && inst.destroy) {
                    inst.destroy()
                    // 수동으로 element까지 제거
                    if (inst.popper && inst.popper.parentNode) {
                        inst.popper.parentNode.removeChild(inst.popper)
                    }
                }
            })
            this.tippyInstances = []
        }

        // 2. Swiper 제거
        if (this.swiper) {
            this.swiper.destroy(true, true) // 완전 제거
            this.swiper = null

            // Swiper destroy가 완전히 적용되도록 잠깐 대기
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // 3. 이벤트 제거
        $chart.off('click');
        $chart.find('.pb_stack_wrap').off('click');

        // 4. 완전 초기화 시 DOM 정리
        if (isReset) {
            $chart.find('.swiper-container').remove(); // Swiper 관련 클래스 제거
            $chart.empty(); // DOM 전체 정리
        }
    }
}
