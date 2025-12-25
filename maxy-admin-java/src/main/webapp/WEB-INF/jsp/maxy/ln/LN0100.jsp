<%--suppress ELValidationInspection --%>
<%--
  Login Page
--%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<html>
<head>
    <title>MAXY</title>

    <jsp:include page="../common/import.jsp"/>
    <jsp:include page="../common/commonScript.jsp"/>
    <jsp:include page="../common/rsaScript.jsp"/>
    <%--<script>
        maxy._onMAXYLocationchange('maxyLogin')
    </script>--%>

    <style>
        /* LN0100 - 로그인 */
        .login_wrap {
            width: 100vw;
            height: 100vh;
            background-color: var(--black-8);
            position: relative;
        }

        .login_wrap .login_box {
            width: 720px;
            height: 456px;
            position: absolute;
            top: calc(50% - 250px);
            left: 50%;
            transform: translateX(-50%);
            background-color: white;
            padding: 10px;
            border-radius: 20px;
            display: flex;
            flex-direction: row;
            align-items: center;
            box-shadow: 0 3px 8px 0 rgba(0, 0, 0, 0.25);
            z-index: 1;
        }

        .login_wrap .login_box > div:first-child {
            display: flex;
            width: 50%;
            flex-direction: column;
            align-items: center;
            padding: 50px;
        }

        .login_wrap .login_box > div:last-child {
            width: 50%;
        }

        .login_wrap .login_box.otp_input,
        .login_wrap .login_box.otp_reg,
        .login_wrap .login_box.otp_qr_store {
            padding: 3.7em 5em 3.7em 5em;
            display: none;
            box-shadow: none;
        }

        /* otp 등록 화면 (QR코드) */
        .login_wrap .login_box.otp_reg {
            z-index: 2;
        }

        /* play store, app store qr 화면 */
        .login_wrap .login_box.otp_qr_store {
            z-index: 3;
        }

        /* otp 입력 화면 (input) -> 이게 가장 상위이므로 z-index 3 */
        .login_wrap .login_box.otp_input {
            z-index: 6;
        }

        .login_box.otp_input, .login_box.otp_reg {
            transition: opacity 0.3s ease;
        }

        .login_box img.login_bg {
            width: 100%;
            height: 100%;
        }

        .login_box .login_title {
            position: relative;
            display: inline-flex;
            align-items: flex-start;
            margin-bottom: 1.5em;
            gap: 4px;
        }

        .login_box .login_title h1 {
            color: var(--black-0);
            font-size: 44px;
            line-height: 52px;
            font-weight: var(--bold);
            display: inline-block;
            margin-left: 5px;
        }

        .login_box .login_title img {
            height: 29px;
            display: inline-block;
        }

        .login_box .login_title img.logo_maxy {
            content: url("/images/maxy/maxy_BI_WH.svg");
        }

        .login_box .login_title img.logo_front {
            height: 13px;
            content: url("/images/maxy/maxyfront_BI_WH.svg");
        }

        .login_box .welcome_txt {
            color: #999999;
            margin: 8px 0 2.5em;
        }

        .login_box li {
            margin-bottom: 24px;
        }

        .login_box li p {
            color: var(--black-2);
            font-size: var(--font-m-size);
            margin-bottom: 6px;
            line-height: 17px;
            padding-left: var(--left-padding);
        }

        .login_box input {
            width: 100%;
            margin-bottom: 1.25em;
            height: 36px;
            border-radius: 5px;
            border: 1px solid #E3E5E8;
            padding: 0.8em;
            outline: none;
        }

        .login_box input::placeholder {
            color: #959595;
        }

        .login_box input:focus {
            border: 1px solid var(--logo-purple-2);
            outline: none;
        }

        .login_box .find_pw {
            min-width: 75px;
            margin-left: auto;
            background-color: transparent;
            color: #009FF9;
            margin-bottom: 0.7em;
        }

        .login_box .login_btn {
            width: 100%;
            height: 32px;
            padding: 0.625em;
            border-radius: 5px;
            color: white;
            background-color: var(--logo-purple-1);
            border: 1px dashed var(--logo-purple-1);
            font-weight: 700;
            cursor: pointer;
        }

        .login_box .login_btn:hover {
            color: var(--logo-purple-1);
            background-color: white;
            border: 1px dashed var(--logo-purple-1);
            cursor: pointer;
            transition: 0.5s;
        }

        .login_wrap .copyright {
            color: #B5B5B5;
            display: inline-block;
            position: absolute;
            bottom: 32px;
            width: 100%;
            text-align: center;
            font-size: var(--font-s-size);
            line-height: 16px;
        }

        .login_wrap .err_txt {
            display: none;
            padding-left: 0;
            margin-top: -1em;
            margin-bottom: 1px;
            text-align: left;
            width: 100%;
            line-height: 20px;
            height: 20px;
            font-size: 12px;
        }

        .add_txt {
            width: 400px;
            display: inline-block;
            position: absolute;
            text-align: center;
            left: 50%;
            bottom: 8%;
            line-height: 16px;
            transform: translateX(-50%);
        }

        .maxy_modal .qr_image {
            width: 170px;
            height: 100%;
            object-fit: contain;
            object-position: center;
        }

        .login_box .otp_reg_title {
            font-weight: 600;
            width: 100%;
            text-align: center;
            font-size: 2.5em;
        }

        .login_box .point {
            color: #3168FF !important;
            text-decoration: underline;
            cursor: pointer;
        }

        .login_box .otp_reg_txt {
            text-align: center;
            line-height: normal;
            color: #999999;
        }

        .login_box.otp_reg #otpReg, .login_box.otp_input #otpInput {
            display: flex;
            flex-direction: column;
            gap: 1em;
            height: 100%;
            /*align-items: center;*/
        }

        .login_box .otp_reg_box {
            height: 100%;
            border: 1px solid #e3e3e3;
            border-radius: var(--radius);
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .login_box .otp_reg_box img {
            width: 170px;
        }

        .login_box .button_wrap {
            display: grid;
            gap: 2%;
            grid-template-columns: 35% 63%;
        }

        .login_box .button_wrap .btn_common.otp_opposite {
            background-color: var(--logo-purple-1);
            color: #fff;
            border: none;
        }

        .login_box.otp_reg .login_otp_qr {
            content: url("/images/maxy/qr/icon-otp-qr.svg");
        }


        .otp_qr_store .qr_btn_wrap > div:first-child {
            color: var(--logo-purple-1);
            gap: .5em;
            display: flex;
            align-items: center;
        }

        .otp_qr_store .qr_btn_wrap {
            margin-left: .5em;
            display: flex;
            flex-direction: column;
            gap: .7em;
        }

        .qr_btn_wrap .icon_ios {
            content: url("/images/maxy/icon-ios-purple.svg")
        }

        .qr_btn_wrap .icon_android {
            content: url("/images/maxy/icon-android-purple.svg");
            height: 24px;
        }

        .otp_qr_store .btn_qr_open {
            gap: .5em;
            border: 1px solid #e3e5e8;
            padding: .8em;
            text-align: center;
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .otp_qr_store .btn_qr_open .icon_symbol_qr {
            content: url("/images/maxy/qr/icon-qr-symbol.svg");
        }

        #otpQrWrap .qr_btn_wrap:nth-child(2) {
            margin: 3em 0 2em .5em;
        }

        #appStoreQr, #playStoreQr {
            width: 300px;
            top: 46%;
        }

        #appStoreQr .popup_footer, #playStoreQr .popup_footer {
            justify-content: center;
        }

        #otpQrWrap {
            position: relative;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .qr_footer_wrap {
            margin-top: auto;
            display: flex;
            justify-content: center;
        }

        .otp_input #qrWrap {
            display: flex;
            justify-content: center;
        }

        .otp_input #qrWrap img {
            width: 115px;
        }

        .otp_box {
            margin-bottom: 3em;
            display: flex;
        }

        .otp_box > input {
            text-align: center;
            border-radius: 0 !important;
            margin-bottom: 0 !important;
            border-right: none; /* 오른쪽 테두리 제거 */
        }

        .otp_box > input:first-child {
            border-top-left-radius: var(--radius) !important;
            border-bottom-left-radius: var(--radius) !important;
        }

        .otp_box > input:last-child {
            border-top-right-radius: var(--radius) !important;
            border-bottom-right-radius: var(--radius) !important;
            border-right: 1px solid #E3E5E8; /* 마지막 요소에만 오른쪽 테두리 추가 */
        }

        .otp_box > input:last-child:focus {
            border-right: 1px solid var(--logo-purple-1);
        }

        .blue {
            color: #009FF9;
            text-align: left;
        }

        #otpInput .otp_reg_txt {
            margin-bottom: 4em;
        }

        .login_box .otp_space_between {
            display: flex;
            justify-content: space-between;
        }

        .otp_space_between #issuedAt {
            color: #ff6969;
        }

        #otpInput .otp_fail_box {
            color: #ff6969;
            text-align: center;
            visibility: hidden;
        }

        .qr_code_wrap {
            height: 90%;
            width: 100%;
            position: absolute;
            top: 20%;
            background-color: white;
            display: none;
            gap: 1em;
            flex-direction: column;
            align-items: center;
        }

        .qr_code_wrap img {
            width: 170px;
        }

        .login_type {
            display: flex;
            position: relative;
            width: 240px;  /* 배경 전체 넓이 */
            height: 32px;  /* 배경 높이 */
            background-color: #F3F3F3;
            border-radius: 30px;
            overflow: hidden;
            margin: 1em 0 1em 0;
        }

        .login_type input[type="radio"] {
            display: none; /* 실제 라디오 숨김 */
        }

        /* 탭 레이블 */
        .login_type .tab{
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            z-index: 2;                /* selector보다 위에 텍스트가 오도록 */
            color: #bfbfbf;            /* 비활성 텍스트 색 */
            user-select: none;
        }

        /* 이동하는 선택 배경(thumb) */
        .login_type .selector{
            position: absolute;
            top: 0;
            left: 0;                   /* 왼쪽 시작 */
            width: 50%;                /* 좌/우 각각 절반 */
            height: 100%;
            z-index: 1;                /* 레이블 텍스트보다 아래 */
            pointer-events: none;
        }

        /* 체크 상태에 따른 이동 */
        #maxyModeMaxy:checked ~ .selector {
            left: 0;
            background-color: #e6e6e6;
            border-radius: 30px 0 0 30px;
        }

        #maxyModeFront:checked ~ .selector {
            left: 50%;
            background-color: #e6e6e6;
            border-radius: 0 30px 30px 0;
        }

        /* 체크된 탭 텍스트 강조 */
        #maxyModeMaxy:checked ~ label[for="maxyModeMaxy"]{ color: #000; }
        #maxyModeFront:checked ~ label[for="maxyModeFront"]{ color: #000; }
    </style>
