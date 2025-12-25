<!-- Deprecated -->

<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<jsp:include page="../common/rsaScript.jsp"/>
<!-- 사용자 그룹 이동 -->
<div class="popup_common" id="userPackageMovePopup">

    <h4 id="titleUM02P4"></h4>
    <ul class="popup_input_wrap">
        <li>
            <label for="upPackageNmMove" data-t="management.user.movepackagename"></label>
            <select id="upPackageNmMove" onchange="UM02P4.func.upPackageNmChange();">
                <option value="noPackage">선택</option>
            </select>
            <span class="err_txt" id="upPackageNmMoveErrTxt"></span>
        </li>

        <li>
            <label for="upServerTpMove" data-t="management.user.moveservertype"></label>
            <select id="upServerTpMove">
                <option value="select">선택</option>
            </select>
            <span></span>
            <span class="err_txt" id="upServerTpMoveErrTxt"></span>
        </li>
    </ul>
    <div class="popup_footer">
        <button class="btn_common opposite" id="moveServerPackageBtnCancel" data-t="common.btn.cancel"></button>
        <button class="btn_common" id="moveServerPackageBtnSave" data-t="common.btn.move"></button>
    </div>
</div>

<script>
    var UM02P4 = {
        v: {
            userNoList: [],
            seqList: []
        },

        //초기화 함수 모음
        init: {
            // 버튼 이벤트
            event() {
                // 사용자 그룹 이동 이동 버튼 클릭 이벤트
                $('#moveServerPackageBtnSave').on('click', UM02P4.func.doSave)
                // 사용자 그룹 이동 취소 버튼 클릭 이벤트
                $('#moveServerPackageBtnCancel').on('click', UM02P4.func.cancelPopup)
            },
            created() {
                //appendAppInfo({pId: "upPackageNmMove", sId: "upServerTpMove"})
                ajaxCall('/gm/0101/getSettingAppPackageList.maxy', null)
                    .then(data => {
                        if (data != null) {
                            UM02P4.func.setUpPackageNmMove(data)
                            if (data.appPackageList[0].packageNm != null)
                                UM02P4.func.createServerTp(data.appPackageList[0].packageNm)
                        }
                    })
                    .catch(error => {
                        console.log(error)
                        UM02P4.func.setErrorMsg('upServerTpMove', error.msg);
                    })

                UM02P4.func.setSelectEvent()
            }
        },
        // 일반 함수 모음
        func: {
            createServerTp(packageNm) {
                const listParam = {
                    "packageNm": packageNm
                }
                ajaxCall('/gm/0101/getSettingAppPackageServerList.maxy', listParam)
                    .then(data => {
                        if (data != null) {
                            UM02P4.func.setServerTpMove(data)
                        }
                    })
                    .catch(error => {
                        console.log(error)
                        UM02P4.func.setErrorMsg('upServerTpMove', error.msg)
                    })
            },
            upPackageNmChange() {
                const $upPackageNmMove = $('#upPackageNmMove option:selected')
                const listParam = {
                    "packageNm": $upPackageNmMove.val()
                }
                ajaxCall('/gm/0101/getSettingAppPackageServerList.maxy', listParam)
                    .then(data => {
                        if (data != null) {
                            UM02P4.func.setServerTpMove(data)
                        }
                    })
                    .catch(error => {
                        console.log(error)
                        UM02P4.func.setErrorMsg('upServerTpMove', error.msg)
                    })
            },
            setServerTpMove(data) {
                const $upServerTpMove = $('#upServerTpMove')
                $upServerTpMove.empty()

                const {appPackageServerList} = data

                for (let i = 0; i < appPackageServerList.length; i++) {
                    const serverNm = i18next.tns('common.' + appPackageServerList[i].displayNm)
                    const option = $(
                        '<option value=' + appPackageServerList[i].serverType + '>'
                        + serverNm + '</option>');
                    $upServerTpMove.append(option);
                }

                $('#upServerTpMove > option:eq(0)').attr('selected', true)

                // 이벤트 추가
                UM02P4.func.setSelectEvent()
            },
            setUpPackageNmMove(data) {
                const $upPackageNmMove = $('#upPackageNmMove')
                $upPackageNmMove.empty();
                for (let i = 0; i < data.appPackageList.length; i++) {
                    const option = $('<option value=' + data.appPackageList[i].packageNm + '>'
                        + data.appPackageList[i].displayNm + '</option>');
                    $upPackageNmMove.append(option);
                }
                $('#upPackageNmMove > option:eq(0)').attr('selected', true)
            },

            setSelectEvent() {
                $('#upServerTpMove').on('change', () => {
                    const serverType = $('#upServerTpMove').val()
      
                    UM02P4.func.resetErrorMsg()
                })
            },

            resetSelect() {
                UM02P4.init.created()
            },

            // 이동 실행 함수
            doSave() {
                // 값 검증
                const param = UM02P4.func.updateValid()

                // 비어 있으면 검증 실패
                if (!param) {
                    return
                }
                // 통신 시작
                const paramList = UM02P3.v.table.getSelectedData() // 체크 데이터

                const userNoListParam = {
                    'packageNm': $("#upPackageNmMove").val(),
                    'serverType': $("#upServerTpMove").val()
                };
                let userNoList = "";
                for (let i = 0; i < paramList.length; i++) {
                    userNoList += paramList[i].userNo + (i !== (paramList.length - 1) ? "," : "");
                }
                userNoListParam.userNoList = userNoList;
          
                ajaxCall('/gm/0101/selectUserPackageCheck.maxy', userNoListParam)
                    .then(data => {
                        if (data.result < 0) {
                            const msg = i18next.tns('management.user.msg.duplicationuser')
                            UM02P4.func.setErrorMsg('upServerTpMove', msg)
                        } else {
                            const msg = i18next.tns('common.msg.success')
                            toast(msg)
                            UM02P4.func.setupServerTpMove(paramList)
                        }
                    })
                    .catch(error => {
                        console.log(error)
                        UM02P4.func.setErrorMsg('upServerTpMove', error.msg)
                    })
            }
            , setupServerTpMove(paramList) {
                const packageparam = {
                    'packageNm': $('#upPackageNmMove').val(),
                    'serverType': $('#upServerTpMove').val()
                };
                for (let i = 0; i < paramList.length; i++) {

                    if ($('#btnGrpMove').hasClass('insert') === true) {
                        // insert
                        packageparam.userNo = paramList[i].userNo;
                        ajaxCall('/gm/0101/insertUserPackage.maxy', packageparam)
                            .then(() => {
                                UM02P4.func.resetParam()
                                UM02P3.func.createTable()
                                UM02P3.func.getUserGroupList()
                                UM02P3.func.getUserGroupMenuList()
                                UM02P4.func.resetErrorMsg()
                                // 등록 팝업 닫기
                                UM02P4.func.cancelPopup()
                            })
                            .catch(error => {
                                console.log(error)
                                UM02P4.func.setErrorMsg('upServerTpMove', error.msg)
                            })
                    } else {
                        //update
                        packageparam.seq = paramList[i].seq
                        packageparam.userNo = paramList[i].userNo

                        ajaxCall('/gm/0101/updateUserPackage.maxy', packageparam)
                            .then(() => {
                                UM02P4.func.resetParam()
                                UM02P3.func.createTable()
                                UM02P3.func.getUserGroupList()
                                UM02P3.func.getUserGroupMenuList()
                                UM02P4.func.resetErrorMsg()
                                // 등록 팝업 닫기
                                UM02P4.func.cancelPopup()
                            })
                            .catch(error => {
                                console.log(error)
                                UM02P4.func.setErrorMsg('upServerTpMove', error.msg)
                            })
                    }

                }
            },

            setErrorMsg(type, error) {
                const targetErrTxt = $('#' + type + 'ErrTxt')
                targetErrTxt.text(error)
                targetErrTxt.show()
            },

            resetErrorMsg() {
                const errTxt = $('.err_txt')
                errTxt.text('')
                errTxt.hide()
            },

            resetParam() {
                UM02P3.v.packageInfo.packageNm = '';
                UM02P3.v.packageInfo.serverType = '';
                $('#btnGrpMove').removeClass('insert')
                $('#btnGrpMove').removeClass('move')
            },

            // 팝업 닫기 함수
            cancelPopup() {
                // hide
                UM02P4.func.resetErrorMsg()
                UM02P4.func.resetSelect()
                $('#userPackageMovePopup').hide()
                $('.popup_dimmed').hide()
            },

            // 값 검증 함수
            updateValid() {
                // input에서 값 가져오기
                const serverType = $('#upServerTpMove option:selected').val()
                const packages = $('#upPackageNmMove option:selected').val()
                const seqList = UM02P4.v.seqList
                const userNoList = UM02P4.v.userNoList

                // 값 비었는지 체크
                if (serverType === "select") {
                    UM02P4.func.setErrorMsg('upServerTpMove', '서버유형을 선택해주세요.')
                    util.emptyInput($('#upServerTpMove'))
                    return false
                }

                if (packages === "noPackage") {
                    UM02P4.func.setErrorMsg('upPackageNmMove', '패키지를 선택해주세요.')
                    util.emptyInput($('#upPackageNmMove'))
                    return false
                }

                // 값 리턴
                return {
                    "serverType": serverType,
                    "PackageNm": packages,
                    seqList,
                    userNoList
                }
            }
        }
    }
    UM02P4.init.event()
    UM02P4.init.created()
</script>