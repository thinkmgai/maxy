<%@ page import="com.thinkm.maxy.vo.MaxyUser" %><%--suppress ELValidationInspection --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<jsp:include page="../common/rsaScript.jsp"/>

<%-- 메인 > 사용자 상세 팝업 --%>
<input type="hidden" name="RSAModulus" id="RSAModulus" value="${RSAModulus}"/>
<input type="hidden" name="RSAExponent" id="RSAExponent" value="${RSAExponent}"/>
<div class="popup_account" id="acct_popup">
    <div class="popup_header">
        <div class="account_info">
            <div class="user_name_wrap">
                <i class="icon_user"></i>
                <h4>${loginUser.userNm}</h4>
            </div>
            <div>
                <i class="icon_logout" id="headerBtnLogout"></i>
            </div>
        </div>
        <div class="user_id_wrap">
            <h5>${loginUser.userId}</h5>
        </div>
<%
    String isInitPw = ((MaxyUser)session.getAttribute("loginUser")).getIsInitPw();

    if("Y".equals(isInitPw)) {
%>
        <div id="changeInitPwMsg" style="margin-bottom: 10px;color: red;display: block;" data-t="common.msg.change.initial.password">

        </div>
<%
    }
    else {
%>
        <div id="changeInitPwMsg" style="margin-bottom: 10px;color: red;display: none;" data-t="common.msg.change.initial.password">
        </div>
<%
    }
%>
    </div>
    <ul class="gray_bg">
        <li class="margin_0">
            <label for="headerEmail" data-t="common.text.email"></label>
            <input id="headerEmail" type="email" value="${loginUser.emailAddr}">
        </li>
        <li class="margin_0 err_txt_wrap">
            <span></span>
            <span class="err_txt" id="emailErrTxt"></span>
        </li>
        <li>
            <label for="headerBtnShowPw" data-t="common.text.password"></label>
            <button id="headerBtnShowPw" class="btn_common opposite" data-t="common.text.changePassword"></button>
        </li>
    </ul>
    <ul class="chg_pw_wrap gray_bg" style="display: none">
        <li class="margin_0">
            <label for="headerUserPw" data-t="common.text.currentPassword"></label>
            <input id="headerUserPw" type="password">
        </li>
        <li class="margin_0 err_txt_wrap">
            <span></span>
            <span class="err_txt" id="userPwErrTxt"></span></li>
        <li>
            <label for="headerUserNewPw" data-t="common.text.newPassword"></label>
            <input id="headerUserNewPw" type="password">
        </li>
        <li class="margin_0 err_txt_wrap">
            <span></span>
            <span class="err_txt" id="userNewPwErrTxt"></span>
        </li>
        <li class="new_password_confirm">
            <label for="headerUserNewRePw" data-t="common.text.newPasswordConfirm"></label>
            <input id="headerUserNewRePw" type="password">
        </li>
        <li class="margin_0 err_txt_wrap">
            <span></span>
            <span class="err_txt" id="userNewRePwErrTxt"></span>
        </li>
    </ul>
    <ul>
        <li class="margin_0">
            <label>User Group</label>
            <div class="info_text" id="grpNm">${loginUser.grpNm}</div>
        </li>
        <li>
            <label>Authority</label>
            <div class="info_text" data-t="${loginUser.roleNm}"></div>
        </li>
        <li>
            <label>Login</label>
            <div class="info_text blur">${loginUser.loginDt}</div>
        </li>
    </ul>
    <div class="popup_footer">
        <button id="headerBtnSave" class="btn_common opposite">Save</button>
    </div>