</head>
<%-- 로그인 --%>
<body>
<section class="login_wrap">
    <!-- 로그인 -->
    <div class="login_box">
        <div>
            <div class="login_title">
                <img class="logo_maxy"  alt="">
                <img class="logo_front" alt="">
            </div>
            <div class="login_type">
                <input type="radio" name="maxyMode" id="maxyModeMaxy" value="maxy">
                <input type="radio" name="maxyMode" id="maxyModeFront" value="front">
                <div class="selector" aria-hidden="true"></div>
                <label for="maxyModeMaxy" class="tab">MAXY</label>
                <label for="maxyModeFront" class="tab">MAXY Front</label>
            </div>
            <%--<div class="welcome_txt">MAXY를 통한 모바일 모니터링을 시작합니다.</div>--%>
            <button class="find_pw" id="btnOpenFindPwModal">
                비밀번호 찾기
            </button>
            <label for="userId"></label>
            <label for="userPw"></label>
            <input id="userId" type="text" required placeholder="ID" tabindex="1">
            <span class="err_txt" id="userIdErrTxt"></span>
            <input id="userPw" type="password" required placeholder="Password" tabindex="2">
            <span class="err_txt" id="userPwErrTxt"></span>
            <span class="err_txt" id="loginErrTxt"></span>
            <button id="btnLogin" type="submit" class="login_btn">LOGIN</button>
            <div class="copyright">
                ${copyright}
            </div>
        </div>
        <div>
            <img class="login_bg maxy" src="/images/maxy/img-maxy-login-bg.svg" alt="">
            <img class="login_bg front" src="/images/maxy/img-maxyfront-login-bg.svg" alt="">
        </div>

    </div>

    <%-- otp 등록 팝업--%>
    <div class="login_box otp_reg">
        <div id="otpReg">
            <div class="otp_reg_title">
                OTP를 등록하세요
            </div>
            <div class="otp_reg_txt">
                <span class="point" id="btnStoreQr">Google Authenticator</span>
                <span>앱에서 OTP를 등록하고 <br> 보안을 강화하세요.</span>
            </div>
            <div class="otp_reg_box"></div>
            <div class="button_wrap">
                <button id="btnCloseOtpReg" class="btn_common opposite">이전</button>
                <button id="btnCompleteOtpReg" class="btn_common otp_opposite">완료</button>
            </div>
        </div>
    </div>

    <%-- otp qr 코드 팝업--%>
    <div class="login_box otp_qr_store">
        <div id="otpQrWrap">
            <div class="otp_reg_txt">
                <span class="point" id="">Google Authenticator</span>
                <span>앱을 다운받고 설치한 후<br>OTP를 등록하고 보안을 강화하세요.</span>
            </div>

            <div class="qr_btn_wrap">
                <div>
                    <img class="icon_ios" alt="appstore"/>
                    <span>Apple 사용자</span>
                </div>
                <div class="btn_qr_open" id="btnAppStoreQr">
                    <img class="icon_symbol_qr" alt="">
                    <span>App Store QR 보기</span>
                </div>
            </div>

            <div class="qr_btn_wrap">
                <div>
                    <img class="icon_android" alt="playstore"/>
                    <span>Android 사용자</span>
                </div>
                <div class="btn_qr_open" id="btnPlayStoreQr">
                    <img class="icon_symbol_qr" alt="">
                    <span>Play Store QR 보기</span>
                </div>
            </div>

            <div class="qr_code_wrap">
                <div id="storeType"></div>
                <img id="storeQr" src="" alt="qr">
                <button class="btn_common opposite" id="btnQrImgClose">이전</button>
            </div>

            <div class="qr_footer_wrap">
                <button class="btn_common opposite" id="btnQrStoreClose">이전</button>
            </div>

        </div>
    </div>

    <%-- otp 입력 팝업--%>
    <div class="login_box otp_input">
        <div id="otpInput">
            <div class="otp_reg_title">
                OTP를 입력하세요
            </div>
            <div class="otp_reg_txt">6자리의 OTP 번호를 입력하세요</div>

            <div class="otp_space_between">
                <button class="blue" id="btnResetOtp">OTP 재등록</button>
                <span id="issuedAt"></span>
            </div>

            <div class="otp_box">
                <input id="otp1" type="text" required maxlength="1"
                       onkeyup="this.value = this.value.replace(/[^0-9]/g, '');"/>
                <input id="otp2" type="text" required maxlength="1"
                       onkeyup="this.value = this.value.replace(/[^0-9]/g, '');"/>
                <input id="otp3" type="text" required maxlength="1"
                       onkeyup="this.value = this.value.replace(/[^0-9]/g, '');"/>
                <input id="otp4" type="text" required maxlength="1"
                       onkeyup="this.value = this.value.replace(/[^0-9]/g, '');"/>
                <input id="otp5" type="text" required maxlength="1"
                       onkeyup="this.value = this.value.replace(/[^0-9]/g, '');"/>
                <input id="otp6" type="text" required maxlength="1"
                       onkeyup="this.value = this.value.replace(/[^0-9]/g, '');"/>
            </div>

            <div class="otp_fail_box">
                <span>OTP 코드 입력 실패</span>
                <span id="otpFailCnt"></span>
            </div>
            <div class="button_wrap">
                <button class="btn_common opposite" id="btnCancelOtp">이전</button>
                <button class="btn_common otp_opposite" id="btnConfirmOtp">완료</button>
            </div>

        </div>
    </div>
    <!--// 로그인 -->
