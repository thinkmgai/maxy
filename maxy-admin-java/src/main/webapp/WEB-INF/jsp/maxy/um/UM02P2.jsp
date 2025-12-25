<style>
    #userDetailPopup {
        width: 800px;
    }

    #userDetailPopup .popup_input_wrap, #userDetailPopup .app_list_wrap {
        margin-top: 16px;
    }

    #userDetailPopup .popup_expanded {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1em;
    }

    #userDetailPopup input[type="text"]:read-only {
        background-color: #EDEDED;
    }

    #userDetailPopup .popup_wrapper {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    #userDetailPopup .popup_footer {
        justify-content: space-between;
    }

    #userDetailPopup .btn_wrapper {
        display: flex;
        gap: .5em;
    }

    #userDetailPopup .app_list_wrap {
        height: 235px;
        max-height: 235px;
        overflow-y: auto;
        border-radius: var(--radius);
        border: 1px solid var(--color-border-in-light);
    }

    #userDetailPopup .app_list_wrap li {
        color: #2f2f2f;
        padding: 1em;
        user-select: none;
    }

    #userDetailPopup .app_list_wrap li:not(:last-child) {
        border-bottom: 1px solid var(--color-border-in-light);
    }

    #userDetailPopup .popup_contents .popup_title {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    #userDetailPopup .popup_contents .popup_title > span {
        font-size: 12px;
    }

    #userDetailPopup .popup_contents .popup_title > span:nth-child(2) {
        margin-left: auto;
        margin-right: 2px;
    }

    h4.user_management {
        margin-bottom: 0 !important;
    }

    .reg_role_option_wrap input[type="radio"]:checked:disabled + label {
        background-image: url(/images/maxy/check-on-gray.svg);
    }

    .app_list_wrap li.selected.disabled {
        background-color: #ededed;
    }
</style>
<%@ page contentType="text/html;charset=UTF-8" %>
<%-- 관리 > 사용자 > 등록/삭제 > 상세 팝업 --%>
<div class="popup_common" id="userDetailPopup">
    <div class="popup_expanded">
        <div class="popup_wrapper">
            <div class="popup_contents">
                <h4>
                    <i class="icon_user"></i>
                    <span data-t="management.user.detail"></span>
                </h4>
                <ul class="popup_input_wrap">
                    <li>
                        <label for="userNm" data-t="management.user.name"></label>
                        <input id="userNm" type="text" readonly>
                    </li>
                    <li>
                        <label for="userId" data-t="management.user.id"></label>
                        <input id="userId" type="text" readonly>
                        <input id="regDt" type="hidden">
                    </li>
                    <li>
                        <label for="upGrpNm" data-t="management.user.groupName"></label>
                        <select id="upGrpNm" name="upGrpNm"></select>
                    </li>

                    <li class="input_radio_wrap">
                        <label data-t="management.user.permission"></label>
                        <div class="reg_role_option_wrap">
                            <input
                                    id="roleGbnGeneral"
                                    type="radio"
                                    name="roleGbn"
                                    value="0013"
                            >
                            <label for="roleGbnGeneral" data-t="management.user.general"></label>
                            <input
                                    id="roleGbnGroup"
                                    type="radio"
                                    name="roleGbn"
                                    value="0012"
                            >
                            <label for="roleGbnGroup" data-t="management.user.group"></label>
                        </div>
                    </li>
                    <li>
                        <label for="emailAddr" data-t="common.text.email"></label>
                        <input id="emailAddr" type="text">
                    </li>
                </ul>
            </div>
        </div>
        <div class="popup_wrapper">
            <div class="popup_contents">
                <div class="popup_title">
                    <h4 class="user_management" data-t="management.user.btn.specifyApp"></h4>
                    <span data-t="management.user.specifiedApp"></span>
                    <span id="specifiedAppCount"></span>
                </div>

                <ul class="app_list_wrap enable_scrollbar" id="appList"></ul>
            </div>
        </div>
    </div>

    <div class="popup_footer">
        <div class="btn_wrapper">
            <button class="btn_common opposite" id="btnUnlock">Reset</button>
            <button class="btn_common opposite" id="btnDelete" data-t="common.btn.delete"></button>
        </div>
        <button class="btn_common opposite" id="btnSave" data-t="common.btn.save"></button>
    </div>
