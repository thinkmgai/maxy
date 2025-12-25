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

<!-- MAXY FRONT 관리 > 설정 > Session Replay 차단 등록/수정 팝업 -->
<div class="popup_common" id="modelPopup">
    <div class="popup_header">
        <h4>Blocked Element</h4>
    </div>

    <div class="popup_content">
        <ul class="popup_input_wrap">
            <li>
                <label for="selectorType">Selector Type</label>
                <select id="selectorType">
                    <option value="id">ID</option>
                    <option value="class">Class</option>
                </select>
            </li>
            <li>
                <label for="targetInput">Target</label>
                <input type="text" id="targetInput"/>
            </li>
            <li>
                <label for="remarkInput">Remark</label>
                <input type="text" id="remarkInput"/>
            </li>
        </ul>
    </div>
    <div class="popup_footer">
        <button class="btn_common opposite" id="btnModelSave" data-t="common.btn.save"></button>
    </div>
</div>

<script>
    var sessionReplayBlockPopup = {
        v: {
            isEditMode: false,
            originalData: null
        },

        init: {
            event() {
                const {func} = sessionReplayBlockPopup
                $('.dimmed').on('click', func.close)
                $('#btnModelSave').on('click', func.save)
            }
        },

        func: {
            open(data) {
                const {v, func} = sessionReplayBlockPopup

                if (data && data.selector) {
                    // 수정 모드
                    v.isEditMode = true
                    v.originalData = data
                    func.setData(data)
                } else {
                    // 신규 등록 모드
                    v.isEditMode = false
                    v.originalData = null
                    func.clearData()
                }

                $('.dimmed').show()
                $('#modelPopup').show()
            },
            close() {
                const {v, func} = sessionReplayBlockPopup
                const $modelPopup = $('#modelPopup')

                $modelPopup.hide()
                $('.dimmed').hide()

                v.isEditMode = false
                v.originalData = null

                func.clearData()
            },
            setData(data) {
                $('#selectorType').val(data.selector || 'class')
                $('#targetInput').val(data.target || '')
                $('#remarkInput').val(data.remark || '')
            },
            clearData() {
                $('#selectorType').val('class')
                $('#targetInput').val('')
                $('#remarkInput').val('')
            },
            save() {
                const {v, func} = sessionReplayBlockPopup
                const {func: parentFunc} = sessionReplayBlock

                // 값 검증
                const param = func.valid()
                if (!param) return

                // 중복 검사
                if (!func.checkDuplicate(param.selector, param.target)) {
                    return
                }

                let data = {
                    selector: param.selector,
                    target: param.target,
                    remark: param.remark
                }

                if (v.isEditMode) {
                    // 수정 모드
                    data.seq = v.originalData.seq
                    parentFunc.update(data)
                } else {
                    // 신규 등록 모드
                    parentFunc.add(data)
                }

                func.close()
            },
            checkDuplicate(selector, target) {
                const {v} = sessionReplayBlockPopup
                const tableData = sessionReplayBlock.v.table.getData()

                const isDuplicate = tableData.some(row => {
                    // 수정 모드일 때는 자기 자신은 제외
                    if (v.isEditMode && v.originalData && row.seq === v.originalData.seq) {
                        return false
                    }
                    return row.selector === selector && row.target === target
                })

                if (isDuplicate) {
                    toast(trl('common.msg.duplicate'))
                    $('#targetInput').focus()
                    return false
                }

                return true
            },
            showError(message) {
                toast(message)
                $('#targetInput').focus()
            },
            validateTarget(selector, target) {
                const validations = {
                    class: [
                        // 시작 문자 검사
                        {test: /^[^a-zA-Z_-]/, msg: trl('common.msg.outFormat')},
                        // 공백
                        {test: /\s/, msg: trl('common.msg.noBlank')},
                        // 비ASCII
                        {test: /[^\x00-\x7F]/, msg: trl('common.msg.outFormat')},
                        // 전체 구문 검사 (inverse)
                        {test: /^[a-zA-Z_-][a-zA-Z0-9_-]*$/, msg: trl('common.msg.outFormat'), inverse: true}
                    ],
                    id: [
                        // 시작 문자 검사
                        {test: /^[^a-zA-Z_]/, msg: trl('common.msg.outFormat')},
                        // 공백
                        {test: /\s/, msg: trl('common.msg.noBlank')},
                        // 전체 구문 검사 (inverse)
                        {test: /^[a-zA-Z_][a-zA-Z0-9_-]*$/, msg: trl('common.msg.outFormat'), inverse: true}
                    ]
                }

                const rules = validations[selector]
                if (!rules) return true

                for (const rule of rules) {
                    const isMatch = rule.test.test(target)
                    const isInvalid = rule.inverse ? !isMatch : isMatch

                    if (isInvalid) {
                        this.showError(rule.msg)
                        return false
                    }
                }

                return true
            },
            valid() {
                const selector = $('#selectorType').val()
                const target = $('#targetInput').val().trim()

                if (!target) {
                    this.showError(trl('common.msg.checkValue'))
                    return false
                }

                if (!this.validateTarget(selector, target)) {
                    return false
                }

                return {
                    selector: selector,
                    target: target,
                    remark: $('#remarkInput').val().trim()
                }
            }
        }
    }

    sessionReplayBlockPopup.init.event()
</script>