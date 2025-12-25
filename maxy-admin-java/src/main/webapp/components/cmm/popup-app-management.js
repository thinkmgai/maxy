/*
   시스템 관리 > App 설정 > 등록/수정 팝업
*/
class MaxyPopupAppManagement {
    /**
     * App 설정 팝업을 제어하는 메인 클래스
     * @param {Object} options - 팝업 초기화 옵션
     * @param {string} options.appendId - 팝업을 삽입할 DOM ID
     * @param {string} options.id - 팝업 고유 ID
     * @param {'reg'|'update'} options.type - 등록/수정 구분
     * @param {Object} options.data - 수정 모드일 때의 기존 데이터
     * @param {boolean|string} options.isIntegration - 통합 대시보드 사용 여부
     * @param {'all'|'front'|'maxy'} options.mode - 화면 모드 (front 전용 여부 판단)
     * @param {string} options.serverType - 서버 타입 정보(JSON 문자열)
     */
    constructor(options) {
        // 기본 속성 초기화
        this.appendId = options.appendId        // 팝업이 추가될 DOM 요소의 ID
        this.id = options.id                    // 팝업의 고유 ID
        this.type = options.type                // 팝업 타입 (등록 / 수정)
        this.data = options.data                // '수정'일 경우에만 있음.
        this.isIntegration = options.isIntegration // 통합 대시보드 사용 여부
        this.mode = options.mode // front 모드 여부 (Front Monitoring 숨김 처리에 사용)
        this.serverType = options.serverType
        // 필수 파라미터 검증
        if (!this.id || !this.appendId || !this.type) {
            console.log('check parameter')
            return false
        }

        this.init().then(() => {
            this.addEventListener()
            this.openPopup().then(() => {
                this.toggleFrontOnlyField()
                // '수정' 팝업인 경우 리스트 상세 데이터 세팅
                if (this.type === 'update') {
                    const $popup = $('#' + this.id + '__popUp')
                    $popup.find('#btnDelete').addClass('is-show')
                    this.setDetailData()
                } else if (this.type === 'reg') {
                    this.setDefaultData()
                    this.initRatioSlider($('#' + this.id + '__popUp'))
                }
            })
        })
    }

    /**
     * 템플릿 로드, 렌더링, 초기 데이터 조회를 처리한다.
     * @returns {Promise<void>}
     */
    async init() {
        const {id, type, appendId} = this

        try {
            // HTML 템플릿 가져오기
            const source = await fetch('/components/cmm/popup-app-management.html')
                .then(response => response.text())

            const template = Handlebars.compile(source)
            const $target = $('#' + appendId)

            if (!($target.length > 0)) {
                throw '대상 요소를 찾을 수 없습니다: #' + appendId
            }

            $target.empty()

            let title
            if (type === 'update') {
                title = trl('common.btn.edit')
            } else {
                title = trl('common.btn.register')
            }
            // 템플릿 렌더링
            $target.append(template({id, title}))

            this.setServerType()
            this.setStatusSettingLabels()

            this.toggleIntegrationField()
            this.toggleFrontMonitoringField()
            this.toggleSessionReplayField()

            // 테이블 필터링 placeholder
            $('.filter_input').attr('placeholder', trl('common.msg.searchEnter'))
            updateContent()
        } catch (error) {
            console.error('팝업 초기화 오류:', error)
        }
    }

