<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<title>DSYM Mgmt.</title>
<style>
    .gm_contents .content_drop_wrap {
        display: flex;
    }

    .gm_contents .content_header_wrap {
        display: flex;
        flex-direction: row;
        margin-bottom: .5em;
        justify-content: space-between;
    }

    .gm_contents .btn {
        width: 32px;
        height: 32px;
        border: 1px solid var(--color-border-out-light);
        border-radius: var(--radius);
        background-color: white;
    }

    .gm_contents .add_btn_wrap {
        margin-top: 0;
        align-items: flex-end;
        margin-right: 2em;
    }

    .gm_contents .add_btn_wrap .btn {
        width: 100px;
        display: flex;
        justify-content: space-evenly;
        align-items: center;
        gap: 1em;
        font-weight: 500;
        cursor: pointer;
    }

    .gm_contents .add_btn_wrap i {
        width: 14px;
        height: 14px;
    }

    .gm_contents .add_btn_wrap .btn_save {
        content: url(/images/maxy/icon-save.svg);
    }

    .gm_contents .border_bottom_purple_wrap {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 1em !important;
    }

    .gm_contents .content_drop_wrap .filter_wrap {
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 1em;
    }

    .gm_contents .content_header_wrap .btn_delete {
        background: url(/images/maxy/icon-delete.svg) no-repeat center;
    }

    /* 드롭존 관련 스타일 */
    .dropzone-container {
        width: 100%;
        height: 120px;
        display: flex;
        gap: 1em;

    }

    .dropzone {
        width: calc(100% - 120px);
        height: 100%;
        border: 2px dashed #aaa;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background-color: #f9f9f9;
    }

    .dropzone:hover {
        border-color: #666;
        background-color: #f0f0f0;
    }

    .dropzone.active {
        border-color: #4a90e2;
        background-color: #e6f2ff;
    }

    .dropzone-text {
        font-size: 2em;
        font-weight: bold;
        color: #666;
        text-align: center;
    }

    .dropzone-subtext-wrap {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex-direction: column;
    }

    .dropzone-subtext {
        font-size: 1em;
        color: #999;
        margin-top: 5px;
        text-align: center;
    }
</style>
<%-- 관리 > DSYM 관리 --%>
<div class="gm_header">
    <div class="gm_menu_text_wrap">
        <h4 class="gm_menu_title" data-t="menu.management.dsymmgmt"></h4>
        <h5 class="gm_menu_desc" data-t="management.dsym.title.desc"></h5>
    </div>
    <div class="gm_filter_group">
        <div class="app_info_wrap">
            <label for="packageNm" class="app_icon">A</label>
            <select id="packageNm" class="app_info_select"></select>
        </div>
    </div>
</div>

<div class="gm_contents">
    <div class="content_drop_wrap">
        <div class="dropzone-container">
            <div id="dropzone" class="dropzone">
                <div class="dropzone-text" data-t="management.dsym.text.dropZone"></div>
                <div class="dropzone-subtext-wrap">
                    <div class="dropzone-subtext" data-t="management.dsym.text.dropZoneDesc1"></div>
                    <div class="dropzone-subtext" data-t="management.dsym.text.dropZoneDesc2"></div>
                    <div class="dropzone-subtext" data-t="management.dsym.text.dropZoneDesc3"></div>
                </div>
            </div>
            <div class="add_btn_wrap">
                <button class="btn" id="btnSave" data-t="common.btn.save"><i class="btn_save"></i></button>
            </div>
            <input type="file" id="fileInput" style="display: none;" accept=".zip,.gz,.gzip" />
        </div>
    </div>
    <div class="border_bottom_purple_wrap"></div>
    <div class="content_header_wrap">
        <div class="filter_wrap">
            <select id="filter-field">
                <option value="" data-t="common.text.textall"></option>
                <option value="fileName">File Name</option>
                <option value="appVer">App Ver</option>
                <option value="appBuildNum">App Build Num</option>
                <option value="uuid">UUID</option>
            </select>
            <input id="filter-value" type="text" placeholder=""/>
        </div>
        <button class="btn btn_delete" id="btnDelete"></button>
    </div>
    <div class="table_wrap">
        <div id="dsymTable"></div>
    </div>
</div>

<div class="dimmed" data-content="dimmed"></div>

