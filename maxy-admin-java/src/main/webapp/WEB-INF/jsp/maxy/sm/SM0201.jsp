<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .popup_common.popup_batch {
        width: 500px;
    }
    .popup_common .popup_input_wrap li {
        grid-template-columns: 20% 80%;
    }

    .popup_batch .flex_space_between {
        display: flex;
        justify-content: space-between;
    }
</style>
<%-- 시스템관리 > Access 로그 > 상세 팝업 --%>
<div class="popup_common popup_batch" id="accessLogPopup" data-id="">
    <div class="flex_space_between">
        <h4 data-t="system.audit.title"></h4>
    </div>
    <ul class="popup_input_wrap">
        <li>
            <label for="access_time">Time</label>
            <input id="access_time" type="text" readonly>
        </li>
        <li>
            <label for="access_duration">Duration</label>
            <input id="access_duration" type="text" readonly>
        </li>
        <li>
            <label for="access_userId">User ID</label>
            <input id="access_userId" type="text" readonly>
        </li>
        <li>
            <label for="access_sessionId">Session ID</label>
            <input id="access_sessionId" type="text" readonly>
        </li>
        <li>
            <label for="access_ip">IP</label>
            <input id="access_ip" type="text" readonly>
        </li>
        <li>
            <label for="access_type">Type</label>
            <input id="access_type" type="text" readonly>
        </li>
        <li>
            <label for="access_method">Method</label>
            <input id="access_method" type="text" readonly>
        </li>
        <li>
            <label for="access_url">URL</label>
            <input id="access_url" type="text" readonly>
        </li>
        <li>
            <label for="access_param">Parameter</label>
            <input id="access_param" type="text" readonly>
        </li>
        <li>
            <label for="access_msg">Message</label>
            <input id="access_msg" type="text" readonly>
        </li>
    </ul>
</div>
<script>
    var SM0201 = {
        func: {
            cancelPopup() {
                const $popup = $('#accessLogPopup')
                $popup.data('id', '')
                $('#accessLogPopup .popup_input_wrap input[type="text"]').val('')
                $popup.hide()
                $('.popup_dimmed').hide()
            }
        }
    }
</script>