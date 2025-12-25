<%--suppress RequiredAttributes --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--suppress CssUnusedSymbol --%>
<style>
    .contents_header {
        height: 32px;
    }

    .menu_role_divide {
        height: calc(100vh - 160px);
    }

    .menu_role_detail_wrap {
        display: none;
        padding: 20px;
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

    .detail_btn_wrap {
        position: fixed;
        right: 2.5%;
        top: 13%;
        display: flex;
        gap: 8px;
    }

    .dark_mode .detail_input_wrap .detail_text_wrap input[type="text"]:read-only {
        border-color: var(--black-2) !important;
        background-color: var(--black-2) !important;
        color: #fff;
    }

    .gm_config_item {
        width: 100%;
        height: 78px;
        border: 1px solid #E3E5E8;
    }

    .config_contents_wrap .config_input_wrap label {
        font-size: 14px;
        margin-right: 8px;
    }

    .gm_config_item_wrap .gm_config_item:nth-of-type(1) {
        border-radius: 8px 8px 0 0;
    }

    .gm_config_item_wrap .gm_config_item:not(:nth-of-type(1)) {
        border-top: none;
    }

    .gm_config_item_wrap .gm_config_item:nth-last-of-type(1) {
        border-radius: 0 0 8px 8px;
    }

    .menu_role_detail_wrap .type_text {
        position: relative;
    }

    .config_input_wrap .config_text_wrap {
        display: grid;
        gap: 8px;
    }

    .config_text_wrap .config_example {
        color: var(--color-subtitle-light);
    }

    .config_contents_wrap_wrap {
        height: 100%;
        display: grid;
        grid-template-columns: 40% 60%;
        align-items: center;
        padding: 18px;
    }

    .btn_common .cancel {
        height: 13px;
    }
</style>
<!-- 시스템관리 > 메뉴관리 -->
<div class="contents_header">
    <div class="ctts_h_left">
        <h4 data-t="system.title.permission"></h4>
    </div>
</div>

<div class="menu_role_divide">
    <!-- 메뉴 트리맵 영역 -->
    <div class="menu_role_wrap">
        <div class="menu_role_tree enable_scrollbar" id="menuListTree"></div>
    </div>

    <!-- 메뉴 상세 영역 -->
    <div class="menu_role_detail_wrap">
        <div class="menu_role_detail">
            <div class="border_bottom_purple_wrap type_text" data-t="system.menu.settings">

            </div>
            <div class="detail_btn_wrap">
                <button class="btn_common" id="btnCancel">
                    <span data-t="common.btn.cancel"></span>
                    <img class="cancel img_cancel" alt="">
                </button>
                <button class="btn_common save" id="btnOpenSaveModal">
                    <span data-t="common.btn.save"></span>
                    <img class="img_save" alt="">
                </button>
            </div>
        </div>

        <div id="menuRoleDetail">

        </div>
    </div>
    <!-- 컨펌 팝업 -->
    <div class="popup_common" id="saveModal">
        <h4 data-t="common.btn.alarm"></h4>
        <div class="popup_msg" data-t="common.msg.save"></div>
        <div class="popup_footer">
            <button class="btn_common opposite" id="btnSaveCancel" data-t="common.btn.cancel"></button>
            <button class="btn_common" id="btnSave" data-t="common.btn.confirm"></button>
        </div>
    </div>
</div>

<script>
    var SM0100 = {
        v: {
            currentMenu: {},
            saveValue: {},
            isUpdate: ''
        },
        init: {
            event() {
                $('#btnCancel').on('click', SM0100.func.resetMenu)
                $('#btnOpenSaveModal').on('click', SM0100.func.openSaveModal)
                $('#btnSaveCancel').on('click', SM0100.func.closeSaveModal)
                $('#btnSave').on('click', SM0100.func.saveMenu)
            },
            created() {
                updateContent()
                SM0100.func.setHandlebarsHelper()
                SM0100.func.getMenuList()
            }
        },
        func: {
            // 취소 버튼
            resetMenu() {
                $('.menu_role_detail_wrap').hide()
                $('#menuRoleDetail').empty()
                $('#orderSeq').val(1)

                // 기존 선택된 요소 디자인 초기화
                const $otherItems = $('.menu_role_tree .tree_text_box')
                $otherItems.removeClass('selected')
            },
            // 모달 닫기
            closeSaveModal() {
                $('#saveModal').hide()
                $('.dimmed').hide()
            },
            // 메뉴 저장 모달
            openSaveModal() {
                // 기존 저장되어 있던 값과 비교
                const menuId = $('#menuId').val()
                const $orderSeq = $('#orderSeq')
                const orderSeq = Number($orderSeq.val())
                const deleteYn = $('input[name="deleteYn"]').val()
                const roleGbn = $('input[name="menuRole"]:checked').val()

                const current = SM0100.v.currentMenu

                let orderSeqValue, deleteYnValue, roleGbnValue, grpLevelValue;

                for (let item of current) {
                    if (item.key === 'deleteYn') {
                        deleteYnValue = item.val;
                    } else if (item.key === 'orderSeq') {
                        orderSeqValue = Number(item.val);
                    } else if (item.key === 'roleGbn') {
                        roleGbnValue = item.val;
                    } else if (item.key === 'grpLevel') {
                        grpLevelValue = item.val;
                    }
                    if (deleteYnValue && orderSeqValue && roleGbnValue && grpLevelValue) {
                        break;
                    }
                }

                const param = {}

                if (orderSeqValue !== orderSeq) {
                    if (orderSeq < 1) {
                        const config = {
                            id: 'minValueOrderModal',
                            msg: '메뉴 순서는 1 이상 입력하셔야 합니다.',
                            fn: () => {
                                util.emptyInput($orderSeq)
                            }
                        }
                        modal.show(config)
                        return
                    }
                    param.orderSeq = orderSeq
                }

                if (deleteYnValue !== deleteYn) {
                    if (deleteYnValue === 'N') {
                        param.deleteYn = 'Y'
                    } else if (deleteYnValue === 'Y') {
                        param.deleteYn = 'N'
                    }
                }
                if (roleGbnValue !== roleGbn) {
                    param.roleGbn = roleGbn
                }

                // 둘 다 변경점이 없다면 통신 수행하지 않음
                if (!param.deleteYn && !param.roleGbn && !param.orderSeq) {
                    const msg = trl('common.msg.noChange')
                    const config = {
                        id: 'noChangeModal',
                        msg: msg
                    }
                    modal.show(config)
                    return
                }
                param.menuId = menuId
                param.grpLevel = grpLevelValue
                SM0100.v.saveValue = param

                $('.dimmed').show()
                $('#saveModal').show()
            },
            // 메뉴 수정
            saveMenu() {
                const param = SM0100.v.saveValue
                if (!param) {
                    return
                }

                // update 수행
                ajaxCall('/sm/0300/modifyMenuAuthList.maxy', param)
                    .then(data => {
                        const msg = trl('common.msg.success')
                        toast(msg)
                        // 저장 성공 후 저장한 데이터로 화면 갱신해줘야함
                        SM0100.func.drawList(data.menuList).then(() => {
                            $('.tree_text_box').each(function () {
                                if ($(this).data('menuId') === param.menuId) {
                                    $(this).trigger('click')
                                }
                            })
                        })

                    })
                    .catch(error => {
                        console.log(error)
                    })
                SM0100.func.closeSaveModal()
            },
            // 메뉴 상세 설정
            async setMenuDetail(target) {
                const $item = $(target)

                // 기존 선택된 요소 디자인 초기화
                const $otherItems = $('.menu_role_tree .menu_item .tree_text_box')
                $otherItems.removeClass('selected')

                // 선택된 요소에 selected
                $item.addClass('selected')

                // 값 가져오기
                const menuNm = $item.data('menuNm')
                const menuId = $item.data('menuId')
                const upMenuId = $item.data('upMenuId')
                const deleteYn = $item.data('deleteYn')
                const roleGbn = $item.data('roleGbn')
                const orderSeq = $item.data('orderSeq')
                const grpLevel = $item.data('grpLevel')

                const title = {
                    name: trl('system.menu.name'),
                    order: trl('system.menu.order'),
                    use: trl('system.menu.use'),
                    permission: trl('system.menu.permission')
                }

                // 현재 선택된 값 저장
                SM0100.v.currentMenu = [
                    {
                        'key': 'menuNm',
                        'val': menuNm,
                        'desc': title.name,
                        'type': 'input',
                        'readonly': 'true',
                        'menuId': menuId,
                        'upMenuId': upMenuId
                    },
                    {
                        'key': 'menuId',
                        'val': menuId,
                        'desc': '메뉴 ID',
                        'type': 'input',
                        'hidden': 'true',
                        'menuId': menuId,
                        'upMenuId': upMenuId
                    },
                    {
                        'key': 'orderSeq',
                        'val': orderSeq,
                        'desc': title.order,
                        'type': 'input',
                        'menuId': menuId,
                        'upMenuId': upMenuId
                    },
                    {
                        'key': 'deleteYn',
                        'val': deleteYn,
                        'desc': title.use,
                        'type': 'toggle',
                        'menuId': menuId,
                        'upMenuId': upMenuId
                    },
                    {
                        'key': 'roleGbn',
                        'val': roleGbn,
                        'desc': title.permission,
                        'type': 'radio',
                        'menuId': menuId,
                        'upMenuId': upMenuId
                    },
                    {
                        'key': 'grpLevel',
                        'val': grpLevel,
                        'desc': '그룹 레벨',
                        'type': 'input',
                        'hidden': 'true',
                        'menuId': menuId,
                        'upMenuId': upMenuId
                    },
                    {
                        'key': 'upMenuId',
                        'val': upMenuId,
                        'desc': '상위 메뉴 ID',
                        'type': 'input',
                        'menuId': menuId,
                        'upMenuId': upMenuId
                    }
                ]

                const source = await fetch('/templates/menuRoleDetail.html')
                    .then(response => response.text())
                const template = Handlebars.compile(source)

                const currentMenuList = template(SM0100.v.currentMenu)
                $('#menuRoleDetail').html(currentMenuList)
                updateContent()

                $('.menu_role_detail_wrap').show()

                $('input[type=checkbox][name=deleteYn]').change(function () {
                    if ($(this).is(':checked')) {
                        $(this).val('N')
                    } else {
                        $(this).val('Y')
                    }
                });
            },
            // Sortable 이벤트 설정
            setSortableEvent() {
                // TODO: 추후 개발
            },
            // 목록 클릭 이벤트 설정 
            setListEvent() {
                // 메뉴 클릭하면 상세 띄우기
                $('.menu_role_tree .menu_item .tree_text_box').on('click', (e) => {
                    SM0100.func.setMenuDetail(e.currentTarget)
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

                // 메뉴 이미지를 클릭하면 하위 메뉴 토글
                $('.tree_btn').on('click', (e) => {
                    e.stopPropagation()
                    const menuId = $(e.currentTarget).data('menuId')
                    if (menuId === '' || $(e.currentTarget).data(
                        'upMenuId') == null) {

                        if (menuId != null) {
                            const menuGrp = menuId.substring(0, 2)
                            const $child = $(
                                '.menu_role_tree .menu_item[data-menu-grp="' + menuGrp + '"')
                            if ($child.css('display') === 'none') {
                                $child.slideDown(300)
                                $(e.currentTarget).addClass('open')
                            } else {
                                $child.slideUp(300)
                                $(e.currentTarget).removeClass('open')
                            }
                        }
                    } else {
                        const $subChild = $(
                            '.menu_role_tree .menu_item[data-up-menu-id="' + menuId + '"')
                        if ($subChild.css('display') === 'none') {
                            $subChild.slideDown(300)
                            $(e.currentTarget).addClass('open')
                        } else {
                            $subChild.slideUp(300)
                            $(e.currentTarget).removeClass('open')
                        }
                    }
                })
            },
            // 핸들바 헬퍼 함수 설정 
            setHandlebarsHelper() {
                // 소분류 이면 앞에 `ㅇ` 추가
                Handlebars.registerHelper('isChild', (subMenuYn, menuId, upMenuId) => {
                    return subMenuYn === 'N'
                        ? '<span class="child_div"></span>'
                        : '<button class="tree_btn open" data-menu-id="' + menuId
                        + '" data-up-menu-id="' + upMenuId + '"></button>'
                })

                Handlebars.registerHelper('isGroupMem', (upMenuId, menuGrp) => {
                    return upMenuId != null
                        ? 'data-menu-grp="' + menuGrp + '"'
                        : ''
                })

                // 사용하지 않는 메뉴라면 사용 안함 처리
                Handlebars.registerHelper('isDel', (deleteYn, roleNm) => {
                    return deleteYn === 'Y' ? 'Closed' : trl(roleNm)
                })

                Handlebars.registerHelper('isDisabled', deleteYn => {
                    return deleteYn === 'Y' ? 'disabled' : ''
                })

                Handlebars.registerHelper('isChecked', (key, val) => {
                    if (key === 'deleteYn' && val === 'N') {
                        return 'checked'
                    }
                })

                Handlebars.registerHelper('isRadioChecked', (currentValue, targetValue) => {
                    return currentValue === targetValue ? "checked" : "";
                })

                Handlebars.registerHelper('isShowItem', (key) => {
                    return key !== 'upMenuId';
                })

                Handlebars.registerHelper('isRadioDisabled', (menuId, upMenuId) => {
                    // 앱 설정 및 메뉴 권한 관리는 disabled 하면 안된다
                    if ((menuId === 'SM0300' || menuId === 'SM0500') && upMenuId === 'SM0000') {
                        return "disabled"
                    } else {
                        return ""
                    }
                })

                Handlebars.registerHelper('getMenuNm', (menuNm) => {
                    const tnsNm = trl(menuNm)
                    if (tnsNm) {
                        return tnsNm
                    } else {
                        return menuNm
                    }
                })

            },
            // 목록 그리기
            async drawList(data) {
                if (data) {
                    const source = await fetch('/templates/menuList.html')
                        .then(response => response.text())
                    const template = Handlebars.compile(source)

                    const appType = sessionStorage.getItem('maxyMode') === 'front' ? '1' : '0'
                    const filterData = data.filter(item => item.appType === appType)
                    const menuList = template({menuList: filterData})
                    $('#menuListTree').html(menuList)

                    // 그리고 난 후 이벤트 추가
                    SM0100.func.setListEvent()

                    // Sortable 이벤트 추가
                    SM0100.func.setSortableEvent()
                }
            },
            // 메뉴 목록 조회 
            getMenuList() {
                ajaxCall('/sm/0300/getMenuAuthList.maxy', {}).then(data => {
                    SM0100.func.drawList(data.menuList)
                }).catch(error => {
                    console.log(error)
                })
            }
        }
    }
    SM0100.init.event()
    SM0100.init.created()
</script>