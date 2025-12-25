<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!-- 관리 > 장치 > 장치 현황 등록 팝업 -->
<div class="popup_common popup_modify" id="targetDeviceInsertPopup">
    <div class="popup_header popup_monitoring">
        <div class="device_popup_title">
            <img src="<c:url value="/images/maxy/icon-monitor.svg"/>" alt="">
            <h4 data-t="management.device.text.management"></h4>
            <%--            <div class="use_yn_wrap toggle_wrap">--%>
            <%--                <input type="checkbox" id="useYn" name=""><label for="useYn"></label>--%>
            <%--            </div>--%>
        </div>

    </div>

    <div class="popup_content">
        <ul class="popup_input_wrap">
            <li>
                <label for="deviceId" data-t="common.tableColumn.deviceId"></label>
                <input type="text" id="deviceId"/>
            </li>
            <li>
                <label for="userId" data-t="common.text.userId"></label>
                <input type="text" id="userId"/>
            </li>
            <li>
                <label for="_packageNm" data-t="common.text.packageNm"></label>
                <select id="_packageNm"></select>
            </li>
            <li>
                <label for="_osType" data-t="common.tableColumn.os"></label>
                <select id="_osType">
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                </select>
            </li>
            <li>
                <label data-t="management.device.text.vipYn"></label>
                <div class="reg_role_option_wrap">
                    <input id="vipY"
                           type="radio"
                           value="Y"
                           name="vipYn"
                    >
                    <label for="vipY" data-t="management.alias.text.use"></label>
                    <input id="vipN"
                           type="radio"
                           value="N"
                           name="vipYn"
                    >
                    <label for="vipN" data-t="management.alias.text.noUse"></label>
                </div>
            </li>
        </ul>
    </div>

    <div class="popup_content bottom">
        <ul class="popup_input_wrap">
            <li>
                <label for="userNm" data-t="management.user.name"></label>
                <input id="userNm" type="text">
            </li>
            <li>
                <label for="emailAddr" data-t="common.text.email"></label>
                <input id="emailAddr" type="text">
            </li>
            <li>
                <label for="phoneNo" data-t="common.text.phoneNumber"></label>
                <input id="phoneNo" type="text">
            </li>
        </ul>
    </div>

    <div class="popup_footer">
        <button class="btn_common opposite" id="targetDeviceBtnSave" data-t="common.btn.save"></button>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var DM01P1 = {
        //초기화 함수 모음
        init: {
            // 버튼 이벤트
            event() {
                const {func} = DM01P1
                // 저장 버튼 클릭 이벤트
                $('#targetDeviceBtnSave').on('click', func.doSave)
                // 취소 버튼 클릭 이벤트
                $('.dimmed').on('click', func.cancelPopup)

                $('#useYn').click(function () {
                    const $useYn = $('#useYn')
                    if ($useYn.is(':checked')) {
                        $useYn.val("Y")
                    } else {
                        $useYn.val("N")
                    }
                })

            },
            created() {
                appInfo.append({pId: '_packageNm', targetPage: 'DM01P1'}).then(() => {
                    const $_packageNm = $('#_packageNm')
                    const packageNm = $('#packageNm').val()

                    $_packageNm.val(packageNm).prop('selected', true)
                    $_packageNm.on('change', function () {
                        let packageNm = $('#_packageNm').val()
                        let selectedPackageNm = $('#packageNm').val()
                        if (packageNm !== selectedPackageNm) {
                            const msg = trl('management.device.msg.differentPackage')
                            toast(msg)
                        }
                    })
                })
                if (localStorage.getItem('lang') === 'en') {
                    $('.web_performance > label').css('line-height', '16px')
                }
            }
        },
        // 일반 함수 모음
        func: {
            // 저장 실행 함수
            doSave() {
                // 값 검증
                const params = DM01P1.func.valid()

                // 비어 있으면 검증 실패
                if (!params) {
                    return
                }

                let url = '/gm/0501/regDevice.maxy'

                // 통신 시작
                ajaxCall(url, params)
                    .then((data) => {
                        const msg = trl('common.msg.success')
                        toast(msg)

                        const searchTargetSt = DM0100.v.searchParam.searchTargetSt

                        // 조회조건 상태값이 ON 또는 OFF인 경우
                        if (searchTargetSt !== '') {
                            DM0100.func.getData()
                        } else {
                            // 리스트 데이터 갱신
                            DM0100.func.makeList(data)
                        }

                        // 등록 팝업 닫기
                        DM01P1.func.cancelPopup()
                    })
                    .catch(error => {
                        toast(trl(error.msg))
                    })
            },

            // 팝업 닫기 함수
            cancelPopup() {
                // 닫을 때 input 값을 비워준다.
                const $useYn = $('#useYn')
                $('#deviceId').val('')
                $('#userId').val('')
                $useYn.val('N')
                $useYn.prop('checked', false)
                const $_packageNm = $('#_packageNm')
                const packageNm = $('#packageNm').val()
                $_packageNm.val(packageNm).prop('selected', true)
                $('#_osType option:eq(0)').prop('selected', true)
                $('#vipN').prop('checked', true)
                $('#userNm').val('')
                $('#emailAddr').val('')
                $('#phoneNo').val('')

                // hide
                $('#targetDeviceInsertPopup').hide()
                $('.dimmed').hide()
            },
            // 값 검증 함수
            valid() {
                const $emailAddr = $('#emailAddr')
                const $deviceId = $('#deviceId')
                const $userId = $('#userId')

                // input에서 값 가져오기
                let deviceId = $deviceId.val()
                let userId = $userId.val()
                let osType = $('#_osType').val()
                let packageNm = $('#_packageNm').val()
                let serverType = $('#_packageNm option:checked').data('server-type')
                let userNm = $('#userNm').val()
                let emailAddr = $emailAddr.val()
                let useYn = 'Y'

                let vipYn = $("input:radio[name='vipYn']:checked").val()
                let phoneNo = $('#phoneNo').val()

                // 값 비었는지 체크
                if (!deviceId) {
                    const msg = trl('management.device.msg.deviceIdEmpty')
                    toast(msg)
                    util.emptyInput($deviceId)
                    return
                }

                // 만약 값이 없다면 빈칸 처리 (에러 방지)
                if (userId === undefined || util.isEmpty(userId)) {
                    userId = ''
                }
                if (userNm === undefined || util.isEmpty(userNm)) {
                    userNm = '-'
                }
                if (emailAddr === undefined || util.isEmpty(emailAddr)) {
                    emailAddr = ''
                }
                if (!util.isEmpty(emailAddr)) {
                    if (!valid.email($emailAddr)) {
                        toast('올바른 이메일 형식이 아닙니다.')
                        return false
                    }
                }
                if (phoneNo === undefined) {
                    phoneNo = ''
                }
                const result = {
                    packageNm,
                    deviceId,
                    userId,
                    osType,
                    serverType,
                    userNm,
                    emailAddr,
                    useYn,
                    vipYn,
                    phoneNo,
                    mFromDt: '',
                    mToDt: ''
                }

                const nowDateTime = util.nowDateTime()
                // 값 리턴
                if (vipYn === 'Y') {
                    result.vipRegDt = nowDateTime
                    return result
                } else {
                    result.vipRemoveDt = nowDateTime
                    return result
                }
            }
        }
    }
    DM01P1.init.created()
    DM01P1.init.event()
</script>