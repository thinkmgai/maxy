<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%-- 관리 > Alias Management > 페이지 수정 팝업 --%>
<div class="popup_common" id="pageUpdatePopup">
    <h4>
        <span id="pageTitle"></span>
    </h4>
    <ul class="popup_input_wrap">
        <li>
            <label for="resourceType">Resource Type</label>
            <input id="resourceType" type="text" readonly>
            <span></span>
        </li>
        <li>
            <label for="reqUrl">Requested Url</label>
            <input id="reqUrl" type="text" readonly>
            <span></span>
        </li>
        <li>
            <label for="pageNm"></label>
            <input id="pageNm" type="text">
            <span></span>
            <span class="err_txt" id="pageNmErrTxt"></span>
        </li>
        <li>
            <label for="pageDescription"></label>
            <input id="pageDescription" type="text">
        </li>
        <li id="favorites">
            <label>Favorites</label>
            <div class="reg_role_option_wrap">
                <input type="radio" name="monitoringYn" id="monitoringY" value="Y"><label for="monitoringY"
                                                                                          id="monitoringYnLabel1" data-t="management.alias.text.use"></label>
                <input type="radio" name="monitoringYn" id="monitoringN" value="N"><label for="monitoringN"
                                                                                          id="monitoringYnLabel2" data-t="management.alias.text.noUse"></label>
            </div>
        </li>
    </ul>

    <div class="popup_footer">
        <button class="btn_common opposite" id="pageBtnSave" data-t="common.btn.save"></button>
    </div>
    <input type="hidden" id="pageSeq" value=""/>
</div>
<script>
    var GM03P1 = {
        init: {
            created() {
                updateContent()
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
            resetErrorMsg() {
                const errTxt = $('.err_txt')
                errTxt.text('')
                errTxt.hide()
            },
            cancelPopup() {
                $('#pageNm').val('');
                $('#pageDescription').val('');
                $('#pageSeq').val('');

                $("#pageUpdatePopup").hide();
                $(".dimmed").hide();
                GM03P1.func.resetErrorMsg()
            }
        }
    }

    GM03P1.init.created()
</script>