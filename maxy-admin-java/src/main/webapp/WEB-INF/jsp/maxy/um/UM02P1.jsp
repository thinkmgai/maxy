<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<jsp:include page="../common/rsaScript.jsp"/>

<style>
    .popup_small {
        width: 400px !important;
    }

</style>
<%-- 관리 > 사용자 > 등록/삭제 > 등록 팝업 --%>
<div class="popup_common popup_small" id="userRegPopup">
    <h4>
        <i class="icon_user"></i>
        <span data-t="management.user.register"></span>
    </h4>
    <ul class="popup_input_wrap">
        <li>
            <label for="regUserNm" data-t="management.user.name"></label>
            <input id="regUserNm" type="text">
            <span></span>
        </li>
        <li>
            <label for="regUserId" data-t="management.user.id"></label>
            <input id="regUserId" type="text">
            <span></span>
        </li>
        <li>
            <label for="regUpGrpNm" data-t="management.user.groupName"></label>
            <select id="regUpGrpNm" name="regUpGrpNm"></select>
        </li>

        <li class="input_radio_wrap">
            <label data-t="management.user.permission"></label>
            <div class="reg_role_option_wrap">
                <input id="regRoleGnGeneral"
                       type="radio"
                       name="regRoleGn"
                       value="0013"
                       checked
                >
                <label for="regRoleGnGeneral" data-t="management.user.general"></label>
                <input id="regRoleGnGroup"
                       type="radio"
                       name="regRoleGn"
                       value="0012"
                >
                <label for="regRoleGnGroup" data-t="management.user.group"></label>
            </div>

        </li>

        <li>
            <label for="regEmailAddr" data-t="common.text.email"></label>
            <input id="regEmailAddr" type="text">
            <span></span>
        </li>
    </ul>
    <div class="popup_footer">
        <button class="btn_common opposite" id="regUserBtnSave" data-t="common.btn.save"></button>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var UM02P1 = {
        v: {},
        //초기화 함수 모음
        init: {
            // 버튼 이벤트
            event() {
                const {func} = UM02P1
                // 저장 버튼 클릭 이벤트
                $('#regUserBtnSave').on('click', func.doSave)
            },
            created() {
            }
        },
        // 일반 함수 모음
        func: {
            // 상위 그룹명 가져오기
            getUpGrpNm() {
                const {func} = UM02P1
                ajaxCall('/gm/0101/getAllUpGroupNameList.maxy', {})
                    .then(data => {
                        func.setGrpSelectBox(data)
                    })
                    .catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                    })
            },

            setGrpSelectBox(data) {
                const {upGroupNameList: grpList} = data

                const $select = $('#regUpGrpNm')
                $select.empty()
                for (let i = 0; i < grpList.length; i++) {
                    const option =
                        $('<option value=' + grpList[i].grpId + '>'
                            + grpList[i].grpNm + '</option>')
                    $select.append(option);
                }
                $('#regUpGrpNm option:eq(0)').prop('selected', true)
            },

            // 저장 실행 함수
            doSave() {
                const {func} = UM02P1
                // 값 검증
                const params = func.valid()
                // 비어 있으면 검증 실패
                if (!params) {
                    return
                }

                params.appType = ((sessionStorage.getItem('maxyMode') || 'maxy') === 'maxy') ? '0' : '1'

                // 통신 시작
                ajaxCall('/gm/0101/regUser.maxy', params)
                    .then(data => {
                        cursor.hide()
                        const msg = trl('common.msg.add')
                        const initialPassword = trl('management.user.initialpassword')
                        toast(msg + "</br>"
                            + "<span style='color:gold;font-size: smaller;'>"
                            + initialPassword
                            + "</span>",
                            true, 5000);

                        UM0200.func.fetch.getUserList(data)
                        // 등록 팝업 닫기
                        UM0200.func.popup.close()
                    })
                    .catch(error => {
                        console.log(error)
                        toast(trl(error.msg))
                        cursor.hide()
                    })
            },

            open() {
                const {func} = UM02P1
                $('.dimmed').show()
                const popup = $('#userRegPopup')
                popup.show()

                // 그룹 목록 세팅
                const $groupList = $('#regUpGrpNm')
                $groupList.empty()

                func.getGroupList()
            },
            getGroupList() {
                const {func} = UM02P1

                ajaxCall('/gm/0101/getAllUpGroupNameList.maxy  ', {}).then((data) => {
                    func.setGroupList(data)
                }).catch((error) => {
                    console.log(error)
                })
            },
            setGroupList(data) {
                const {upGroupNameList} = data
                const $groupList = $('#regUpGrpNm')

                for (let i = 0; i < upGroupNameList.length; i++) {
                    $groupList.append('<option value="'
                        + upGroupNameList[i].grpId + '">'
                        + upGroupNameList[i].grpNm
                        + '</option>')
                }
            },
            // 값 검증 함수
            valid() {
                // input에서 값 가져오기
                const $userNm = $('#regUserNm')
                const $userId = $('#regUserId')
                const $grpId = $('#regUpGrpNm')
                const $emailAddr = $('#regEmailAddr')

                const userNm = $userNm.val().trim()
                const userId = $userId.val().trim()
                const grpId = $grpId.val().trim()
                const roleGbn = $('input[name=regRoleGn]:checked').val()
                const emailAddr = $emailAddr.val().trim()

                // 값 비었는지 체크
                if (util.isEmpty(userNm)) {
                    const msg = trl('management.user.msg.userName')
                    toast(msg)
                    util.emptyInput($userNm)
                    return false
                }
                // 값 비었는지 체크
                if (util.isEmpty(userId)) {
                    const msg = trl('management.user.msg.userId')
                    toast(msg)
                    util.emptyInput($userId)
                    return false
                } else {
                    // id는 4자리 이상 입력
                    if (userId.length < 4) {
                        const msg = trl('management.user.msg.userIdValid')
                        toast(msg)
                        util.emptyInput($userId)
                        return false
                    }
                }

                if (util.isEmpty(roleGbn)) {
                    const msg = trl('management.user.msg.permissionEmpty')
                    toast(msg)
                    return false
                }
                if (util.isEmpty(grpId)) {
                    util.emptyInput($grpId)
                    return false
                }
                if (util.isEmpty(emailAddr)) {
                    const msg = trl('management.user.msg.emailEmpty')
                    toast(msg)
                    util.emptyInput($emailAddr)
                    return false
                }
                // 값 리턴
                return {
                    userNm,
                    userId,
                    grpId,
                    roleGbn,
                    emailAddr
                }
            }
        }
    }
    UM02P1.init.event()
    UM02P1.init.created()
</script>