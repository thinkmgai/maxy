<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    li {
        list-style: none;
    }

    progress {
        background: #e3e5e8;
        height: 8px;
        border-radius: var(--radius);
    }

    progress::-webkit-progress-bar {
        background: #e3e5e8;
        height: 8px;
        border-radius: var(--radius);
    }

    progress::-webkit-progress-value {
        background: #01875F;
        height: 8px;
        border-radius: var(--radius);
    }

    progress::-moz-progress-bar {
        background: #e3e5e8;
        height: 8px;
        border-radius: var(--radius);
    }

    i.icon_ios {
        content: url("/images/maxy/icon-ios.svg");
        width: 20px;
        height: 20px;
    }

    i.icon_android {
        content: url("/images/maxy/icon-android.svg");
        width: 20px;
        height: 20px;
    }

    .gm_wrap .gm_header {
        margin-bottom: 0;
    }

    .gm_contents_grid {
        position: relative;
        width: 100%;
        height: calc(100vh - 162px);
        display: flex;
        gap: 1em;
    }

    .gm_contents_half {
        width: 100%;
        height: 100%;
    }

    .gm_contents_half.left {
        min-width: 1.5vw;
        padding: 2em 1em 0 1em;
    }

    .gm_contents_half.right {
        padding: 1em;
        border-radius: var(--radius);
        height: calc(100vh - 225px);
        margin-top: 4.5em;
        border: 1px solid var(--color-border-out-light);
    }

    .gm_contents_half.right .review_list {
        height: 100%;
        overflow-y: scroll;
        display: grid;
        grid-template-rows: repeat(5, 1fr);
        gap: 2.5em;
    }

    .review_list .no_data {
        padding-top: 10px;
        color: #949494;
        text-align: center;
    }

    .gm_contents_header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1em;
    }

    .gm_contents_header h4 {
        font-size: 14px;
        line-height: 20px;
    }

    .gm_contents_header > div {
        display: flex;
        gap: 1em;
        align-items: center;
    }

    .gm_menu_text_wrap .title_option_desc {
        flex-direction: column;
        gap: 0.7em;
        align-items: flex-start;
    }

    .gm_toggle_wrap .btn_os_type:nth-child(1) {
        margin-right: 10px;
    }

    .gm_toggle_wrap .btn_os_type {
        border: 1px solid var(--color-border-out-light);
        border-radius: 15px;
        padding: 5px 25px 5px 25px;
    }

    .gm_toggle_wrap .btn_os_type.on {
        background-color: #E6F3EF;
        color: #116C52;
        border: none;
    }

    .gm_mini_box {
        width: 100%;
        margin-bottom: 2em;
    }

    .gm_mini_box.app_info_wrap {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 1em;
        border-radius: var(--radius);
        border: 1px solid #e3e5e8;
        padding: .5em;
    }

    .gm_mini_box.app_info_wrap > div {
        border-right: 1px solid var(--color-border-in-light);
        width: 100%;
        text-align: center;
        padding: .5em;
        display: flex;
        flex-direction: column;
        gap: .5em;
    }

    .gm_mini_box.app_info_wrap > div:last-child {
        border-right: none;
    }

    .gm_mini_box.app_info_wrap .app_info_title {
        color: var(--color-grid-title-light-2);
    }

    .gm_mini_box.rate_wrap {
        display: grid;
        gap: 1em;
        grid-template-columns: 100px auto;
    }

    .gm_mini_box.rate_wrap .rate {
        font-size: 28px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .gm_mini_box.rate_wrap .progress_wrap {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .gm_mini_box.rate_wrap .progress_wrap progress {
        width: 100%;
    }

    .progress_wrap .progress {
        display: grid;
        align-items: center;
        grid-template-columns: 3% 97%;
    }

    .progress_wrap .progress > span {
        font-size: 12px;
    }

    .gm_mini_box.rate_wrap .star_wrap {
        display: flex;
        gap: 2px;
    }

    .gm_mini_box.rate_wrap .review_count {
        font-size: 11px;
        margin-top: 8px;
        color: #808080;
    }

    .review_list_wrap .comment {
        line-height: 18px;
    }

    .no_review {
        text-align: center;
        color: #D5DCDF;
    }

    .paging_btn_wrap {
        position: absolute;
        right: 0;
        top: 2em;
        gap: .5em !important;
        height: 23px !important;
        margin-top: inherit !important;
    }

    .paging_btn_wrap > button {
        min-width: 28px !important;
        width: 28px !important;
        border-radius: var(--radius) !important;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    #analysisChart, #wordCloudChart {
        height: 22vh;
    }
</style>
<%-- 관리 > 스토어 > 스토어 분석 --%>
<div class="gm_wrap">
    <div class="gm_header">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title" data-t="menu.management.storeanalysis"></h4>
                <%-- os type toggle button --%>
                <div class="gm_toggle_wrap">
                    <button class="btn_os_type" data-type="iOS">iOS</button>
                    <button class="btn_os_type" data-type="Android">Android</button>
                </div>
            </div>
        </div>
        <div>
            <label for="packageNm"></label><select id="packageNm"></select>
        </div>
    </div>
    <div class="gm_contents_grid">
        <div class="gm_contents_half left">

            <%-- 상단 앱 정보 박스 --%>
            <div class="gm_contents_header">
                <div>
                    <i class="icon_ios" id="os"></i>
                    <h4>Updated On
                        <span id="today"></span>
                    </h4>
                </div>
            </div>
            <div class="gm_mini_box app_info_wrap">
                <div>
                    <div class="app_info_title" data-t="dashboard.bi.install"></div>
                    <div id="pInstall"></div>
                </div>
                <div>
                    <div class="app_info_title" data-t="dashboard.bi.reInstall"></div>
                    <div id="pReInstall"></div>
                </div>
                <div>
                    <div class="app_info_title" data-t="dashboard.bi.upgrade"></div>
                    <div id="pUpgrade"></div>
                </div>
                <div>
                    <div class="app_info_title" data-t="dashboard.bi.activeUser"></div>
                    <div id="pActiveUser"></div>
                </div>
                <div>
                    <div class="app_info_title" data-t="dashboard.bi.unInstall"></div>
                    <div id="pUnInstall"></div>
                </div>
            </div>
            <%-- 상단 앱 정보 박스 END --%>

            <%-- 별점 및 리뷰 박스 --%>
            <div class="gm_contents_header">
                <div>
                    <h4>Ratings and Reviews</h4>
                </div>
            </div>

            <div class="gm_mini_box rate_wrap">
                <div>
                    <div class="rate" id="pRate"></div>
                    <div class="star_wrap"></div>
                    <div class="review_count" id="reviewCount"></div>
                </div>
                <div class="progress_wrap">
                    <div class="progress">
                        <span>5</span>
                        <progress id="progress5" value="" max="100"></progress>
                    </div>
                    <div class="progress">
                        <span>4</span>
                        <progress id="progress4" value="" max="100"></progress>
                    </div>
                    <div class="progress">
                        <span>3</span>
                        <progress id="progress3" value="" max="100"></progress>
                    </div>
                    <div class="progress">
                        <span>2</span>
                        <progress id="progress2" value="" max="100"></progress>
                    </div>
                    <div class="progress">
                        <span>1</span>
                        <progress id="progress1" value="" max="100"></progress>
                    </div>

                </div>
            </div>
            <%-- 별점 및 리뷰 박스 END --%>

            <%-- 리뷰 Word Cloud 박스 --%>
            <div class="gm_contents_header">
                <div>
                    <h4>Word Cloud</h4>
                </div>
            </div>
            <div class="gm_mini_box wordcloud_wrap">
                <div id="wordCloudChart"></div>
            </div>
            <%-- 리뷰 Trend 박스 END --%>

            <%-- 리뷰 Trend 박스 --%>
            <div class="gm_contents_header">
                <div>
                    <h4>Analytics</h4>
                </div>
            </div>
            <div class="gm_mini_box trend_wrap">
                <div id="analysisChart"></div>
            </div>
            <%-- 리뷰 Trend 박스 END --%>
        </div>
        <%-- review list --%>

        <div class="paging_btn_wrap">
            <button class="btn_move_page tabulator-page" data-type="prev">
                <span data-t="common.btn.◀"></span>
            </button>
            <input type="hidden" id="selectSize" value="100">
            <button class="btn_move_page tabulator-page" data-type="next">
                <span data-t="common.btn.▶"></span>
            </button>
        </div>
        <div class="gm_contents_half right enable_scrollbar">
            <div class="review_list" id="reviewList">

            </div>
        </div>
    </div>
</div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var SA0000 = {
        v: {
            // android review, ios review 페이징 관련 변수 (초기값 1)
            androidPageIndex: 0,
            iosPageIndex: 0,
            reviewCount: 0,
            osType: 'ios'
        },
        init: {
            event() {
                const {v, func} = SA0000
                $('.btn_os_type').on('click', function (e) {
                    const $el = $(e.target)
                    func.toggle($el)
                })

                $('#packageNm').on('change', () => {
                    v.reviewCount = 0
                    v.androidPageIndex = 0
                    v.iosPageIndex = 0
                    $('.btn_os_type[data-type="iOS"]').trigger('click')

                    // 패키지 변경시 osType, appVer 전체 값으로 초기화
                    sessionStorage.setItem('osType', 'A')
                    sessionStorage.setItem('appVer', 'A')
                })
            },
            created() {
                updateContent()
                const {func} = SA0000
                appInfo.append({pId: 'packageNm'}).then(() => {
                    $('.btn_os_type[data-type="iOS"]').trigger('click')
                    func.setHandlebarsHelper()
                    func.setDate()
                    func.getReviewTemplate()
                })
            }
        },
        func: {
            setDate() {
                // 28 August 2023 형식으로 표시
                const date = String(util.nowDateTime())
                // 년도
                const year = date.substr(0, 4)
                // 월
                const month = date.substr(4, 2)
                // 해당 월에 맞는 영문명 가져오기
                const engMonth = util.getEngMonth(month)
                const day = date.substr(6, 2)
                $('#today').text(day + ' ' + engMonth + ' ' + year)
            },
            setHandlebarsHelper() {
                Handlebars.registerHelper('setStar', rating => {
                    let start = ''
                    if (rating >= 1 && rating <= 5) {
                        for (let i = 1; i <= Number(rating); i++) {
                            start += '<img src="/images/maxy/icon-star-on-gold.svg" alt="" />'
                        }
                        for (let i = 1; i <= (5 - Number(rating)); i++) {
                            start += '<img src="/images/maxy/icon-star-off-gold.svg" alt="" />'
                        }
                    }
                    return new Handlebars.SafeString(start)
                })

                Handlebars.registerHelper('isNeedReplyBox', replyContent => {
                    return replyContent != null
                })

                Handlebars.registerHelper('isEmptyReply', replyContent => {
                    return replyContent !== '' && replyContent !== null
                })

                Handlebars.registerHelper('tsToDttm', (ts, dttm) => {
                    if (ts) {
                        return util.timestampToDateTime(ts)
                    } else {
                        return util.utcToDateTime(dttm)
                    }
                })

                Handlebars.registerHelper('setName', name => {
                    return name ? name : '익명'
                })
            },
            // OS 유형 토글
            toggle(target) {
                const {v, func} = SA0000
                v.androidPageIndex = 0
                v.iosPageIndex = 0

                $('.btn_os_type').removeClass('on')
                target.addClass('on')

                // OS 유형에 따라 날짜 옆 아이콘 변경
                const osType = target.data('type').toLowerCase()
                v.osType = osType
                const $os = $('#os')
                $os.removeAttr('class')
                $os.addClass('icon_' + osType)

                // OS 유형에 따라 페이징 버튼 id 설정
                const $prevBtn = $('.btn_move_page[data-type="prev"]')
                const $nextBtn = $('.btn_move_page[data-type="next"]')
                $prevBtn.removeAttr('id')
                $prevBtn.attr('id', osType + 'BtnPrev')
                $nextBtn.removeAttr('id')
                $nextBtn.attr('id', osType + 'BtnNext')

                const $btnPrev = $('#' + v.osType + 'BtnPrev')
                const $btnNext = $('#' + v.osType + 'BtnNext')

                // 버튼 클릭 이벤트 등록
                $btnPrev.attr('disabled', true)
                $btnPrev.off('click')
                $btnPrev.on('click', () => {
                    v[v.osType + 'PageIndex'] --
                    func.getData(true)

                    if (v[v.osType + 'PageIndex'] <= 0) {
                        $btnPrev.attr('disabled', true)
                    }
                })

                $btnNext.off('click')
                $btnNext.on('click', () => {
                    v[v.osType + 'PageIndex']++
                    func.getData(true)

                    if (v[v.osType + 'PageIndex'] >= 0) {
                        $btnNext.attr('disabled', false)
                        $btnPrev.attr('disabled', false)
                    }
                })

                // 리뷰 프로그레스바 초기화
                $('.progress > progress').val('0')
                func.getData()
            },
            getData(isClick) {
                const {v, func} = SA0000

                const accessDate = util.nowDateTime().substr(0,8)
                const param = {
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type'),
                    accessDate,
                    fromDt: util.getDateToString(),
                    toDt: util.getDateToString(),
                    pageSize: 5
                }

                if (isClick) {
                    param.paging = true
                }

                param.osType = v.osType

                // 서버로 보낼 page index는 화면에서 생성한 변수에 * pageSize 해서 보낸다
                param.firstIndex = v[param.osType + 'PageIndex'] * param.pageSize

                if (util.checkParam(param)) {
                    return
                }

                ajaxCall('/gm/0800/getAppInfo.maxy', param).then(data => {
                    const {app, rate, review, reviewCount, trend, wordcloud} = data

                    if (!param.paging) {
                        v.reviewCount = reviewCount
                    }

                    if (review.length === 0) {
                        $('#' + param.osType + 'BtnPrev').attr('disabled', true)
                        $('#' + param.osType + 'BtnNext').attr('disabled', true)
                    }

                    // 마지막 페이지인 경우 (리뷰 갯수가 0이 아니고)
                    if (v.reviewCount <= param.firstIndex + review.length && review.length !== 0) {
                        $('#' + param.osType + 'BtnPrev').attr('disabled', false)
                        $('#' + param.osType + 'BtnNext').attr('disabled', true)
                    }
                    else if (review.length !== 0) {
                        $('#' + param.osType + 'BtnNext').attr('disabled', false)
                    }

                    // isClick이 true면 prev 또는 next 버튼을 눌렀다는 것임
                    // 리뷰 페이징 버튼 눌렀는데 리뷰 리스트 말고 다른 데이터들은 갱신할 필요가 없음
                    if (isClick) {
                        func.setReviewList(review)
                        return
                    }
                    func.setData(app, rate, reviewCount)
                    func.setReviewList(review)
                    func.setAnalysisChart(trend)
                    func.setWordCloudChart(wordcloud)
                }).catch(error => {
                    console.log(error)
                })
            },
            setData(app, rate, reviewCount) {
                const {func} = SA0000

                const {install, reInstall, upgrade, activerUser, unInstall} = app

                // 값이 없는 경우 -으로
                $('#pInstall').text(util.isEmpty(install) ? '-' : util.comma(install))
                $('#pReInstall').text(util.isEmpty(reInstall) ? '-' : util.comma(reInstall))
                $('#pUpgrade').text(util.isEmpty(upgrade) ? '-' : util.comma(upgrade))
                $('#pActiveUser').text(util.isEmpty(activerUser) ? '-' : util.comma(activerUser))
                $('#pUnInstall').text(util.isEmpty(unInstall) ? '-' : util.comma(unInstall))

                // 별점 세팅
                const rateCount = util.isEmpty(rate.rate) ? '0' : rate.rate
                $('#pRate').text(rateCount)

                const star = func.setStar(rateCount)
                $('.star_wrap').html(star)
                $('#reviewCount').text(util.comma(reviewCount))

                // 별점 별 프로그레스바 세팅
                const {countByRate, count} = rate
                if (!countByRate || countByRate.length === 0) {
                    return
                }
                for (let i = 0; i < countByRate.length; i++) {
                    const rates = isNaN(countByRate[i]['ratingCnt']) ? 0 : countByRate[i]['ratingCnt']
                    const ratePct = (rates / count) * 100
                    $('#progress' + (i + 1)).val(ratePct)
                }
            },
            async getReviewTemplate() {
                const {v} = SA0000
                v.source = await fetch('/templates/review.html')
                    .then(response => response.text())
                v.template = Handlebars.compile(v.source)
            },
            setReviewList(review) {
                const {v, func} = SA0000

                // 템플릿이 로드되지 않은 경우, getReviewTemplate 호출 후 종료
                if (!v.template) {
                    console.warn('Template not loaded. Attempting to load template again.')
                    func.getReviewTemplate().then(() => {
                        func.setReviewList(review)  // 템플릿 로딩 후 다시 호출
                    }).catch(error => {
                        console.error('Failed to load template:', error)
                        $('#reviewList').empty().append('<div class="no_review">Template loading failed.</div>')
                    })
                    return
                }

                const reviewList = v.template({reviewList: review})
                const $reviewList = $('#reviewList')
                $reviewList.empty()

                // 리뷰가 없는 경우
                if (!review || review.length <= 0) {
                    $reviewList.append('<div class="no_review">Data is being processed.</div>')
                    return
                }

                $reviewList.html(reviewList)
            },
            setStar(rate) {
                let start = ''
                if (rate >= 1 && rate <= 5) {
                    for (let i = 1; i <= Number(rate); i++) {
                        start += '<img src="/images/maxy/icon-star-on-gold.svg" alt="" />'
                    }
                    for (let i = 1; i <= (5 - Number(rate)); i++) {
                        start += '<img src="/images/maxy/icon-star-off-gold.svg" alt="" />'
                    }
                }
                return start
            },
            setAnalysisChart(trend) {
                const options = {
                    id: 'analysisChart',
                    data: trend
                }

                const analysisChart = new MaxyAnalysisChart(options)
                analysisChart.setData(trend)
            },
            setWordCloudChart(wordCloud) {
                const options = {
                    id: 'wordCloudChart',
                    data: wordCloud
                }

                const wordCloudChart = new MaxyWordCloudChart(options)
            }
        }
    }
    SA0000.init.event()
    SA0000.init.created()
</script>