    /**
     * 팝업 내부 이벤트를 일괄 등록한다.
     * - 슬라이더/체크박스 동기화
     * - 테이블 행 추가/삭제/필터
     * - 모드 토글에 따른 섹션 표시/숨김
     */
    addEventListener() {
        const v = this

        const $target = $('#' + v.id + '__popUp')

        $('.dimmed').on('click', () => {
            this.closePopup(this)
        })

        /* order 숫자 입력 제한 */
        $target.on('keyup change', '#order', function () {
            let value = $(this).val().replace(/[^0-9]/g, '');
            let num = Number(value);

            if (num > 100) num = 100;

            $(this).val(value === '' ? '' : num);
        });

        /* ratio slider */
        $target.find('.ratio-slider').on('input', function () {
            v.updateSliderColor(this)
        })

        /* ratio checkbox */
        $target.find('.ratio-check').on('change', (e) => {
            const $ratioItem = $(e.target).closest('.ratio-item')
            const slider = $ratioItem.find('.ratio-slider')[0] // ⭐ 핵심

            // 슬라이더가 없는 체크박스(ratio 기반/target 기반 선택 등)는 건너뛴다.
            if (!slider) return

            const isChecked = e.target.checked

            const $sliderWrap = $ratioItem.find('.slider-wrap')
            const $valueText = $sliderWrap.find('.ratio-value')

            $sliderWrap.toggleClass('disabled', !isChecked)
            $(slider).prop('disabled', !isChecked)

            if (!isChecked) {
                // OFF
                slider.value = 0
                $valueText.text('0%')

                // JS 배경 제거
                slider.style.background = ''
            } else {
                // ON → slider를 넘긴다
                this.updateSliderColor(slider)
            }
        })

        v.toggleCriteria(
            $target,
            '#ratioBasedCriteria',
            '#ratioBasedCriteriaWrap',
            '#targetBasedCriteria',
            '#targetBasedCriteriaWrap'
        );
        v.toggleCriteria(
            $target,
            '#targetBasedCriteria',
            '#targetBasedCriteriaWrap',
            '#ratioBasedCriteria',
            '#ratioBasedCriteriaWrap'
        );

        // 'Front 모니터링' 토글 시 feeldex, session replay 영역 표시여부 정해주기
        $target.find('#appType').on('change', () => {
            v.toggleFrontOnlyField()
        })
        // 'session replay' 토글 시 session replay 영역 표시여부 정해주기
        $target.find('#sReplayYn').on('change', () => {
            v.toggleFrontOnlyField()
        })
        // 앱 설정 저장 버튼
        $target.find('#btnSave').on('click', function () {
            v.saveAppInfo()
        })

        // Session Replay : Target-based 테이블 저장 버튼 이벤트
        $target.on('click', '.table_wrapper .btn_add', (e) => {
            const tableBodySelector = '#' + e.target.closest('tbody').id
            let selectorFilter = []
            if (tableBodySelector === '#targetCriteriaTableBody') {
                selectorFilter = ['user', 'url']
            }

            this.addTableRow(tableBodySelector, selectorFilter)
        })

        // Session Replay : Target-based 테이블 삭제 버튼 이벤트
        $target.on('click', '.table_wrapper .btn_remove', (e) => {
            const tableBodySelector = '#' + e.target.closest('tbody').id
            let selectorFilter = []
            if (tableBodySelector === '#targetCriteriaTableBody') {
                selectorFilter = ['user', 'url']
            }

            this.removeTableRow(e.target, tableBodySelector, selectorFilter)
        })

        // Session Replay : Target-based 테이블 필터링 이벤트
        $target.on('keypress', '.table_wrapper .filter_input', (e) => {
            if (e.which === 13) { // 엔터키
                const wrapSelector = '#' + e.target.closest('.table_wrapper').id
                const tableBodySelector = '#' + $(wrapSelector).find('tbody')[0].id

                this.filterTable(wrapSelector, tableBodySelector)
            }
        })

        // Session Replay : Target-based 테이블 필터링 초기화 이벤트
        $target.on('click', '.table_wrapper .filter_clear_btn', (e) => {
            const wrapSelector = '#' + e.target.closest('.table_wrapper').id
            const tableBodySelector = '#' + $(wrapSelector).find('tbody')[0].id

            this.clearTableFilter(wrapSelector, tableBodySelector)
        })

        // URL 검색 버튼 클릭 이벤트
        $target.on('click', '#targetCriteriaTableBody .btn_search', (e) => {
            const $itemSelect = $('#targetCriteriaTableBody .item_select')
            if ($itemSelect.val() === 'url') {
                // URL 검색 팝업 인스턴스 생성
                new MaxyUrlSearchPopup({
                    appendId: 'maxyUrlSearchPopup',
                    id: 'urlSearchPopup',
                    packageNm: $target.find('#appId').val(),
                    serverType: $target.find('#serverType').val(),
                    $targetInput: $(e.target).siblings('.target_input')
                })
            } else if ($itemSelect.val() === 'user') {
                // URL 검색 팝업 인스턴스 생성
                new MaxyUserSearchPopup({
                    appendId: 'maxyUrlSearchPopup',
                    id: 'urlSearchPopup',
                    packageNm: $target.find('#appId').val(),
                    serverType: $target.find('#serverType').val(),
                    $targetInput: $(e.target).siblings('.target_input')
                })
            }
        })

        // Target-Based 테이블에서 Target Item 변경시 입력값 초기화
        $target.on('change', '#targetCriteriaTableBody .item_select', () => {
            $('#targetCriteriaTableBody .target_input').val('')
            $('#targetCriteriaTableBody .remark_input').val('')
        })

        // 수정 팝업일 경우에 삭제 버튼에 이벤트 추가
        if (v.type === 'update') {
            $target.find('#btnDelete').on('click', function () {
                v.delete()
            })
        }
    }

    /**
     * 슬라이더 값에 따라 트랙/썸 컬러와 표시 텍스트를 갱신한다.
     * @param {HTMLInputElement} slider - range input 엘리먼트
     */
    updateSliderColor(slider) {
        if (!slider || !slider.style) return

        const value = Number(slider.value)
        const percent = Math.min(Math.max(value, 0), 100)

        const ratioItem = slider.closest('.ratio-item')
        const ratioCheckId = ratioItem?.querySelector('.ratio-check')?.id || ''
        const isSessionReplayRatio = ratioCheckId === 'webCollectionRate' || ratioCheckId === 'webViewCollectionRate'

        // 세션리플레이 영역 range value가 70이 넘으면 red 계열로 변경
        const trackColor = (isSessionReplayRatio && percent >= 70)
            ? '#ff0000'
            : '#adc3f1'

        // thumb 색상
        slider.style.setProperty('--track-color', trackColor)

        // track 색상
        slider.style.background = `
            linear-gradient(
                to right,
                ${trackColor} 0%,
                ${trackColor} ${percent}%,
                #bdc3c7 ${percent}%,
                #bdc3c7 100%
            )
        `

        const valueEl = slider.closest('.slider-wrap')
            ?.querySelector('.ratio-value')

        if (valueEl) {
            valueEl.textContent = percent + '%'
        }
    }

    /**
     * 팝업을 화면에 표시하며 애니메이션을 트리거한다.
     * @returns {Promise<void>}
     */
    async openPopup() {
        try {
            const {id} = this;
            $('.dimmed').show()

            const $target = $('#' + id + '__popUp')
            // 슬라이드 인 애니메이션이 매번 동작하도록, 시작 상태를 강제로 재설정 후 reflow
            $target.removeClass('hidden show') // 기본 상태 (right:-1300px)
            void $target[0]?.offsetWidth       // reflow로 상태 확정
            $target.addClass('show')           // transition 트리거

            await util.sleep(200)
        } catch (error) {
            console.error('팝업 열기 오류:', error);
        }
    }

