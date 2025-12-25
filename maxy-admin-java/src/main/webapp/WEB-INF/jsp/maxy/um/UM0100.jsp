<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .popup_common.group_config {
        z-index: 32;
    }

    .maxy_popup_common {
        min-width: auto;
        width: 45vw;
    }

    .group_list_wrap {
        height: calc(100vh - 110px);
    }

    .group_list_wrap .menu_role_tree {
        height: calc(100% - 40px);
    }

    .group_list_wrap .btn_wrap_center {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 5px;
    }

    .group_list_wrap .btn_wrap_center > button {
        margin-left: 10px;
    }

    .menu_role_detail_wrap .btn_wrap_right {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 15px;
    }

    .group_config_modal {
        position: fixed;
        left: 0;
        top: 40px;
        margin-top: -50px;
        height: calc(100vh + 10px);
        width: 100%;
        background-color: var(--black-0);
        opacity: 0.5;
        display: none;
        z-index: 30;
    }

    @keyframes shake {
        25% {
            transform: translateX(4px);
        }
        50% {
            transform: translateX(-4px);
        }
        75% {
            transform: translateX(4px);
        }
    }

</style>
<!-- 컨텐츠 헤더 -->
<div class="maxy_popup_common" id="groupManagementPopup">
    <div class="group_list_wrap">
        <!-- 메뉴 트리맵 영역 -->
        <div class="menu_role_wrap">
            <div class="btn_wrap_center">
                <button id="btnGroupReg" class="btn_common">
                    <span data-t="management.user.btn.subGroupAdd"></span>
                    <img class="img_add" alt="">
                </button>
                <button id="btnGroupDel" class="btn_common">
                    <span data-t="management.user.btn.groupDelete"></span>
                    <img class="img_delete" alt="">
                </button>
                <button id="btnGroupUpdate" class="btn_common">
                    <span data-t="management.user.btn.groupNmModify"></span>
                    <img class="img_modify" alt="">
                </button>
            </div>
            <div class="menu_role_tree enable_scrollbar" id="groupListTree"></div>
        </div>
    </div>
</div>

<!-- 그룹 추가 -->
<input id="grpId" type="hidden">
<input id="upGrpId" type="hidden">
<div class="group_config_modal" data-content="dimmed"></div>
<div class="popup_common group_config" id="useGroupRegPopup" data-type="userGroupPopup">
    <h4 data-t="management.user.btn.groupAdd"></h4>
    <ul class="popup_input_wrap">
        <li>
            <label for="grpNm" data-t="management.user.btn.parentGroup"></label>
            <input id="grpNm" type="text" readonly>
        </li>

        <li>
            <label for="regGroupNm" data-t="management.user.groupName"></label>
            <input id="regGroupNm" type="text">
            <span></span>
            <span class="err_txt" id="regGroupNmErrTxt"></span>
        </li>
    </ul>
    <div class="popup_footer">
        <button class="btn_common" id="regUserGroupBtnCancel" data-t="common.btn.cancel"></button>
        <button class="btn_common opposite" id="regUserGroupBtnSave" data-t="common.btn.save"></button>
    </div>
</div>

<!-- 그룹 수정 -->
<div class="popup_common group_config" id="useGroupUpdatePopup" data-type="userGroupPopup">
    <h4 data-t="management.user.groupModify"></h4>
    <ul class="popup_input_wrap">
        <li>
            <label for="nowGrpNm" data-t="management.user.currentGroupName"></label>
            <input id="nowGrpNm" type="text" readonly>
        </li>

        <li>
            <label for="modifyGrpNm" data-t="management.user.newGroupName"></label>
            <input id="modifyGrpNm" type="text" autocomplete="off">
            <span></span>
            <span class="err_txt" id="modifyGrpNmErrTxt"></span>
        </li>
    </ul>
    <div class="popup_footer">
        <button class="btn_common opposite" id="modifyUserGroupBtnCancel" data-t="common.btn.cancel"></button>
        <button class="btn_common" id="modifyUserGroupBtnSave" data-t="common.btn.save"></button>
    </div>
