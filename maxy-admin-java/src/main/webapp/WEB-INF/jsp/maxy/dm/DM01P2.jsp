<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!-- 관리 > 장치 > 장치 현황 수정 팝업 -->
<div class="popup_common popup_modify" id="targetDeviceModifyPopup">
    <div class="popup_header popup_monitoring">
        <div class="device_popup_title">
            <img src="<c:url value="/images/maxy/icon-monitor.svg"/>" alt="">
            <h4 data-t="management.device.text.management"></h4>
            <div class="use_yn_wrap toggle_wrap">
                <input type="checkbox" id="mUseYn" name="">
                <label for="mUseYn"></label>
            </div>
        </div>

    </div>

    <div class="popup_content">
        <ul class="popup_input_wrap">
            <li>
                <label for="mDeviceId">Device ID</label>
                <input type="text" id="mDeviceId" readonly/>
            </li>
            <li>
                <label for="mUserId">User ID</label>
                <input type="text" id="mUserId" readonly/>
            </li>
            <li>
                <label for="mPackageNm" data-t="common.text.packageNm"></label>
                <select id="mPackageNm" class="readonly" disabled></select>
            </li>
            <li>
                <label for="mOsType">OS</label>
                <select id="mOsType" class="readonly" disabled>
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                </select>
            </li>

            <li>
                <label data-t="management.device.text.vipYn"></label>
                <div class="reg_role_option_wrap">
                    <input id="mVipY"
                           type="radio"
                           value="Y"
                           name="vipYn"
                    >
                    <label for="mVipY" data-t="management.alias.text.use"></label>
                    <input id="mVipN"
                           type="radio"
                           value="N"
                           name="vipYn"
                    >
                    <label for="mVipN" data-t="management.alias.text.noUse"></label>
                </div>
            </li>

        </ul>
    </div>

    <div class="popup_content bottom">
        <ul class="popup_input_wrap">
            <li>
                <label for="mUserNm" data-t="management.user.name"></label>
                <input id="mUserNm" type="text">
            </li>
            <li>
                <label for="mEmailAddr" data-t="common.text.email"></label>
                <input id="mEmailAddr" type="text">
            </li>
            <li>
                <label for="mPhoneNo" data-t="common.text.phoneNumber"></label>
                <input id="mPhoneNo" type="text">
            </li>
            <input type="hidden" id="mTargetId">
        </ul>
    </div>

    <div class="popup_footer">
        <button class="btn_common opposite" id="btnModify" data-t="common.btn.save"></button>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var DM01P2 = {
        //초기화 함수 모음
        init: {
            // 버튼 이벤트
            event() {
                // 저장 버튼 클릭 이벤트
                $('#btnModify').on('click', DM01P2.func.doSave)
                // 취소 버튼 클릭 이벤트
                $('.dimmed').on('click', DM01P2.func.cancelPopup)

                $('#detailUseYn').click(function () {
                    const $useYn = $('#detailUseYn')
                    if ($useYn.is(':checked')) {
                        $useYn.val("Y")
                    } else {
                        $useYn.val("N")
                    }
                })
            },
            created() {
                appInfo.append({pId: 'mPackageNm', targetPage: 'DM01P2'})
                DM01P2.func.setDatePicker()
                if (localStorage.getItem('lang') === 'en') {
                    $('.web_performance > label').css('line-height', '16px')
                }
            }
        },
        // 일반 함수 모음
        func: {
            setDatePicker() {
                $('#mFromDt, #mToDt').datepicker({'dateFormat': 'yy-mm-dd'})
            },
            // 저장 실행 함수
            doSave() {
                // 값 검증
                const params = DM01P2.func.valid()

                // 비어 있으면 검증 실패
                if (!params) {
                    return
                }

                // 통신 시작
                ajaxCall('/gm/0501/modifyDevice.maxy', params)
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
                        DM01P2.func.cancelPopup()
                    })
                    .catch(error => {
                        toast(trl(error.msg))
                    })
            },

            // 팝업 닫기 함수
            cancelPopup() {
                const $dimmed = $('.dimmed')
                // 닫을 때 input 값을 비워준다.
                const $useYn = $('#mUseYn')
                $('#mDeviceId').val('')
                $('#mUserId').val('')
                $useYn.val('N')
                $useYn.prop('checked', false)
                const $packageNm = $('#mPackageNm')
                const packageNm = $packageNm.val()
                $packageNm.val(packageNm).prop('selected', true)
                $('#mOsType option:eq(0)').prop('selected', true)
                $('#mVipN').prop('checked', true)
                $('#mUserNm').val('')
                $('#mEmailAddr').val('')
                $('#mPhoneNo').val('')
                $('#mFromDt').val('')
                $('#mToDt').val('')

                // hide
                $('#targetDeviceModifyPopup').hide()
                $dimmed.hide()
            },
            // 값 검증 함수
            valid() {
                const $emailAddr = $('#mEmailAddr')
                const $deviceId = $('#mDeviceId')
                const $targetId = $('#mTargetId')

                // input에서 값 가져오기
                let targetId = $targetId.val()
                let deviceId = $deviceId.val()
                let osType = $('#mOsType').val()
                let packageNm = $('#mPackageNm').val()
                let serverType = $('#mPackageNm option:checked').data('server-type')
                let userNm = $('#mUserNm').val()
                let emailAddr = $emailAddr.val()
                let useYn = $('#mUseYn').is(':checked')
                if (useYn) {
                    useYn = 'Y'
                } else {
                    useYn = 'N'
                }
                let vipYn = $("input:radio[name='vipYn']:checked").val()
                let phoneNo = $('#mPhoneNo').val()
                let mFromDt = $('#mFromDt').val()
                let mToDt = $('#mToDt').val()

                if (targetId === undefined || util.isEmpty(targetId)) {
                    toast(trl('management.device.msg.targetIdEmpty'))
                }

                // 값 비었는지 체크
                if (util.isEmpty(deviceId)) {
                    const msg = trl('management.device.msg.deviceIdEmpty')
                    DM01P2.func.setErrorMsg('deviceId', msg)
                    util.emptyInput($deviceId)
                    return false
                }

                // 만약 값이 없다면 빈칸 처리 (에러 방지)
                if (userNm === undefined || util.isEmpty(userNm)) {
                    userNm = '-'
                }
                if (emailAddr === undefined || util.isEmpty(emailAddr)) {
                    emailAddr = ''
                }
                if (!util.isEmpty(emailAddr)) {
                    if (!valid.email($emailAddr)) {
                        return false
                    }
                }
                if (phoneNo === undefined) {
                    phoneNo = ''
                }
                if (mFromDt === undefined) {
                    mFromDt = ''
                }
                if (mToDt === undefined) {
                    mToDt = ''
                }
                const result = {
                    targetId,
                    packageNm,
                    deviceId,
                    osType,
                    serverType,
                    userNm,
                    emailAddr,
                    useYn,
                    vipYn,
                    phoneNo,
                    mFromDt,
                    mToDt
                }

                let nowDateTime = util.nowDateTime()
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
    DM01P2.init.created()
    DM01P2.init.event()
</script>