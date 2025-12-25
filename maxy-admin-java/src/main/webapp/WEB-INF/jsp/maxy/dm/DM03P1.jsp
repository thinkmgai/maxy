<%--suppress HtmlFormInputWithoutLabel suppress CssUnusedSymbol--%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<style>
    #targetDevicePagePopup.popup_modify {
        padding: 0;
        width: 800px;
    }

    #targetDevicePagePopup .popup_content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-top: 1px solid var(--color-border-out-light);
        background: none;
        gap: 1em;
        padding: 1em 1em 0;
    }

    #targetDevicePagePopup.popup_modify .half {
        width: 100%;
        max-width: 380px;
    }

    #targetDevicePagePopup .popup_search_wrap {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    #targetDevicePagePopup .popup_search_wrap .search_keyword {
        display: flex;
    }

    #targetDevicePagePopup.popup_modify .popup_modify_title_wrap {
        padding: 20px 20px 14px 20px;
        display: flex;
        justify-content: space-between;
        font-weight: 700;
        font-size: 16px;
    }

    #targetDevicePagePopup .popup_modify_title_wrap .popup_name {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    #targetDevicePagePopup .popup_search_wrap .search_keyword {
        border: none;
        border-bottom: 1px solid #E3E5E8;
    }

    #targetDevicePagePopup .popup_search_wrap .search_keyword input, .popup_search_wrap .search_keyword select {
        border: none;
    }

    #targetDevicePagePopup .popup_content .tabulator-header {
        background-color: white;
    }

    #targetDevicePagePopup .popup_content .half.right {
        background-color: #F7F8FA;
        font-size: 14px;
        padding: 1em;
        border-radius: .5em;
    }

    #targetDevicePagePopup .popup_content .half.right .title {
        display: flex;
        gap: 1em;
        align-items: center;
        color: #A7ADBA;
        font-weight: 700;
        margin-bottom: .5em;
    }

    #targetDevicePagePopup .reg_target_list {
        height: 360px;
        overflow: scroll;
        font-size: 13px;
    }

    #targetDevicePagePopup .reg_target_list li {
        padding-top: 6px;
        padding-bottom: 6px;
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid var(--color-border-in-light);
    }

    #targetDevicePagePopup .reg_target_list li .btn_x {
        cursor: pointer;
        margin-left: 1em;
    }

    #targetDevicePagePopup .popup_footer {
        margin: 1em;
    }

    #targetDevicePagePopup .popup_content .tabulator {
        border: none;
    }
</style>
<%-- 관리 > 장치 > 모니터링 화면 설정 > 등록 팝업 --%>
<div class="popup_common popup_modify" id="targetDevicePagePopup">
    <div class="popup_modify_title_wrap">
        <div class="popup_name">
            <img src="<c:url value="/images/maxy/icon-logging-page-modify.svg"/>" alt="">
            <span data-t="management.device.text.logPage"></span>
        </div>

        <div class="popup_search_wrap">
            <div class="search_keyword">
                <label for="popupTextType"></label><select id="popupTextType">
                <option value=""></option>
                <option value="appPageNm"></option>
                <option value="reqUrl"></option>
            </select>
            </div>

            <div class="search_keyword">
                <input id="searchPageText" type="text" placeholder="">
                <button id="btnPageSearch">
                    <img src="<c:url value="/images/maxy/icon-search-purple.svg"/>" width="20px" alt="search-bk">
                </button>
            </div>
        </div>
    </div>

    <div class="popup_content">
        <div class="half">
            <div class="table-group">
                <div id="searchAppPageListTable"></div>
            </div>
        </div>
        <div class="half right">
            <div class="title">
                <img src="<c:url value="/images/maxy/icon-page-reg-info.svg"/>" alt="">
                <span data-t="management.device.text.properties"></span>
            </div>

            <ul class="reg_target_list enable_scrollbar" id="regTargetList"></ul>
        </div>
    </div>

    <div class="popup_footer">
        <button class="btn_common opposite" id="targetDevicePageBtnSave" data-t="common.btn.save"></button>
    </div>
