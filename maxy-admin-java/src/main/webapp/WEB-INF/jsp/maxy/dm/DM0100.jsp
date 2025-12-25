<%--suppress CssUnusedSymbol, suppress RequiredAttributes, suppress ES6ConvertVarToLetConst --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<style>
    .tabulator-cell[tabulator-field="deviceId"] {
        display: block !important;
        text-overflow: ellipsis;
        height: auto !important;
    }

    #deviceListTable .btn_yn {
        background-color: transparent !important;
    }

    .gm_menu_desc #appInfoText {
        color: var(--logo-blue-1);
    }
</style>

<%-- 관리 > 장치 > 장치 현황 --%>
<div class="contents_header">
    <div class="ctts_h_left">
        <div class="gm_menu_text_wrap">
            <div class="title_option_desc">
                <h4 class="gm_menu_title" data-t="management.title.deviceList"></h4>
            </div>

            <h5 class="gm_menu_desc">
                <span id="appInfoText"></span>
                <span data-t="management.title.desc.deviceList"></span>
            </h5>
        </div>

    </div>
    <div class="ctts_h_right mt_auto">
        <button id="btnReg" class="btn_common">
            <span data-t="common.btn.register"></span>
            <img class="img_entry" alt="">
        </button>
    </div>
</div>
<div class="table-group">
    <div id="deviceListTable"></div>
    <div class="add_btn_wrap">
        <label for="limit"></label>
        <select id="limit">
            <option value="100" selected>100</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
            <option value="10000">10000</option>
        </select>
        <button id="btnLoadMoreData" class="btn btn_common opposite" data-t="common.btn.more"></button>
    </div>
