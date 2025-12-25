class MaxyPopupVersionComparison {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.param = options.param
        this.userNo = sessionStorage.getItem('userNo')
        this.optData = {}

        // 팝업 생성 후
        this.init().then(() => {
            this.addEventListener()
        })
    }

    async init() {
        const {appendId, id, tip, title, prefix} = this
        const source = await fetch(
            '/components/gm/popup/popup-version-comparison-setting.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }

        $target.append(template({id, tip, title, prefix}))

        updateContent()
    }

    addEventListener() {
        const v = this
        const {id} = v

        $('#packageName').on('change', function () {
            v.setOsType(true).then(() => {
                v.setAppVerParam($('#aVersion'), true)
                v.setAppVerParam($('#bVersion'), true, $('#aVersion').val())
            }).catch((error) => {
                console.error("Error occurred:", error)
            })
        })

        $('#aOsType, #bOsType').on('change', function () {
            const $versionSelect = $(this).closest('.os_wrap').siblings('.version_wrap').find('.version')

            // aOsType을 변경했을 경우, bVersion도 가져오도록 설정
            const $otherVersionSelect = $(this).attr('id') === 'aOsType'
                ? $('#bVersion')
                : $('#aVersion')

            if ($('#aOsType').val() === $('#bOsType').val()) {
                v.setAppVerParam($versionSelect, true, $otherVersionSelect.val())
            } else {
                v.setAppVerParam($versionSelect, true, false, $otherVersionSelect)
            }
        })

        $('#aVersion, #bVersion').on('change', function () {
            if ($('#aOsType').val() === $('#bOsType').val()) {
                v.setAppVerParam($(this).closest('.content').siblings('.content').find('.version'), true, $(this).val())
            }
        })

        $('#' + id + '__navbar' + ' .btn_component_setting_save').on('click', () => {
            v.save()
        })

        // dimmed클릭 이벤트 추가
        $('.dimmed').on('click', () => {
            v.close()
        })
    }

    setVersionComparisonData(data) {
        try {
            if (data && Object.keys(data).length > 0) {
                this.optData = {
                    packageNm: data.packageNm,
                    serverType: data.serverType,
                    osTypeA: data.optOsTypeA,
                    appVerA: data.optAppVerA,
                    osTypeB: data.optOsTypeB,
                    appVerB: data.optAppVerB
                }
            }
            appInfo.append({pId: 'packageName', oId: '', vId: '', targetPage: 'GM0302'}).then(() => {
                return this.setOsType()
            }).then(() => {
                this.setAppVerParam($('#aVersion'))
            }).then(() => {
                this.setAppVerParam($('#bVersion'), false, $('#aVersion').val())
            }).catch((error) => {
                console.error("Error occurred:", error)
            })
        } catch (e) {
            console.error("Error occurred:", e)
        }
    }

    // 팝업 열기 함수
    open() {
        const {id} = this
        $('.dimmed').show()

        this.getOption()

        // 클래스 추가로 슬라이드 인 효과 적용
        $('#' + id + '__navbar').addClass('open')
    }

    // 팝업 닫기 함수
    close() {
        const {id} = this
        $('.dimmed').hide()

        // 클래스 제거로 슬라이드 아웃 효과 적용
        $('#' + id + '__navbar').removeClass('open')
    }

    async setOsType(isChanged) {
        const {optData} = this
        const packageNm = $('#packageName').val()
        const serverType = $('#packageName option:selected').data('server-type')

        const osTypeInfo = appInfo.packageInfo[`${packageNm}:${serverType}`]
        const $aOsType = $('#aOsType')
        const $bOsType = $('#bOsType')

        if (osTypeInfo) {
            $aOsType.empty()
            $bOsType.empty()
            const osTypes = Object.keys(osTypeInfo)

            if (osTypes.length === 1 && osTypes[0] === 'A') {
                return
            }
            osTypes.sort()

            // 선택한 패키지명, 서버타입의 os type을 가져와서 세팅
            for (const osType of osTypes) {
                if (osType === 'A') {
                    continue
                }
                const text = osType

                const $opA = $('<option>', {value: osType, text: text})
                const $opB = $('<option>', {value: osType, text: text})

                $aOsType.append($opA)
                $bOsType.append($opB)
            }

            let savedOstypeB, savedOstypeA
            if (optData !== null && Object.keys(optData).length > 0) {
                savedOstypeB = optData.osTypeB
                savedOstypeA = optData.osTypeA
            }

            if (!isChanged) {
                if (savedOstypeA) {
                    // 저장된 쿠키가 있으면 select
                    $aOsType.val(savedOstypeA).prop('selected', true)
                }

                if (savedOstypeB) {
                    // 저장된 쿠키가 있으면 select
                    $bOsType.val(savedOstypeB).prop('selected', true)
                }
            } else {
                $aOsType.find('option').eq(0).prop('selected', true)
                $bOsType.find('option').eq(0).prop('selected', true)
            }
        }
    }

    setAppVerParam(target, isChanged, value, oppositeTarget) {
        if (target) {
            this.setAppVer(target, isChanged, value)
            if (oppositeTarget) {
                this.setAppVer(oppositeTarget, isChanged, false, true)
            }
        }
    }

    setAppVer(target, isChanged, value, isOppositeTarget) {
        const {optData} = this

        const $aVersion = $('#aVersion')
        const $bVersion = $('#bVersion')
        const packageNm = $('#packageName').val()
        const serverType = $('#packageName option:selected').data('server-type')
        const $aOsType = $('#aOsType')
        const $bOsType = $('#bOsType')

        const aVersion = $aVersion.val()
        const bVersion = $bVersion.val()

        const osType = target.closest('.content').find('.os_type').val()
        const appverInfo = appInfo.packageInfo[`${packageNm}:${serverType}`][`${osType}`]

        target.empty()

        if (appverInfo) {
            const appVerList = Object.keys(appverInfo)
                .filter(appVer => appVer !== 'A')  // 'A'를 제외
                .sort((a, b) => a - b)  // 오름차순 정렬

            let savedAppverA, savedAppverB
            if (optData && Object.keys(optData).length > 0) {
                savedAppverB = optData.appVerB
                savedAppverA = optData.appVerA
            }

            // 앱 버전이 1개 이하인 경우 빈 값이 아니라 - 를 세팅하도록
            if (appVerList.length <= 1) {
                appVerList.push('-')
            }

            for (let i = 0; i < appVerList.length; i++) {
                // 선택된 값은 제외
                if (value && appVerList[i] === value && $aOsType.val() === $bOsType.val()) {
                    continue;
                }

                const $op = $('<option>', {value: appVerList[i], text: appVerList[i]})
                target.append($op);
            }

            if (value || isOppositeTarget) {
                if (target.attr('id') === 'bVersion') {
                    if (target.find(`option[value="${bVersion}"]`).length > 0) {
                        target.val(bVersion).prop('selected', true)
                    } else {
                        target.find('option:first').prop('selected', true)
                    }
                } else {
                    if (target.find(`option[value="${aVersion}"]`).length > 0) {
                        target.val(aVersion).prop('selected', true)
                    } else {
                        target.find('option:first').prop('selected', true)
                    }
                }
            }

            // 초기 세팅
            if (!isChanged) {
                if (savedAppverA) {
                    $aVersion.val(savedAppverA).prop('selected', true)
                } else {
                    $aVersion.find('option:first').prop('selected', true)
                }

                if (savedAppverB) {
                    $bVersion.val(savedAppverB).prop('selected', true)
                } else {
                    $bVersion.find('option:first').prop('selected', true)
                }
            }
        }
    }

    getOption() {
        const {id} = this
        const param = {
            type: id,
            packageNm: sessionStorage.getItem('packageNm'),
            serverType: sessionStorage.getItem('serverType')
        }
        ajaxCall('/gm/0302/getComponentConfig.maxy',
            param,
            {disableCursor: true}
        ).then(data => {
            this.setVersionComparisonData(data)
        }).catch(error => {
            console.log(error)
            toast(trl(error.msg))
        })
    }

    save() {
        const v = this
        const $optOsTypeA = $('#aOsType')
        const $optOsTypeB = $('#bOsType')
        const $optAppVerA = $('#aVersion')
        const $optAppVerB = $('#bVersion')

        const packageNm = $('#packageName').val()
        const serverType = $('#packageName option:checked').data('server-type')

        const optOsTypeA = $optOsTypeA.val() === '-' ? '' : $optOsTypeA.val()
        const optOsTypeB = $optOsTypeB.val() === '-' ? '' : $optOsTypeB.val()
        const optAppVerA = $optAppVerA.val() === '-' ? '' : $optAppVerA.val()
        const optAppVerB = $optAppVerB.val() === '-' ? '' : $optAppVerB.val()

        if (!packageNm || serverType === undefined || !optOsTypeA || !optOsTypeB || !optAppVerA || !optAppVerB) {
            toast(trl('common.msg.noSelect'))
            return
        }

        // 각각의 값들을 1년간 유지되는 쿠키로 저장
        const param = {
            packageNm, serverType, optOsTypeA, optOsTypeB, optAppVerA, optAppVerB
        }

        ajaxCall('/gm/0301/setVersionComparisonConfig.maxy', param)
            .then(() => {
                // JSON 문자열로 변환하여 저장
                toast(trl('common.msg.success'))
                v.close()
            })
            .catch(error => {
                toast(trl(error.msg))
            })

        toast(trl('common.msg.success'))
    }
}