</div>
<script>
    var DM03P1 = {
        v: {
            table: [],
            saveItems: {}
        },
        //초기화 함수 모음
        init: {
            // 버튼 이벤트
            event() {
                const {func} = DM03P1
                // 저장 버튼 클릭 이벤트
                $('#targetDevicePageBtnSave').on('click', func.doSave)
                // 취소 버튼 클릭 이벤트
                $('.dimmed').on('click', func.cancelPopup)
                // 페이지 검색 버튼 클릭 이벤트
                $('#btnPageSearch').on('click', func.searchAppPageList)
                $("#searchPageText").keydown(function (key) {
                    if (key.keyCode === 13) {
                        func.searchAppPageList()
                    }
                });
            },
            created() {
                const {v, func} = DM03P1
                const placeHolderText = i18next.tns('common.msg.searchValue')
                $('#searchPageText').attr('placeholder', placeHolderText)

                // select box text 넣기
                const texts = ['all', 'pageName', 'reqUrl']
                texts.forEach((text, index) => {
                    $('#popupTextType > option:eq(' + index + ')').text(i18next.tns('management.device.btn.' + text))
                });
                func.createTable()
            }
        },
        // 일반 함수 모음
        func: {
            open() {
                const {func} = DM03P1

                const params = DM0300.v.search

                ajaxCall('/gm/0503/getTargetDevicePageList.maxy', params)
                    .then(data => {
                        const {targetDevicePageList} = data
                        func.setPageList(targetDevicePageList)
                    }).catch((error) => {
                    console.error(error)
                    toast(i18next.tns(error.msg))
                })
            },
            createTable() {
                const {v, func} = DM03P1
                const placeHolder = i18next.tns('common.msg.noData')
                v.table = new Tabulator("#searchAppPageListTable", {
                    height: '380px',
                    columnHeaderVertAlign: 'middle',
                    layout: "fitDataFill",
                    placeholder: placeHolder,
                    columns: [
                        {
                            title: "Requested URL",
                            field: "reqUrl",
                            vertAlign: "middle",
                            width: "60%"
                        },
                        {
                            title: "Page Name",
                            field: "appPageNm",
                            vertAlign: "middle",
                            width: "39%"
                        }
                    ],
                });

                //trigger an alert message when the row is clicked
                v.table.on("rowClick", (e, row) => {
                    func.setDevicePageNmArea(row.getData())
                });
            },
            searchAppPageList() {
                const {func} = DM03P1
                const param = {
                    packageNm: $('#selectedPackageNm').val(),
                    serverType: $('#selectedServerType').val(),
                    searchPageText: $('#searchPageText').val(),
                    searchPopupTextType: $('#popupTextType').val()
                }
                if (param.searchPageText.length < 4) {
                    toast(i18next.tns('common.msg.searchValueMore4'))
                    return
                }
                // 통신 시작
                ajaxCall('/gm/0503/getAppPageList.maxy', param)
                    .then(data => {
                        func.makeList(data)
                    })
                    .catch(error => {
                        toast(i18next.tns(error.msg))
                    })
            },
            makeList(data) {
                const {v} = DM03P1
                const {appPageList} = data
                if (appPageList.length <= 0) {
                    $('#regTargetList').empty()
                    v.table.replaceData([])
                    return
                }
                v.table.replaceData(appPageList)
            },
            // 저장 실행 함수
            doSave() {
                const {v, func} = DM03P1
                // 값 검증
                const params = func.valid()

                // 비어 있으면 검증 실패
                if (!params) {
                    return
                }

                // 통신 시작
                ajaxCall('/gm/0503/regTargetDevicePage.maxy', params)
                    .then(() => {
                        let params = {
                            packageNm: $('#selectedPackageNm').val(),
                            serverType: $('#selectedServerType').val(),
                            deviceId: $('#selectedDeviceId').val(),
                            targetId: $('#selectedTargetId').val()
                        }
                        const msg = i18next.tns('common.msg.add')
                        toast(msg)
                        DM0300.func.getTargetDevicePageList(params)
                        // 등록 팝업 닫기
                        func.cancelPopup()
                    })
                    .catch(error => {
                        toast(i18next.tns(error.msg))
                    })
            },
            // 값 검증 함수
            valid() {
                const {v} = DM03P1
                if (!v.saveItems) {
                    const msg = i18next.tns('management.device.msg.loggingPageSelect')
                    toast(msg)
                    return;
                }
                const appPageUrls = []
                for (let x of Object.entries(v.saveItems)) {
                    appPageUrls.push(x[1])
                }

                return {
                    packageNm: $('#selectedPackageNm').val(),
                    serverType: $('#selectedServerType').val(),
                    deviceId: $('#selectedDeviceId').val(),
                    appPageUrls: appPageUrls.join(',')
                }
            },

            // 팝업 닫기 함수
            cancelPopup() {
                const {v} = DM03P1
                // 닫을 때 list, input 값 모두 비우기
                $('#popupTextType').val('')
                $('#searchPageText').val('')
                $('#regTargetList').empty()
                v.saveItems = {}
                v.table.replaceData([])

                // hide
                $('.popup_common').hide()
                $('.dimmed').hide()
            },
            setDevicePageNmArea(data) {
                const {v} = DM03P1
                const $regTargetList = $('#regTargetList')

                const {appPageNm, reqUrl} = data
                const $liArray = $('#regTargetList li')

                // 중복 체크
                if ($liArray.length > 0) {
                    for (const li of $liArray) {
                        // 정규 표현식을 사용하여 대괄호 안의 내용만 추출
                        const match = li.textContent.match(/\[([^\]]+)]/)

                        if (match) {
                            if (reqUrl === match[1].trim()) {
                                toast(i18next.tns('common.msg.duplicated'))
                                return
                            }
                        }
                    }
                }

                // 이미 있는 list에서 최대값 찾기
                let max = 0
                for (let i = 0; i < $liArray.length; i++) {
                    const d = $($liArray[i]).data('id')
                    if (d > max) {
                        max = d
                    }
                }
                const idx = max + 1
                let addStr = (appPageNm ? appPageNm : '') + ' [ ' + reqUrl + ' ] '
                $regTargetList.append(`<li id="li__\${idx}" data-id="\${idx}"><span>\${addStr}</span><span class="btn_x">x</span></li>`)

                // 삭제 버튼 이벤트 추가
                const $btnX = $('li#li__' + idx + ' span.btn_x')
                $btnX.off('click')
                $btnX.on('click', function () {
                    delete v.saveItems[idx]
                    $('li#li__' + idx).remove()
                })

                v.saveItems[idx] = reqUrl
            },
            setPageList(data) {
                const {v} = DM03P1
                const $regTargetList = $('#regTargetList')
                $regTargetList.empty()
                if (!data) {
                    return
                }
                for (let idx = 0; idx < data.length; idx++) {
                    const x = data[idx]
                    const {appPageNm, reqUrl} = x

                    let addStr = (appPageNm ? appPageNm : '') + ' [ ' + reqUrl + ' ] '
                    $regTargetList.append(`<li data-id="\${idx}" id="li__\${idx}"><span>\${addStr}</span><span class="btn_x">x</span></li>`)

                    // 삭제 버튼 이벤트 추가
                    const $btnX = $('li#li__' + idx + ' span.btn_x')
                    $btnX.off('click')
                    $btnX.on('click', function () {
                        delete v.saveItems[idx]
                        $('li#li__' + idx).remove()
                    })

                    v.saveItems[idx] = reqUrl
                }
            },
        }
    }
    DM03P1.init.created()
    DM03P1.init.event()
</script>