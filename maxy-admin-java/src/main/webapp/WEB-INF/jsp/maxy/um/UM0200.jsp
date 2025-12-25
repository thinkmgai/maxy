<%--suppress RequiredAttributes --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%--등록 팝업--%>
<jsp:include page="UM02P1.jsp"/>
<%--수정 팝업--%>
<jsp:include page="UM02P2.jsp"/>
<%--앱 별 사용자 목록 팝업--%>
<jsp:include page="UM02P3.jsp"/>
<%--그룹 관리 팝업--%>
<jsp:include page="UM0100.jsp"/>

<style>
    .user_initial_password_desc {
        display: flex;
        gap: 7px;
        flex-direction: column;
    }

    .user_initial_password_desc > div {
        display: flex;
        gap: 2px;
    }

    .gm_menu_desc.point.red, .table-group .red {
        color: red;
    }

    .table-group .red {
        font-weight: 500;
    }

    .btn_common {
        padding: 0.3em 1.5em 0.3em 1.5em;
    }
</style>
<%-- 관리 > 사용자 > 등록/삭제 --%>
<div>
    <div class="contents_header">
        <div class="ctts_h_left">
            <div class="gm_menu_text_wrap">
                <div class="title_option_desc">
                    <h4 class="gm_menu_title" data-t="management.title.userManagement"></h4>
                </div>
                <h5 class="gm_menu_desc" data-t="management.title.desc.user"></h5>
                <div class="user_initial_password_desc">
                    <div>
                        <h5 class="gm_menu_desc point" data-t="management.title.desc.userpoint"></h5>
                        <h5 class="gm_menu_desc point red" data-t="management.title.desc.initialpassword"></h5>
                    </div>
                    <h5 class="gm_menu_desc point" id="expw"></h5>
                </div>

            </div>
        </div>

        <div class="ctts_h_right mt_auto">
            <%--suppress HtmlFormInputWithoutLabel --%>
            <select id="filter-field">
                <option value="userId">User ID</option>
                <option value="userNm">User Name</option>
                <option value="grpNm">User Group</option>
            </select>

            <%--suppress HtmlFormInputWithoutLabel --%>
            <input id="filter-value" type="text" placeholder=""/>
            <button id="filter-clear" class="filter_clear"></button>

            <button id="btnUserReg" class="btn_common">
                <span data-t="common.btn.register"></span>
                <img class="img_entry" alt="">
            </button>
            <button id="btnUserListByApp" class="btn_common">
                <span data-t="management.user.specifyApp"></span>
            </button>
            <button id="btnGrpManagement" class="btn_common" data-t="management.user.btn.groupManagement">
            </button>
        </div>
    </div>
    <div class="table-group">
        <div class="" id="userListTable">
        </div>
    </div>
