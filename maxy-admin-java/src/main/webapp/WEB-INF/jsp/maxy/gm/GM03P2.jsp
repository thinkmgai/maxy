<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%-- 관리 > Alias Management > 페이지 등록 팝업 --%>
<div class="popup_common" id="pageInsertPopup">
    <h4 data-t="management.alias.text.aliasReg"></h4>
    <ul class="popup_input_wrap">
        <li>
            <label for="requestedURL_i">Requested URL</label>
            <input id="requestedURL_i" type="text">
        </li>
        <li>
            <label for="pageNm_i" data-t="management.alias.text.aliasName"></label>
            <input id="pageNm_i" type="text">
            <span></span>
            <span class="err_txt" id="pageNmErrTxt_i"></span>
        </li>
        <li>
            <label for="pageDescription_i" data-t="management.alias.text.aliasDesc"></label>
            <input id="pageDescription_i" type="text">
        </li>
        <li>
            <label>Favorites</label>
            <div class="reg_role_option_wrap">
                <input type="radio" name="monitoringYn_i" id="monitoringY_i" value="Y" checked>
                <label for="monitoringY_i" id="monitoringYnLabel1_i" data-t="management.alias.text.use"></label>
                <input type="radio" name="monitoringYn_i" id="monitoringN_i" value="N">
                <label for="monitoringN_i" id="monitoringYnLabel2_i" data-t="management.alias.text.noUse"></label>
            </div>
        </li>
    </ul>

    <div class="popup_footer">
        <%--        <button class="btn_common" id="pageBtnCancel_i">취소</button>--%>
        <button class="btn_common opposite" id="pageBtnSave_i" data-t="common.btn.save"></button>
    </div>
    <input type="hidden" id="pageSeq" value=""/>
</div>
<script>
    var GM03P2 = {
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
                $('#pageNm_i').val('');
                $('#pageDescription_i').val('');
                $('#requestedURL_i').val('');
                $('#pageSeq_i').val('');

                $("#pageInsertPopup").hide();
                $(".dimmed").hide();
                GM03P2.func.resetErrorMsg()
            }
        }
    }
</script>