    /**
     * 팝업을 닫고 이벤트/텍스트를 정리한다.
     * @param {Object} v - 팝업 인스턴스
     */
    closePopup(v) {
        try {
            const popup = '#' + v.id + '__popUp';
            const span = popup + ' span';
            const div = popup + ' div';
            const $dimmed = $('.dimmed');
            const $popup = $(popup);

            // 텍스트 초기화
            $(span).text('');
            $(div).text('');

            // 이벤트 제거 및 팝업 숨기기
            $dimmed.off('click');
            $dimmed.hide();
            $popup.removeClass('show').addClass('hidden');

            // 커서 숨기기
            const $cursor = $('.maxy_cursor_dots');
            if ($cursor.css('display') === 'block') {
                cursor.hide();
            }
        } catch (error) {
            console.error('팝업 닫기 오류:', error);
        }
    }

    /**
     * 초기 슬라이더 컬러 값을 세팅한다.
     * @param {JQuery} $target - 슬라이더가 포함된 팝업 래퍼
     */
    initRatioSlider($target) {
        const v = this

        $target.find('.ratio-slider').each(function () {
            v.updateSliderColor(this)
        })
    }

    /**
     * 등록 모드의 기본값을 세팅한다.
     */
    setDefaultData() {
        const {id, mode} = this

        const $target = $('#' + id + '__popUp')

        $target.find('#useYn').prop('checked', true)
        $target.find('#monitoringYn').prop('checked', true)
        $target.find('#zipYn').prop('checked', true)
        $target.find('#zipYn').prop('checked', true)
        $target.find('#collectionLoggingRate').prop('checked', true)
        $target.find('#collectionLoggingRateMobile').prop('checked', true)

        if (mode !== 'maxy') {
            $target.find('#lcp').val('40')
            $target.find('#inp').val('30')
            $target.find('#cls').val('30')
        }

        this.toggleFrontOnlyField()
    }

    /**
     * 수정 모드에서 기존 데이터를 폼에 주입한다.
     */
    setDetailData() {
        const {id, data} = this
        const v = this

        const $target = $('#' + id + '__popUp')
        const {
            packageNm,
            serverType,
            displayNm,
            order,
            logPeriod,
            pageLogPeriod,
            sessionLogPeriod,
            logBundleUnit,
            sessionRatePc,
            sessionRateMobile,
            loggingRatePc,
            loggingRateMobile,
            useYn,
            monitoringYn,
            zipYn,
            integrationYn,
            fullMsgYn,
            fullReqMsgYn,
            infoYn,
            appType,
            sReplayYn,
            sessionBasedCriteria,
            lcp,
            cls,
            inp
        } = data

        // 1. App 정보 세팅
        $target.find('#appId').attr('readonly', true)
        $target.find('#appId').val(packageNm)
        $target.find('#serverType').attr('disabled', true)
        $target.find('#serverType').val(serverType)
        $target.find('#appName').attr('readonly', true)
        $target.find('#appName').val(displayNm)
        $target.find('#order').val(order)
        $target.find('#logPeriod').val(logPeriod)
        $target.find('#pageLogPeriod').val(pageLogPeriod)
        $target.find('#sessionLogPeriod').val(sessionLogPeriod)
        $target.find('#logBundleUnits').val(logBundleUnit)

        // 2. 수집 정보 세팅
        $target.find('#useYn').prop('checked', useYn === 'Y')
        $target.find('#monitoringYn').prop('checked', monitoringYn === 'Y')
        $target.find('#integrationYn').prop('checked', integrationYn === 'Y')
        $target.find('#zipYn').prop('checked', zipYn === 'Y')
        $target.find('#fullMsgYn').prop('checked', fullMsgYn === 'Y')
        $target.find('#fullReqMsgYn').prop('checked', fullReqMsgYn === 'Y')
        $target.find('#infoYn').prop('checked', infoYn === 'Y')
        $target.find('#appType').prop('checked', appType === '1')
        $target.find('#sReplayYn').prop('checked', sReplayYn === 'Y')

        // FeelDex 세팅, 설정값이 없을 경우 default 세팅
        if (util.isEmpty(lcp) || util.isEmpty(cls) || util.isEmpty(inp)) {
            $target.find('#lcp').val('40')
            $target.find('#inp').val('30')
            $target.find('#cls').val('30')
        } else {
            $target.find('#lcp').val(lcp)
            $target.find('#cls').val(cls)
            $target.find('#inp').val(inp)
        }

        v.setRatioValue($target, '#sessionRatePc', sessionRatePc);
        v.setRatioValue($target, '#sessionRateMobile', sessionRateMobile);

        v.setRatioValue($target, '#loggingRatePc', loggingRatePc);
        v.setRatioValue($target, '#loggingRateMobile', loggingRateMobile);

        // 3. 세션 리플레이 기준 방식 세팅 + 관련 표시/숨김 로직 실행
        const $ratioBasedCriteria = $target.find('#ratioBasedCriteria')
        const $targetBasedCriteria = $target.find('#targetBasedCriteria')
        if (sessionBasedCriteria === 'R') {
            $ratioBasedCriteria.prop('checked', true).trigger('change')
            $targetBasedCriteria.prop('checked', false)
        } else if (sessionBasedCriteria === 'T') {
            $targetBasedCriteria.prop('checked', true).trigger('change')
            $ratioBasedCriteria.prop('checked', false)
        } else {
            $ratioBasedCriteria.prop('checked', false).trigger('change')
            $targetBasedCriteria.prop('checked', false)
        }

        v.toggleFrontOnlyField()
        v.getSessionReplayRuleInfo()
    }