</div>
<script>

    var UM02P2 = {
        v: {
            // 클릭한 사용자 번호, 팝업을 닫으면 null로 변수 해제한다.
            userNo: null,
            appCount: null
        },
        //초기화 함수 모음
        init: {
            // 버튼 이벤트
            event() {
                const {func} = UM02P2
                // 저장 버튼 클릭 이벤트
                $('#btnSave').on('click', func.fetch.doSave)
                // 취소 버튼 클릭 이벤트
                $('.dimmed').on('click', func.popup.close)
                // reset 버튼 클릭 이벤트
                $('#btnUnlock').on('click', func.userUnlock)
                // 삭제 버튼 클릭 이벤트
                $('#btnDelete').on('click', func.userDelete)

                tippy('#btnUnlock', {
                    content: i18next.tns('management.user.msg.resetdesc') + '<br>' + i18next.tns('management.user.msg.resetpassword'),
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            },
            created() {
                updateContent()
            }
        },
        // 일반 함수 모음
        func: {
            fetch: {
                /**
                 * 사용자 상세 조회
                 * @param userNo
                 */
                getUserDetail(userNo) {
                    const {func} = UM02P2

                    const appType = ((sessionStorage.getItem('maxyMode') || 'maxy') === 'maxy') ? '0' : '1'
                    const params = {
                        userNo,
                        appType
                    }
                    ajaxCall('/gm/0101/getUserDetail.maxy', params).then((data) => {
                        func.popup.setData(data)
                    }).catch((error) => {
                        console.log(error)
                        toast(i18next.tns(error.msg))
                    })
                },
                /**
                 * 사용자 정보 저장
                 */
                doSave() {
                    const {func} = UM02P2
                    // 값 검증
                    const params = func.valid()
                    // 비어 있으면 검증 실패
                    if (!params) {
                        return
                    }

                    params.appType = ((sessionStorage.getItem('maxyMode') || 'maxy') === 'maxy') ? '0' : '1'

                    // 통신 시작
                    ajaxCall('/gm/0101/modifyUserDetail.maxy', params, {json: true})
                        .then(data => {
                            const msg = i18next.tns('common.msg.success')
                            toast(msg)
                            UM0200.func.table.setData(data)
                            // 등록 팝업 닫기
                            func.popup.close()
                        })
                        .catch(error => {
                            console.log(error)
                            toast(i18next.tns(error.msg))
                        })
                },
                unlock() {
                    const {v, func} = UM02P2
                    const userNo = v.userNo
                    if (userNo === '') {
                        const msg = i18next.tns('system.batch.invalidParam')
                        toast(msg)
                        return
                    }

                    const appType = ((sessionStorage.getItem('maxyMode') || 'maxy') === 'maxy') ? '0' : '1'
                    const param = {
                        userNo,
                        appType
                    }

                    ajaxCall('/gm/0101/unlockUser.maxy', param).then(data => {
                        toast(
                            // reset message
                            i18next.tns('management.user.msg.accountResetSuccess')
                            + "</br>"
                            + "<span style='color:gold;font-size: smaller;'>"
                            // password
                            + i18next.tns('management.user.initialpassword')
                            + "</span>", true, 5000)

                        UM0200.func.table.setData(data)
                        // 등록 팝업 닫기
                        func.popup.close()
                    }).catch(error => {
                        console.log(error)
                        toast(i18next.tns(error.msg))
                    })
                },
                delete() {
                    const {v, func} = UM02P2
                    const userNo = v.userNo
                    if (userNo === '') {
                        const msg = i18next.tns('system.batch.invalidParam')
                        toast(msg)
                        return
                    }

                    const appType = ((sessionStorage.getItem('maxyMode') || 'maxy') === 'maxy') ? '0' : '1'
                    const param = {
                        userNo,
                        appType
                    }

                    ajaxCall('/gm/0101/delUser.maxy', param).then(data => {
                        toast(i18next.tns('common.msg.delete'))

                        UM0200.func.table.setData(data)
                        // 등록 팝업 닫기
                        func.popup.close()
                    }).catch(error => {
                        console.log(error)
                        toast(i18next.tns(error.msg))
                    })
                }
            },
            popup: {
                /**
                 * 사용자 수정 팝업에 데이터 설정
                 * @param data
                 */
                setData(data) {
                    const {v, func} = UM02P2
                    try {
                        const {appList, detail, groupList} = data

                        const {userNm, userId, emailAddr, grpId, userNo} = detail
                        // 사용자 상세 정보 세팅
                        $('#userNm').val(userNm)
                        $('#userId').val(userId)
                        $('#emailAddr').val(emailAddr)
                        // 사용자 구분 체크
                        $('input[type=radio][name=roleGbn][value="' + detail.roleGbn + '"]').prop('checked', true);
                        // 그룹 목록 세팅
                        const $groupList = $('#upGrpNm')
                        $groupList.empty()

                        for (let i = 0; i < groupList.length; i++) {
                            $groupList.append('<option value="'
                                + groupList[i].grpId + '">'
                                + groupList[i].grpNm
                                + '</option>')
                        }
                        $groupList.val(grpId)

                        // 앱 리스트 세팅 및 지정된 앱 표시
                        const $appList = $('#appList')
                        $appList.empty()

                        let myself
                        const sessionUserNo = Number(sessionStorage.getItem('userNo'))
                        if (userNo === sessionUserNo) {
                            myself = true
                        }

                        for (let i = 0; i < appList.length; i++) {
                            const isPicked = appList[i].picked === 'Y' ? 'selected' : ''
                            const displayNm = getDisplayNm(appList[i].packageNm, appList[i].serverType)
                            let serverNm = getServerNm(appList[i].serverType)
                            serverNm = i18next.tns('common.' + serverNm)

                            $appList.append('<li class="' + isPicked + (myself ? ' disabled' : '') + '" ' +
                                'data-package-nm="' + appList[i].packageNm + '" ' +
                                'data-server-type="' + appList[i].serverType + '">'
                                + displayNm
                                + ' (' + serverNm + ')'
                                + '</li>');
                        }

                        // 지정된 앱 갯수 표시
                        $('#specifiedAppCount').text('(' + v.appCount + ')')

                        const loginUserNo = Number(sessionStorage.getItem('userNo'))

                        if (loginUserNo === v.userNo) {
                            $('#upGrpNm').attr('disabled', true)
                            $('input[name=roleGbn]').attr('disabled', true)
                        } else {
                            $('#upGrpNm').attr('disabled', false)
                            $('input[name=roleGbn]').attr('disabled', false)
                            $appList.find('li').on('click', function (e) {
                                func.popup.clickAppList(e.target)
                            })
                        }
                    } catch (e) {

                    }
                },
                /**
                 * 팝업 닫기
                 */
                close() {
                    const {v} = UM02P2

                    // 초기화
                    v.userNo = null
                    v.appCount = null

                    UM0200.func.popup.close()
                },
                /**
                 * 팝업 열기
                 * @param userNo
                 * @param appCount
                 */
                open(userNo, appCount) {
                    const {v, func} = UM02P2
                    v.userNo = userNo
                    v.appCount = appCount
                    $('.dimmed').show()
                    const popup = $('#userDetailPopup')
                    popup.show()
                    func.fetch.getUserDetail(userNo)
                    $('.app_list_wrap').scrollTop(0)
                },
                clickAppList(target) {
                    const {v} = UM02P2

                    const params = {
                        userNo: v.userNo,
                        packageNm: $(target).data('packageNm'),
                        serverType: $(target).data('serverType'),
                        roleGbn: $('input[name=roleGbn]:checked').val()
                    }
                    ajaxCall('/gm/0101/checkAppGranted.maxy', params).then((data) => {
                        if (!data.granted) {
                            const msg = i18next.tns('management.user.msg.unregisteredapp')
                            toast(msg)
                        } else {
                            // 기존에 선택된 행을 재 선택하는 경우 selected 클래스 제거
                            if ($(target).hasClass('selected')) {
                                $(target).removeClass('selected')
                            } else {
                                $(target).addClass('selected')
                            }

                            // 지정된 앱 갯수 표시
                            const specifiedAppCount = $('#appList').find('li.selected').length
                            $('#specifiedAppCount').text('(' + specifiedAppCount + ')')
                        }
                    }).catch((error) => {
                        console.log(error)
                    })
                }
            },
            /**
             * 사용자 잠금 해제
             */
            userUnlock() {
                const msg = i18next.tns('management.user.msg.accountReset') + '<br>' + i18next.tns('management.title.desc.initialpassword')
                modal.show({
                    id: 'resetModal',
                    msg: msg,
                    confirm: true,
                    fn: UM02P2.func.fetch.unlock
                })
            },
            userDelete() {
                const msg = i18next.tns('common.msg.deleteConfirm')
                modal.show({
                    id: 'userDeleteModal',
                    msg: msg,
                    confirm: true,
                    fn: UM02P2.func.fetch.delete
                })
            },
            /**
             * 값 검증 함수
             * @returns {{grpId: (*|string|jQuery), userNm: (*|string|jQuery), userNo: null, emailAddr: (*|string|jQuery), roleGbn: (*|jQuery|string)}|boolean}
             */
            valid() {
                const userNo = UM02P2.v.userNo
                // 값 비었는지 체크
                if (util.isEmpty(userNo)) {
                    toast('Invalid User Info')
                    return false
                }

                // input에서 값 가져오기
                const $userNm = $('#userNm')
                const $grpId = $('#upGrpNm')
                const $emailAddr = $('#emailAddr')

                const userNm = $userNm.val()
                const grpId = $grpId.val()
                const roleGbn = $('input[name=roleGbn]:checked').val()
                const emailAddr = $emailAddr.val()

                // 선택한 앱 목록 가져오기
                const $target = $('#appList > li.selected')

                const appInfoList = []

                for (let i = 0; i < $target.length; i++) {
                    const appListObj = {}
                    appListObj.packageNm = $target.eq(i).data('packageNm')
                    appListObj.serverType = $target.eq(i).data('serverType')
                    appInfoList.push(appListObj)
                }

                // 값 비었는지 체크
                if (util.isEmpty(userNm)) {
                    util.emptyInput($userNm)
                    return false
                }
                if (util.isEmpty(roleGbn)) {
                    const msg = i18next.tns('management.user.msg.permissionEmpty')
                    toast(msg)
                    return false
                }
                if (util.isEmpty(grpId)) {
                    util.emptyInput($grpId)
                    return false
                }
                if (util.isEmpty(emailAddr)) {
                    const msg = i18next.tns('management.user.msg.emailEmpty')
                    toast(msg)
                    util.emptyInput($emailAddr)
                    return false
                }
                // 값 리턴
                return {
                    userNo,
                    userNm,
                    grpId,
                    roleGbn,
                    emailAddr,
                    appInfoList
                }
            }
        }
    }
    UM02P2.init.event()
    UM02P2.init.created()
</script>