</div>
<!-- 그룹 삭제 -->
<div class="popup_common group_config" id="delUserGroupModal" data-type="userGroupPopup">
    <h4 data-t="common.btn.alarm"></h4>
    <div class="popup_msg">
        [<span id="delUserNm"></span>] <span data-t="management.user.msg.groupDelete"></span>
    </div>
    <div class="popup_footer">
        <button class="btn_common opposite" id="delUserGroupBtnCancel" data-t="common.btn.cancel"></button>
        <button class="btn_common" id="delUserGroupBtnSave" data-t="common.btn.confirm"></button>
    </div>
</div>
<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var UM01P1 = {
        v: {
            btnType: ''
        },
        //초기화 함수 모음
        init: {
            // 버튼 이벤트
            event() {
                const {v, func} = UM01P1
                // 그룹 추가 저장 버튼 클릭 이벤트
                $('#regUserGroupBtnSave').on('click', function () {
                    v.btnType = 'save'
                    func.doSave()
                })
                // 그룹 추가 취소 버튼 클릭 이벤트
                $('#regUserGroupBtnCancel').on('click', func.cancelPopup)
                // 그룹 수정 저장 버튼 클릭 이벤트
                $('#modifyUserGroupBtnSave').on('click', function () {
                    v.btnType = 'modify'
                    func.doModify()
                })
                // 그룹 수정 취소 버튼 클릭 이벤트
                $('#modifyUserGroupBtnCancel, .group_config_modal').on('click', func.cancelPopup)
                // 그룹 삭제 취소 버튼
                $('#delUserGroupBtnCancel').on('click', func.cancelPopup)
                // 그룹 삭제 확인 버튼
                $('#delUserGroupBtnSave').on('click', func.doDelete)
            }
        },
        // 일반 함수 모음
        func: {
            open(type) {
                const {v} = UM0100
                //const $dimmed = $('.modal_dimmed')
                let popupId = ''
                let {grpNm, grpId, upGrpId} = v.grpInfo

                switch (type) {
                    case 'reg': {
                        if (upGrpId) {
                            const msg = i18next.tns('management.user.msg.addGroupError')
                            toast(msg)
                            return
                        }

                        if (!grpId || !grpNm) {
                            if ('0011' !== '${loginUser.roleGbn}') {
                                toast(i18next.tns('management.user.msg.noGrant'))
                                return
                            }
                            grpNm = 'Root'
                            grpId = ''
                        }
                        popupId = 'useGroupRegPopup'
                        break
                    }
                    case 'modify': {
                        if (!grpId) {
                            const msg = i18next.tns('management.user.msg.selectGroup')
                            toast(msg)
                            return false
                        }
                        popupId = 'useGroupUpdatePopup'
                        break
                    }
                    case 'delete': {
                        if (!grpNm) {
                            const msg = i18next.tns('common.msg.noSelect')
                            toast(msg)
                            return
                        }
                        popupId = 'delUserGroupModal'

                    }
                }

                $('#delUserNm').text(grpNm)
                $('#grpNm').val(grpNm)
                $('#nowGrpNm').val(grpNm)
                $('#grpId').val(grpId)
                $('#' + popupId).show()
                const $dimmed = $('.group_config_modal')
                $dimmed.show()
            },
            // 저장 실행 함수
            doSave() {
                const {func} = UM01P1
                // 값 검증
                const params = func.valid()

                // 비어 있으면 검증 실패
                if (!params) {
                    return
                }

                // 통신 시작
                ajaxCall(params.upGrpId === ''
                    ? '/gm/0101/addUserGroup.maxy'
                    : '/gm/0101/addUserSubGroup.maxy', params)
                    .then(data => {
                        UM0100.func.drawList(data)
                        // 등록 팝업 닫기
                        func.cancelPopup()
                        toast(i18next.tns('common.msg.success'))
                        // 사용자 상세, 등록 팝업 내 그룹리스트 갱신
                        UM02P2.func.getUpGrpNm()
                        UM02P1.func.getUpGrpNm()
                    })
                    .catch(error => {
                        console.log(error)
                        toast(i18next.tns(error.msg))
                    })
            },

            // 수정 실행 함수
            doModify() {
                const {func} = UM01P1
                // 값 검증
                const params = func.valid()

                // 비어 있으면 검증 실패
                if (!params) {
                    return
                }

                // 통신 시작
                ajaxCall('/gm/0101/modifyUserGroupNm.maxy', params)
                    .then(data => {
                        UM0100.func.drawList(data)
                        // 등록 팝업 닫기
                        func.cancelPopup()
                        toast(i18next.tns('common.msg.success'))
                        // 사용자 상세, 등록 팝업 내 그룹리스트 갱신
                        UM02P2.func.getUpGrpNm()
                        UM02P1.func.getUpGrpNm()
                    })
                    .catch(error => {
                        console.log(error)
                        toast(i18next.tns(error.msg))
                    })
            },

            doDelete() {
                const {v} = UM0100
                const {func} = UM01P1
                // delete call
                const {grpId} = v.grpInfo
                if (!grpId) {
                    toast(i18next.tns('common.msg.noSelect'))
                    return
                }
                const params = {grpId}
                ajaxCall('/gm/0101/delUserGroupMenu.maxy', params)
                    .then(data => {
                        toast(i18next.tns('common.msg.delete'))
                        // redraw list
                        UM0100.func.drawList(data)
                        // 등록 팝업 닫기
                        func.cancelPopup()
                        // 사용자 상세, 등록 팝업 내 그룹리스트 갱신
                        UM02P2.func.getUpGrpNm()
                        UM02P1.func.getUpGrpNm()
                    })
                    .catch(error => {
                        toast(i18next.tns(error.msg))
                        console.log(error)
                    })
            },

            // 팝업 닫기 함수
            cancelPopup() {
                // 닫을 때 input 값을 비워준다.
                $('#modifyGrpNm').val('')
                $('#regGroupNm').val('')
                $('#upGrpId').val('')
                $('#grpId').val('')
                $('#delUserNm').text('')
                $('.group_config_modal').hide()
                $('#delUserGroupModal').hide()
                // hide
                $('.popup_common[data-type="userGroupPopup"]').hide()
                UM0100.v.grpInfo = {}
            },

            // 값 검증 함수
            valid() {
                const {v} = UM01P1

                // input 에서 값 가져오기
                let grpNm = '';
                const upGrpId = $('#grpId').val()
                let $modifyGrpNmTarget
                let modifyGrpNm

                if (v.btnType === 'save') {
                    $modifyGrpNmTarget = $('#regGroupNm')
                    modifyGrpNm = $modifyGrpNmTarget.val()
                } else if (v.btnType === 'modify') {
                    $modifyGrpNmTarget = $('#modifyGrpNm')
                    modifyGrpNm = $modifyGrpNmTarget.val()
                }

                // 값 비었는지 체크
                if (util.isEmpty(modifyGrpNm)) {
                    util.emptyInput($modifyGrpNmTarget)
                    return false
                }

                // 특수문자 입력 불가 / 한글, 영문, 숫자만 입력 가능
                const validChars = /^[가-힣a-zA-Z0-9]*$/;
                if (!validChars.test(modifyGrpNm)) {
                    const msg = i18next.tns('management.user.msg.specialchar')
                    toast(msg)
                    return false
                }

                grpNm = modifyGrpNm
                // 값 리턴
                return {grpNm, upGrpId, grpId: upGrpId}
            }
        }
    }
    UM01P1.init.event()