</div>
<jsp:include page="DM01P1.jsp"/>
<jsp:include page="DM01P2.jsp"/>
<script>
    var DM0100 = {
        v: {
            table: '',
            // 검색 매개 변수 저장용. 페이지 이동시에도 동일한 검색 결과를 바탕으로 이동해야 함
            searchParam: {
                searchOsType: '',
                searchTextType: '',
                searchValue: '',
                searchPackageNm: '',
                searchServerType: '',
                searchTargetSt: '',
            },
            limit: 100,
            offset: 0,
            listSize: '',
            targetId: -1
        },

        init: {
            // 버튼 이벤트 등록
            event() {
                const {v, func} = DM0100
                // 더 보기 버튼
                $('#btnLoadMoreData').on('click', func.loadMoreData)
                // 모니터링 대상 직접 등록 버튼
                $('#btnReg').on('click', func.openInsertPopup)
            },
            // 화면이 켜지고 초기값 세팅하는 함수 모음
            created() {
                const {func} = DM0100
                updateContent()
                search.append({
                    keyword: true,
                    type: [
                        'textType1',
                        'osType',
                        'appInfo',
                    ],
                    func: func.doSearch
                }).then(() => {
                    search.load()
                    func.createTable()
                    func.getData()
                })
            }
        },

        func: {
            /**
             * 데이터 추가 조회
             * offset, limit 를 지정하고 데이터 조회 함수 호출
             */
            loadMoreData() {
                const {v, func} = DM0100
                v.offset += Number(v.listSize)
                v.limit = Number($('#limit').val())
                func.getData()
            },
            /**
             * 검색조건을 넣어 조회
             */
            doSearch() {
                const {v, func} = DM0100
                // 검색어
                v.searchParam.searchValue = $('#searchText').val()
                // 검색어의 종류(deviceId, userId, userNm)
                v.searchParam.searchTextType = $('#textType').val()
                // 운영체제
                v.searchParam.searchOsType = $('#osType').val().toLowerCase()

                // 0 페이지부터 조회하도록 페이징 옵션 초기화
                v.offset = 0
                v.limit = 100
                $('#limit').val(100)

                // 데이터 조회
                func.getData()

                // 실패, 성공에 관계 없이 검색 조건 save
                search.save()
            },
            /**
             * 장치 목록 테이블 생성
             */
            createTable() {
                const {v, func} = DM0100

                const placeHolderText = trl('common.msg.noData')
                /**
                 * Y/N -> on/off
                 * @param status
                 * @returns {string}
                 */
                const onOff = function (status) {
                    if (status === 'Y') {
                        return "<span class='btn_yn'>ON</span>"
                    } else if (status === 'N') {
                        return "<span class='btn_yn off'>OFF</span>"
                    }
                }

                const columnNames = {
                    'deviceId': trl('common.tableColumn.deviceId'),
                    'userId': trl('common.text.userId'),
                    'model': trl('common.tableColumn.model'),
                    'use': trl('common.tableColumn.use'),
                    'vip': trl('management.device.text.vipYn'),
                    'makeType': trl('common.tableColumn.makeType'),
                    'regDt': trl('common.tableColumn.regDt'),
                }

                v.table = new Tabulator("#deviceListTable", {
                    height: 'calc(100vh - 225px)',
                    layout: "fitDataFill",
                    columnHeaderVertAlign: 'middle',
                    placeholder: placeHolderText,
                    columns: [
                        {
                            title: columnNames.deviceId,
                            field: "deviceId",
                            vertAlign: "middle",
                            width: "30%"
                        },
                        {
                            title: columnNames.userId,
                            field: "userId",
                            vertAlign: "middle",
                            width: "20%",
                            tooltip: util.tooltipFormatter
                        },
                        {
                            title: "OS",
                            field: "osType",
                            vertAlign: "middle",
                            width: "10%"
                        },
                        {
                            // Model 정보 (MD)
                            title: columnNames.model,
                            field: "modelNo",
                            vertAlign: "middle",
                            width: "15%",
                            formatter: function (cell) {
                                return getDeviceModel(cell.getValue())
                            }
                        },
                        {
                            // 사용 여부 (MTA)
                            title: columnNames.use,
                            field: "useYn",
                            vertAlign: "midddle",
                            width: "6%",
                            formatter: function (cell) {
                                return onOff(cell.getValue())
                            }
                        },
                        {
                            // VIP 여부 (MTA)
                            title: columnNames.vip,
                            field: "vipYn",
                            vertAlign: "midddle",
                            width: "6%",
                            formatter: function (cell) {
                                return onOff(cell.getValue())
                            }
                        },
                        {
                            // 등록 시간 (MD)
                            title: columnNames.regDt,
                            field: "regDt",
                            vertAlign: "midddle",
                            width: "10%",
                            formatter: function (cell) {
                                return util.datetimeFormat(cell.getValue())
                            }
                        },
                    ],
                })

                // row click 하면 row 전체 데이터를 가지고 등록/수정 팝업을 연다
                v.table.on("rowClick", (e, row) => {
                    func.openSavePopup(row.getData())
                })
            },
            /**
             * 등록  팝업 open
             * 신규 등록시 데이터 없음
             */
            openInsertPopup() {
                $('.dimmed').show()
                $('#vipN').prop('checked', true)
                $('#targetDeviceInsertPopup').show()

                const $_packageNm = $('#_packageNm')
                const selectedPackageNm = sessionStorage.getItem('packageNm')
                const selectedServerType = sessionStorage.getItem('serverType')
                if (!$_packageNm.val()) {
                    $_packageNm.find('option[value="' + selectedPackageNm + '"][data-server-type="' + selectedServerType + '"]').prop('selected', true);
                }
            },
            /**
             * 수정 팝업 open
             * @param data 클릭한 테이블의 데이터
             */
            openSavePopup(data) {
                const {v} = DM0100
                const $dimmed = $('.dimmed')

                let {
                    deviceId,
                    targetId,
                    packageNm,
                    serverType,
                    osType,
                    useYn,
                    vipYn,
                    emailAddr,
                    phoneNo,
                    userNm,
                    userId,
                    birthDay,
                    clientNm
                } = data

                if (targetId === undefined || util.isEmpty(targetId)) {
                    toast(trl('management.device.msg.targetIdEmpty'))
                    return
                }

                // 수정팝업인 경우에만 useYn toggle 버튼 보이기
                $('.use_yn_wrap').show()
                const $useYn = $('#mUseYn')
                $useYn.val(useYn)
                if (useYn === 'Y') {
                    $useYn.prop('checked', true)
                } else {
                    $useYn.prop('checked', false)
                }

                // 아래는 전부 다 클릭된 데이터를 팝업의 input 에 넣어주는 과정
                $('#mDeviceId').val(deviceId)
                $('#mUserId').val(userId)
                $('#mPackageNm option').each(function () {
                    if ($(this).val() === packageNm && $(this).data('server-type') === Number(serverType)) {
                        $(this).prop('selected', true)
                    }
                })
                $('#mOsType').val(osType).prop('checked', true)

                const $vipY = $('#mVipY')
                const $vipN = $('#mVipN')
                if (vipYn === 'Y') {
                    $vipY.prop('checked', true)
                } else {
                    $vipN.prop('checked', true)
                }

                $('#mUserNm').val(userNm)
                $('#mEmailAddr').val(emailAddr)
                $('#mPhoneNo').val(phoneNo)
                $('#mTargetId').val(targetId)

                if (!util.isEmpty(userId) && userId !== '-') {
                    const userInfo = (util.isEmpty(clientNm) ? '-' : clientNm) +
                        ' / ' + (util.isEmpty(userNm) ? '-' : userNm) +
                        ' / ' + userId +
                        ' / ' + (util.isEmpty(birthDay) ? '-' : birthDay)

                    if (v.userInfoTooltip) {
                        v.userInfoTooltip[0].setContent(userInfo)
                    } else {
                        v.userInfoTooltip = tippy('#mUserId', {
                            content: userInfo,
                            arrow: false,
                            placement: 'bottom',
                            allowHTML: true,
                            theme: 'maxy-tooltip'
                        })
                    }
                }

                $('#targetDeviceModifyPopup').show()
                $dimmed.show()
            },
            // 삭제 modal open
            openDeleteModal() {
                const {func} = DM0100
                const {targetIdList} = func.getSelectedItem()
                if (targetIdList) {
                    const lang = localStorage.getItem('lang')
                    let msg
                    if (lang === 'ko' || lang === 'ja') {
                        msg = targetIdList.length + trl('common.msg.countdelete')
                    } else if (lang === 'en') {
                        msg = trl('common.msg.countdelete') + targetIdList.length + ' items?'
                    }

                    modal.show({
                        id: 'deleteDeviceModal',
                        msg: msg,
                        confirm: true,
                        fn: () => {
                            func.deleteTargetDevice()
                        }
                    })
                }
            },

            // 삭제 함수
            deleteTargetDevice() {
                const {v, func} = DM0100
                const param = func.getSelectedItem()

                param.packageNm = $('#packageNm').val()
                param.serverType = $('#packageNm option:checked').data('server-type')

                ajaxCall('/gm/0501/delMonitoringTarget.maxy', param)
                    .then((data) => {
                        const msg = trl('common.msg.delete')
                        toast(msg)
                        if (v.searchParam.searchTargetSt !== '') {
                            func.getData()
                        } else {
                            func.makeList(data)
                        }
                    })
                    .catch(error => {
                        const config = {
                            id: 'errorModal',
                            msg: error.msg
                        }
                        modal.show(config)
                    })
            },
            /**
             * 테이블의 다중 선택된 값을 반환함
             */
            getSelectedItem() {
                const {v} = DM0100
                const targetIdList = []
                for (const {targetId}
                    of v.table.getSelectedData()) {
                    targetIdList.push(Number(targetId))
                }

                if (targetIdList.length < 1) {
                    const msg = trl('common.msg.noSelect')
                    toast(msg)
                    return false
                }

                return {targetIdList}
            },
            setTargetDevice() {
                const {v, func} = DM0100

                const deviceList = []
                for (const {deviceId, serverType, packageNm}
                    of v.table.getSelectedData()) {
                    deviceList.push({
                        deviceId,
                        serverType,
                        packageNm
                    })
                }

                if (deviceList.length < 1) {
                    const msg = trl('common.msg.noSelect')
                    toast(msg)
                    return
                }

                ajaxCall('/gm/0501/regMonitoringTarget.maxy', {
                    deviceListStr: JSON.stringify(deviceList),
                    packageNm: $('#packageNm').val(),
                    serverType: $('#packageNm option:checked').data('server-type')
                }).then((data) => {
                    const msg = trl('common.msg.add')
                    toast(msg)
                    v.listSize = data.length
                    func.makeList(data)
                    $('#appInfoText').text($('#packageNm  > option:selected').text())
                }).catch((error) => {
                    console.log(error)
                    const msg = trl('common.msg.serverError')
                    toast(error.msg ? trl(error.msg) : msg)
                })
            },
            getData() {
                const {v, func} = DM0100
                v.searchParam.packageNm = $('#packageNm').val()
                v.searchParam.serverType = $('#packageNm option:checked').data('server-type')
                v.searchParam.searchOsType = $('#osType').val()

                const params = {
                    'limit': v.limit,
                    'offset': v.offset,
                    ...v.searchParam
                }

                if (util.checkParam(params)) {
                    return
                }

                ajaxCall('/gm/0501/getDeviceList.maxy', params).then((data) => {
                    v.listSize = data.length
                    func.makeList(data)
                    $('#appInfoText').text($('#packageNm  > option:selected').text())
                }).catch((error) => {
                    console.log(error)
                    const msg = trl('common.msg.serverError')
                    toast(error.msg ? trl(error.msg) : msg)
                })
            },
            makeList(data) {
                const {v} = DM0100
                if (data) {
                    if (v.offset > 0) {
                        v.table.addData(data)
                        v.table.setPageSize(v.limit)
                    } else {
                        v.table.setData(data)
                    }
                }
            },
            // 버튼명 '전체' -> '모니터링 ON' -> '모니터링 OFF' 순으로 변경
            toggleTargetSt() {
                const {v, func} = DM0100
                const target = $('#selectTargetSt > option:selected')
                v.searchParam.searchTargetSt = target.val()

                func.getData()
            }
        }
    }

    DM0100.init.created()
    DM0100.init.event()
</script>