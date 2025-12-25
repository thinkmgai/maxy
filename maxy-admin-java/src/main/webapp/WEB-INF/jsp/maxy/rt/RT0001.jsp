<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .calendar_wrap::before {
        content: '';
    }

    .contents_wrap {
        padding: 0;
    }

    .rt_wrap {
        display: flex;
        height: 100%;
    }

    .rt_wrap .left_side_wrap {
        background-color: var(--black-7);
        width: 340px;
        padding: 20px 25px;
    }

    .rt_wrap .right_side_wrap {
        width: 93%;
        background-color: white;
        padding: 20px;
    }

    .rt_wrap .right_side_wrap .toolbar_wrap {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        margin-bottom: 1em;
        gap: 1em;
    }

    .rt_wrap .right_side_wrap .pdf_wrap {
        width: 100%;
        height: 100%;
    }

    .rt_wrap .right_side_wrap .add_help {
        font-weight: 700;
        margin: 0 1em 1em 0;
        gap: 3px;
        position: relative;
    }

    .rt_wrap .right_side_wrap .add_help .ic_question {
        position: absolute;
        left: 27px;
        top: -6px;
        width: 1em;
    }

    .rt_wrap .right_side_wrap.auto_height {
        height: calc(100vh - 40px);
        overflow: auto;
    }

    /* left side wrap */
    .rt_wrap .app_info_group {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-bottom: 8px;
    }

    .rt_wrap .app_info_group .app_info_wrap {
        display: grid;
        gap: 5px;
        grid-template-columns: 30px auto;
        align-items: center;
        width: 100%;
        margin-bottom: 8px;
    }

    .rt_wrap .app_info_wrap label {
        font-size: 13px;
    }

    .rt_wrap .app_info_wrap select {
        border: 1px solid #E1E4E8;
        width: 250px;
        text-align: center;
    }

    .rt_wrap .calendar_wrap {
        margin-bottom: 18px;
        gap: 0;
    }

    .rt_wrap .left_side_wrap .btn_wrap {
        display: grid;
        grid-template-columns: 48.5% 48.5%;
        gap: 3%;
        margin-top: 16px;
    }

    .rt_wrap .tag_wrap .tag_header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .rt_wrap .tag_content {
        display: flex;
        flex-direction: column;
        overflow: scroll;
        margin-top: 8px;
        background-color: var(--black-9);
        border-radius: var(--radius);
        padding: 1em;
        max-height: 200px;
    }

    .rt_wrap .tag_content .tag {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid #E1E4E8;
        border-radius: var(--radius);
        white-space: nowrap;
        margin: 3px;
        padding: 3px 6px;
        line-height: 20px;
    }

    .rt_wrap .tag_content .tag img {
        width: 0.9em;
        padding: 0.1em;
        vertical-align: middle;
    }

    .vanilla-calendar {
        width: 100%;
    }

    .maxy_cursor_dots {
        z-index: 150;
        position: absolute;
        left: 50%;
        top: 70%;
        transform: translate(-50%, -50%);
    }

    .rt_wrap .right_navbar_wrap {
        display: flex;
        flex-direction: column;
        position: fixed;
        top: 40px;
        height: calc(100% - 40px);
        background-color: var(--black-9);
        box-shadow: -2px 0 12px rgba(0, 0, 0, 0.25);
        z-index: 19;
        overflow-y: auto;
        transition: right 0.5s ease; /* 부드러운 슬라이드 효과 */
    }

    .rt_wrap .right_navbar_wrap.select_type_wrap {
        width: 1200px;
        right: -1200px; /* 초기에는 화면 밖에 위치 */
        min-width: 1200px;
    }

    .rt_wrap .right_navbar_wrap.export_wrap {
        width: 300px;
        right: -300px; /* 초기에는 화면 밖에 위치 */
        min-width: 300px;
    }

    .rt_wrap .right_navbar_wrap.email_wrap {
        width: 400px;
        right: -400px; /* 초기에는 화면 밖에 위치 */
        min-width: 400px;
    }

    /* 이메일 예약 발송 패널 스타일 */
    .rt_wrap .right_navbar_wrap.scheduled_email_wrap {
        width: 450px;
        right: -450px; /* 초기에는 화면 밖에 위치 */
        min-width: 450px;
    }

    /* 이메일 예약 리스트 패널 스타일 */
    .rt_wrap .right_navbar_wrap.scheduled_email_list_wrap {
        width: 800px;
        right: -800px; /* 초기에는 화면 밖에 위치 */
        min-width: 800px;
    }

    .rt_wrap .right_navbar_wrap .header {
        height: 60px;
        width: 100%;
        padding: 20px 15px;
        display: flex;
        justify-content: space-between;
        gap: 1em;
        border-bottom: 1px solid #DCDCDC;
        align-items: center;
    }

    .rt_wrap .right_navbar_wrap .header .name {
        display: flex;
        gap: 1em;
        align-items: center;
    }

    .rt_wrap .right_navbar_wrap .header .name {
        display: flex;
        gap: 1em;
        align-items: center;
    }

    .rt_wrap .right_navbar_wrap.email_wrap .contents {
        flex-direction: column;
        margin: 14px 20px;
    }

    .rt_wrap .right_navbar_wrap .contents .right_side_wrap .add_type_wrap {
        display: flex;
        flex-direction: column;
        overflow: scroll;
        background-color: var(--black-9);
        border-radius: var(--radius);
        height: calc(90% - 2em);
        gap: 5px;
    }

    .rt_wrap .right_navbar_wrap .header .btn_wrap {
        display: flex;
        gap: 1em;
    }

    .rt_wrap .right_navbar_wrap .header .btn_wrap .btn_common {
        width: 70px;
        background: var(--logo-purple-1);
        color: white;
    }

    .rt_wrap .right_navbar_wrap .header h3 {
        color: #000;
        font-size: 16px;
        font-style: normal;
        font-weight: 700;
        line-height: normal;
    }

    .rt_wrap .right_navbar_wrap .contents {
        display: flex;
        height: calc(100% - 60px);
    }

    .rt_wrap .right_navbar_wrap .contents .btn_wrap {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 1em;
        margin: 14px 20px;
    }

    .rt_wrap .right_navbar_wrap .contents .btn_wrap .btn_common {
        display: flex;
        justify-content: space-between;
        gap: 1.5em;
        width: 100%;
        height: 40px;
    }

    .rt_wrap .right_navbar_wrap .contents .btn_wrap .btn_common img {
        width: 20px;
    }

    .rt_wrap .right_navbar_wrap .contents .btn_wrap .btn_common span {
        width: 100%;
        text-align: left;
    }

    /* 이메일 폼 스타일 */
    .rt_wrap .right_navbar_wrap.email_wrap .header .btn_wrap .btn_common {
        width: 100px;
    }

    .rt_wrap .right_navbar_wrap.email_wrap .form_group {
        margin-bottom: 15px;
    }

    .rt_wrap .right_navbar_wrap.email_wrap .form_group.grid2fr {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1em;
    }

    .rt_wrap .right_navbar_wrap.email_wrap .form_group label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        font-size: 14px;
    }

    .rt_wrap .right_navbar_wrap.email_wrap .form_group input,
    .rt_wrap .right_navbar_wrap.email_wrap .form_group textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }

    .rt_wrap .right_navbar_wrap.email_wrap .form_group textarea {
        resize: vertical;
        min-height: 80px;
    }

    .rt_wrap .right_navbar_wrap.email_wrap .error-message {
        font-size: 12px;
        margin-top: 5px;
    }

    .rt_wrap .right_navbar_wrap.scheduled_email_wrap .contents {
        overflow-y: auto;
    }

    /* 이메일 태그 스타일 */
    .email-tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 4px;
        min-height: 38px;
        max-height: 500px;
        background-color: #fff;
        overflow: scroll;
    }

    .email-tag {
        display: inline-flex;
        align-items: center;
        background-color: #e9f5fe;
        border: 1px solid #c2e0ff;
        border-radius: 3px;
        padding: 2px 8px;
        margin: 2px;
        font-size: 14px;
    }

    .email-tag .remove-tag {
        margin-left: 5px;
        cursor: pointer;
        font-weight: bold;
        color: #666;
    }

    .email-tag .remove-tag:hover {
        color: #ff0000;
    }

    /* 예약된 이메일 목록 Tabulator 스타일 */
    .scheduled_email_table {
        width: 100%;
        font-size: 14px;
    }

    /* Tabulator 헤더 스타일 */
    .scheduled_email_table .tabulator-header {
        background-color: #f5f5f5;
        border-bottom: 1px solid #ddd;
    }

    .scheduled_email_table .tabulator-col {
        font-weight: bold;
    }

    /* Tabulator 셀 스타일 */
    .scheduled_email_table .tabulator-cell {
        border-bottom: 1px solid #ddd;
    }

    /* Tabulator 행 호버 스타일 */
    .scheduled_email_table .tabulator-row:hover {
        background-color: #f9f9f9;
    }

    .tabulator-row .tabulator-cell {
        display: inline-block;
    }

    /* 활성/비활성 상태 스타일 */
    .scheduled_email_table .active {
        color: #4CAF50;
    }

    .scheduled_email_table .inactive, .scheduled_email_table .expired {
        color: #F44336;
    }

    .email-input {
        flex: 1;
        min-width: 100px;
        border: none;
        outline: none;
        padding: 5px;
        font-size: 14px;
    }

    .rt_wrap .right_navbar_wrap .left_side_wrap {
        padding: 0;
        width: 100%;
    }

    .rt_wrap .right_navbar_wrap .right_side_wrap {
        position: relative;
        width: 400px;
    }

    .rt_wrap .right_navbar_wrap .add_contents_wrap {
        width: 100%;
        height: calc(90vh - 60px);
        background-color: #F7F8FA;
        padding: 20px 25px;
        overflow-y: scroll;
        border-bottom-left-radius: var(--radius);
        display: block;
        font-size: 12px;
    }

    .rt_wrap .right_navbar_wrap .add_contents_wrap .add_contents_group {
        display: flex;
        gap: 1.5em;
        flex-direction: column;
    }

    .rt_wrap .right_navbar_wrap .add_contents_wrap .add_contents_group .add_group .add_header {
        display: flex;
        gap: 1em;
        justify-content: space-between;
    }

    .rt_wrap .right_navbar_wrap .add_contents_wrap .add_contents_group .add_group .add_items {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        row-gap: .8em;
        column-gap: 1.3em;
    }

    .rt_wrap .right_navbar_wrap .add_contents_wrap .add_contents_group .add_group .add_items .checkbox_wrap,
    .rt_wrap .right_navbar_wrap .contents .right_side_wrap .add_type_wrap .type {
        height: 40px;
        flex-shrink: 0;
        border-radius: var(--radius);
        border: 1px solid #E3E3E3;
        background: #FFF;
        padding: 0 14px;
        cursor: pointer;
        line-height: 16px;
    }

    .rt_wrap .right_navbar_wrap .contents .right_side_wrap .add_type_wrap .type {
        display: flex;
        align-items: center;
        padding: 0 12px;
        justify-content: space-between;
    }

    .rt_wrap .right_navbar_wrap .contents .right_side_wrap .add_type_wrap .type img {
        width: 20px;
    }

    .rt_wrap .right_navbar_wrap .add_header label {
        user-select: none;
        background: url('/images/maxy/icon-check-circle-off.svg') left transparent no-repeat;
        width: 20em;
        height: 20px;
        color: #4D83A1;
        padding-left: 2em;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 11px;
        padding-bottom: 0.5em;
        text-decoration: underline #E3E5E8 1px;
        text-underline-offset: 0.5em;
    }

    .rt_wrap .right_navbar_wrap .add_header label.on {
        background: url('/images/maxy/icon-check-circle-on.svg') left transparent no-repeat;
        background-size: 20px 20px;
        border-radius: 20px;
    }

    .rt_wrap .right_navbar_wrap .add_items label {
        user-select: none;
        background: url('/images/maxy/check-off-t.svg') left transparent no-repeat;
        background-size: 14px 14px;
        height: 40px;
        border-radius: 3px;
        padding-left: 1.7em;
    }

    .rt_wrap .right_navbar_wrap .add_items label.on {
        background: url('/images/maxy/check-on-t.svg') left transparent no-repeat;
        background-size: 14px;
    }

    .btn_link {
        height: 40px;
        background-color: white;
        color: var(--color-common-button-light);
        border: 1px solid var(--color-border-out-light);
        border-radius: var(--radius);
        padding: 0.625em 1.7em 0.625em 1.7em;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        font-weight: 700;
        gap: 1.5em;
        text-decoration: none;
        cursor: pointer;
    }

    .btn_link img {
        width: 20px;
        height: 20px;
    }

    .rt_wrap .right_navbar_wrap.open {
        right: 0; /* 열릴 때 화면 안으로 이동 */
    }