<%--suppress ES6ConvertVarToLetConst --%>
<script>
    var GM0702 = {
        v: {
            param: {},
            selectedFile: null, // 선택된 파일을 저장할 변수
            maxFileSize: '${maxFileSize}' // 서버에서 전달받은 MAX_FILE_SIZE
        },

        init: {
            /**
             * 이벤트 리스너 등록
             * - 파일 업로드 관련 이벤트
             * - 필터 검색 관련 이벤트
             */
            event() {
                const {func} = GM0702

                const dropzone = document.getElementById('dropzone')
                const fileInput = document.getElementById('fileInput')
                const btnSave = document.getElementById('btnSave')
                const btnDelete = document.getElementById('btnDelete')
                const filterField = document.getElementById('filter-field')
                const filterValue = document.getElementById('filter-value')

                // Save 버튼 클릭 이벤트 처리
                btnSave.addEventListener('click', () => {
                    func.save()
                })

                // Delete 버튼 클릭 이벤트 처리
                btnDelete.addEventListener('click', () => {
                    func.delete()
                })

                // 필터 검색 이벤트 처리
                filterValue.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        func.searchWithFilter()
                    }
                })

                // 필터 필드 변경 시 검색값 초기화 및 placeholder 설정
                filterField.addEventListener('change', () => {
                    filterValue.value = ''
                    const selectedField = filterField.value
                    filterValue.placeholder = trl('common.msg.required.filter')
                    filterValue.type = 'text'

                    // 필터 필드가 선택되지 않은 경우 전체 조회
                    if (!selectedField) {
                        func.getData()
                    }
                });

                // 드래그된 파일이 있는 상태에서 기본 동작 방지
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropzone.addEventListener(eventName, e => e.preventDefault())
                    dropzone.addEventListener(eventName, e => e.stopPropagation())
                })

                // 드래그 오버 시 스타일 변경
                dropzone.addEventListener('dragover', () => {
                    dropzone.classList.add('active')
                })

                dropzone.addEventListener('dragleave', () => {
                    dropzone.classList.remove('active')
                })

                // 파일이 드롭되었을 때 처리
                dropzone.addEventListener('drop', e => {
                    dropzone.classList.remove('active')
                    const files = e.dataTransfer.files
                    handleFiles(files)
                })

                // 드롭존 클릭 시 파일 선택 다이얼로그 표시
                dropzone.addEventListener('click', () => {
                    fileInput.click()
                })

                // 파일 선택 시 처리
                fileInput.addEventListener('change', () => {
                    const files = fileInput.files
                    handleFiles(files)
                })

                // 파일 처리 함수
                function handleFiles(files) {
                    for (const file of files) {
                        // 파일 유효성 검사
                        if (func.validFile(file)) {
                            // 유효한 파일이면 selectedFile에 저장 (업로드는 Save 버튼 클릭 시 수행)
                            GM0702.v.selectedFile = file
                            // 파일이 선택되었음을 사용자에게 알림
                            const dropzone = document.getElementById('dropzone')
                            dropzone.querySelector('.dropzone-text').textContent = file.name
                        }
                    }
                    // 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
                    fileInput.value = ''
                }
            },

            /**
             * 페이지 초기화
             * - 테이블 생성 및 초기 데이터 로딩
             */
            async created() {
                const {func} = GM0702
                updateContent()

                // app info 설정, pIdCb: packageNm onChange 콜백함수
                await appInfo.append({
                    pId: 'packageNm',
                    pIdCb: func.appInfoPackageNmCb,
                })

                // 테이블 생성
                func.drawTable()

                // 초기 데이터 로딩 (전체 조회)
                func.getData()

                // 다국어 동적값 변경
                $('[data-t="management.dsym.text.dropZoneDesc3"]').text(trl('management.dsym.text.dropZoneDesc3').replace('{size}', util.convertBytes(GM0702.v.maxFileSize)))
            }
        },

        func: {
            // appInfo.js에서 #packageNm의 onChange 후 콜백함수
            async appInfoPackageNmCb() {
                const {func} = GM0702

                sessionStorage.setItem('osType', 'A')
                sessionStorage.setItem('appVer', 'A')

                func.getData()
            },
            /**
             * 파일 유효성 검사
             * - 압축 파일인지 확인 (zip, gz)
             * - 파일 크기 확인
             * @param {File} file - 검사할 파일 객체
             * @returns {boolean} - 유효한 파일이면 true, 아니면 false
             */
            validFile(file) {
                // 압축 파일 확장자 목록
                const compressedExtensions = ['.zip', '.gz', '.gzip']

                // 파일 이름에서 확장자 추출
                const fileName = file.name.toLowerCase()
                const fileExt = fileName.substring(fileName.lastIndexOf('.'))

                // 파일 크기 (바이트 단위)
                const fileSize = file.size

                // 압축 파일인지 확인
                const isCompressedFile = compressedExtensions.includes(fileExt)

                // 파일 크기가 제한 이내인지 확인
                const isSizeValid = fileSize <= GM0702.v.maxFileSize

                // 유효성 검사 결과 메시지 표시
                if (!isCompressedFile) {
                    const msg = trl('management.dsym.text.dropZoneDesc2')
                    modal.show({
                        msg: '<div>' + msg + '</div>'
                    })
                    return false
                }

                if (!isSizeValid) {
                    const msg = trl('management.dsym.text.dropZoneDesc3').replace('{size}', util.convertBytes(GM0702.v.maxFileSize))
                    modal.show({
                        msg: '<div>' + msg + '</div>'
                    })
                    return false
                }

                return true
            },
            /**
             * 저장 이벤트
             * - 선택된 파일이 있으면 업로드 진행
             * - 선택된 파일이 없으면 경고 메시지 표시
             */
            save() {
                const {v, func} = GM0702

                // 선택된 파일이 있는지 확인
                if (v.selectedFile) {
                    // 선택된 파일이 있으면 업로드 진행
                    func.uploadFile(v.selectedFile)
                    // 업로드 후 선택된 파일 초기화
                    v.selectedFile = null
                } else {
                    // 선택된 파일이 없으면 경고 메시지 표시
                    const msg = trl('management.dsym.text.validFile')
                    modal.show({
                        msg: '<div>' + msg + '</div>'
                    })
                }
            },
            /**
             * upload 성공시 input 및 업로드 관련 초기화
             * - 파일 입력 초기화
             * - 드롭존 상태 초기화
             * - 선택된 파일 초기화
             * - 드롭존 텍스트 초기화
             */
            resetInput() {
                const {v} = GM0702

                // 파일 입력 초기화
                document.getElementById('fileInput').value = ''

                // 드롭존 상태 초기화
                const dropzone = document.getElementById('dropzone')
                dropzone.classList.remove('active')

                // 선택된 파일 초기화
                v.selectedFile = null

                // 드롭존 텍스트 초기화
                const originalText = trl('management.dsym.text.dropZone')
                dropzone.querySelector('.dropzone-text').textContent = originalText
            },
            /**
             * 파일 업로드
             * - FormData를 사용하여 파일 업로드
             * - 업로드 성공 시 데이터 갱신 및 입력 초기화
             * @param {File} file - 업로드할 파일 객체
             */
            uploadFile(file) {
                const {func} = GM0702

                // 로딩 표시
                cursor.show()

                // FormData 객체 생성
                const formData = new FormData()
                formData.append('file', file)
                formData.append('packageNm', sessionStorage.getItem('packageNm'))
                formData.append('serverType', sessionStorage.getItem('serverType'))

                // AJAX 요청 설정
                $.ajax({
                    url: '/gm/0702/uploadDsym.maxy',  // 서버의 업로드 엔드포인트
                    type: 'POST',
                    data: formData,
                    contentType: false,  // 필수: FormData 사용 시 false로 설정
                    processData: false,  // 필수: FormData 사용 시 false로 설정
                    success: function(response) {
                        const msg = trl('common.msg.uploadSuccess')
                        modal.show({
                            msg: '<div>' + msg + '</div>'
                        })

                        // 데이터 갱신 및 입력 초기화 (resetInput에서 드롭존 텍스트도 초기화함)
                        func.getData()
                        func.resetInput()

                        cursor.hide()
                    },
                    error: function(xhr, status, error) {
                        cursor.hide()
                        // 업로드 실패 시 처리
                        const msg = trl('common.msg.uploadError') + '<br>' + (xhr.responseJSON?.message || error)
                        modal.show({
                            msg: '<div>' + msg + '</div>'
                        })

                        // 실패 시에도 입력 초기화 (resetInput에서 드롭존 텍스트도 초기화함)
                        func.resetInput();
                    }
                });
            },

            /**
             * 선택된 DSYM 파일 정보 삭제
             * - 테이블에서 선택된 행들을 확인
             * - 각 선택된 행에 대해 삭제 API 호출
             * - 로컬 파일과 DB 레코드 모두 삭제
             */
            delete() {
                const {v, func} = GM0702

                // 선택된 행들 가져오기
                const selectedRows = v.table.getSelectedRows();

                if (selectedRows.length === 0) {
                    // 선택된 행이 없는 경우 경고 메시지 표시
                    const msg = trl('common.msg.noSelectDel')
                    modal.show({
                        msg: '<div>' + msg + '</div>'
                    });
                    return;
                }

                // 삭제 확인 메시지 표시
                const confirmMsg = trl('common.msg.selectDel');

                modal.show({
                    msg: '<div>' + confirmMsg + '</div>',
                    confirm: true,
                    fn: () => {
                        // 삭제 진행
                        func.performDelete(selectedRows)
                    }
                });
            },

            /**
             * 실제 삭제 작업 수행
             * - 선택된 각 행에 대해 삭제 API 호출
             * - 성공/실패 결과를 집계하여 사용자에게 알림
             * @param {Array} selectedRows - 삭제할 행들의 배열
             */
            async performDelete(selectedRows) {
                const {func} = GM0702

                const failMessages = []

                // 로딩 표시
                cursor.show()

                // 각 선택된 행에 대해 삭제 API 호출
                for (const row of selectedRows) {
                    const rowData = row.getData()

                    try {
                        // 삭제 API 호출을 위한 파라미터 구성
                        const deleteParam = {
                            packageNm: sessionStorage.getItem('packageNm'),
                            serverType: sessionStorage.getItem('serverType'),
                            osType: rowData.osType,
                            appVer: rowData.appVer,
                            appBuildNum: rowData.appBuildNum
                        }

                        // 삭제 API 호출
                        const response = await ajaxCall('/gm/0702/deleteDsymFile.maxy', deleteParam)

                        if (response.status !== 200) {
                            failMessages.push(rowData.fileName + ' : ' + response.message)
                        }
                    } catch (error) {
                        failMessages.push(rowData.fileName)
                    }
                }

                // 결과 메시지 구성 및 표시
                let resultMsg = ''
                if (failMessages.length > 0) {
                    resultMsg = '<div>' + trl('common.msg.failDel') + '</div>'
                    for (const failMessage of failMessages) {
                        resultMsg += failMessage + '<br>'
                    }
                } else {
                    resultMsg = '<div>' + trl('common.msg.delete') + '</div>'
                }

                cursor.hide()
                // 결과 메시지 표시
                modal.show({
                    msg: resultMsg
                })

                // 테이블 데이터 갱신
                func.getData()
            },
            /**
             * DSYM 파일 정보 테이블 그리기
             * - Tabulator를 사용하여 DSYM 파일 정보를 표시하는 테이블 생성
             * - 체크박스, 파일명, OS타입, UUID, 앱버전, 빌드번호, 등록일 컬럼 포함
             */
            drawTable() {
                const placeholder = i18next.tns('common.msg.noData')
                const {v} = GM0702
                v.table = new Tabulator("#dsymTable", {
                    placeholder: placeholder,
                    height: '60vh',
                    layout: "fitDataFill",
                    columns: [
                        {
                            formatter: "rowSelection",
                            titleFormatter: "rowSelection",
                            hozAlign: "center",
                            headerSort: false,
                            vertAlign: "middle",
                            width: "3%"
                        },
                        {
                            title: "File Name",
                            field: "fileName",
                            width: '20%',
                            vertAlign: 'middle',
                            hozAlign: 'left'
                        },
                        {
                            title: "OS Type",
                            field: "osType",
                            width: '10%',
                            vertAlign: 'middle',
                            hozAlign: 'center'
                        },
                        {
                            title: "UUID",
                            field: "uuid",
                            vertAlign: 'middle',
                            width: '25%',
                            hozAlign: 'left'
                        },
                        {
                            title: "App Ver",
                            field: "appVer",
                            width: '12%',
                            vertAlign: 'middle',
                            hozAlign: 'center'
                        },
                        {
                            title: "App Build Num",
                            field: "appBuildNum",
                            width: '15%',
                            vertAlign: 'middle',
                            hozAlign: 'center'
                        },
                        {
                            title: "Reg Date",
                            field: "regDt",
                            width: '15%',
                            vertAlign: 'middle',
                            hozAlign: 'center',
                            formatter: cell => {
                                return util.datetimeFormat(cell.getValue())
                            }
                        }
                    ]
                })

                util.likeSearchTable(v.table)
            },
            setData(data) {
                const {v} = GM0702
                if (data) {
                    v.table.setData(data)
                }
            },
            /**
             * DSYM 파일 정보 목록 조회
             */
            getData() {
                const {func} = GM0702

                // 기본 파라미터 설정
                const param = {
                    packageNm: sessionStorage.getItem('packageNm'),
                    serverType: sessionStorage.getItem('serverType')
                }

                // API 호출
                ajaxCall('/gm/0702/getDsymFileList.maxy', param)
                    .then(response => {
                        // 응답 데이터 구조 확인 후 테이블에 설정
                        if (response && response.data) {
                            func.setData(response.data)
                        } else {
                            func.setData([])
                        }
                    })
                    .catch(err => {
                        toast(err.msg)
                        func.setData([])
                    })
            },

            /**
             * 필터 검색 실행
             * - 필터 조건에 따라 데이터 재조회
             */
            searchWithFilter() {
                const {func} = GM0702
                func.getData()
            }
        }
    }
    GM0702.init.event()
    GM0702.init.created()
</script>
