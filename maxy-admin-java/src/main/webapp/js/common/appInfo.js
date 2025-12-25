'use strict';

/**
 * packageNm / serverType 객체
 *
 * 로그인 페이지 등에서 JSON parse 에러 발생하는 것을 방지 하기 위한 더미가 존재
 */
// 페이지 정보를 담고 있는 객체
const aliasMap = {}
const logDictionaryMap = {}
// deviceModel 정보를 담고 있는 객체
const deviceModelMap = {}
const logTypeSetMap = {}

const appInfo = {
    // select id 임시 저장 변수
    id: {},
    packageInfo: {},
    serverType: {},
    packageOrder: {},
    // 앱 정보 저장할 기본 id
    types: [
        'packageNm', 'serverType', 'osType', 'appVer'
    ],
    /**
     * packageNm:serverType
     *
     * @param packageNm
     * @return Array [packageNm, serverType]
     */
    parse(packageNm) {
        if (packageNm) {
            const a = packageNm.split(':');
            return a.length > 1 ? a : [a[0],];
        }
    },
    /**
     * Select box 를 매개변수의 값에 위치하도록 설정
     */
    select: {
        /**
         * packageNm Select box 를 매개변수의 값에 위치하도록 설정
         * @param selector querySelector ('#packageNm')
         * @param packageNm packageNm 값
         * @param serverType serverType 값
         */
        packageNm(selector, packageNm, serverType) {
            console.log(selector, packageNm, serverType)
            if (!packageNm) {
                $(selector + ' option:eq(0)').prop("selected", true)
            }
            if (serverType === undefined) {
                serverType = '0'
            }
            // packageNm의 모든 option을 순회하며 server-type과 value가 모두 일치하는 option 선택
            $(selector + ' option').each(function () {
                if ($(this).val() === packageNm
                    && $(this).data('server-type') === serverType) {
                    // 일치하는 항목 선택
                    $(this).prop('selected', true)
                } else {
                    // 일치하지 않는 항목은 선택 해제
                    $(this).prop('selected', false)
                }
            })
        },
        /**
         * osType Select box 를 매개변수의 값에 위치하도록 설정
         * @param selector querySelector ('#osType')
         * @param osType osType 값
         */
        osType(selector, osType) {
            if (!osType) {
                $(selector + ' option:eq(0)').prop("selected", true)
            }

            $(selector + ' option').each(function () {
                if ($(this).val() === osType) {
                    // 일치하는 항목 선택
                    $(this).prop('selected', true)
                } else {
                    // 일치하지 않는 항목은 선택 해제
                    $(this).prop('selected', false)
                }
            })
        },
        /**
         * appVer Select box 를 매개변수의 값에 위치하도록 설정
         * @param selector querySelector ('#appVer')
         * @param appVer appVer 값
         */
        appVer(selector, appVer) {
            if (!appVer) {
                $(selector + ' option:eq(0)').prop("selected", true)
            }
            $(selector + ' option').each(function () {
                if ($(this).val() === appVer) {
                    // 일치하는 항목 선택
                    $(this).prop('selected', true)
                } else {
                    // 일치하지 않는 항목은 선택 해제
                    $(this).prop('selected', false)
                }
            })
        }
    },
    /**
     * 패키지명 추가
     * @param $select  package name selectbox
     * @param targetPage
     * @return {Promise<void>}
     */
    async setPackageNm($select, targetPage) {
        // 기존에 있던 select 비우기
        $select.empty()
        // console.log($select)
        // [키, 값] 쌍을 담은 배열을 반환  ['maxy:1', {~~~}]
        // 배열을 정렬
        const packageNmArray = appInfo.sort(Object.entries(appInfo.packageInfo), appInfo.packageOrder)
        for (const i in packageNmArray) {
            const list = Object.values(packageNmArray[i])
            const packageNm = list[0];
            if (!list[1]) {
                console.log('no package info')
                break
            }
            const osList = Object.values(list[1])
            if (!osList[0]) {
                console.log('no osType info')
                break
            }
            const appVerList = Object.values(osList[0])
            if (!appVerList[0]) {
                console.log('no appVer info')
                break
            }
            const displayNm = appVerList[0].displayNm
            // maxy:0 을 : 기준으로 자름
            const data = this.parse(packageNm);
            // serverType: number
            const serverTypeIndex = parseInt(data[1]);
            // serverType: string
            let serverType = appInfo.serverType[serverTypeIndex];
            serverType = i18next.tns('common.' + serverType)
            // value: package name, text: package name ( server type )
            const attr = {value: data[0], text: displayNm + ' (' + serverType + ')',}
            // data-server-type: server type(number)
            $select.append($('<option>', attr).attr('data-server-type', serverTypeIndex));
        }

        let selectedPackageNm = sessionStorage.getItem('packageNm')
        let selectedServerType = sessionStorage.getItem('serverType')

        // 첫 로그인시에는 쿠키에 저장된 최근 선택한 패키지로 선택되게끔
        if(selectedPackageNm === null && selectedServerType === null) {
            const maxyMode = sessionStorage.getItem('maxyMode') || 'maxy'
            const currentPackage = util.getCookie(maxyMode + 'CurrentPackage')

            if(currentPackage !== null) {
                selectedPackageNm = currentPackage.split(':')[0]
                selectedServerType = currentPackage.split(':')[1]
            }
        }

        // 관리 > Components > Version comparison 팝업에선 현재 보고있는 패키지 (세션에 저장된 패키지) 만
        // 선택되도록 함 (변경도 불가능 함)
        if (targetPage === 'GM0302') {
            $select.find('option').each(function () {
                if ($(this).val() === selectedPackageNm && $(this).data('server-type') === Number(selectedServerType)) {
                    $(this).prop("selected", true);
                }
            })
        } else {
            const savedData = packageNmArray.find(function (element) {
                return element[0].includes(selectedPackageNm) && element[0].includes(selectedServerType)
            })

            // 저장된 데이터가 있고, options의 데이터 중에 저장된 데이터가 포함되어 있으면
            if (selectedPackageNm !== undefined && selectedServerType !== undefined && savedData) {
                $select.find('option[value="' + selectedPackageNm + '"][data-server-type="' + selectedServerType + '"]').prop('selected', true);

                // $select.find('option').each(function () {
                //     if ($select.val() === selectedPackageNm && $select.data('server-type') === Number(selectedServerType)) {
                //         $select.prop("selected", true);
                //     }
                // })
            } else {
                $select.find('option:eq(0)').prop("selected", true)
            }
        }
    },
    /**
     * 서버 유형 추가
     * @param $select
     * @param packageNm
     * @param serverType
     * @param isOnChanged {boolean=} onChange 이벤트에서 넘어왔을 경우 sessionStorage 에서 가져오지 않도록 하는 플래그
     * @param targetPage
     * @return {Promise<void>}
     */
    async setOsType($select, packageNm, serverType, isOnChanged, targetPage) {
        if (!$select || !packageNm) {
            console.log('check parameter')
            return
        }
        $select.empty()

        // 선택한 데이터 객체 가져오기
        const selectedData = appInfo.packageInfo[`${packageNm}:${serverType}`];

        if (selectedData) {
            const osTypes = Object.keys(selectedData)
            osTypes.sort()
            // 선택한 패키지명, 서버타입의 os type을 가져와서 세팅
            for (const osType of osTypes) {
                // text를 '전체'로 설정
                const all = i18next.tns('dashboard.bi.allOsType')
                const text = osType === 'A' ? all : osType
                const attr = {
                    value: osType,
                    text: text
                };
                const $op = $('<option>', attr)
                $select.append($op)
            }
        }

        const saved = sessionStorage.getItem('osType')

        // 저장된 데이터가 있고, onChange 이벤트에서 넘어오지 않았고, options 의 데이터중에 저장된 데이터가 포함되어 있으면
        if (saved !== undefined && Object.keys(selectedData).includes(saved)
            && !isOnChanged) {
            // 해당 데이터를 찾아 select
            $select.val(saved).prop('selected', true)
        } else if (!targetPage) {
            // 첫 번째 요소 select
            $('#' + appInfo.id.oId + ' option:eq(0)').prop('selected', true)
        }
    },
    /**
     * 앱 버전 select 추가
     * @param $select
     * @param packageNm
     * @param serverType
     * @param osType
     * @param isOnChanged {boolean=} onChange 이벤트에서 넘어왔을 경우 sessionStorage 에서 가져오지 않도록 하는 플래그
     * @return {Promise<void>}
     */
    async setAppVer($select, packageNm, serverType, osType, isOnChanged) {
        $select.empty()

        // packageNm, serverType이 없으면 return
        if (!packageNm && !serverType) return;

        // 선택한 데이터 객체 가져오기
        const selectedData = appInfo.packageInfo[`${packageNm}:${serverType}`][`${osType}`];
        if (selectedData) {
            const appVerList = Object.keys(selectedData);
            appVerList.sort((a, b) => {
                // 'A'는 작은 값으로 간주하여 앞으로 이동
                if (a === 'A') return -1;
                // 'A' 이외의 값은 'a'보다 큰 값으로 간주하여 뒤로 이동
                if (b === 'A') return 1;
                return a - b; // 숫자는 오름차순으로 정렬
            });

            // 선택한 패키지명, 서버타입의 os type을 가져와서 세팅
            for (const appVer of appVerList) {
                if (appVer === null) continue

                const allText = i18next.tns('dashboard.bi.allAppVer')
                const text = appVer === 'A' ? allText : appVer; // text를 '전체'로 설정
                const attr = {
                    value: appVer,
                    text: text
                };

                const $op = $('<option>', attr)
                $select.append($op)
            }
        }

        const appInfoList = selectedData

        // 버전 정보 없을 경우
        if (appInfoList === undefined
            || (Object.keys(appInfoList).length === 1 && appInfoList['-'])) {
            // await appendAppVer('', '-')
            return
        }

        const saved = sessionStorage.getItem('appVer')
        // 저장된 데이터가 있고, onChange 이벤트에서 넘어오지 않았고, options 의 데이터중에 저장된 데이터가 포함되어 있으면
        if (saved && Object.keys(appInfoList).includes(saved) && !isOnChanged) {
            // 해당 데이터를 찾아 select
            $select.val(saved).prop('selected', true)
        } else {
            // 첫 번째 요소 select
            $('#' + appInfo.id.vId + ' option:eq(0)').prop('selected', true)
        }

        // 앱 버전 변경되면 해당 값으로 save
        $select.on('change', appInfo.save)
    },
    /**
     * Append PackageNm / ServerType Select
     * pId: packageNm, serverType select element id
     * oId: osType select element id
     * vId: appVer select element id
     * targetPage
     *
     * @param option {{pId: string=, oId: string=, vId: string=, targetPage: string=}}
     */
    async append(option) {
        // package명과 server type이 하나의 select box에 들어가게 되어 기존의 server type == sId를 oId로 변경 (osType Id)
        const {pId, oId, vId, targetPage, pIdCb, oIdCb, vIdCb} = option
        this.id = {...option}
        let $pSelect, $oSelect, $vSelect

        // 패키지, 서버유형 추가
        $pSelect = $('#' + pId)

        await appInfo.setPackageNm($pSelect, targetPage)
        const pNm = $pSelect.val()
        const sNm = $('#' + pId + ' option:selected').data('server-type')

        if (oId) {
            // os type 추가
            $oSelect = $('#' + oId)
            await appInfo.setOsType($oSelect, pNm, sNm, '', targetPage)
        }

        // appVer 정보
        if (vId) {
            $vSelect = $('#' + vId)
            const oNm = $oSelect.val()
            await appInfo.setAppVer($vSelect, pNm, sNm, oNm)

            $oSelect.on('change', async (e) => {
                const pNm = $pSelect.val()
                const sNm = $('#' + pId + ' option:selected').data('server-type');
                const oNm = $oSelect.val()
                $vSelect.empty()

                await appInfo.setAppVer($vSelect, pNm, sNm, oNm, true)

                // 수정
                // searchPopup과 보고서 화면에서는 선택값 변경만으론 세션값 변경 아님
                if (!e.target.closest('#searchPopup') && !e.target.closest('.rt_wrap')) {
                    appInfo.save('', [$pSelect, $oSelect, $vSelect])
                }

                // 앱 버전 변경되면 변경된 버전으로 sse 객체 새로 생성
                if (sNm != sessionStorage.getItem('serverType')) {
                    initSSE()
                }

                if (typeof oIdCb === 'function') oIdCb()
            })

            // 앱 버전 변경되면 변경된 버전으로 sse 객체 새로 생성
            $vSelect.on('change', async (e) => {
                initSSE()
                // 변경한 appVer 값 저장
                // searchPopup과 보고서 화면에서는 선택값 변경만으론 세션값 변경 아님
                if (!e.target.closest('#searchPopup') && !e.target.closest('.rt_wrap')) {
                    appInfo.save('', [$pSelect, $oSelect, $vSelect])
                }

                if (typeof vIdCb === 'function') vIdCb()
            })
        } else if (oId) {
            $oSelect.on('change', async () => {
                const pNm = $pSelect.val()
                const sNm = $('#' + pId + ' option:selected').data('server-type');
                const oNm = $oSelect.val()

                if ($oSelect[0].id.includes('_a')) {
                    $('#osType').val(oNm)
                }

                //await appInfo.setAppVer($vSelect, pNm, sNm, oNm, true)

                appInfo.save('', [$pSelect, $oSelect, $vSelect])

                // 앱 버전 변경되면 변경된 버전으로 sse 객체 새로 생성
                if (sNm != sessionStorage.getItem('serverType')) {
                    initSSE()
                }

                if (typeof oIdCb === 'function') oIdCb()
            })
        }

        // packageNm Select onChange
        // packageNm 변경되면 osType 재셋팅

        $pSelect.on('change', async (e) => {
            const pNm = $pSelect.val()
            const sNm = $pSelect.find('option:selected').data('server-type')

            if (oId) {
                $oSelect.empty()
                await appInfo.setOsType($oSelect, pNm, sNm, true)
            }

            if (vId) {
                const oNm = $oSelect.val()
                await appInfo.setAppVer($('#' + vId), pNm, sNm, oNm, true)
            }

            if (pNm !== sessionStorage.getItem('packageNm')) {
                // 앱 버전 변경되면 변경된 버전으로 sse 객체 새로 생성
                initSSE()
            }

            // 보고서 화면에서는 선택값 변경만으론 세션값 변경 아님
            if (!e.target.closest('.rt_wrap')) {
                appInfo.save('', [$pSelect, $oSelect, $vSelect])
            }

            if (typeof pIdCb === 'function') pIdCb()
        })

        const $appIcons = $('.app_icon')
        if ($appIcons.length > 0) {
            for (const appIcon of $appIcons) {
                let txt = ''
                const appIconText = appIcon.textContent
                if (appIconText === 'A') {
                    txt = i18next.tns('common.text.targetApp')
                } else if (appIconText === 'E') {
                    txt = i18next.tns('common.text.targetEnvironment')
                } else if (appIconText === 'O') {
                    txt = i18next.tns('common.text.targetOs')
                } else if (appIconText === 'V') {
                    txt = i18next.tns('common.text.targetVersion')
                }
                const tooltipCommon = i18next.tns('common.msg.tooltipCommon')
                tippy(appIcon, {
                    content: txt + tooltipCommon,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })
            }
        }

        appInfo.save('', [$pSelect, $oSelect, $vSelect])
    },
    // 앱 정보 저장
    save(targetPage, appInfoSelect) {
        const {types} = appInfo

        if (targetPage === 'GM0302'
            || targetPage === 'DM01P1'
            || targetPage === 'DM01P2') {
            return
        }

        if (appInfoSelect && appInfoSelect.length > 0) {
            for (let i = 0; i < appInfoSelect.length; i++) {
                const el = appInfoSelect[i]
                if (!el) {
                    return
                }
                const id = appInfoSelect[i][0]['id']

                // id가 packageNm, osType, appVer이 아니라 packageNm_a, osType_a, appVer_a 인 경우
                // 한 화면에 appInfo selectbox가 두개인 경우임
                if (id.includes('_')) {
                    if (id.includes('packageNm')) {
                        sessionStorage.setItem('packageNm', appInfoSelect[i].val())
                        sessionStorage.setItem('serverType', $(appInfoSelect[i][0]).find('option:selected').data('server-type'))

                        // 로그인시 최근 선택했던 패키지가 기본으로 선택되도록 쿠키에 저장
                        const maxyMode = sessionStorage.getItem('maxyMode') || 'maxy'
                        document.cookie = maxyMode + "CurrentPackage=" + sessionStorage.getItem('packageNm')
                            + ":" + sessionStorage.getItem('serverType')
                            + "; path=/; max-age=" + (60 * 60 * 24 * 30)
                    } else {
                        if (id.includes('osType')) {
                            sessionStorage.setItem('osType', appInfoSelect[i].val())
                        } else if (id.includes('appVer')) {
                            sessionStorage.setItem('appVer', appInfoSelect[i].val())
                        }
                    }
                } else {
                    if (id === 'packageNm') {
                        sessionStorage.setItem('packageNm', appInfoSelect[i].val())
                        sessionStorage.setItem('serverType', $(appInfoSelect[i][0]).find('option:selected').data('server-type'))

                        // 로그인시 최근 선택했던 패키지가 기본으로 선택되도록 쿠키에 저장
                        const maxyMode = sessionStorage.getItem('maxyMode') || 'maxy'
                        document.cookie = maxyMode + "CurrentPackage=" + sessionStorage.getItem('packageNm')
                            + ":" + sessionStorage.getItem('serverType')
                            + "; path=/; max-age=" + (60 * 60 * 24 * 30)
                    } else {
                        sessionStorage.setItem(id, appInfoSelect[i].val())
                    }

                }
            }
        }

        // 이 부분을 수정해야함
        // types를 고정으로 할 게 아니라 packageNm, serverType, osType, appVer를 받아와야함
        // for (let i in types) {
        //     const type = types[i]
        //     const $item = $('#' + type)
        //
        //     if (type === 'serverType') {
        //         sessionStorage.setItem(type, $packageNmTarget.find('option:selected').data('server-type'));
        //     }
        //     if ($item.length > 0 && type !== 'serverType') {
        //         //console.log(type, $item.val(), sessionStorage.getItem('osType'))
        //         sessionStorage.setItem(type, $item.val())
        //     }
        // }
    },
    sort(packageNmArray, packageOrder) {
        let sortResult = new Array(packageNmArray.length);
        for (let order in packageOrder) {
            for (let i = 0; i < packageNmArray.length; i++) {
                if (packageOrder[order] === packageNmArray[i][0]) {
                    sortResult[order] = packageNmArray[i]
                    break
                }
            }
        }
        return sortResult;
    },

    /**
     * alias session mapping
     */
    async getSessionAlias() {
        try {
            // 로그인 화면은 회피
            if (location.pathname === '/' || location.pathname.indexOf('/ln/') >= 0) {
                return
            }

            const appType = (sessionStorage.getItem('maxyMode') || '') === 'front' ? 1 : 0
            await $.ajax({
                url: '/ln/getSessionAlias.maxy',
                dataType: 'JSON',
                type: 'POST',
                data: { appType: appType },
                async: false,
                success: data => {
                    const {
                        alias
                    } = data
                    if (alias) {
                        try {
                            Object.assign(aliasMap, alias)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                },
                error: error => {
                    if (error.status === 403) {
                        // 로그인 화면인 경우에는 logout 처리 하지 않음
                        console.log('session is not exist')
                    }
                }
            })
        } catch (e) {
            console.error(e)
        }
    }
}

// 변경된 app 정보로 sse 객체 재 생성
const initSSE = () => {
    const pNm = $('#packageNm').val()
    const sNm = $('#packageNm option:checked').data('server-type')

    const param = {
        packageNm: pNm,
        serverType: sNm
    }

    try {
        ML0100.v.sse.init(param)
    } catch (e) {

    }
}
/**
 * packageNm 에 해당하는 패키지 명 반환
 * @param packageNm
 * @param serverType
 * @returns {*}
 */
const getDisplayNm = (packageNm, serverType) => {
    try {
        if (typeof packageNm === 'object') {
            // tabulator 객체일 경우
            packageNm = packageNm.getValue()
        }
        let key = ''

        const info = Object.keys(appInfo.packageInfo)

        for (let el of info) {
            const k = el.split(':')[0]
            const s = el.split(':')[1]

            // 패키지명이 마이앱스샘플-개발 , 마이앱스샘플-운영 인 경우가 있어 서버타입까지 비교해야함
            if (packageNm == k && serverType == s) {
                key = el
            }
        }

        if (key === '') {
            console.log('no packageNm mapping')
            return packageNm
        }

        return Object.values(Object.values(appInfo.packageInfo[key])[0])[0].displayNm
    } catch (e) {
        console.log('no packageNm mapping: ' + packageNm)
    }
}

/**
 * serverType 에 해당하는 서버 유형 명 반환
 * @param serverType
 * @returns {*}
 */
const getServerNm = (serverType) => {
    try {
        if (typeof serverType === 'object') {
            // tabulator 객체일 경우
            serverType = serverType.getValue()
        }
        return appInfo.serverType[String(serverType)]
    } catch (e) {
        console.log(e)
        console.log('no serverType mapping: ' + serverType)
    }
}

/**
 * page url / alias mapping
 * @param packageNm {string}
 * @param serverType {string}
 * @param reqUrl {string}
 * @param blank {boolean=}
 * @returns {*|string}
 */
const getPageList = (packageNm, serverType, reqUrl, blank) => {
    try {
        const page = aliasMap[packageNm][serverType][reqUrl]
        return page ? page : blank ? '' : reqUrl
    } catch (e) {
        return blank ? '' : reqUrl
    }
}

/**
 * page url / alias mapping
 * @param packageNm {string}
 * @param serverType {string}
 * @param reqUrl {string}
 * @param blank {boolean=}
 * @returns {*|string}
 */
const convertAliasWithUrl = (packageNm, serverType, reqUrl, blank) => {
    try {
        const page = aliasMap[packageNm][serverType][reqUrl]
        return page ? page + ' (' + reqUrl + ')' : blank ? '-' : reqUrl
    } catch (e) {
        return blank ? '-' : reqUrl
    }
}

// 로그 타입 그룹명 반환
const getLogTypeGroup = (logType) => {
    try {
        return logDictionaryMap[logType].group
    } catch (e) {
        console.log('not allowed logType: ' + logType)
        return logType
    }
}
// 로그 타입 상세명 반환
const getLogTypeDetail = (logType) => {
    try {
        return logDictionaryMap[logType].detail
    } catch (e) {
        console.log('not allowed logType: ' + logType)
        return logType
    }
}
// 로그 타입 설명 반환
const getLogTypeDescription = (logType) => {
    return logDictionaryMap[logType].description
}
// 모델명으로 이름 리턴
const getDeviceModel = (value) => {
    let name = value
    try {
        const info = deviceModelMap[value]
        if (localStorage.getItem('lang') === 'ko') {
            name = info.nameKo
        } else {
            name = info.nameEn
        }
    } catch (e) {
        console.log(value)
        // console.log(e)
    }
    return name ? name : value
}

async function getSessionInfo() {
    try {
        // 로그인 화면은 회피
        if (location.pathname === '/' || location.pathname.indexOf('/ln/') >= 0) {
            return
        }

        const appType = (sessionStorage.getItem('maxyMode') || '') === 'front' ? 1 : 0
        await $.ajax({
            url: '/ln/getSessionInfo.maxy',
            dataType: 'JSON',
            type: 'POST',
            data: { appType: appType },
            async: false,
            success: data => {
                const {
                    appInfoData,
                    serverType,
                    packageOrder,
                    alias,
                    logDictionary,
                    logTypeSet,
                    deviceModelList
                } = data
                appInfo.packageInfo = appInfoData ? appInfoData : {}
                appInfo.serverType = serverType ? serverType : {}
                appInfo.packageOrder = packageOrder ? packageOrder : {}
                if (alias) {
                    try {
                        Object.assign(aliasMap, alias)
                    } catch (e) {
                        console.error(e)
                    }
                }
                if (logDictionary) {
                    try {
                        Object.assign(logDictionaryMap, logDictionary)
                    } catch (e) {
                        console.error(e)
                    }
                }
                if (deviceModelList) {
                    try {
                        Object.assign(deviceModelMap, deviceModelList)
                    } catch (e) {
                        console.error(e)
                    }
                }
                if (logTypeSet) {
                    try {
                        Object.assign(logTypeSetMap, logTypeSet)
                    } catch (e) {
                        console.error(e)
                    }
                }
            },
            error: error => {
                if (error.status === 403) {
                    // 로그인 화면인 경우에는 logout 처리 하지 않음
                    console.log('session is not exist')
                }
            }
        })
    } catch (e) {
        console.error(e)
    }
}

getSessionInfo().then()