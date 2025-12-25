<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .popup_common#reset_pw_popup {
        width: 360px;
    }

    .reset_pw_input_wrap {
        display: flex;
        flex-direction: column;
        gap: .3em;
    }

    .reset_pw_input_wrap > li {
        display: grid;
        align-items: center;
        grid-template-columns: 35% 65%;
        margin-bottom: 0 !important;
    }

    .pw_input_box {
        position: relative;
        display: flex;
        align-items: center;
    }

    .pw_input_box input {
        width: 100%;
        padding-right: 40px;
    }

    .pw_toggle_btn {
        position: absolute;
        right: 8px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
    }

    .pw_toggle_btn:focus,
    .pw_toggle_btn:active {
        transform: none;
    }

    .pw_toggle_btn:active img {
        transform: none;
    }

    .pw_toggle_btn img {
        width: 18px;
        height: 18px;
    }

    #reset_pw_popup .title_wrap {
        color: var(--color-block-light-text-2);
        line-height: normal;
        white-space: pre-line;
        border-radius: 5px;
        margin-bottom: 16px;
        padding: .8em;
        background-color: var(--color-block-light-2);
        display: flex;
        align-items: flex-start;
        flex-direction: column;
    }

    #reset_pw_popup .title_wrap > div {
        display: flex;
        align-items: flex-start;
    }

    #reset_pw_popup .title_wrap .pwd_alert {
        margin-top: .5em;
        margin-left: 1.7em;
        font-size: 11px;
        color: var(--red-0);
    }
</style>
<!-- 로그인 > 비밀번호 변경 -->
<div class="popup_common" id="reset_pw_popup">
    <h4>비밀번호 변경</h4>
    <div>
        <div class="title_wrap">

            <div class="">
                <span class="mk_error"></span>
                <span id="title"></span>

            </div>
            <div class="pwd_alert">※ 비밀번호를 변경하지 않으면 사용이 제한될 수 있습니다.</div>
        </div>
    </div>
    <input type="hidden" name="RSAModulus" id="RSAModulus" value="${RSAModulus}"/>
    <input type="hidden" name="RSAExponent" id="RSAExponent" value="${RSAExponent}"/>
    <ul class="reset_pw_input_wrap">
        <li>
            <label for="userPwCur">현재 비밀번호</label>
            <div class="pw_input_box">
                <input id="userPwCur" type="password" placeholder="현재 비밀번호">
                <button type="button"
                        class="pw_toggle_btn"
                        data-target="#userPwCur"
                        data-icon-view="<c:url value='/images/maxy/icon-pwd-view.svg'/>"
                        data-icon-close="<c:url value='/images/maxy/icon-pwd-close.svg'/>"
                        aria-pressed="false"
                        aria-label="비밀번호 보기">
                    <img src="<c:url value='/images/maxy/icon-pwd-view.svg'/>" alt="" aria-hidden="true">
                </button>
            </div>
        </li>
        <li class="margin_0 err_txt_wrap">
            <span></span>
            <span class="err_txt" id="userPwCurErrTxt"></span></li>
        <li>
        <li>
            <label for="userPwNew">새 비밀번호</label>
            <div class="pw_input_box">
                <input id="userPwNew" type="password" placeholder="새 비밀번호">
                <button type="button"
                        class="pw_toggle_btn"
                        data-target="#userPwNew"
                        data-icon-view="<c:url value='/images/maxy/icon-pwd-view.svg'/>"
                        data-icon-close="<c:url value='/images/maxy/icon-pwd-close.svg'/>"
                        aria-pressed="false"
                        aria-label="비밀번호 보기">
                    <img src="<c:url value='/images/maxy/icon-pwd-view.svg'/>" alt="" aria-hidden="true">
                </button>
            </div>
        </li>
        <li class="margin_0 err_txt_wrap">
            <span></span>
            <span class="err_txt" id="userPwNewErrTxt"></span></li>
        <li>
        <li>
            <label for="userPwNewRe">새 비밀번호 확인</label>
            <div class="pw_input_box">
                <input id="userPwNewRe" type="password" placeholder="새 비밀번호 확인">
                <button type="button"
                        class="pw_toggle_btn"
                        data-target="#userPwNewRe"
                        data-icon-view="<c:url value='/images/maxy/icon-pwd-view.svg'/>"
                        data-icon-close="<c:url value='/images/maxy/icon-pwd-close.svg'/>"
                        aria-pressed="false"
                        aria-label="비밀번호 보기">
                    <img src="<c:url value='/images/maxy/icon-pwd-view.svg'/>" alt="" aria-hidden="true">
                </button>
            </div>
        </li>
        <li class="margin_0 err_txt_wrap">
            <span></span>
            <span class="err_txt" id="userPwNewReErrTxt"></span></li>
        <li>
    </ul>

    <div class="popup_footer login_footer">
        <button class="btn_common" id="btnClose">닫기</button>
        <button class="btn_common opposite" id="btnResetPw">변경</button>
    </div>