</div>
<script>
    const ML01P1 = {
        v: {
            isChangePw: false
        },
        init: {
            event() {
                const {func} = ML01P1
                $('#headerBtnSave').on('click', func.save)
                $('#headerBtnLogout').on('click', func.logout)
                $('#headerBtnShowPw').on('click', func.togglePwInput)
            },
            created() {
                if (localStorage.getItem('lang') === 'en') {
                    $('.new_password_confirm > label').css('line-height', '16px')
                }

                i18next.changeLanguage(getLang()).then(() => {
                    tippy('#headerBtnLogout', {
                        content: trl('common.btn.logout'),
                        arrow: false,
                        placement: 'bottom',
                        allowHTML: true,
                        theme: 'maxy-tooltip',
                    })

                    if ("${loginUser.grpNm}" === 'no.group') {
                        $('#grpNm').text(trl('common.text.' + "${loginUser.grpNm}"))
                    }
                })
            }
        },
        func: {
            setErrorMsg(type, error) {
                const errTxt = $('.err_txt')
                errTxt.text('')
                errTxt.hide()
                const targetErrTxt = $('#' + type + 'ErrTxt')
                targetErrTxt.text(error)
                targetErrTxt.show()
            },
            getRSAKey() {
                ajaxCall('/cmm/initRSAKey.maxy', {})
                    .then((data) => {
                        const {RSAPub} = data
                        $('#RSAExponent').val(RSAPub.RSAExponent)
                        $('#RSAModulus').val(RSAPub.RSAModulus)
                        $('.chg_pw_wrap').slideDown(500)
                    }).catch(() => {
                    toast("can not initialize RSA Key")
                })
            },
            removeRSAKey() {
                ajaxCall('/cmm/removeRSAKey.maxy', {})
                $('#RSAExponent').val('')
                $('#RSAModulus').val('')
                $('.chg_pw_wrap').slideUp(500)
            },
            togglePwInput() {
                const {v, func} = ML01P1
                const $btn = $('#headerBtnShowPw')
                if (v.isChangePw) {
                    v.isChangePw = false
                    func.removeRSAKey()
                    $btn.removeClass('open')
                } else {
                    v.isChangePw = true
                    func.getRSAKey()
                    $btn.addClass('open')
                }
            },
            resetInput() {
                const {v} = ML01P1
                // reset
                $('#RSAExponent').val('')
                $('#RSAModulus').val('')

                $('#headerUserPw').val('')
                $('#headerUserNewPw').val('')
                $('#headerUserNewRePw').val('')

                v.isChangePw = false

                $('.err_txt').hide()
                $('.chg_pw_wrap').hide()
            },
            save() {
                const {func} = ML01P1
                const param = func.valid()
                if (param) {
                    ajaxCall('/um/modifyUserInfo.maxy', param)
                        .then((data) => {
                            // close password input
                            const msg = trl('common.msg.password.change')
                            toast(msg)
                            func.resetInput()
                            const $popup = $('#acct_popup')
                            const $dimmed = $('.account_dimmed')
                            $popup.hide()
                            $dimmed.hide()
                            $dimmed.off('click')

                            if (data.userInfo.isInitPw == 'Y') {
                                $('#changeInitPwMsg').show()
                            } else {
                                $('#changeInitPwMsg').hide()
                            }
                        })
                        .catch(error => {
                            if (error.status === 401) {
                                func.setErrorMsg('userPw', trl(error.msg))
                            } else {
                                console.log(error)
                                func.setErrorMsg('userNewPw', trl(error.msg))
                            }
                        })
                }
            },
            valid() {
                const {v, func} = ML01P1
                let params = {}

                const $email = $('#headerEmail')
                const email = $email.val()
                if (util.isEmpty(email) || !valid.email($email)) {
                    const msg = trl('common.msg.invalid.email')
                    func.setErrorMsg('email', msg)
                    return false
                }
                params.email = email

                if (v.isChangePw) {
                    const $userPw = $('#headerUserPw')
                    const $userNewPw = $('#headerUserNewPw')
                    const $userNewRePw = $('#headerUserNewRePw')

                    const userPw = $userPw.val()
                    const userNewPw = $userNewPw.val()
                    const userNewRePw = $userNewRePw.val()

                    if (util.isEmpty(userPw)) {
                        const msg = trl('common.msg.empty.password')
                        func.setErrorMsg('userPw', msg)
                        util.emptyInput($userPw)
                        return false
                    }
                    if (util.isEmpty(userNewPw)) {
                        const msg = trl('common.msg.new.password')
                        func.setErrorMsg('userNewPw', msg)
                        util.emptyInput($userNewPw)
                        return false
                    }
                    if (util.isEmpty(userNewRePw)) {
                        const msg = trl('common.msg.confirm.new.password')
                        func.setErrorMsg('userNewRePw', msg)
                        util.emptyInput($userNewRePw)
                        return false
                    }
                    if (userNewPw !== userNewRePw) {
                        const msg = trl('common.msg.not.correct.password')
                        func.setErrorMsg('userNewRePw', msg)
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
            logout() {
                sessionStorage.clear()
                location.href = '<c:url value="/ln/doLogout.maxy"/>'
            }
        }
    }
    ML01P1.init.event()
    ML01P1.init.created()
</script>
