<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .popup_common#find_pw_popup {
        width: 350px;
        border: 0;
        transition: all 0.3s;
        border-radius: var(--radius);
        padding: 2em 3em;
        transform: translate(-50%, -45%);
    }

    .popup_common#find_pw_popup h4 {
        color: var(--black-2);
        font-size: 13px;
        margin: 0.8em 0 0.8em 0;
    }

    .popup_common#find_pw_popup input {
        width: 100%;
        margin-bottom: 1.25em;
        height: 40px;
        border-radius: 5px;
        border: 1px solid #E3E5E8 !important;
        padding: 0.8em;
        outline: none;
    }

    .popup_common#find_pw_popup input:nth-of-type(2) {
        margin-bottom: 1em;
    }

    .popup_common#find_pw_popup input:focus {
        border: 1px solid var(--logo-purple-2) !important;
        outline: none;
    }

    .popup_common#find_pw_popup .popup_msg {
        color: #999999;
    }

    .popup_common#find_pw_popup .popup_footer {
        margin-top: 14px;
    }

    .popup_common#find_pw_popup .login_footer > button {
        border-radius: 5px;
        width: 100%;
    }

    .popup_common#find_pw_popup input::placeholder {
        color: #959595;
    }
</style>
<!-- 로그인 > 비밀번호 찾기 -->
<div class="popup_common" id="find_pw_popup">
    <h4>비밀번호 찾기</h4>
    <label for="userIdFind"></label>
    <label for="userEmailFind"></label>
    <input id="userIdFind" type="text" placeholder="ID">
    <input id="userEmailFind" type="text" placeholder="Email">
    <div class="popup_msg">
        입력하신 이메일로 임시 비밀번호가 발송됩니다.
    </div>
    <div class="popup_footer login_footer">
        <button class="btn_common opposite" id="btnFindPw">Send</button>
    </div>
</div>
<script>
    const LN01P1 = {
        init: {
            event() {
                const {func} = LN01P1
                $('#btnFindPw').on('click', func.doFindPw)
                $('.dimmed').on('click', func.closePopup)
                $('#find_pw_popup input[type="text"]').on('keyup', (key) => {
                    if (key.keyCode === 13) {
                        func.doFindPw()
                    }
                })
            }
        },
        func: {
            closePopup() {
                const {func} = LN01P1
                func.resetInput()
                $('#find_pw_popup').hide()
                $('.dimmed').hide()
            },
            resetInput() {
                $('#userIdFind').val('')
                $('#userEmailFind').val('')
            },
            doFindPw() {
                const {func} = LN01P1
                const userInfo = func.valid()

                if (userInfo) {
                    ajaxCall('/ln/resetPw.maxy', userInfo)
                        .then(() => {
                            func.resetInput()
                            $('#find_pw_popup').hide()
                            $('.dimmed').hide()

                            toast(trl('common.msg.mail.send'))
                        })
                        .catch(error => {
                            toast(trl(error.msg))
                        })
                }
            },
            valid() {
                const $userId = $('#userIdFind')
                const $email = $('#userEmailFind')
                const userId = $userId.val()
                const email = $email.val()

                if (!userId) {
                    toast(trl('alert.empty.id'))
                    util.emptyInput($userId)
                    return
                }
                if (!email) {
                    toast(trl('alert.type.email'))
                    util.emptyInput($email)
                    return
                }
                return {userId, email}
            }
        }
    }

    LN01P1.init.event()
</script>