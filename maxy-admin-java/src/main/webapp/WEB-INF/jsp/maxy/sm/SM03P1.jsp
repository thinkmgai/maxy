<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%-- 시스템 관리 > 배치관리 > 배치 등록 --%>
<div class="popup_common popup_batch" id="batchInsertPopup">
    <h4 data-t="system.batch.reg"></h4>
    <ul class="popup_input_wrap">
        <li>
            <label for="batchName" data-t="system.batch.name"></label>
            <input id="batchName" type="text">
            <span></span>
            <span class="err_txt" id="batchNameErrTxt"></span>
        </li>
        <li>
            <label for="batchDesc" data-t="system.batch.description"></label>
            <input id="batchDesc" type="text">
        </li>
        <li>
            <label for="batchInterval" data-t="system.batch.cycle"></label>
            <input id="batchInterval" type="text">
        </li>
        <li>
            <label for="batchOption1" data-t="system.batch.option1"></label>
            <input id="batchOption1" type="text">
        </li>
        <li>
            <label for="batchOption2" data-t="system.batch.option2"></label>
            <input id="batchOption2" type="text">
        </li>
        <li>
            <label for="batchOption3" data-t="system.batch.option3"></label>
            <input id="batchOption3" type="text">
        </li>
        <li>
            <label for="batchOption3" data-t="system.batch.option4"></label>
            <input id="batchOption4" type="text">
        </li>
        <li>
            <label for="batchJarFile" data-t="system.batch.file"></label>
            <input id="batchJarFile" type="text">
        </li>
        <li>
            <label for="batchMainClass" data-t="system.batch.class"></label>
            <input id="batchMainClass" type="text">
        </li>
        <li>
            <label for="batchLogFile" data-t="system.batch.logfile"></label>
            <input id="batchLogFile" type="text">
        </li>
        <li>
            <label for="batchKillFile" data-t="system.batch.path"></label>
            <input id="batchKillFile" type="text">
        </li>
    </ul>
    <div class="popup_footer">
        <div></div>
        <button class="btn_common opposite" id="batchBtnSave" data-t="common.btn.save"></button>
    </div>
</div>

<script>
    var SM03P1 = {
        init: {
            event() {

            }
        },

        func: {
            cancelPopup() {
                $('#batchName').val('')
                $('#batchDesc').val('')
                $('#batchInterval').val('')
                $('#batchOption1').val('')
                $('#batchOption2').val('')
                $('#batchOption3').val('')
                $('#batchOption4').val('')
                $('#batchJarFile').val('')
                $('#batchMainClass').val('')
                $('#batchLogFile').val('')
                $('#batchKillFile').val('')

                SM03P1.func.resetErrorMsg()
                $('#batchInsertPopup').hide()
                $('.popup_dimmed').hide()
            },
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
            valid() {
                const $batchName = $('#batchName')
                const batchName = $batchName.val()
                const batchDesc = $('#batchDesc').val()
                const batchInterval = $('#batchInterval').val()
                const batchOption1 = $('#batchOption1').val()

                const batchOption2 = $('#batchOption2').val()
                const batchOption3 = $('#batchOption3').val()
                const batchOption4 = $('#batchOption4').val()

                const batchJarFile = $('#batchJarFile').val()
                const batchMainClass = $('#batchMainClass').val()
                const batchLogFile = $('#batchLogFile').val()
                const batchKillFile = $('#batchKillFile').val()

                if (util.isEmpty(batchName)) {
                    const msg = trl('system.batch.msg.name')
                    SM03P1.func.setErrorMsg('batchName', msg)
                    util.emptyInput($batchName)
                    return false
                }

                return {
                    'batchName': batchName,
                    'batchDesc': batchDesc,
                    'batchInterval': batchInterval,
                    'batchOption1': batchOption1,
                    'batchOption2': batchOption2,
                    'batchOption3': batchOption3,
                    'batchOption4': batchOption4,
                    'regId': '${loginUser.userId}',
                    'batchJarFile': batchJarFile,
                    'batchMainClass': batchMainClass,
                    'batchLogFile': batchLogFile,
                    'batchKillFile': batchKillFile
                }
            }
        }
    }
</script>