</div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var UM0200 = {
        v: {
            table: {}
        },
        init: {
            // 버튼 이벤트 등록
            event() {
                const {func} = UM0200
                // 등록 버튼
                $('#btnUserReg').on('click', func.popup.openRegPopup)
                // 앱 별 사용자 목록
                $('#btnUserListByApp').on('click', func.popup.openUserListByAppPopup)
                // 그룹 관리 버튼
                $('#btnGrpManagement').on('click', func.popup.openGroupManagementPopup)
                $('.dimmed').on('click', func.popup.close)
            },
            // 화면이 켜지고 초기값 세팅하는 함수 모음
            created() {
                const {func} = UM0200
                updateContent()
                func.table.createTable()
                // 코드 그룹 목록 가져오기 (첫 페이지)
                func.fetch.getUserList()
                func.cmm.setExampleText()
            }
        },
        func: {
            cmm: {
                setExampleText() {
                    $('#expw').text(`Ex) ID: maxy / PW: max\${util.nowMonthDate()}!@`)
                }
            },
            table: {
                createTable() {
                    const {v, func} = UM0200

                    const red = (data) => {
                        if (util.isBeforeOrToday(data)) {
                            return '<div class="red">' + data + '</div>'
                        }
                        return data
                    }

                    v.table = new Tabulator("#userListTable", {
                        placeholder: i18next.tns('common.msg.noData'),
                        height: 'calc(100vh - 195px)',
                        layout: 'fitDataFill',
                        selectable: 1,
                        columnHeaderVertAlign: 'middle',
                        columns: [
                            {
                                title: "User Name",
                                field: "userNm",
                                width: "15%"
                            },
                            {
                                title: "User ID",
                                field: "userId",
                                width: "15%"
                            },
                            {
                                title: "User Group",
                                field: "grpNm",
                                width: "15%"
                            },
                            {
                                title: "User Grade",
                                field: "grpAdminYn",
                                width: "15%",
                                formatter: function (cell) {
                                    const txt = i18next.tns('common.text.administrator')
                                    if (cell.getValue() === 'Y') {
                                        return '<span class="btn_yn">' + txt + '</span>'
                                    }
                                }
                            },
                            {
                                title: "App Count",
                                field: "appCount",
                                width: "10%"
                            },
                            {
                                title: "Reg Dt.",
                                field: "regDt",
                                width: "15%",
                                formatter: (cell) => {
                                    return util.dateFormat(cell.getValue())
                                }
                            },
                            {
                                title: "Exp Dt.",
                                field: "expiredDate",
                                width: "14%",
                                headerTooltip: 'Password Expired Date',
                                formatter: (cell) => {
                                    return red(util.dateFormat(cell.getValue()))
                                }
                            },
                        ],
                    });

                    //trigger an alert message when the row is clicked
                    v.table.on("rowClick", function (e, row) {
                        func.popup.openUserDetailPopup(row.getData())
                    });

                    util.likeSearchTable(v.table)
                },
                /**
                 * 사용자 목록을 테이블에 세팅
                 * @param data
                 */
                setData(data) {
                    const {v} = UM0200
                    //데이터가 있다면
                    if (data) {
                        v.table.setData(data)
                    }
                },
            },
            popup: {
                /**
                 * 사용자 등록 팝업 열기
                 */
                openRegPopup() {
                    ajaxCall('/gm/0101/getAllUpGroupNameList.maxy', {})
                        .then(data => {
                            if (data) {
                                if (data.upGroupNameList.length > 0) {
                                    UM02P1.func.open()
                                } else {
                                    toast(trl('management.user.msg.nogroup'))
                                }
                            }
                        })
                        .catch(error => {
                            console.log(error)
                            toast(i18next.tns(error.msg))
                        })


                },
                /**
                 * 사용자 상세 팝업 열기
                 */
                openUserDetailPopup(data) {
                    const {userNo, appCount} = data
                    if (!userNo) {
                        toast('Invalid User')
                    }
                    UM02P2.func.popup.open(userNo, appCount)
                },
                /**
                 * 앱 별 사용자 목록 팝업 열기
                 */
                openUserListByAppPopup() {
                    UM02P3.func.open()
                },
                /**
                 * 그룹 관리 팝업 열기
                 */
                openGroupManagementPopup() {
                    UM0100.func.open()
                },
                /**
                 * 팝업 닫기
                 */
                close() {
                    $('.popup_common input').not('[type=radio]').val('')
                    $('.popup_common select > option:eq(0)').prop('selected', true)
                    $('.popup_common input:radio[name=roleGbn]').eq(0).prop('checked', true)
                    $('.popup_common .app_list_wrap').empty()
                    $('.popup_common').hide()
                    $('.dimmed').hide()
                }
            },
            fetch: {
                /**
                 * 사용자 목록 조회
                 */
                getUserList() {
                    const {func} = UM0200

                    const appType = ((sessionStorage.getItem('maxyMode') || 'maxy') === 'maxy') ? '0' : '1'
                    ajaxCall('/gm/0101/getUserList.maxy', {appType}).then((data) => {
                        func.sortList(data)

                    }).catch((error) => {
                        console.log(error)
                    })
                }
            },
            sortList(data) {
                const {v} = UM0200
                const userNo = Number(sessionStorage.getItem('userNo'))

                // data 배열을 정렬하여 userNo가 자신인 데이터를 맨 위로 올림å
                const sortedData = data.sort((a, b) => {
                    if (a.userNo === userNo && b.userNo !== userNo) {
                        return -1
                    } else if (a.userNo !== userNo && b.userNo === userNo) {
                        return 1
                    } else {
                        return 0
                    }
                })

                v.table.setData(sortedData)
            }
        }
    }

    UM0200.init.created()
    UM0200.init.event()
</script>