</style>
<!-- 보고서 -->
<div class="rt_wrap">
    <%-- left side --%>
    <div class="left_side_wrap">
        <%-- app info wrap --%>
        <div class="app_info_group">
            <div class="app_info_wrap">
                <label for="packageNm_a" data-t="common.text.app"></label>
                <select id="packageNm_a"></select>
            </div>
            <div class="app_info_wrap">
                <label for="osType_a">OS</label>
                <select id="osType_a"></select>
            </div>
            <div class="app_info_wrap">
                <label for="appVer_a" data-t="common.text.version"></label>
                <select id="appVer_a"></select>
            </div>
        </div>
        <%-- calendar --%>
        <div class="calendar_wrap">
            <div id="rtCalendar"></div>
        </div>

        <div class="tag_wrap">
            <div class="tag_header">
                <span data-t="common.text.reportType"></span>
                <button class="btn_common" data-t="common.btn.select" id="btnAdd"></button>
            </div>
            <div class="tag_content enable_scrollbar sortable"></div>
        </div>

        <div class="btn_wrap">
            <button class="btn_common" id="btnReport" data-t="common.text.search"></button>
            <button class="btn_common" id="btnExportMenu" data-t="common.text.export"></button>
        </div>
    </div>
    <%-- right side --%>
    <div class="right_side_wrap enable_scrollbar auto_height" id="reportArea">
        <div class="pdf_wrap" id="pdf-container"></div>
    </div>

    <%-- Report 검색조건 팝업 --%>
    <div class="right_navbar_wrap select_type_wrap">
        <div class="header">
            <div class="name">
                <button>
                    <img class="img_x_bk" alt="">
                </button>
                <%--<img class="img_search_header" alt="">--%>
                <h3 data-t="common.text.reportType"></h3>
            </div>
            <div class="btn_wrap">
                <button class="btn_common" id="btnReportTypeAdd" data-t="common.btn.confirm"></button>
            </div>
        </div>
        <div class="contents">
            <div class="left_side_wrap">
                <div class="add_contents_wrap">
                    <div class="add_contents_group"></div>
                </div>
            </div>
            <div class="right_side_wrap">
                <div class="add_help">
                    <span data-t="common.text.order"></span>
                    <img class="ic_question" src="<c:url value="/images/maxy/ic-question-grey-blue.svg"/>" alt="?">
                </div>
                <div class="add_type_wrap enable_scrollbar sortable"></div>
            </div>
        </div>
    </div>

    <div class="right_navbar_wrap export_wrap">
        <div class="header">
            <div class="name">
                <button>
                    <img class="img_x_bk" alt="">
                </button>
                <%--<img class="img_share" alt="">--%>
                <h3 data-t="common.text.exportReportText"></h3>
            </div>
        </div>
        <div class="contents">
            <div class="btn_wrap">
                <button class="btn_common" id="btnSendEmail">
                    <img class="img_mail" alt="">
                    <span data-t="common.text.sendEmail"></span>
                </button>
                <button class="btn_common" id="btnScheduledEmail">
                    <img class="img_calendar_clock" alt="">
                    <span data-t="common.text.scheduledEmail"></span>
                </button>
                <button class="btn_common" id="btnScheduledEmailList">
                    <img class="img_calendar_clock" alt="">
                    <span data-t="common.text.scheduledEmailList"></span>
                </button>
                <a class="btn_link" target="_blank" id="btnCsvDownload">
                    <img class="img_file_download" alt="">
                    <span data-t="management.alias.btn.csvDownload"></span>
                </a>
                <a class="btn_link" target="_blank" id="btnErrorCsvDownload">
                    <img class="img_file_download" alt="">
                    <span data-t="management.alias.btn.csvErrorDownload"></span>
                </a>
            </div>
        </div>
    </div>

    <!-- 이메일 전송 패널 -->
    <div class="right_navbar_wrap email_wrap">
        <div class="header">
            <div class="name">
                <button>
                    <img class="img_x_bk" alt="">
                </button>
                <%--<img class="img_mail" alt="">--%>
                <h3 data-t="common.text.sendEmail"></h3>
            </div>
            <div class="btn_wrap">
                <button class="btn_common" id="btnSendEmailSubmit" data-t="common.text.send"></button>
            </div>
        </div>
        <div class="contents">
            <div class="form_group">
                <label for="emailInput" data-t="common.text.recipient"></label>
                <div class="email-tags-container" id="emailTagsContainer">
                    <input type="text" id="emailInput" class="email-input">
                </div>
                <input type="hidden" id="emailTo">
                <div id="emailToError" class="error-message" style="color: red; display: none;"></div>
            </div>
            <div class="form_group">
                <label for="emailSubject" data-t="common.text.emailTitle"></label>
                <input type="text" id="emailSubject" class="form-control">
            </div>
            <div class="form_group">
                <label for="reportSubject" data-t="common.text.reportName"></label>
                <input type="text" id="reportSubject" class="form-control">
            </div>
        </div>
    </div>

    <!-- 이메일 예약 발송 패널 -->
    <div class="right_navbar_wrap email_wrap scheduled_email_wrap">
        <div class="header">
            <div class="name">
                <button>
                    <img class="img_x_bk" alt="">
                </button>
                <%--<img class="img_calendar_clock" alt="">--%>
                <h3 data-t="common.text.scheduledEmail"></h3>
            </div>
            <div class="btn_wrap">
                <button class="btn_common" id="btnScheduledEmailSubmit" data-t="common.btn.save"></button>
            </div>
        </div>
        <div class="contents">
            <div class="form_group">
                <label for="scheduledReportSubject" data-t="common.text.reportName"></label>
                <input type="text" id="scheduledReportSubject" class="form-control">
            </div>
            <div class="form_group">
                <label for="scheduledEmailSubject" data-t="common.text.emailTitle"></label>
                <input type="text" id="scheduledEmailSubject" class="form-control">
            </div>
            <div class="form_group">
                <label for="scheduledEmailInput" data-t="common.text.recipient"></label>
                <div class="email-tags-container" id="scheduledEmailTagsContainer">
                    <input type="text" id="scheduledEmailInput" class="email-input">
                </div>
                <input type="hidden" id="scheduledEmailTo">
                <div id="scheduledEmailToError" class="error-message" style="color: red; display: none;"></div>
            </div>
            <div class="form_group">
                <label data-t="common.text.startDate"></label>
                <div class="calendar_wrap">
                    <div id="scheduledStartDateCalendar" style="border: 1px solid #ddd;"></div>
                </div>
            </div>

            <div class="form_group grid2fr">
                <div>
                    <!-- 발송 빈도 선택: 이메일이 발송될 주기를 설정합니다 (매일, 매주, 매월, 매분기) -->
                    <label for="frequency" data-t="common.text.frequency"></label>
                    <select id="frequency" class="form-control">
                        <option value="1d" data-t="common.frequency.day"></option>
                        <option value="7d" data-t="common.frequency.week"></option>
                        <option value="1M" data-t="common.frequency.month"></option>
                        <option value="3M" data-t="common.frequency.quarter"></option>
                    </select>
                </div>
                <div>
                    <!-- 사용 기한 선택: 예약 발송이 유지될 기간을 설정합니다 (1~12개월) -->
                    <label for="usagePeriod" data-t="common.text.usagePeriod"></label>
                    <select id="usagePeriod" class="form-control">
                        <option value="1" data-t="common.period.1M"></option>
                        <option value="2" data-t="common.period.2M"></option>
                        <option value="3" data-t="common.period.3M"></option>
                        <option value="4" data-t="common.period.4M"></option>
                        <option value="5" data-t="common.period.5M"></option>
                        <option value="6" data-t="common.period.6M"></option>
                        <option value="7" data-t="common.period.7M"></option>
                        <option value="8" data-t="common.period.8M"></option>
                        <option value="9" data-t="common.period.9M"></option>
                        <option value="10" data-t="common.period.10M"></option>
                        <option value="11" data-t="common.period.11M"></option>
                        <option value="12" data-t="common.period.12M"></option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <div class="right_navbar_wrap scheduled_email_list_wrap">
        <div class="header">
            <div class="name">
                <button>
                    <img class="img_x_bk" alt="">
                </button>
                <%--<img class="img_calendar_clock" alt="">--%>
                <h3 data-t="common.text.scheduledEmailList"></h3>
            </div>
            <div class="btn_wrap">
                <button class="btn_common" id="btnScheduledEmailEdit" data-t="common.btn.edit"></button>
                <button class="btn_common" id="btnScheduledEmailDelete" data-t="common.btn.delete"></button>
            </div>
        </div>
        <div class="contents">
            <!-- 예약된 이메일 목록 테이블 (Tabulator) -->
            <div id="scheduledTable" class="scheduled_email_table"></div>
        </div>
    </div>