</script>
<script>
    var UM0100 = {
        v: {
            table: [],
            currentMenu: {},
            saveValue: {},
            grpInfo: {
                grpId: '',
                grpNm: '',
                upGrpId: ''
            },
            userNoList: []
        },
        // 초기화 함수 모음
        init: {
            event() {
                const {func} = UM0100
                $('#btnGroupUpdate').on('click', func.openModifyPopup)

                // 그룹 추가
                $('#btnGroupReg').on('click', func.openRegPopup)

                // 그룹 삭제
                $('#btnGroupDel').on('click', func.openDeletePopup)
                $('.dimmed').on('click', func.closePopup)
            },
            created() {
                const {func} = UM0100
                updateContent()
                func.setHandlebarsHelper()
            }
        },
        func: {
            open() {
                const {func} = UM0100
                $('#groupManagementPopup').show()
                $('.dimmed').show()
                func.getUserGroupMenuList()
            },
            closePopup() {
                $('#groupManagementPopup').hide()
                $('.dimmed').hide()
            },
            // 목록 클릭 이벤트 설정
            setListEvent() {
                const {v} = UM0100
                // 메뉴 클릭하면 상세 띄우기
                $('.menu_role_tree .menu_item .tree_text_box').on('click', (e) => {

                    const $item = $(e.currentTarget)

                    // 기존 선택된 요소 디자인 초기화
                    const $otherItems = $('.menu_role_tree .tree_text_box')
                    $otherItems.removeClass('selected')

                    // 선택된 요소에 selected
                    $item.addClass('selected')

                    v.grpInfo = {
                        grpNm: $item.data('grpNm'),
                        grpId: $item.data('grpId'),
                        upGrpId: $item.data('upGrpId')
                    }
                })

                // root 클릭 시
                $('.menu_root .tree_text_box').on('click', (e) => {
                    v.grpInfo = {
                        upGrpId: ''
                    }

                    const $item = $(e.currentTarget)
                    // 기존 선택된 요소 디자인 초기화
                    const $otherItems = $('.tree_text_box')
                    $otherItems.removeClass('selected')

                    // 선택된 요소에 selected
                    $item.addClass('selected')
                })

                // root 의 이미지를 클릭하면 전체 메뉴 토글
                $('.menu_root > button').on('click', (e) => {
                    e.stopPropagation()
                    const $target = $('.menu_role_tree .menu_item')
                    if ($target.css('display') === 'none') {
                        $target.slideDown(300)
                        $('.menu_lvl_1 .tree_btn').addClass('open')
                        $(e.currentTarget).addClass('open')
                    } else {
                        $target.slideUp(300)
                        $(e.currentTarget).removeClass('open')
                    }
                })

                // level 1의 메뉴 이미지를 클릭하면 하위 메뉴 토글
                $('.menu_lvl_1 .tree_btn').on('click', (e) => {
                    e.stopPropagation()
                    const grpId = $(e.currentTarget).data('grpId')
                    const $child = $('.menu_role_tree .menu_item[data-up-grp-id="' + grpId + '"')

                    if ($child.css('display') === 'none') {
                        $child.slideDown(300)
                        $(e.currentTarget).addClass('open')
                    } else {
                        $child.slideUp(300)
                        $(e.currentTarget).removeClass('open')
                    }
                })
            },
            // 핸들바 헬퍼 함수 설정
            setHandlebarsHelper() {
                // 소분류 이면 앞에 `ㅇ` 추가
                Handlebars.registerHelper('isChild', (lvl, grpId) => {
                    return lvl > 1
                        ? '<span class="child_div"></span>'
                        : '<button class="tree_btn open" data-grp-id="' + grpId + '"></button>'
                })

                // 사용하지 않는 메뉴라면 사용 안함 처리
                Handlebars.registerHelper('isDel', (deleteYn, roleNm) => {
                    return deleteYn === 'Y' ? '사용 안함' : roleNm
                })

                Handlebars.registerHelper('isDisabled', deleteYn => {
                    return deleteYn === 'Y' ? 'disabled' : ''
                })
            },
            // 목록 그리기
            async drawList(data) {
                const {func} = UM0100
                if (!data) {
                    return
                }
                const source = await fetch('/templates/userGroupList.html')
                    .then(response => response.text())
                const template = Handlebars.compile(source)
                const userGroupMenuList = template({userGroupMenuList: data})
                $('#groupListTree').html(userGroupMenuList)

                // root 요소에 selected 설정
                $('.menu_root .tree_text_box').addClass('selected')

                // 그리고 난 후 이벤트 추가
                func.setListEvent()
            },
            // 메뉴 목록 조회
            getUserGroupMenuList() {
                const {func} = UM0100
                ajaxCall('/gm/0101/getUserGroupMenuList.maxy', {})
                    .then(data => {
                        func.drawList(data)
                    })
                    .catch(error => {
                        console.log(error)
                    })
            },

            openRegPopup() {
                UM01P1.func.open('reg')
            },

            openModifyPopup() {
                UM01P1.func.open('modify')
            },

            openDeletePopup() {
                UM01P1.func.open('delete')
            }
        }
    }
    UM0100.init.event()
    UM0100.init.created()
</script>