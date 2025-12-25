<%--suppress CssUnusedSymbol, suppress RequiredAttributes, suppress ES6ConvertVarToLetConst --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<style>
    #modelPopup {
        display: none
    }

    .popup_header {
        display: flex;
        gap: 1em;
        margin-bottom: 1em;
    }

    .popup_header h4 {
        margin: 0;
    }
</style>

<!-- 관리 > 장치 > 디바이스모델 등록 팝업 -->
<div class="popup_common" id="modelPopup">
    <div class="popup_header">
        <img src="<c:url value="/images/maxy/icon-monitor.svg"/>" alt="">
        <h4 data-t="management.model.popup.title"></h4>
    </div>

    <div class="popup_content">
        <ul class="popup_input_wrap">
            <li>
                <label for="deviceModel">Model Code</label>
                <input type="text" id="deviceModel"/>
            </li>
            <li>
                <label for="nameKo">Model Name (kr)</label>
                <input type="text" id="nameKo"/>
            </li>
            <li>
                <label for="nameEn">Model Name (en)</label>
                <input type="text" id="nameEn"/>
            </li>
            <li>
                <label for="description">Description</label>
                <input type="text" id="description"/>
            </li>
        </ul>
    </div>
    <div class="popup_footer">
        <button class="btn_common opposite" id="btnModelSave" data-t="common.btn.save"></button>
    </div>
</div>

<script>
    var DM04P1 = {
        v: {},

        init: {
            event() {
                const {func} = DM04P1
                $('.dimmed').on('click', func.close)
                $('#btnModelSave').on('click', func.save)
            }
        },

        func: {
            open(data) {
                const {func} = DM04P1
                if (data) {
                    func.setData(data)
                }
                $('.dimmed').show()
                $('#modelPopup').show()
            },
            close() {
                const $modelPopup = $('#modelPopup')
                $modelPopup.hide()
                $('.dimmed').hide()
                $('#modelPopup input[type="text"]').val('')
                $modelPopup.data('seq', '')
            },
            setData(data) {
                const {deviceModel, nameKo, nameEn, description, seq} = data
                $('#modelPopup').data('seq', seq)
                $('#deviceModel').val(deviceModel)
                $('#nameKo').val(nameKo)
                $('#nameEn').val(nameEn)
                $('#description').val(description)
            },
            save() {
                const {func} = DM0400
                const seq = $('#modelPopup').data('seq')
                // 값 검증
                const param = DM04P1.func.valid()
                if (param) {
                    if (seq > 0) {
                        param.seq = seq
                        func.modify(param)
                    } else {
                        func.save(param)
                    }
                }
            },
            valid() {
                const $inputArray = [
                    $('#deviceModel'),
                    $('#nameKo'),
                    $('#nameEn'),
                    $('#description')
                ]

                const msg = i18next.tns('management.obfuscation.msg.paramempty')
                for (let el of $inputArray) {
                    // value 가 비어있는 경우
                    if (!el.val() || el.val().trim() === '') {
                        util.emptyInput(el)
                        toast(msg)
                        return false
                    }
                }

                return {
                    deviceModel: $inputArray[0].val(),
                    nameKo: $inputArray[1].val(),
                    nameEn: $inputArray[2].val(),
                    description: $inputArray[3].val()
                }
            }
        }
    }

    DM04P1.init.event()
</script>