</div>

<script>
    var RT0000 = {
        v: {
            date: {
                min: '', // calendar에서 선택한 Min 날짜
                max: '' // calendar에서 선택한 Max 날짜
            },
            types: [],
            scheduledTable: null, // 예약이메일 리스트
            scheduledTableSelRowData: undefined // 예약이메일 리스트 중 선택ROW
        },

        /**
         * 초기화 함수
         */
        init: {
            /**
             * 이벤트 핸들러 등록
             */
            event() {
                const {func} = RT0000

                func.addEvent.report()
                func.addEvent.addPopup()
            },

            /**
             * 페이지 로드 시 실행되는 초기화 함수
             */
            async created() {
                const {v, func} = RT0000
                updateContent()
                $('.day_night_btn').hide()
                $('body').removeClass('dark_mode')
                $('#emailInput').attr('placeholder', trl('common.text.emailPlaceholder'))

                // 툴팁 초기화
                tippy('.rt_wrap .ic_question', {
                    content: i18next.tns('alert.report.popup.question'),
                    placement: 'bottom',
                    allowHTML: true,
                    arrow: false,
                    theme: 'maxy-tooltip'
                })

                // Report Type Tag 칸 드래그로 정렬 효과
                $(".tag_content").sortable({
                    cursor: 'move',
                    opacity: 0.5,
                    axis: "y",
                    connectWith: '.tag',
                });

                // Popup Report Type 칸 드래그로 정렬 효과
                $(".add_type_wrap").sortable({
                    cursor: 'move',
                    opacity: 0.5,
                    axis: "y",
                    connectWith: '.type',
                });

                // 캘린더 초기화
                await calendar.init({
                    id: 'rtCalendar',
                    checkedDate: [util.getDateToString(util.getDate(-1), '-')], // Default 어제
                    fn: (dates, date) => {
                        v.date = date
                    },
                    created: () => {
                        v.date.min = util.getDateToString(util.getDate(-1), '-') // Default 어제
                        v.date.max = util.getDateToString(util.getDate(-1), '-') // Default 어제
                    }
                })

                // app info 설정
                await appInfo.append({
                    pId: 'packageNm_a',
                    oId: 'osType_a',
                    vId: 'appVer_a'
                })

                // 보고서 조회 유형 가져오기 후 report 실행
                await func.fetch.reportType()
                    .then(() => {
                        // reportType이 완료된 후 report 실행
                        if ($('[data-tag-type]').length > 0) { // 태그가 있는 경우에만 실행
                            func.fetch.report()
                        }
                    })

                // 컬럼 이름 정의
                const columnNames = {
                    "subject": i18next.tns('common.text.emailTitle'),
                    "reportSubject": i18next.tns('common.text.reportName'),
                    "sendFrequency": i18next.tns('common.text.frequency'),
                    "recipientCount": i18next.tns('common.text.recipientCount'),
                    "endDate": i18next.tns('common.text.endDate'),
                    "activeStatus": i18next.tns('common.text.activeStatus')
                };

                // Tabulator 초기화
                v.scheduledTable = new Tabulator("#scheduledTable", {
                    layout: "fitDataFill",
                    placeholder: i18next.tns('common.msg.noData'),
                    columns: [
                        {
                            title: columnNames.subject,
                            field: "subject",
                            width: "23%"
                        },
                        {
                            title: columnNames.reportSubject,
                            field: "reportSubject",
                            width: "22%"
                        },
                        {
                            title: columnNames.sendFrequency,
                            field: "sendCycle",
                            width: "15%",
                            hozAlign: 'center',
                            formatter: cell => {
                                // 발송 빈도 (sendCycle 값에 따라 표시 텍스트 변경)
                                const value = cell.getValue()
                                switch (value) {
                                    case '1d':
                                        return i18next.tns('common.frequency.day')
                                    case '7d':
                                        return i18next.tns('common.frequency.week')
                                    case '1M':
                                        return i18next.tns('common.frequency.month')
                                    case '3M':
                                        return i18next.tns('common.frequency.quarter')
                                    default:
                                        return value;
                                }
                            }
                        },
                        {
                            title: columnNames.recipientCount,
                            field: "recipientCount",
                            hozAlign: 'center',
                            width: "15%"
                        },
                        {
                            title: columnNames.endDate,
                            field: "sendEndDt",
                            hozAlign: 'center',
                            width: "15%"
                        },
                        {
                            title: columnNames.activeStatus,
                            field: "status",
                            hozAlign: 'center',
                            width: "10%",
                            formatter: cell => {
                                // 상태 여부 (0: 예약중, 1: 활성, 2: 만료됨)
                                const value = cell.getValue()
                                if (value === "0") {
                                    return '<span class="reserved">' + i18next.tns('common.text.reserved') + '</span>'
                                } else if (value === "1") {
                                    return '<span class="active">' + i18next.tns('common.text.active') + '</span>'
                                } else if (value === "2") {
                                    return '<span class="expired">' + i18next.tns('common.text.expired') + '</span>'
                                } else {
                                    return '<span class="inactive">' + i18next.tns('common.text.inactive') + '</span>'
                                }
                            }
                        }
                    ]
                })

                v.scheduledTable.on('rowClick', (e, row) => {
                    if (v.scheduledTableSelRow) {
                        v.scheduledTableSelRow.getElement().classList.remove('selected_row')
                    }
                    row.getElement().classList.add('selected_row')
                    v.scheduledTableSelRow = row
                    v.scheduledTableSelRowData = row.getData()
                })
            }
        },

        /**
         * 기능 함수
         */
        func: {
            cmm: {
                /**
                 * CSV, ERROR CSV 다운로드 URL 설정
                 * @param {Object} param - 다운로드 파라미터
                 */
                setDownloadUrl(param) {
                    let url = "<c:url value="/rt/0000/downloadReportDataByRDB.maxy?"/>"
                    let errorCrashurl = "<c:url value="/rt/0000/downloadErrorCrashReportData.maxy?"/>"
                    let searchUrl = new URLSearchParams(url.search);

                    // 선택한 보고서 유형
                    let reportType = ''
                    $('[data-tag-type]').each(function () {
                        const $this = $(this)
                        reportType += $this.data('tag-type') + ','
                    })
                    reportType = reportType.slice(0, -1) // 마지막 , 제거

                    searchUrl.append('fromDt', param.fromDt);
                    searchUrl.append('toDt', param.toDt);
                    searchUrl.append('searchFromDt', param.searchFromDt);
                    searchUrl.append('searchToDt', param.searchToDt);
                    searchUrl.append('packageNm', param.packageNm);
                    searchUrl.append('serverType', param.serverType);
                    searchUrl.append('osType', param.osType);
                    searchUrl.append('appVer', param.appVer);
                    searchUrl.append('diff', param.diff);
                    searchUrl.append('locale', localStorage.getItem('lang'));
                    searchUrl.append('reportType', reportType)

                    document.getElementById("btnCsvDownload").href = url + searchUrl;
                    document.getElementById("btnErrorCsvDownload").href = errorCrashurl + searchUrl;
                },
                // SMTP 서비스 여부
                mailServiceOnOff(isMailService) {
                    if (!isMailService) {
                        const el = '#btnSendEmail, #btnScheduledEmail, #btnScheduledEmailList'
                        // 서비스 안할 경우 disabled 처리, 속성으로 disabled하면 툴팁이 안돼서 class로..
                        $(el).addClass('disabled')
                        $(el).off('click')

                        tippy(el, {
                            content: i18next.tns('alert.noSettingMailInfo'),
                            placement: 'bottom',
                            allowHTML: true,
                            arrow: false,
                            theme: 'maxy-tooltip'
                        })
                    }
                },
                /**
                 * 쿠키에서 저장된 reportType을 가져와서 체크박스 체크 및 정렬
                 */
                loadReportTypeFromCookie() {
                    // 쿠키에서 reportType 값 가져오기
                    const cookies = document.cookie.split(';')
                    let savedReportType = ''

                    for (let cookie of cookies) {
                        const [name, value] = cookie.trim().split('=')
                        if (name === 'reportType') {
                            savedReportType = decodeURIComponent(value)
                            break
                        }
                    }

                    if (savedReportType) {
                        // 저장된 reportType을 배열로 변환 (쉼표로 구분)
                        const reportTypes = savedReportType.split(',')

                        // 각 reportType에 대해 체크박스 체크
                        reportTypes.forEach(function (type) {
                            const $checkbox = $('#' + type)
                            if ($checkbox.length > 0) {
                                $checkbox.prop('checked', true)
                                $checkbox.next('label').addClass('on')
                            }
                        })

                        // 헤더 체크박스 상태 업데이트
                        const $headItems = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[data-check-type="head"]')
                        $headItems.each(function () {
                            const $this = $(this)
                            const $items = $('input[data-check-type="item"][name="' + $this.prop('id') + '"]')
                            const $checkedItems = $items.filter(':checked')

                            if ($items.length === $checkedItems.length && $items.length > 0) {
                                $this.prop('checked', true)
                                $this.next('label').addClass('on')
                            }
                        });

                        // 전체 체크박스 상태 업데이트
                        const $allHeadItems = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[data-check-type="head"]')
                        const $checkedHeadItems = $allHeadItems.filter(':checked')
                        const $reportTypeAddAll = $('#reportTypeAddAll')

                        if ($allHeadItems.length === $checkedHeadItems.length && $allHeadItems.length > 0) {
                            $reportTypeAddAll.prop('checked', true)
                            $reportTypeAddAll.next('label').addClass('on')
                        }

                        // 순서 정렬 아이콘 생성 (저장된 순서대로)
                        $('.add_type_wrap').empty() // 기존 아이콘 제거

                        reportTypes.forEach(function (type) {
                            const $checkbox = $('#' + type);
                            if ($checkbox.length > 0 && $checkbox.is(':checked')) {
                                const $label = $checkbox.next('label')
                                $('.add_type_wrap').append(`
                                    <div class="type" data-report-type="\${type}">
                                        \${$label.text()}
                                        <img src="<c:url value="/images/maxy/icon-order.svg"/>" alt="">
                                    </div>
                                `)
                            }
                        })
                    } else {
                        // 쿠키가 없으면 모든 체크박스 선택
                        const $allCheckboxes = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[type="checkbox"]')
                        $allCheckboxes.prop('checked', true)
                        $allCheckboxes.next('label').addClass('on')

                        // 순서 정렬 아이콘 생성 (모든 항목)
                        $('.add_type_wrap').empty()
                        const $itemCheckboxes = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[data-check-type="item"]')
                        $itemCheckboxes.each(function () {
                            const $checkbox = $(this)
                            const type = $checkbox.prop('id')
                            const $label = $checkbox.next('label')
                            $('.add_type_wrap').append(`
                                <div class="type" data-report-type="\${type}">
                                    \${$label.text()}
                                    <img src="<c:url value="/images/maxy/icon-order.svg"/>" alt="">
                                </div>
                            `)
                        })
                    }
                }
            },
            draw: {
                /**
                 * 예약된 이메일 목록 Tabulator 데이터 설정
                 * @param {Array} emailList - 이메일 목록 데이터
                 */
                scheduledEmailList(emailList) {
                    // 선택한 row 초기화
                    RT0000.v.scheduledTableSelRow = null
                    RT0000.v.scheduledTableSelRowData = undefined

                    // 데이터 설정
                    if (emailList && emailList.length > 0) {
                        RT0000.v.scheduledTable.setData(emailList);
                    } else {
                        RT0000.v.scheduledTable.setData([]);
                    }
                },
                /**
                 * 보고서 유형 선택 팝업 체크박스 생성
                 */
                addPopupCheckBox() {
                    const {v, func} = RT0000

                    // 체크박스 만들기
                    const $div = $('.add_contents_group')

                    // v.types의 키(그룹명)를 오름차순으로 정렬
                    const sortedGroups = Object.keys(v.types).sort((a, b) => {
                        return a.localeCompare(b)
                    })

                    for (const group of sortedGroups) {
                        // 체크박스 그룹
                        const $group = $('<div class="add_group">')
                        // 그룹단위 체크박스
                        const $head = `
                                <div class="add_header">
                                    <input type="checkbox" id="\${group}" data-check-type="head">
                                    <label for="\${group}">\${group}</label>
                                </div>
                            `
                        // 그룹 아이템단위 체크박스
                        const $items = $('<div class="add_items">')
                        for (const i in v.types[group]) {
                            const $checkBox = `
                                    <div class="checkbox_wrap">
                                        <input type="checkbox" id="\${v.types[group][i].type}" data-check-type="item" name="\${group}">
                                        <label for="\${v.types[group][i].type}">\${v.types[group][i].name}</label>
                                    </div>
                                `
                            $items.append($checkBox)
                        }

                        $group.append($head)
                        $group.append($items)
                        $div.append($group)
                    }

                    // 첫번째 헤더 오른쪽에 전체체크박스 추가
                    const $firstAddGroup = $div.find('.add_header').first()
                    $firstAddGroup.append(`
                            <input type="checkbox" id="reportTypeAddAll" data-check-type="all">
                            <label for="reportTypeAddAll" data-t="dashboard.bi.all" style="width: 100px;"></label>
                        `)

                    // 다국어 텍스트 적용
                    updateContent()

                    // 체크박스 클릭시 처리
                    function clickCheckbox(isChecked, $targets) {
                        // 변경대상 체크박스
                        $targets.each(function () {
                            const $label = $(this).next('label')
                            $targets.prop('checked', isChecked)

                            if (isChecked) {
                                $label.addClass('on')
                            } else {
                                $label.removeClass('on')
                            }
                        })

                        // 순서 정렬 아이콘 생성
                        func.draw.addPopupReportType()

                        // 헤더 체크박스 on/off 처리
                        const $headItems = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[data-check-type="head"]')
                        $headItems.each(function () {
                            const $items = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[name="' + $(this).prop('id') + '"]')
                            const $checkedItems = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[name="' + $(this).prop('id') + '"]:checked')
                            const $label = $(this).next('label')

                            // 하위 체크박스가 모두 선택되었을 경우
                            if ($items.length === $checkedItems.length) {
                                $(this).prop('checked', true)
                                $label.addClass('on')
                            } else {
                                $(this).prop('checked', false)
                                $label.removeClass('on')
                            }
                        })

                        const $checkedHeadItems = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[data-check-type="head"]:checked')
                        const $reportTypeAddAll = $('#reportTypeAddAll')
                        // 전체 체크박스 on/off 처리
                        if ($headItems.length === $checkedHeadItems.length) {
                            $reportTypeAddAll.prop('checked', true)
                            $reportTypeAddAll.next('label').addClass('on')
                        } else {
                            $reportTypeAddAll.prop('checked', false)
                            $reportTypeAddAll.next('label').removeClass('on')
                        }

                        $(".add_type_wrap").sortable("refresh")
                    }

                    // 체크박스 클릭시 처리
                    $('.rt_wrap .right_navbar_wrap.select_type_wrap [data-check-type]').on('click', function () {
                        const $this = $(this)

                        // 변경대상 체크박스
                        let $targets

                        // 클릭한 체크박스 타입에 따라 변경대상 체크박스 설정
                        if ($this.attr('data-check-type') === 'all') {
                            $targets = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[data-check-type="item"]')
                        } else if ($this.attr('data-check-type') === 'head') {
                            $targets = $('.rt_wrap .right_navbar_wrap.select_type_wrap input[name="' + $this.prop('id') + '"][data-check-type="item"]')
                        } else if ($this.attr('data-check-type') === 'item') {
                            $targets = $this
                        }

                        // 체크박스 클릭
                        clickCheckbox($this.is(':checked'), $targets)
                    })

                    // 순서 정렬 아이콘 생성
                    func.draw.addPopupReportType()

                    // 쿠키에서 저장된 reportType을 가져와서 체크박스 체크 및 정렬
                    func.cmm.loadReportTypeFromCookie()

                    $('#btnReportTypeAdd').trigger('click')
                },
                /**
                 * 순서 정렬 아이콘 생성
                 */
                addPopupReportType() {
                    $('.rt_wrap .right_navbar_wrap.select_type_wrap input[data-check-type="item"]').each(function () {
                        const $this = $(this)
                        const $label = $this.next('label')
                        const $type = $('.add_type_wrap .type[data-report-type="' + $this.prop('id') + '"]')

                        if ($this.is(':checked') && $type.length === 0) {
                            $('.add_type_wrap').append(`
                                    <div class="type" data-report-type="\${$(this).prop('id')}">
                                        \${$label.text()}
                                        <img src="<c:url value="/images/maxy/icon-order.svg"/>" alt="">
                                    </div>
                                `)
                        } else if (!$this.is(':checked') && $type.length > 0) {
                            // 체크 해제된 경우
                            $type.remove()
                        }
                    })
                }
            },
            /**
             * 데이터 조회 함수
             */
            fetch: {
                /**
                 * 예약된 이메일 목록 조회
                 */
                scheduledEmailList() {
                    // 예약된 이메일 목록 조회 API 호출
                    ajaxCall('/rt/0000/getScheduledEmailList.maxy', {}, {
                        disableCursor: true
                    }).then((data) => {
                        // 테이블에 데이터 렌더링
                        RT0000.func.draw.scheduledEmailList(data.emailList);
                    }).catch(e => {
                        console.error('예약된 이메일 목록 조회 중 오류 발생:', e);
                    })
                },
                /**
                 * 보고서 유형 조회
                 */
                reportType() {
                    const {func, v} = RT0000

                    return new Promise((resolve, reject) => {
                        // 보고서 조회 유형 가져오기
                        ajaxCall('/rt/0000/getReportType.maxy', {}, {
                            disableCursor: true
                        }).then((data) => {
                            const {reportType, isMailService} = data
                            v.types = reportType
                            func.draw.addPopupCheckBox()
                            func.cmm.mailServiceOnOff(isMailService)
                            resolve() // 성공 시 resolve 호출
                        }).catch(e => {
                            console.log(e)
                            reject(e) // 실패 시 reject 호출
                        })
                    })
                },
                /**
                 * 보고서 조회
                 */
                report() {
                    const {v, func} = RT0000

                    // 기존 embed 태그가 있으면 제거
                    const existingEmbed = document.querySelector("#pdf-container embed")
                    if (existingEmbed) existingEmbed.remove()

                    // 현재 설정된 앱 정보 객체 가져오기
                    const $packageNm = $('#packageNm_a')
                    const $osType = $('#osType_a')
                    const $appVer = $('#appVer_a')

                    const packageNm = $packageNm.val()
                    const serverType = $packageNm.find('option:selected').data('server-type')
                    const osType = $osType.val()
                    const appVer = $appVer.val()

                    const packageNmText = $packageNm.find('option:selected').text()
                    const osTypeText = $osType.find('option:selected').text()
                    const appVerText = $appVer.find('option:selected').text()

                    const from = util.dateToTimestamp(new Date(v.date.min), true)
                    const to = util.dateToTimestamp(new Date(v.date.max), false)

                    // 선택한 보고서 유형
                    let reportType = ''
                    $('[data-tag-type]').each(function () {
                        const $this = $(this)
                        reportType += $this.data('tag-type') + ','
                    })
                    reportType = reportType.slice(0, -1) // 마지막 , 제거

                    // reportType 값을 쿠키에 저장
                    document.cookie = "reportType=" + encodeURIComponent(reportType) + "; path=/; max-age=" + (60 * 60 * 24 * 30);

                    let url = "<c:url value="/rt/0000/maxyReport.maxy?"/>"
                    let searchUrl = new URLSearchParams(url.search)

                    searchUrl.append('packageNm', packageNm)
                    searchUrl.append('serverType', serverType)
                    searchUrl.append('osType', osType)
                    searchUrl.append('appVer', appVer)
                    searchUrl.append('packageNmText', packageNmText)
                    searchUrl.append('osTypeText', osTypeText)
                    searchUrl.append('appVerText', appVerText)
                    searchUrl.append('from', from)
                    searchUrl.append('to', to)
                    searchUrl.append('diff', util.getDateDiff(v.date.min, v.date.max) + 1)
                    searchUrl.append('locale', localStorage.getItem('lang'));
                    searchUrl.append('reportType', reportType)

                    // 새 embed 태그 동적으로 생성
                    const embed = document.createElement("embed")
                    embed.src = url + searchUrl
                    embed.type = "application/pdf"
                    embed.style.width = "100%"
                    embed.style.height = "100%"

                    document.getElementById("pdf-container").appendChild(embed)

                    const downloadParam = {
                        fromDt: v.date.min.replaceAll('-', ''),
                        toDt: v.date.max.replaceAll('-', ''),
                        searchFromDt: from,
                        searchToDt: to,
                        packageNm: packageNm,
                        serverType: serverType,
                        osType: osType,
                        appVer: appVer,
                        diff: util.getDateDiff(v.date.min, v.date.max) + 1
                    }
                    func.cmm.setDownloadUrl(downloadParam)
                }
            },

            /**
             * 이벤트 핸들러 등록 함수
             */
            addEvent: {
                /**
                 * 보고서 조회 관련 이벤트 등록
                 */
                report() {
                    const {func} = RT0000

                    // 보고서 조회 버튼 클릭
                    $('#btnReport').on('click', function () {
                        if ($('[data-tag-type]').length === 0) {
                            toast(i18next.tns('alert.report.no.type'))
                            return
                        }
                        func.fetch.report()
                    });
                },

                /**
                 * 팝업 관련 이벤트 등록
                 */
                addPopup() {
                    const {func, v} = RT0000

                    // Report Type 추가 팝업 열기
                    $('#btnAdd').on('click', function () {
                        $('.right_navbar_wrap.select_type_wrap').addClass('open')
                        $('.search_dimmed').show()
                    })

                    // 이메일 전송 팝업 열기
                    $('#btnSendEmail').on('click', function () {
                        $('.right_navbar_wrap.email_wrap').not('.scheduled_email_wrap').not('scheduled_email_list_wrap').addClass('open')
                        $('.search_dimmed').show()

                        // 기본 제목 설정
                        const dateRange = v.date.min + ' ~ ' + v.date.max
                        $('#emailSubject').val('MAXY Report (' + dateRange + ')')

                        // 기본 보고서 제목 설정
                        const nowDate = util.nowDate()
                        const nowTime = util.nowTime().replaceAll(':', '')
                        $('#reportSubject').val('MAXY_Report_' + nowDate + '_' + nowTime)

                        // 이메일 태그 컨테이너 초기화
                        emailUtils.initEmailTagsSystem({
                            containerSelector: '#emailTagsContainer',
                            inputSelector: '#emailInput',
                            hiddenFieldSelector: '#emailTo',
                            errorSelector: '#emailToError',
                            addTagFunction: emailUtils.addEmailTag
                        })
                    })

                    // 이메일 예약 발송 팝업 열기
                    $('#btnScheduledEmail').on('click', function () {
                        // 선택한 row 초기화
                        v.scheduledTableSelRow = null
                        v.scheduledTableSelRowData = undefined

                        // 예약 발송 패널 열기
                        $('.right_navbar_wrap.scheduled_email_wrap').addClass('open')
                        $('.search_dimmed').show()

                        // 기본 제목 설정
                        $('#scheduledEmailSubject').val('MAXY Report')
                        // 기본 보고서 제목 설정
                        $('#scheduledReportSubject').val('MAXY_Report')
                        // 발송빈도, 사용기간 첫번째 option으로 설정
                        $('#frequency').prop('selectedIndex', 0)
                        $('#usagePeriod').prop('selectedIndex', 0)

                        // 캘린더 초기화
                        calendar.init({
                            id: 'scheduledStartDateCalendar',
                            type: 'single',
                            checkedDate: [util.getDateToString(util.getDate(1), '-')], // 내일 날짜를 기본값으로 설정
                            minDate: util.getDateToString(util.getDate(1), '-'),
                            maxDate: util.getDateToString(util.getDate(365), '-'),
                            fn: (dates, date) => {
                                RT0000.v.scheduledStartDate = date.min
                            },
                            created: () => {
                                RT0000.v.scheduledStartDate = util.getDateToString(util.getDate(1), '-')
                            }
                        })

                        // 이메일 태그 컨테이너 초기화
                        emailUtils.initEmailTagsSystem({
                            containerSelector: '#scheduledEmailTagsContainer',
                            inputSelector: '#scheduledEmailInput',
                            hiddenFieldSelector: '#scheduledEmailTo',
                            errorSelector: '#scheduledEmailToError',
                            addTagFunction: emailUtils.addEmailTag
                        })
                    })

                    // 예약된 이메일 팝업 열기
                    $('#btnScheduledEmailList').on('click', async function () {
                        // 예약된 이메일 목록 조회
                        await func.fetch.scheduledEmailList()

                        // 예약 발송 패널 열기
                        $('.right_navbar_wrap.scheduled_email_list_wrap').addClass('open')
                        $('.search_dimmed').show()
                    })

                    /**
                     * 이메일 전송 버튼 클릭 이벤트 핸들러
                     * 일반 이메일 전송 패널에서 사용
                     */
                    $('#btnSendEmailSubmit').on('click', function () {
                        // 현재 입력 중인 이메일이 있으면 태그로 추가
                        const currentInput = $('#emailInput').val().trim()
                        if (currentInput) {
                            // Enter 키 이벤트를 발생시켜 태그 추가 로직 실행
                            const e = $.Event('keydown')
                            e.which = 13 // Enter 키 코드
                            $('#emailInput').trigger(e)
                        }

                        // 이메일 유효성 검사
                        const toEmails = $('#emailTo').val().trim()

                        // 받는 사람은 필수
                        if (!toEmails) {
                            $('#emailToError').text(trl('common.msg.required.email')).show()
                            return;
                        }

                        // 이메일 유효성 검사
                        const isToValid = emailUtils.validateEmailList(toEmails)

                        if (!isToValid) {
                            return;
                        }

                        // 로딩 표시
                        $(this).prop('disabled', true).text(trl('common.text.sending'));

                        // 현재 설정된 앱 정보 객체 가져오기
                        const $packageNm = $('#packageNm_a')
                        const $osType = $('#osType_a')
                        const $appVer = $('#appVer_a')

                        const packageNm = $packageNm.val()
                        const serverType = $packageNm.find('option:selected').data('server-type')
                        const osType = $osType.val()
                        const appVer = $appVer.val()

                        const packageNmText = $packageNm.find('option:selected').text()
                        const osTypeText = $osType.find('option:selected').text()
                        const appVerText = $appVer.find('option:selected').text()

                        const from = util.dateToTimestamp(new Date(v.date.min), true)
                        const to = util.dateToTimestamp(new Date(v.date.max), false)
                        const diff = util.getDateDiff(v.date.min, v.date.max) + 1

                        let reportType = ''
                        $('[data-tag-type]').each(function () {
                            const $this = $(this)
                            reportType += $this.data('tag-type') + ','
                        })
                        reportType = reportType.slice(0, -1) // 마지막 , 제거

                        // 이메일 목록 준비
                        const toEmailList = toEmails.split(',').map(e => e.trim()).filter(e => e);

                        // API 요청 데이터
                        const requestData = {
                            from: from,
                            to: to,
                            reportType: reportType,
                            packageNm: packageNm,
                            serverType: serverType,
                            osType: osType,
                            appVer: appVer,
                            packageNmText: packageNmText,
                            osTypeText: osTypeText,
                            appVerText: appVerText,
                            diff: diff,
                            locale: localStorage.getItem('lang'),
                            toEmailList: toEmailList,
                            emailSubject: $('#emailSubject').val(),
                            reportSubject: $('#reportSubject').val(),
                        };

                        // 보고서 첨부해서 이메일 전송
                        ajaxCall('/rt/0000/sendReportByEmail.maxy', requestData, {disableCursor: true}).then(response => {
                            if (response.success) {
                                toast(trl('common.msg.send.email.success'));
                                // 팝업 닫기
                                $('.right_navbar_wrap.email_wrap').not('.scheduled_email_wrap').not('scheduled_email_list_wrap').removeClass('open');

                                // 폼 초기화
                                $('#emailTagsContainer').find('.email-tag').remove()
                                $('#emailInput').val('')
                                $('#emailTo').val('')
                                $('.error-message').hide();
                            } else {
                                toast(trl('common.msg.send.email.fail') + ': ' + response.message);
                            }

                            // 버튼 상태 복원
                            $('#btnSendEmailSubmit').prop('disabled', false)
                            $('#btnSendEmailSubmit').text(trl('common.text.send'))
                        })
                    })

                    // 이메일 예약 발송 등록 버튼 클릭 이벤트
                    $('#btnScheduledEmailSubmit').on('click', function () {
                        // 현재 입력 중인 이메일이 있으면 태그로 추가 - 사용자 편의성 향상
                        const currentInput = $('#scheduledEmailInput').val().trim()
                        if (currentInput) {
                            // Enter 키 이벤트를 발생시켜 태그 추가 로직 실행
                            const e = $.Event('keydown')
                            e.which = 13 // Enter 키 코드
                            $('#scheduledEmailInput').trigger(e)
                        }

                        // 이메일 유효성 검사 - 수신자 목록이 비어있는지 확인
                        const toEmails = $('#scheduledEmailTo').val().trim()

                        // 받는 사람은 필수 - 수신자가 없으면 오류 메시지 표시
                        if (!toEmails) {
                            $('#scheduledEmailToError').text(trl('common.msg.required.email')).show()
                            return;
                        }

                        // 이메일 유효성 검사 - 모든 이메일 주소가 유효한지 확인
                        const isToValid = emailUtils.validateEmailList(toEmails, 'scheduledEmailToError')

                        if (!isToValid) {
                            return;
                        }

                        // 메일 제목이 비어있으면
                        if ($('#scheduledEmailSubject').val().trim() === '') {
                            toast(trl('common.msg.required.emailSubject'))
                            return;
                        }

                        // 보고서 제목이 비어있으면
                        if ($('#scheduledReportSubject').val().trim() === '') {
                            toast(trl('common.msg.required.reportSubject'))
                            return;
                        }

                        // 현재 설정된 앱 정보 객체 가져오기 - 보고서에 포함될 앱 정보
                        const $packageNm = $('#packageNm_a')
                        const $osType = $('#osType_a')
                        const $appVer = $('#appVer_a')

                        const packageNm = $packageNm.val()
                        const serverType = $packageNm.find('option:selected').data('server-type')
                        const osType = $osType.val()
                        const appVer = $appVer.val()

                        const packageNmText = $packageNm.find('option:selected').text()
                        const osTypeText = $osType.find('option:selected').text()
                        const appVerText = $appVer.find('option:selected').text()

                        // 보고서 유형 정보 수집 - 어떤 유형의 보고서를 생성할지 결정
                        let reportType = ''
                        $('[data-tag-type]').each(function () {
                            const $this = $(this)
                            reportType += $this.data('tag-type') + ','
                        })
                        reportType = reportType.slice(0, -1) // 마지막 , 제거

                        // 발송 빈도 가져오기 - 예약 발송의 주기 설정 (매일, 매주, 매월, 매분기)
                        const frequency = $('#frequency').val()

                        // 사용 기한 가져오기 - 예약 발송이 유지될 기간 (1~12개월)
                        const usagePeriod = parseInt($('#usagePeriod').val(), 10);

                        // API 요청 데이터 - 서버에 전송할 모든 정보를 포함
                        const param = {
                            seq: (v.scheduledTableSelRowData === undefined) ? null : v.scheduledTableSelRowData.seq,
                            reportType: reportType,
                            packageNm: packageNm,
                            serverType: serverType,
                            osType: osType,
                            appVer: appVer,
                            packageNmText: packageNmText,
                            osTypeText: osTypeText,
                            appVerText: appVerText,
                            toEmailListStr: toEmails,
                            subject: $('#scheduledEmailSubject').val().trim(),
                            reportSubject: $('#scheduledReportSubject').val().trim(),
                            sendStartDt: v.scheduledStartDate,  // 발송 시작 날짜
                            sendCycle: frequency,                 // 발송 빈도
                            usagePeriod: usagePeriod,
                            locale: localStorage.getItem('lang')
                        };

                        // 예약 발송 등록 API 호출
                        ajaxCall('/rt/0000/upsertScheduledEmail.maxy', param).then(() => {
                            // 성공 메시지 표시
                            toast(trl('common.msg.add'));
                            // 팝업 닫기
                            $('.right_navbar_wrap.scheduled_email_wrap').removeClass('open');

                            // 선택한 row 초기화
                            v.scheduledTableSelRow = null
                            v.scheduledTableSelRowData = undefined

                            // 폼 초기화 - 다음 사용을 위해 입력 필드 초기화
                            $('#scheduledEmailTagsContainer').find('.email-tag').remove()
                            $('#scheduledEmailInput').val('')
                            $('#scheduledEmailTo').val('')
                            $('.error-message').hide();
                        }).catch((e) => {
                            if (e.msg) {
                                toast(trl(e.msg))
                            } else {
                                const msg = trl('common.msg.serverError')
                                toast(msg)
                            }
                        })
                    })

                    // 예약이메일 정보 수정
                    $('#btnScheduledEmailEdit').on('click', function () {
                        if (v.scheduledTableSelRowData === undefined) {
                            toast(trl('common.msg.noSelect'))
                            return
                        }

                        // 리스트 닫고 예약 발송 패널 열기
                        $('.right_navbar_wrap.scheduled_email_list_wrap').removeClass('open')
                        $('.right_navbar_wrap.scheduled_email_wrap').addClass('open')
                        $('.search_dimmed').show()

                        const rowData = v.scheduledTableSelRowData

                        // 제목 설정
                        $('#scheduledEmailSubject').val(rowData.subject)
                        // 보고서 제목 설정
                        $('#scheduledReportSubject').val(rowData.reportSubject)
                        // 발송 빈도 설정
                        $('#frequency').val(rowData.sendCycle)
                        // 사용 기간 설정
                        $('#usagePeriod').val(rowData.usagePeriod)

                        // 캘린더 초기화
                        calendar.init({
                            id: 'scheduledStartDateCalendar',
                            type: 'single',
                            checkedDate: [rowData.sendStartDt],
                            minDate: util.getDateToString(util.getDate(1), '-'),
                            maxDate: util.getDateToString(util.getDate(365), '-'),
                            fn: (dates, date) => {
                                RT0000.v.scheduledStartDate = date.min
                            },
                            created: () => {
                                RT0000.v.scheduledStartDate = rowData.sendStartDt
                            }
                        })

                        // 이메일 태그 컨테이너 초기화
                        emailUtils.initEmailTagsSystem({
                            containerSelector: '#scheduledEmailTagsContainer',
                            inputSelector: '#scheduledEmailInput',
                            hiddenFieldSelector: '#scheduledEmailTo',
                            errorSelector: '#scheduledEmailToError',
                            addTagFunction: emailUtils.addEmailTag
                        })

                        $('#scheduledEmailInput').val(rowData.toEmailListStr)
                        // Enter 키 이벤트를 발생시켜 태그 추가 로직 실행
                        const e = $.Event('keydown')
                        e.which = 13 // Enter 키 코드
                        $('#scheduledEmailInput').trigger(e)
                    })

                    // 예약정보 삭제 버튼 클릭
                    $('#btnScheduledEmailDelete').on('click', function () {
                        if (v.scheduledTableSelRowData === undefined) {
                            toast(trl('common.msg.noSelect'))
                            return
                        }

                        const param = {
                            seq: v.scheduledTableSelRowData.seq
                        }

                        const msg = i18next.tns('common.msg.deleteSchedule')
                        modal.show({
                            id: 'deleteScheduledEmail',
                            msg: msg,
                            confirm: true,
                            fn: () => {
                                ajaxCall('/rt/0000/deleteScheduledEmail.maxy', param, {
                                    disableCursor: true
                                }).then((data) => {
                                    // 테이블에 데이터 렌더링
                                    RT0000.func.draw.scheduledEmailList(data.emailList);
                                }).catch(e => {
                                    console.error('예약된 이메일 목록 조회 중 오류 발생:', e);
                                })
                            }
                        })
                    })

                    /**
                     * 배경 딤드(dimmed) 클릭 시 팝업 닫기 처리
                     * 이메일 전송 패널과 예약 발송 패널을 구분하여 처리
                     */
                    $('.search_dimmed').on('click', function () {
                        // 일반 이메일 전송 패널이 열려있는 경우
                        if ($('.right_navbar_wrap.email_wrap').not('.scheduled_email_wrap').not('scheduled_email_list_wrap').hasClass('open')) {
                            $('.right_navbar_wrap.email_wrap').not('.scheduled_email_wrap').not('scheduled_email_list_wrap').removeClass('open')
                            return
                        }
                        // 이메일 예약 발송 패널이 열려있는 경우
                        if ($('.right_navbar_wrap.scheduled_email_wrap').hasClass('open')) {
                            $('.right_navbar_wrap.scheduled_email_wrap').removeClass('open')
                            return
                        }
                        // 이메일 예약 리스트 패널이 열려있는 경우
                        if ($('.right_navbar_wrap.scheduled_email_list_wrap').hasClass('open')) {
                            // 선택한 row 초기화
                            RT0000.v.scheduledTableSelRow = null
                            RT0000.v.scheduledTableSelRowData = undefined
                            $('.right_navbar_wrap.scheduled_email_list_wrap').removeClass('open')
                            return
                        }
                        // 그 외 다른 패널이 열려있는 경우
                        $(this).hide()
                        $('.right_navbar_wrap').removeClass('open')
                    })

                    // navbar 왼쪽상단 x버튼
                    $('.img_x_bk').on('click', function () {
                        $('.search_dimmed').trigger('click')
                    })

                    // Report Type 추가
                    $('#btnReportTypeAdd').on('click', function () {
                        const $tagWrap = $('.tag_content')
                        $tagWrap.empty()

                        // 체크된 Report Type 추가
                        const $checkedItems = $('.rt_wrap .right_navbar_wrap.select_type_wrap .add_type_wrap .type')
                        $checkedItems.each(function () {
                            const $this = $(this)
                            const type = $this.data('report-type')
                            const name = $this.text()

                            $tagWrap.append(`
                                    <div class="tag">
                                        <span data-tag-type="\${type}">\${name}</span>
                                        <i><img src="<c:url value="/images/maxy/x-bk.svg"/>" alt=""></i>
                                    </div>
                                `)
                        })

                        $(".tag_content").sortable("refresh")
                        $('.right_navbar_wrap.select_type_wrap').removeClass('open')
                        $('.search_dimmed').hide()
                    })

                    // 보고서 유형 tag의 x버튼
                    $(document).on('click', '.tag_content .tag i', function () {
                        const $this = $(this)
                        const $tag = $this.parent('.tag')

                        // 태그 삭제
                        $tag.remove()
                    })

                    // 공유 navbar 열기
                    $('#btnExportMenu').on('click', function () {
                        $('.right_navbar_wrap.export_wrap').addClass('open')
                        $('.search_dimmed').show()
                    })
                }
            }
        }
    }

    RT0000.init.created()
    RT0000.init.event()
</script>