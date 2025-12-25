<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    .popup_common.popup_batch {
        width: 500px;
    }
    .popup_common .popup_input_wrap li {
        grid-template-columns: 20% 80%;
    }

    .popup_batch .popup_footer {
        display: flex;
        justify-content: space-between;
    }

    .popup_batch .popup_footer .btn_wrapper {
        display: flex;
        gap: 1em;
    }

    .popup_batch .popup_footer .btn_wrapper .btn_delete {
        background-color: #cb0505;
        border: 0;
    }

    .popup_batch .desc_area {
    }

    .popup_batch .flex_space_between {
        display: flex;
        justify-content: space-between;
    }

    .popup_batch .popup_input_wrap li .cycle_desc {
        position: absolute;
        right: 36px;
    }

    .popup_batch .param_list_wrap {
        align-items: start;
        margin-bottom: 1.5em !important;
        background-color: #F7F8FA;
        padding: 1em 25px;
        margin-right: -25px;
        margin-left: -25px;
    }

    .popup_batch .param_list_wrap .param_list {
        max-height: 260px;
        overflow-y: scroll;
    }

    .popup_batch .param_list_wrap .param_list li {
        display: flex;
        gap: .5em;
    }

    .popup_batch .param_list_wrap .btn_plus_param {
        justify-content: center;
        display: flex;
        background-color: #E0E8F0;
        padding-top: .5em;
        padding-bottom: .5em;
        margin: 0;
        cursor: pointer;
    }
</style>
<%-- 시스템관리 > 배치 조회 > 배치 수정 팝업 --%>
<div class="popup_common popup_batch" id="batchUpdatePopup" data-id="">
    <div class="flex_space_between">
        <h4 data-t="system.batch.modify"></h4>

        <div class="config_contents_wrap">
            <div class="config_input_wrap toggle_wrap">
                <input type="checkbox"
                       class="toggle"
                       id="updBatchYn"
                       name="updBatchYn"
                       value="N"
                       checked=""
                >
                <label for="updBatchYn"></label>
            </div>
        </div>
    </div>
    <ul class="popup_input_wrap">
        <li>
            <label for="upd__jobName">Job Class</label>
            <input id="upd__jobName" type="text" readonly>
        </li>
        <li>
            <label for="upd__jobNameDesc">Batch Name</label>
            <input id="upd__jobNameDesc" type="text">
        </li>
        <li>
            <label for="upd__description">Description</label>
            <textarea class="desc_area" id="upd__description"></textarea>
        </li>
        <li>
            <label for="upd__cycle">Cycle</label>
            <input id="upd__cycle" type="text">
            <span class="cycle_desc" id="cycleDescTxt"></span>
        </li>
        <li class="param_list_wrap">
            <label id="upd_parameterList" for="updBatchOption1">Parameter</label>
            <ul id="upd__parameterList" class="param_list enable_scrollbar"></ul>
        </li>
    </ul>

    <div class="popup_footer">
        <div class="btn_wrapper">
            <button class="btn_common opposite btn_delete" id="btnBatchDelete" data-t="common.btn.delete"></button>
        </div>
        <div class="btn_wrapper">
            <button class="btn_common" id="batchBtnUpdateCancel" data-t="common.btn.cancel"></button>
            <button class="btn_common opposite" id="batchBtnUpdate" data-t="common.btn.save"></button>
        </div>
    </div>
</div>
<script>
    var SM0301 = {
        func: {
            cancelPopup() {
                const $popup = $('#batchUpdatePopup')
                $popup.data('id', '')
                $('#batchUpdatePopup .popup_input_wrap input[type="text"]').val('')
                $('#batchUpdatePopup .popup_input_wrap span').text('')
                $popup.hide()
                $('.popup_dimmed').hide()
            }
        }
    }
</script>