</section>

<!-- 마스크-->
<div class="dimmed" style="top: 0; height: 100vh; background-color: transparent" data-content="dimmed"></div>
<jsp:include page="LN01P1.jsp"/>
<jsp:include page="LN01P2.jsp"/>
</body>
<script>

    const v = {
        countdownTimer: null
    }

    const init = {
        init() {
            // all이면 제품 선택하는 ui 추가
            if ('${maxyMode}' === 'all') {
                $('.login_type').show()
                // 쿠키에서 저장된 maxyMode 값을 읽어와서 자동선택
                const savedMaxyMode = func.getCookie('maxyMode')
                if (savedMaxyMode) {
                    $('input[name="maxyMode"][value="' + savedMaxyMode + '"]').prop('checked', true)
                } else {
                    // 쿠키값이 없으면 기본값으로 첫 번째 radio 버튼 선택
                    $('input[name="maxyMode"]:first').prop('checked', true)
                }

                if($('input[name="maxyMode"]:checked').val() === 'front') {
                    $('.logo_front').show()
                    $('img.login_bg.maxy').hide()
                    $('img.login_bg.front').show()
                }else {
                    $('.logo_front').hide()
                    $('img.login_bg.front').hide()
                    $('img.login_bg.maxy').show()
                }
            } else if ('${maxyMode}' === 'front') {
                $('.login_type').hide()

                $('img.login_bg.maxy').hide()
                $('img.login_bg.front').show()
            } else {
                $('.login_type').hide()
                $('.logo_front').hide()

                $('img.login_bg.front').hide()
                $('img.login_bg.maxy').show()
            }
        },
        event() {
            $('#btnLogin').on('click', func.clickLogin)

            $('#userId, #userPw').on('keyup', (key) => {
                if (key.keyCode === 13) {
                    func.clickLogin()
                }
            })

            $('#btnOpenFindPwModal').on('click', () => {
                func.checkMailService()
            })

            // app store qr 보기 버튼
            $('#btnAppStoreQr').on('click', () => {
                func.otp.showStoreQR('App Store', '/images/maxy/qr/qrcode_apps.apple.com.svg');
            })

            // play store qr 보기 버튼
            $('#btnPlayStoreQr').on('click', () => {
                func.otp.showStoreQR('Play Store', '/images/maxy/qr/qrcode_play.google.com.svg');
            })

            // otp 등록 (qr) 완료 버튼
            $('#btnCompleteOtpReg').on('click', () => {

                const $otp_reg = $('.otp_reg')
                const $otp_input = $('.otp_input')

                const otpRegZindex = Number($otp_reg.css('z-index'))
                const otpInputZindex = Number($otp_input.css('z-index'))

                // 이 경우에는 otp_input 의 z-index를 otp_reg 보다 1 크게 조정한다
                if (otpRegZindex > otpInputZindex) {
                    $otp_input.css('z-index', otpRegZindex + 1)
                }

                func.otp.register()
            })

            // otp 재등록 버튼
            $('#btnResetOtp').on('click', () => {
                // otp 입력 화면에서 otp 재등록 버튼 누른 경우 (otp 입력은 z-index가 4, otp 등록은 z-index 2로 되어있음)
                // 이 경우에만 otp_reg 의 z-index를 otp 입력보다 1 크게 조정한다
                const $otp_reg = $('.otp_reg')
                const $otp_input = $('.otp_input')

                const otpRegZindex = Number($otp_reg.css('z-index'))
                const otpInputZindex = Number($otp_input.css('z-index'))

                // 이 경우에는 otp_input 의 z-index를 otp_reg 보다 1 크게 조정한다
                if (otpInputZindex > otpRegZindex) {
                    $otp_reg.css('z-index', otpInputZindex + 1)
                }

                func.otp.resetInput()
                func.otp.registerUrl()
            })

            // otp 코드 입력 완료 버튼
            $('#btnConfirmOtp').on('click', () => {
                func.otp.confirm()
            })

            // otp 코드 입력 이전 버튼
            $('#btnCancelOtp').on('click', () => {
                // OTP 입력 필드 초기화
                func.otp.resetInput()
            })

            // otp 등록 화면의 이전 버튼 (로그인 화면으로 가야함)
            $('#btnCloseOtpReg').on('click', () => {
                $('.otp_reg').hide()
                $('.otp_input').hide()
            })

            $('#btnStoreQr').on('click', () => {
                const $otp_reg = $('.otp_reg')
                const $otp_qr_store = $('.otp_qr_store')

                const otpRegZindex = Number($otp_reg.css('z-index'))
                const otpQrStoreZindex = Number($otp_qr_store.css('z-index'))

                if (otpRegZindex > otpQrStoreZindex) {
                    $otp_qr_store.css('z-index', otpRegZindex + 1)
                }
                $otp_qr_store.show()
            })

            $('#btnQrStoreClose').on('click', () => {
                $('.otp_qr_store').hide()
            })

            // OTP 입력 필드에 값 입력 시 자동으로 다음 필드로 이동하는 이벤트 추가
            $('#otp1, #otp2, #otp3, #otp4, #otp5').on('input', function () {
                // 현재 입력 필드에 값이 입력되었는지 확인
                if ($(this).val().length === 1) {
                    // 다음 입력 필드로 포커스 이동
                    $(this).next('input').focus()
                }
            });

            // OTP 입력 필드에 포커스가 들어왔을 때 내용 전체 선택
            $('#otp1, #otp2, #otp3, #otp4, #otp5, #otp6').on('focus', function () {
                // 현재 입력 필드의 내용 전체 선택
                $(this).select();
            });

            $('.otp_box input').on('keydown', function (e) {
                // 백스페이스 키 코드는 8입니다
                if (e.keyCode === 8) {
                    // 현재 입력 필드가 비어있고, 첫 번째 입력 필드가 아닌 경우
                    if ($(this).val() === '' && $(this).attr('id') !== 'otp1') {
                        // 이전 입력 필드로 포커스 이동
                        $(this).prev().focus();
                    }
                }
            });

            $('#otp6').on('keydown', function (e) {
                // Enter 키 코드는 13입니다
                if (e.keyCode === 13) {
                    // 모든 OTP 필드가 입력되었는지 확인
                    const otpCode1 = $('#otp1').val();
                    const otpCode2 = $('#otp2').val();
                    const otpCode3 = $('#otp3').val();
                    const otpCode4 = $('#otp4').val();
                    const otpCode5 = $('#otp5').val();
                    const otpCode6 = $('#otp6').val();

                    // 모든 필드가 입력되었으면 완료 버튼 동작 실행
                    if (otpCode1 && otpCode2 && otpCode3 && otpCode4 && otpCode5 && otpCode6) {
                        func.otp.confirm();
                    }
                }
            });

            $('#btnQrImgClose').on('click', () => {
                $('#storeQr').attr('src', '')
                $('.qr_code_wrap').hide()
            })

            $('input[name="maxyMode"]').on('change', function () {
                if($(this).val() === 'front') {
                    $('.logo_front').show()

                    $('img.login_bg.maxy').hide()
                    $('img.login_bg.front').show()
                }else {
                    $('.logo_front').hide()

                    $('img.login_bg.front').hide()
                    $('img.login_bg.maxy').show()
                }
            })
        },
        created() {
            func.checkMsg()
            func.empty()
        }
    }

    const func = {
        async checkMsg() {
            const denied = '${denied}'
            if (denied) {
                // code 에 맞는 메시지 발생
                /*
                code:
                - session.expired
                - invalid.url
                - menu.denied
                 */
                await util.sleep(100)
                const txt = trl('common.msg.' + denied)
                toast(txt, true, 2000)
                history.pushState(null, null, '/ln/goLoginPage.maxy')
            }
        },
        checkMailService() {
            ajaxCall('/ln/checkMailService.maxy', {}).then(() => {
                func.resetErrorMsg()
                $('#find_pw_popup').show()
                $('.dimmed').show()
            }).catch(error => {
                let msg = (error.msg).replaceAll('\n', '<br>')
                toast(trl(msg), true, 2000)
            })
        },
        resetErrorMsg() {
            const errTxt = $('.err_txt')
            $('#userId').val('')
            $('#userPw').val('')
            errTxt.text('')
            errTxt.hide()
        },
        setErrorMsg(type, error) {
            const errTxt = $('.err_txt')
            errTxt.text('')
            errTxt.hide()
            const targetErrTxt = $('#' + type + 'ErrTxt')
            targetErrTxt.text(error)
            targetErrTxt.show()
        },
        empty() {
            // history.clear()
            sessionStorage.clear()
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
        },
        clickLogin() {
            const userInfo = func.valid();

            // 아이디, 비번 모두 입력 된 경우만 RSAKey 받아오도록 한다.
            if (!userInfo) {
                return
            }

            const rsa = new RSAKey()
            cursor.show()
            // 로그인 버튼 누를 시 RSAKey 받아오기
            ajaxCall('/cmm/initRSAKey.maxy', {}, {disableCursor: true}).then((data) => {
                const {RSAPub} = data
                const {RSAExponent, RSAModulus} = RSAPub
                rsa.setPublic(RSAModulus, RSAExponent)
                userInfo.userPw = rsa.encrypt(userInfo.userPw)
            }).then(() => {
                // 암호화 성공 시 로그인 실행
                func.doLogin(userInfo)
            }).catch((e) => {
                cursor.hide()
                console.log(e)
                toast(trl('common.msg.serverError'))
            })
        },
        doLogin(userInfo) {
            ajaxCall('/ln/doLogin.maxy', userInfo).then(data => {
                let maxyMode = '${maxyMode}'
                if (maxyMode === 'all') {
                    // 선택된 radio 버튼 값을 쿠키에 저장
                    const selectedMaxyMode = $('input[name="maxyMode"]:checked').val();
                    if (selectedMaxyMode) {
                        document.cookie = 'maxyMode=' + encodeURIComponent(selectedMaxyMode) + '; path=/; max-age=' + (60 * 60 * 24 * 30); // 30일 유지
                    }

                    maxyMode = selectedMaxyMode
                }

                // maxy 제품유형 (maxy: 기존 maxy, front: maxy front)
                sessionStorage.setItem('maxyMode', maxyMode);

                // OTP true 면 otp process 실행
                if (data?.msg?.otp) {
                    func.otp.process(data)
                }
                // OTP 정보 없으면 로그인 완료
                else {
                    location.replace('/main.maxy');
                }
            }).catch((e) => {
                cursor.hide()
                console.log(e)

                const {msg, status} = e

                // InvalidKeyException RSA Key 만료
                if (status === 504) {
                    location.reload();
                }

                // 비밀번호 틀린 횟수 N회 이상인 경우
                if (msg.includes('passcntover')) {
                    func.loginFail.passcntover(msg)
                }
                // 계정 만료일자가 지난 경우
                else if (msg.includes('overuptdt')) {
                    func.loginFail.overuptdt(msg)
                }
                // 그 외 일반 에러일 경우
                else {
                    toast(trl(msg))
                }
            })
        },
        valid() {
            const $userId = $('#userId')
            const $userPw = $('#userPw')

            const userId = $userId.val()
            let userPw = $userPw.val()
            if (!userId) {
                const msg = trl('common.msg.empty.id')
                func.setErrorMsg('userId', msg)
                util.emptyInput($userId)
                return
            }
            if (!userPw) {
                const msg = trl('common.msg.empty.password')
                func.setErrorMsg('userPw', msg)
                util.emptyInput($userPw)
                return
            }

            return {userId, userPw}
        },
        loginFail: {
            passcntover(msg) {
                const count = msg.split('passcntover.')
                const value = count[1]

                // '비밀번호 실패'
                const passcntOverMsg = trl('alert.passcntover')
                const exceedMsg = trl('alert.exceed')

                toast(passcntOverMsg + ' ' + value + exceedMsg)
            },
            overuptdt(msg) {
                // msg 형식 = alert.invalid.overuptdt.90
                // 숫자 앞 부분만 가져옴 , alert.invalid.overuptdt
                const result = msg.substring(0, msg.lastIndexOf('.'))

                const day = msg.split('.').pop()

                // '비밀번호 변경 후'
                const passwordChange = trl(result)

                // ' 일이 경과했습니다. 비밀번호를 변경해주십시오'
                const nDayOver = trl('alert.nday.over')
                toast(passwordChange + day + nDayOver)

                const title = passwordChange + day + nDayOver;

                // 비밀번호 초기화 팝업 열기
                LN01P2.func.openPopup(title)
            }
        },
        otp: {
            process(data) {
                const {msg} = data
                const {status} = msg

                if (status && status === 'NEED_REGISTER') {
                    const {url} = data
                    // otp 등록이 안되어있는 경우 qr 코드 생성
                    func.otp.getQr(url)
                } else if (status && status === 'NEED_VERIFY') {
                    // otp 등록이 되어있고, 인증이 필요한 경우 otp 입력창 열기
                    func.otp.showOtp(data)
                } else {
                    toast(trl(status))
                }
            },
            // 구글 otp 앱에서 qr 코드 인식하고 등록 완료
            register() {
                ajaxCall('/ln/otp/register.maxy', {}).then(data => {
                    func.otp.showOtp(data)
                }).catch((e) => {
                    toast(trl(e.msg))
                })
            },
            // qr코드 url 받아옴
            getQr() {
                ajaxCall('/ln/otp/register-url.maxy', {}).then(data => {
                    func.otp.showQr(data.url)
                }).catch((e) => {
                    toast(trl(e.msg))
                })
            },
            registerUrl() {
                ajaxCall('/ln/otp/register-url.maxy', {}).then(data => {
                    func.otp.showQr(data.url)
                }).catch((e) => {
                    toast(trl(e.msg))
                })
            },
            // 등록 modal 열기 (qr 코드)
            showQr(otpUrl) {
                $('.otp_reg').show()

                if (otpUrl) {
                    // QR 코드 생성
                    QRCode.toDataURL(otpUrl, {width: 200}, function (err, url) {
                        if (err) {
                            console.error('QR 코드 생성 실패:', err);
                            return;
                        }

                        const img = document.createElement('img');
                        img.src = url;

                        const $qrWrap = $('.otp_reg_box');
                        $qrWrap.empty();
                        $qrWrap.append(img);
                    });
                }
            },
            // otp 입력 modal 열기
            showOtp(data) {
                const {msg} = data

                let issuedTime
                if (msg) {
                    const {issuedAt} = msg
                    issuedTime = issuedAt
                } else {
                    issuedTime = data.issuedAt
                }

                $('.otp_input').show()

                const $issuedAt = $('#issuedAt')

                // 타이머 함수 정의
                const startCountdown = () => {
                    // issuedAt 시간 (밀리초)
                    const issuedAtTime = parseInt(issuedTime)

                    // 종료 시간 = issuedAt + 3분 (180000 밀리초)
                    const endTime = issuedAtTime + 180000;

                    // 이미 존재하는 타이머가 있다면 제거
                    if (v.countdownTimer) {
                        clearInterval(v.countdownTimer);
                        v.countdownTimer = null
                    }

                    // 타이머 함수 - 남은 시간을 계산하고 표시하는 함수
                    const updateTimer = () => {
                        // 현재 시간 업데이트
                        const currentTime = new Date().getTime();

                        // 남은 시간 계산 (밀리초)
                        const remainingTime = endTime - currentTime;

                        // 남은 시간이 0 이하면 타이머 종료
                        if (remainingTime < 0) {
                            clearInterval(v.countdownTimer);
                            v.countdownTimer = null
                            $issuedAt.text('인증 시간이 만료되었습니다.');
                            return;
                        }

                        // 남은 시간을 분:초 형식으로 변환
                        const minutes = Math.floor(remainingTime / 60000);
                        const seconds = Math.floor((remainingTime % 60000) / 1000);

                        $issuedAt.text(minutes + ':' + util.padding(seconds));
                    };

                    // 처음에 타이머 함수 실행 (지연 없이 바로 계산)
                    updateTimer();

                    // 1초마다 업데이트하는 타이머 설정
                    v.countdownTimer = setInterval(updateTimer, 1000);
                };

                // 타이머 시작
                startCountdown()

                // OTP 입력 모달이 닫힐 때 타이머 정리
                $('#btnCancelOtp').on('click', () => {
                    $('.otp_input').hide()
                    // OTP 입력 필드 초기화
                    func.otp.resetInput()
                })
            },
            showStoreQR(storeType, qrImagePath) {
                $('.qr_code_wrap').css('display', 'flex');
                $('#storeType').text(storeType);
                $('#storeQr').attr('src', qrImagePath);
            },
            confirm() {
                const otpCode1 = $('#otp1').val()
                const otpCode2 = $('#otp2').val()
                const otpCode3 = $('#otp3').val()
                const otpCode4 = $('#otp4').val()
                const otpCode5 = $('#otp5').val()
                const otpCode6 = $('#otp6').val()

                const otpCode = otpCode1 + otpCode2 + otpCode3 + otpCode4 + otpCode5 + otpCode6

                if (!otpCode) {
                    toast(trl('common.msg.empty.otp'))
                    return
                }

                ajaxCall('/ln/otp/verify.maxy', {otpCode}).then(() => {
                    location.replace('/main.maxy');
                }).catch((e) => {
                    console.log(e)
                    func.otp.fail(e.msg)
                })
            },
            fail(data) {
                if (data.msg === 'alert.otp.invalid') {
                    toast(trl(data.msg))
                    $('.otp_fail_box').css('visibility', 'visible')
                    $('#otpFailCnt').text('(' + data.attempts + '/' + data.maxAttempts + ')')
                } else if (data === 'alert.otp.exceeded.max.attempts'
                    || data === 'alert.otp.expired.issued.time') {
                    toast(trl(data))
                } else if (data.msg) {
                    toast(trl(data.msg))
                } else if (data) {
                    toast(trl(data))
                }
            },
            // otp input 화면 초기화하기
            resetInput() {
                // OTP 입력 필드 초기화
                $('#otp1').val('');
                $('#otp2').val('');
                $('#otp3').val('');
                $('#otp4').val('');
                $('#otp5').val('');
                $('#otp6').val('');

                // 실패 메시지 박스 숨기기
                $('.otp_fail_box').css('visibility', 'hidden');

                // 타이머 정리
                if (v.countdownTimer) {
                    clearInterval(v.countdownTimer);
                    v.countdownTimer = null
                }

                // 남은시간 초기화
                $('#issuedAt').text('')
                // input 화면 숨기기
                //$('.otp_input').hide()
            }
        }
    }

    init.init()
    init.event()
    init.created()
</script>
</html>