</div>
<script>
    const LN01P2 = {
        v: {
            isChangePw: false
        },
        init: {
            event() {
                const {func} = LN01P2

                $('#btnResetPw').on('click', func.renewPw)
                $('.dimmed, #btnClose').on('click', func.closePopup)
                $('.pw_toggle_btn').on('click', func.togglePwVisibility)
                $('#find_pw_popup input[type="text"]').on('keyup', (key) => {
                    if (key.keyCode === 13) {
                        func.renewPw()
                    }
                })
            }
        },
        func: {
            openPopup(title) {
                const {v, func} = LN01P2

                $('#reset_pw_popup').show()
                $('.dimmed').show()

                if (title) {
                    $('#title').text(title)
                }

                v.isChangePw = true
                func.getRSAKey()
            },
            closePopup() {
                const {v, func} = LN01P2

                v.isChangePw = false
                func.resetInput()
                $('#reset_pw_popup').hide()
                $('.dimmed').hide()
            },
            togglePwVisibility(e) {
                const $btn = $(e.currentTarget)
                const targetSelector = $btn.data('target')
                const $input = $(targetSelector)
                const viewIcon = $btn.data('iconView')
                const closeIcon = $btn.data('iconClose')
                const $icon = $btn.find('img')

                if ($input.length === 0) {
                    return
                }

                const isVisible = $input.attr('type') === 'text'
                const nextType = isVisible ? 'password' : 'text'
                const nextIcon = isVisible ? viewIcon : closeIcon
                const nextLabel = isVisible ? '비밀번호 보기' : '비밀번호 숨기기'

                $input.attr('type', nextType)
                if ($icon.length) {
                    $icon.attr('src', nextIcon)
                }
                $btn.toggleClass('is_active', !isVisible)
                $btn.attr('aria-pressed', (!isVisible).toString())
                $btn.attr('aria-label', nextLabel)
            },
            setErrorMsg(type, error) {
                const errTxt = $('.err_txt')
                errTxt.text('')
                errTxt.hide()

                const targetErrTxt = $('#' + type + 'ErrTxt')
                const htmlStr = error.replace(/\n/g, '<br>') // \n → <br> 변환

                targetErrTxt.html(htmlStr)  // html()로 넣기
                targetErrTxt.show()
            },
            resetInput() {
                const {func} = LN01P2

                func.removeRSAKey()
                $('#userPwCur').val('')
                $('#userPwNew').val('')
                $('#userPwNewRe').val('')
                func.resetVisibility()
            },
            resetVisibility() {
                const mapping = ['#userPwCur', '#userPwNew', '#userPwNewRe']

                const $errTxt = $('.reset_pw_input_wrap .err_txt')
                $errTxt.text('')
                $errTxt.hide()

                mapping.forEach((selector) => {
                    const $input = $(selector)
                    const $btn = $('.pw_toggle_btn[data-target="' + selector + '"]')
                    const viewIcon = $btn.data('iconView')
                    const $icon = $btn.find('img')

                    $input.attr('type', 'password')
                    $btn.removeClass('is_active')
                    $btn.attr('aria-pressed', 'false')
                    $btn.attr('aria-label', '비밀번호 보기')
                    if ($icon.length) {
                        $icon.attr('src', viewIcon)
                    }
                })
            },
            renewPw() {
                const {func} = LN01P2
                const pwdInfo = func.valid()

                if (pwdInfo) {
                    ajaxCall('/ln/renewPw.maxy', pwdInfo)
                        .then(() => {
                            func.resetInput()
                            $('#reset_pw_popup').hide()
                            $('.dimmed').hide()

                            toast(trl('alert.success.changepw'))

                            setTimeout(() => {
                                location.replace('/ln/goLoginPage.maxy')
                            }, 1200)
                        })
                        .catch(error => {
                            let $target
                            let target

                            const msg = trl(error.msg)
                            if (error.msg === ('alert.invalid.pw')) {
                                $target = $('#userPwCur')
                                target = 'userPwCur'
                            } else if (error.msg.includes('.pw')
                                || error.msg.includes('invalid.currentpw')
                                || error.msg.includes('invalid.recentpw')) {
                                $target = $('#userPwNew')
                                target = 'userPwNew'
                            }

                            func.setErrorMsg(target, msg)
                            util.emptyInput($target)

                        })
                }
            },
            valid() {
                const {v, func} = LN01P2
                let params = {}

                if (v.isChangePw) {
                    const $userPw = $('#userPwCur')
                    const $userNewPw = $('#userPwNew')
                    const $userNewRePw = $('#userPwNewRe')

                    const userPw = $userPw.val()
                    const userNewPw = $userNewPw.val()
                    const userNewRePw = $userNewRePw.val()

                    if (util.isEmpty(userPw)) {
                        const msg = trl('common.msg.empty.password')
                        func.setErrorMsg('userPwCur', msg)

                        util.emptyInput($userPw)
                        return false
                    }
                    if (util.isEmpty(userNewPw)) {
                        const msg = trl('common.msg.new.password')
                        func.setErrorMsg('userPwNew', msg)

                        util.emptyInput($userNewPw)
                        return false
                    }
                    if (util.isEmpty(userNewRePw)) {
                        const msg = trl('common.msg.confirm.new.password')
                        func.setErrorMsg('userPwNewRe', msg)

                        util.emptyInput($userNewRePw)
                        return false
                    }
                    if (userNewPw !== userNewRePw) {
                        const msg = trl('common.msg.not.correct.curnew')
                        func.setErrorMsg('userPwNewRe', msg)

                        util.emptyInput($userNewRePw)
                        return false
                    }

                    const rsa = new RSAKey()
                    rsa.setPublic($('#RSAModulus').val(), $('#RSAExponent').val())
                    params.userPw = rsa.encrypt(userPw)
                    params.userNewPw = rsa.encrypt(userNewPw)
                }

                return params
            },
            getRSAKey() {
                ajaxCall('/cmm/initRSAKey.maxy', {})
                    .then((data) => {
                        const {RSAPub} = data
                        $('#RSAExponent').val(RSAPub.RSAExponent)
                        $('#RSAModulus').val(RSAPub.RSAModulus)
                    }).catch(() => {
                    toast("can not initialize RSA Key")
                })
            },
            removeRSAKey() {
                ajaxCall('/cmm/removeRSAKey.maxy', {})
                $('#RSAExponent').val('')
                $('#RSAModulus').val('')
            },
        }
    }

    LN01P2.init.event()
</script>