    getSessionReplayRuleInfo() {
        const {id} = this
        const $popup = $('#' + id + '__popUp')

        const packageNm = $popup.find('#appId').val()
        const serverType = $popup.find('#serverType').val()

        const param = {
            packageNm,
            serverType
        }
        // Session Replay : target-based 테이블 데이터
        ajaxCall('/sm/0500/getSessionReplayRuleInfo.maxy', param).then(data => {
            // target-based 데이터
            const targetListData = (data || []).filter(item => item.selector === 'user' || item.selector === 'url')

            this.loadTableData(targetListData, '#targetCriteriaTableBody')
        }).catch(error => {
            console.log(error)
        })
    }

    /**
     * 상태설정 영역 체크박스 툴팁 설정
     */
    setStatusSettingLabels() {
        const {id} = this
        const $target = $('#' + id + '__popUp')
        const $statusSection = $target.find('#statusSettingSection')

        // 체크박스 ID와 해당 label 텍스트 키를 매핑
        const labelMappings = [
            {id: 'useYn', textKey: 'system.package.desc.useYn'},
            {id: 'monitoringYn', textKey: 'system.package.desc.monitoringYn'},
            {id: 'integrationYn', textKey: 'system.package.desc.integrationYn'},
            {id: 'zipYn', textKey: 'system.package.desc.zipYn'},
            {id: 'fullMsgYn', textKey: 'system.package.desc.fullMsgYn'},
            {id: 'fullReqMsgYn', textKey: 'system.package.desc.fullReqMsgYn'},
            {id: 'infoYn', textKey: 'system.package.desc.infoYn'},
            {id: 'appType', textKey: 'system.package.desc.appType'},
            {id: 'sReplayYn', textKey: 'system.package.desc.sReplayYn'}
        ]

        // 각 label 설정
        for (let i = 0; i < labelMappings.length; i++) {
            const mapping = labelMappings[i]
            const $label = $statusSection.find(`label[for="${mapping.id}"]`)

            if ($label.length > 0) {
                tippy(`#statusSettingSection label[for="${mapping.id}"]`, {
                    content: i18next.tns(mapping.textKey),
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            }
        }
    }

    /**
     * 서버 타입 셀렉트 박스를 초기화하고 기본값을 세팅한다.
     */
    setServerType() {
        const {id, serverType} = this
        const $target = $('#' + id + '__popUp')
        const $serverType = $target.find("#serverType")
        $serverType.empty()

        let option = ''
        $.each(JSON.parse(serverType), (i, val) => {
            const desc = trl('common.' + val.desc)
            option += '<option value="' + val.code + '">' + desc + '</option>'
        })
        $serverType.append(option)

        // ServerType
        // 개발 기본설정 : log Bundle Unit : 10, log Period :  10
        // 품질/운영 기본설정 : log Bundle Unit : 100, log Period :  30
        $serverType.on('change', function () {
            const selectedVal = $(this).val()
            if (selectedVal === '0') {
                $target.find('#logBundleUnits').val('10')
                $target.find('#logPeriod').val('10')
            } else {
                $target.find('#logBundleUnits').val('100')
                $target.find('#logPeriod').val('30')
            }
        })
    }

    /**
     * 슬라이더/체크박스 값을 받아 퍼센트 표기를 갱신한다.
     * @param {JQuery} $target - 팝업 래퍼
     * @param {string} valueSelector - 값이 들어갈 span ID 선택자
     * @param {number|string} value - 퍼센트 값
     */
    setRatioValue($target, valueSelector, value) {
        if (value === undefined || value === null) return

        const numericValue = Number(value)
        if (Number.isNaN(numericValue)) return

        const percent = Math.min(Math.max(numericValue, 0), 100)

        const $valueEl = $target.find(valueSelector)
        const $item = $valueEl.closest('.ratio-item')

        const $checkbox = $item.find('.ratio-check')
        const $slider = $item.find('.ratio-slider')
        const $ratioValue = $item.find('.ratio-value')

        // 체크 ON (disabled 해제)
        $checkbox.prop('checked', true)
        $checkbox.trigger('change')

        // 값 세팅
        $slider.val(percent)
        $ratioValue.text(percent + '%')
        $valueEl.text(percent + '%')

        // 색상 & 트랙은 공통 함수로
        this.updateSliderColor($slider[0])
    }

    /**
     * Session Replay 기준 방식 토글 시 표시/숨김을 제어한다.
     * @param {JQuery} $target - 팝업 래퍼
     * @param {string} onSelector - 활성 체크박스 선택자
     * @param {string} onWrap - 활성 영역 래퍼 선택자
     * @param {string} offSelector - 비활성 체크박스 선택자
     * @param {string} offWrap - 비활성 영역 래퍼 선택자
     */
    toggleCriteria($target, onSelector, onWrap, offSelector, offWrap) {
        $target.find(onSelector).on('change', function () {
            const isChecked = $(this).is(':checked');

            if (isChecked) {
                $target.find(onWrap).css('display', 'grid');
                $target.find(offWrap).hide();
                $target.find(offSelector).prop('checked', false);
            } else {
                $target.find(onWrap).hide();
            }
        });
    }

    /**
     * 통합 대시보드를 쓰지 않을 때 통합 관련 체크박스를 숨긴다.
     */
    toggleIntegrationField() {
        try {
            const {isIntegration} = this

            if (isIntegration === 'true' || isIntegration === true) return
            const $popup = $('#' + this.id + '__popUp')
            $popup.find('#integrationYn').closest('div').css('display', 'none')
        } catch (error) {
            console.error('통합 대시보드 필드 숨김 처리 오류:', error)
        }
    }

    /**
     * front 모드일 경우 Front Monitoring 토글을 숨긴다.
     */
    toggleFrontMonitoringField() {
        try {
            const {mode, id} = this

            if (mode === 'all') return
            const $popup = $('#' + id + '__popUp')
            $popup.find('#appType').closest('div').css('display', 'none')
        } catch (error) {
            console.error('Front Monitoring 필드 숨김 처리 오류:', error)
        }
    }

    /**
     * 허용된 모드가 아니면 Session Replay 토글 및 주기를 숨긴다.
     */
    toggleSessionReplayField() {
        try {
            const {mode, id} = this

            if (mode === 'all' || mode === 'front') return
            const $popup = $('#' + id + '__popUp')
            $popup.find('#sReplayYn').closest('div').css('display', 'none')
            $popup.find('#sessionLogPeriod').closest('div').css('display', 'none')
        } catch (error) {
            console.error('Session Replay 필드 숨김 처리 오류:', error)
        }
    }

    /**
     * Front 전용 섹션 노출 여부에 따라 Data Collection 번호를 조정한다.
     * @param {boolean} hasFrontSection - Front 영역이 표시되는지 여부
     */
    updateDataCollectionTitle(hasFrontSection) {
        try {
            const $popup = $('#' + this.id + '__popUp')
            const $title = $popup.find('.data_collection_rate_wrap .title')

            $title.text(function (_, text) {
                if (!text) return text

                const targetNumber = hasFrontSection ? '5.' : '4.'
                return text.replace(/^\d+\./, targetNumber)
            })
        } catch (error) {
            console.error('데이터 수집률 타이틀 업데이트 오류:', error)
        }
    }

    /**
     * Session Replay 비율 관련 체크/슬라이더를 0%로 초기화한다.
     * @param {JQuery} $popup - 팝업 래퍼
     */
    resetSessionReplayValues($popup) {
        const resetItem = (checkboxSelector, valueSelector) => {
            const $item = $popup.find(checkboxSelector).closest('.ratio-item')
            if (!$item.length) return

            const $checkbox = $item.find('.ratio-check')
            const $slider = $item.find('.ratio-slider')
            const $value = $item.find(valueSelector)
            const $sliderWrap = $item.find('.slider-wrap')

            $checkbox.prop('checked', false)
            $slider.prop('disabled', true)
            $sliderWrap.addClass('disabled')
            $slider.val(0)
            if ($slider[0]) this.updateSliderColor($slider[0])
            if ($value.length) $value.text('0%')
        }

        resetItem('#webCollectionRate', '#sessionRatePc')
        resetItem('#webViewCollectionRate', '#sessionRateMobile')
    }

    /**
     * 웹뷰 로깅 비율을 기본값(100%)으로 복구한다.
     * @param {JQuery} $popup - 팝업 래퍼
     */
    resetLoggingRateMobile($popup) {
        const $item = $popup.find('#collectionLoggingRateMobile').closest('.ratio-item')
        if (!$item.length) return

        const $checkbox = $item.find('.ratio-check')
        const $slider = $item.find('.ratio-slider')
        const $value = $item.find('#loggingRateMobile')
        const $sliderWrap = $item.find('.slider-wrap')

        $checkbox.prop('checked', true)
        $slider.prop('disabled', false)
        $sliderWrap.removeClass('disabled')
        $slider.val(100)
        if ($slider[0]) this.updateSliderColor($slider[0])
        if ($value.length) $value.text('100%')
    }

    /**
     * Front Monitoring/Session Replay 토글 상태에 따라 관련 섹션을 표시하거나 숨긴다.
     */
    toggleFrontOnlyField() {
        try {
            const {mode, id} = this
            const $popup = $('#' + id + '__popUp')
            const $feeldexSection = $popup.find('#feeldexSection')
            const $sessionReplayRateSection = $popup.find('#sessionReplayRateSection')
            const $sReplayToggleWrap = $popup.find('#sReplayYn').closest('div')
            const $sReplayToggle = $sReplayToggleWrap.find('#sReplayYn')

            const setVisible = ($el, show) => {
                $el.css('display', show ? 'block' : 'none')
            }

            if (mode === 'maxy') {
                setVisible($feeldexSection, false)
                setVisible($sessionReplayRateSection, false)
                setVisible($sReplayToggleWrap, false)
                $sReplayToggle.prop('checked', false)
                this.resetSessionReplayValues($popup)
                this.resetLoggingRateMobile($popup)
                this.updateDataCollectionTitle(false)
                return
            }

            const isFrontMonitoringChecked = mode === 'front'
                ? true
                : $popup.find('#appType').prop('checked')

            setVisible($sReplayToggleWrap, isFrontMonitoringChecked)
            if (!isFrontMonitoringChecked) {
                $sReplayToggle.prop('checked', false)
            }

            const isSessionReplayChecked = isFrontMonitoringChecked && $sReplayToggle.prop('checked')

            setVisible($feeldexSection, isFrontMonitoringChecked)

            const showSessionReplaySection = isFrontMonitoringChecked && isSessionReplayChecked
            setVisible($sessionReplayRateSection, showSessionReplaySection)

            if (!showSessionReplaySection) {
                //this.resetSessionReplayValues($popup)
                //this.resetLoggingRateMobile($popup)
            }

            this.updateDataCollectionTitle(isFrontMonitoringChecked)
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * 폼 유효성 검사 및 전송 파라미터를 구성한다.
     * @returns {{status: boolean, param: Object|null}}
     */
    valid() {
        const v = this

        const $target = $('#' + v.id + '__popUp')

        const $packageNm = $target.find('#appId')
        const $serverType = $target.find('#serverType')
        const $displayNm = $target.find('#appName')
        const $loggingRate = $target.find('#loggingRate')
        const $logBundleUnit = $target.find('#logBundleUnits')
        const $logPeriod = $target.find('#logPeriod')
        const $pageLogPeriod = $target.find('#pageLogPeriod')
        const $sessionLogPeriod = $target.find('#sessionLogPeriod')
        const $order = $target.find('#order')
        const $appType = $target.find('#appType')
        const $useYn = $target.find('#useYn')
        const $monitoringYn = $target.find('#monitoringYn')
        const $zipYn = $target.find('#zipYn')
        const $fullMsgYn = $target.find('#fullMsgYn')

        const $fullReqMsgYn = $target.find('#fullReqMsgYn')
        const $infoYn = $target.find('#infoYn')
        const $integrationYn = $target.find('#integrationYn')
        const $sReplayYn = $target.find('#sReplayYn')

        const $ratioBasedCriteria = $target.find('#ratioBasedCriteria')
        const $targetBasedCriteria = $target.find('#targetBasedCriteria')

        const param = {
            packageNm: $packageNm.val()?.trim(),
            serverType: parseInt($serverType.val(), 10),
            displayNm: $displayNm.val()?.trim(),
            order: parseInt($order.val(), 10),
            appType: $appType.is(':checked') ? '1' : '0',
            logPeriod: parseInt($logPeriod.val(), 10),
            pageLogPeriod: parseInt($pageLogPeriod.val(), 10),
            sessionLogPeriod: parseInt($sessionLogPeriod.val(), 10),
            logBundleUnit: parseInt($logBundleUnit.val(), 10),

            useYn: $useYn.is(':checked') ? 'Y' : 'N',
            monitoringYn: $monitoringYn.is(':checked') ? 'Y' : 'N',
            zipYn: $zipYn.is(':checked') ? 'Y' : 'N',
            fullMsgYn: $fullMsgYn.is(':checked') ? 'Y' : 'N',

            fullReqMsgYn: $fullReqMsgYn.is(':checked') ? 'Y' : 'N',
            infoYn: $infoYn.is(':checked') ? 'Y' : 'N',
            integrationYn: $integrationYn.is(':checked') ? 'Y' : 'N',
            sReplayYn: $sReplayYn.is(':checked') ? 'Y' : 'N',
            loggingRatePc: v.getRateValue('collectionLoggingRate', 'loggingRatePc'),
            loggingRateMobile: v.getRateValue('collectionLoggingRateMobile', 'loggingRateMobile'),
            sessionRatePc: v.getRateValue('webCollectionRate', 'sessionRatePc'),
            sessionRateMobile: v.getRateValue('webViewCollectionRate', 'sessionRateMobile')
        };

        const isSessionReplayOn = $sReplayYn.prop('checked')
        const isRatioBased = $ratioBasedCriteria.prop('checked')
        const isTargetBased = $targetBasedCriteria.prop('checked')

        // Session Replay 기준 방식 검증 및 전달
        if (isSessionReplayOn) {
            if (!isRatioBased && !isTargetBased) {
                toast('Session Replay 기준을 선택해주세요.')
                return {status: false, param: null};
            }
            param.sessionBasedCriteria = isRatioBased ? 'R' : 'T'
        } else {
            param.sessionBasedCriteria = ''
        }

        // packageNm 형식 체크
        const packageNmRegex = /^[a-zA-Z0-9._-]{1,100}$/;
        if (!param.packageNm || !packageNmRegex.test(param.packageNm)) {
            toast(trl('system.package.msg.packageName'));
            util.emptyInput($packageNm);
            return {status: false, param: null};
        }

        // serverType 허용값 확인
        if (![0, 1, 2].includes(param.serverType)) {
            toast(trl('system.batch.msg.invalidParam'));
            util.emptyInput($serverType);
            return {status: false, param: null};
        }

        // displayNm 길이 제한
        if (!param.displayNm || param.displayNm.length > 100) {
            toast(trl('system.package.msg.displayName'));
            util.emptyInput($displayNm);
            return {status: false, param: null};
        }

        // Y/N 필드 체크
        const ynFields = ['useYn', 'monitoringYn', 'zipYn', 'fullMsgYn', 'fullReqMsgYn', 'infoYn', 'integrationYn', 'sReplayYn'];
        for (const field of ynFields) {
            const value = param[field];
            if (!['Y', 'N'].includes(value)) {
                toast(`$\{trl('system.batch.msg.invalidParam')}`);
                return {status: false, param: null};
            }
        }
        // logBundleUnit 범위 체크
        if (isNaN(param.logBundleUnit)
            || param.logBundleUnit < 10
            || param.logBundleUnit > 500) {
            toast(trl('system.package.msg.valid.numberrange', [10, 500]));
            util.emptyInput($logBundleUnit);
            return {status: false, param: null};
        }
        // logPeriod 범위 체크
        if (isNaN(param.logPeriod)
            || param.logPeriod < 1
            || param.logPeriod > 120) {
            toast(trl('system.package.msg.valid.numberrange', [1, 120]));
            util.emptyInput($logPeriod);
            return {status: false, param: null};
        }
        // pageLogPeriod 범위 체크
        if (isNaN(param.pageLogPeriod)
            || param.pageLogPeriod < 0
            || param.pageLogPeriod > 10) {
            toast(trl('system.package.msg.valid.numberrange', [0, 10]));
            util.emptyInput($pageLogPeriod);
            return {status: false, param: null};
        }
        // sessionLogPeriod 범위 체크
        if (isNaN(param.sessionLogPeriod)
            || param.sessionLogPeriod < 1
            || param.sessionLogPeriod > 10) {
            toast(trl('system.package.msg.valid.numberrange', [1, 10]));
            util.emptyInput($sessionLogPeriod);
            return {status: false, param: null};
        }

        // loggingRate 범위 체크
        if (isNaN(param.loggingRatePc) || param.loggingRatePc < 0 || param.loggingRatePc > 100) {
            toast(trl('system.package.msg.valid.numberrange', [0, 100]));
            util.emptyInput($loggingRate);
            return {status: false, param: null};
        }

        // order 범위 체크
        if (isNaN(param.order) || param.order < 0 || param.order > 999) {
            toast(trl('system.package.msg.valid.numberrange', [0, 999]));
            util.emptyInput($order);
            return {status: false, param: null};
        }

        let lcp, inp, cls
        if (v.mode !== 'maxy') {
            const $lcp = $("#lcp")
            lcp = $lcp.val() ? parseFloat($lcp.val()) : 40
            param.lcp = lcp

            const $inp = $("#inp")
            inp = $inp.val() ? parseFloat($inp.val()) : 30
            param.inp = inp

            const $cls = $("#cls")
            cls = $cls.val() ? parseFloat($cls.val()) : 30
            param.cls = cls

            if (lcp + inp + cls > 100) {
                toast('LCP, INP, CLS 비율의 합은 100을 초과할 수 없습니다.')
                return {status: false, param: null};
            }
        }

        return {param, status: true};
    }

    /**
     * 슬라이더 표시 텍스트에서 퍼센트 숫자만 추출한다.
     * @param {string} checkboxId - 체크박스 ID (사용 안 함, 호환 유지)
     * @param {string} valueId - 값이 표시된 span ID
     * @returns {number}
     */
    getRateValue(checkboxId, valueId) {
        return Number(
            $('#' + valueId).text().replace('%', '')
        )
    }

    /**
     * 검증 후 App 정보를 저장 요청한다.
     */
    saveAppInfo() {
        const v = this

        const $target = $('#' + v.id + '__popUp')

        const packageNm = $target.find('#appId').val()
        const serverType = $target.find('#serverType').val()

        if (!packageNm || !serverType) {
            toast(trl('system.package.msg.valid.appinfo'))
            return
        }

        const {param, status} = v.valid()
        if (!status) return

        // 등록: reg, 수정: update
        param.type = v.type

        // mode가 front인 경우엔 appType이 0일 수 없음. 반대도 마찬가지. all일 때만 0또는 1 선택한 값으로 들어가야함
        if (v.mode === 'front') {
            param.appType = 1
        } else if (v.mode === 'maxy') {
            param.appType = 0
        }

        ajaxCall('/sm/0500/saveAppInfo.maxy', param).then(data => {
            toast(trl('system.package.msg.save'), true)
            v.closePopup(v)

            SM0400.v.table.setData(data)
            getSessionInfo()
        }).catch(error => {
            console.log(error)
            toast(trl(error.msg))
        })
    }

    // 삭제 확인 텍스트 비교
    confirmDelete(str) {
        const confirmText = trl('system.package.msg.deleteConfirm')
        return str === confirmText
    }

    delete() {
        const v = this

        const s = prompt(trl('system.package.msg.deleteWarning'), '')
        if (v.confirmDelete(s)) {
            v.deleteAppInfo()
        }
    }

    // 앱 삭제
    deleteAppInfo() {
        const {id} = this
        const v = this
        const $target = $('#' + id + '__popUp')

        const packageNm = $target.find('#appId').val()
        const serverType = $target.find('#serverType').val()

        if (!packageNm || !serverType) {
            toast(trl('system.batch.msg.invalidParam'))
            return
        }

        const param = {packageNm, serverType}
        param.appType = (sessionStorage.getItem('maxyMode') || '') === 'front' ? 1 : 0

        ajaxCall('/sm/0500/deleteAppInfo.maxy', param).then(data => {
            SM0400.v.table.replaceData(data)
            toast(trl('system.package.msg.delete'), true)
            v.closePopup(v)
            getSessionInfo()
        }).catch(error => {
            console.log(error)
            toast(trl(error.msg))
        })
    }

    /**
     * 테이블 행을 추가한다.
     * @param {string} tableBodySelector - 테이블 tbody 선택자
     * @param {Array<string>} selectorFilter - 응답에서 필터링할 selector 리스트
     */
    addTableRow(tableBodySelector, selectorFilter) {
        const v = this
        const $target = $('#' + v.id + '__popUp')
        const $tableBody = $(tableBodySelector)
        const $newRowTemplate = $tableBody.find('.new_row_template')

        // 입력값 검증
        const targetItem = $newRowTemplate.find('.item_select').val()
        const target = $newRowTemplate.find('.target_input').val().trim()
        const remark = $newRowTemplate.find('.remark_input').val().trim()

        if (!target) {
            toast(trl('common.msg.checkValue'))
            return
        }

        // ID, Class 요소 값 유효성 검사
        /* if (!this.validateTarget(targetItem, target)) {
            return false
        }
 */
        const param = {
            packageNm: $target.find('#appId').val(),
            serverType: $target.find('#serverType').val(),
            selector: targetItem,
            target: target,
            remark: remark,
            useYn: 'Y'
        }

        ajaxCall('/sm/0500/addSessionReplayRuleInfo.maxy', param).then(data => {
            const listData = (data || []).filter(item => selectorFilter.includes(item.selector))
            v.loadTableData(listData, tableBodySelector)

            // 템플릿 행 초기화
            $newRowTemplate.find('.target_input').val('')
            $newRowTemplate.find('.remark_input').val('')
        }).catch(error => {
            console.log(error)
            toast('서버 오류가 발생했습니다.')
        })
    }

    /**
     * 테이블 행을 삭제한다.
     * @param {HTMLElement} button - 삭제 버튼 DOM
     * @param {string} tableBodySelector - 테이블 tbody 선택자
     * @param {Array<string>} selectorFilter - 응답에서 필터링할 selector 리스트
     */
    removeTableRow(button, tableBodySelector, selectorFilter) {
        const v = this
        const $target = $('#' + v.id + '__popUp')

        const $row = $(button).closest('tr')
        const seq = $row.data('seq')

        const msg = trl('common.msg.selectDel')
        modal.show({
            id: 'deleteRow',
            msg: msg,
            confirm: true,
            fn: () => {
                const param = {
                    packageNm: $target.find('#appId').val(),
                    serverType: $target.find('#serverType').val(),
                    seq: seq
                }

                ajaxCall('/sm/0500/deleteSessionReplayRuleInfo.maxy', param).then(data => {
                    const listData = (data || []).filter(item => selectorFilter.includes(item.selector))
                    this.loadTableData(listData, tableBodySelector)
                }).catch(error => {
                    console.log(error)
                    toast('서버 오류가 발생했습니다.')
                })
            }
        })
    }

    /**
     * 테이블 데이터를 렌더링한다.
     * @param {Array<Object>} data - 렌더링할 데이터 배열
     * @param {string} tableBodySelector - 테이블 tbody 선택자
     */
    loadTableData(data, tableBodySelector) {
        const $tableBody = $(tableBodySelector)
        const $newRowTemplate = $tableBody.find('.new_row_template')

        // 기존 등록된 행들 제거
        $tableBody.find('.registered-row').remove()

        if (data.length === 0) return

        // 데이터 행 추가
        data.forEach(item => {
            let selector = ''
            if ((item.selector || '').toLowerCase() === 'user') selector = 'User'
            else if ((item.selector || '').toLowerCase() === 'url') selector = 'Page'

            const rowHtml = `
                <tr class="registered-row" data-seq="${item.seq}">
                    <td>${selector}</td>
                    <td>${item.target}</td>
                    <td>${item.remark}</td>
                    <td>${util.datetimeFormat(item.regDt)}</td>
                    <td>
                        <button type="button" class="btn_remove" data-t="common.btn.delete"></button>
                    </td>
                </tr>
            `

            $newRowTemplate.before(rowHtml)
        })

        updateContent()
    }

    /**
     * 테이블을 필터링한다.
     * @param {string} wrapSelector - 필터 입력 래퍼 선택자
     * @param {string} tableBodySelector - 테이블 tbody 선택자
     */
    filterTable(wrapSelector, tableBodySelector) {
        const filterType = $(wrapSelector + ' .filter_type_select').val()
        const filterValue = $(wrapSelector + ' .filter_input').val().trim().toLowerCase()

        if (!filterValue) {
            this.clearTableFilter(wrapSelector, tableBodySelector)
            return
        }

        const $tableBody = $(tableBodySelector)
        const $rows = $tableBody.find('.registered-row')

        $rows.each(function () {
            const $row = $(this)
            let cellValue = ''

            if (filterType === 'target') {
                cellValue = $row.find('td:nth-child(2)').text().toLowerCase() // Target 컬럼
            } else if (filterType === 'remark') {
                cellValue = $row.find('td:nth-child(3)').text().toLowerCase() // Remark 컬럼
            }

            if (cellValue.includes(filterValue)) {
                $row.show()
            } else {
                $row.hide()
            }
        })
    }

    /**
     * 테이블 필터를 초기화한다.
     * @param {string} wrapSelector - 필터 입력 래퍼 선택자
     * @param {string} tableBodySelector - 테이블 tbody 선택자
     */
    clearTableFilter(wrapSelector, tableBodySelector) {
        $(wrapSelector + ' .filter_input').val('')
        const $tableBody = $(tableBodySelector)
        const $rows = $tableBody.find('.registered-row')
        $rows.show() // 모든 행 표시
    }

    /**
     * Target 값의 유효성을 검사한다.
     * @param {string} selector - 선택자 타입 (class, id, user, url)
     * @param {string} target - 검사할 target 값
     * @returns {boolean} 유효성 검사 결과
     */
    validateTarget(selector, target) {
        const validations = {
            class: [
                // 시작 문자 검사
                {test: /^[^a-zA-Z_-]/, msg: trl('common.msg.outFormat')},
                // 공백
                {test: /\s/, msg: trl('common.msg.noBlank')},
                // 비ASCII
                {test: /[^\x00-\x7F]/, msg: trl('common.msg.outFormat')},
                // 전체 구문 검사 (inverse)
                {test: /^[a-zA-Z_-][a-zA-Z0-9_-]*$/, msg: trl('common.msg.outFormat'), inverse: true}
            ],
            id: [
                // 시작 문자 검사
                {test: /^[^a-zA-Z_]/, msg: trl('common.msg.outFormat')},
                // 공백
                {test: /\s/, msg: trl('common.msg.noBlank')},
                // 전체 구문 검사 (inverse)
                {test: /^[a-zA-Z_][a-zA-Z0-9_-]*$/, msg: trl('common.msg.outFormat'), inverse: true}
            ],
            user: [],
            url: []
        }

        const rules = validations[selector]
        if (!rules) return true

        for (const rule of rules) {
            const isMatch = rule.test.test(target)
            const isInvalid = rule.inverse ? !isMatch : isMatch

            if (isInvalid) {
                toast(rule.msg)
                return false
            }
        }

        return true
    }
}
