class MaxyPopupComponentSetting {
    constructor(options) {
        this.appendId = options.appendId
        this.id = options.id
        this.name = options.name
        this.param = options.param
        this.func = options.func

        if (!this.id || !this.appendId || !this.name) {
            console.log('check parameter')
            return false
        }

        this.init().then(() => {
            this.addEventListener()
            this.openPopup()
        })
    }

    addEventListener() {
        const v = this

        $('.dimmed').on('click', () => {
            v.closePopup(v)
        })

        // 숫자만 입력 가능
        $('.popup_input_wrap input').on('propertychange change keyup paste input', function () {
            this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
        })

        $('#btnSave').on('click', () => {
            v.doSave(v.id)
        })
    }

    async init() {
        const {appendId, id, param} = this

        const source = await fetch(
            '/components/gm/popup/popup-component-setting.html')
            .then(response => response.text())

        const template = Handlebars.compile(source)

        const $target = $('#' + appendId)

        if (!($target.length > 0)) {
            throw 'can\'t find #' + appendId
        }
        $target.empty()

        $target.append(template({id, param}))
        updateContent()
    }

    validateInput(id) {
        const $optMaxSize = $('#' + id + '__optMaxSize')
        const $optLogmeterTime = $('#optLogmeterTime')
        const $optLogmeterCrashWeight = $('#optLogmeterCrashWeight')
        const $optLogmeterErrorWeight = $('#optLogmeterErrorWeight')
        const $optLogmeterLogWeight = $('#optLogmeterLogWeight')
        const optLogmeterTime = Number($optLogmeterTime.val())
        const optLogmeterCrashWeight = Number($optLogmeterCrashWeight.val())
        const optLogmeterErrorWeight = Number($optLogmeterErrorWeight.val())
        const optLogmeterLogWeight = Number($optLogmeterLogWeight.val())
        const optMaxSize = Number($optMaxSize.val())
        const optScatterSize = Number($('#optScatterSize').val())
        const crashMaxLimit = 1000
        const errorMaxLimit = 1000
        const logMaxLimit = 1000
        const pvMaxLimit = 20
        const etcMaxLimit = 30
        const scatterSizeMaxLimit = 3000

        const lang = localStorage.getItem('lang')
        const requiredMsg = trl('management.components.msg.requiredInput')
        const requiredWeight = trl('management.components.msg.requiredWeight')

        // Logmeter 컴포넌트 옵션 설정 팝업인 경우 (값이 4개)
        if (id === 'logmeterSetting') {
            const types = {
                optLogmeterTime: optLogmeterTime,
                optLogmeterCrashWeight: optLogmeterCrashWeight,
                optLogmeterErrorWeight: optLogmeterErrorWeight,
                optLogmeterLogWeight: optLogmeterLogWeight
            };

            for (const typeName in types) {
                // typeValue에는 입력한 값이 들어감
                const typeValue = types[typeName];
                let targetName
                let maxLimit
                if (typeName.includes('Crash')) {
                    maxLimit = crashMaxLimit
                    targetName = 'Crash'
                } else if (typeName.includes('Error')) {
                    maxLimit = errorMaxLimit
                    targetName = 'Error'
                } else if (typeName.includes('Log')) {
                    maxLimit = logMaxLimit
                    targetName = 'Log'
                }

                if (util.isEmpty(typeValue)) {
                    this.setErrorMsg(typeName, `${targetName}` + requiredWeight);
                    util.emptyInput($(`#${typeName}`))
                    return false;
                }

                if (typeValue > maxLimit) {
                    let weightMaxMsg
                    const weightMax = trl('management.components.msg.weightMax')

                    if (lang === 'ko') {
                        weightMaxMsg = `${targetName}` + weightMax + ' ' + `${maxLimit}` + '입니다.'
                    } else if (lang === 'en') {
                        weightMaxMsg = weightMax + ' ' + `${targetName}` + ' weight is ' + `${maxLimit}`
                    } else if (lang === 'ja') {
                        weightMaxMsg = `${targetName}` + weightMax + `${maxLimit}` + 'です。'
                    }
                    this.setErrorMsg(typeName, weightMaxMsg)
                    util.emptyInput($(`#${typeName}`))
                    return false
                }
            }
            return types
        }
        if (id.includes('scatterSetting')) {
            let types = {
                optScatterSize: optScatterSize
            };

            for (const typeName in types) {
                // typeValue에는 입력한 값이 들어감
                const typeValue = types[typeName]

                let targetName
                let maxLimit
                if (typeName.includes('optScatterSize')) {
                    maxLimit = scatterSizeMaxLimit
                    targetName = trl('management.components.setting.maximum')
                } else if (typeName.includes('optScatterRange')) {
                    if (id.includes('rendering')) {
                        maxLimit = etcMaxLimit
                    } else {
                        maxLimit = pvMaxLimit
                    }

                    targetName = '범위'
                }

                if (util.isEmpty(typeValue)) {
                    this.setErrorMsg(typeName, requiredMsg);
                    util.emptyInput($(`#${typeName}`))
                    return false;
                }


                if (typeValue > maxLimit) {
                    let weightMaxMsg

                    const maxValueMsg = trl('management.components.msg.maxValue')
                    if (lang === 'ko') {
                        weightMaxMsg = maxValueMsg + `${maxLimit}` + '입니다.'
                    } else if (lang === 'en') {
                        weightMaxMsg = maxValueMsg + ' is ' + `${maxLimit}`
                    } else if (lang === 'ja') {
                        weightMaxMsg = maxValueMsg + `${maxLimit}` + 'です。'
                    }

                    this.setErrorMsg(typeName, weightMaxMsg)
                    util.emptyInput($(`#${typeName}`))
                    return false
                }
            }

            if (id.includes('response')) {
                types = {
                    'optResponsetimescatterSize': optScatterSize
                }
            } else if (id.includes('loading')) {
                types = {
                    'optLoadingtimescatterSize': optScatterSize
                }
            }

            return types

        }
        if (id === 'versioncomparisonSetting') {
            return {
                'optVersioncomparisonOstypeA': $('#aOsType').val(),
                'optVersioncomparisonAppverA': $('#aVersion').val(),
                'optVersioncomparisonOstypeB': $('#bOsType').val(),
                'optVersioncomparisonAppverB': $('#bVersion').val()
            }
        }
        // Favorites, Page view, PV equalizer 옵션 설정 팝업인 경우 (값이 1개)
        else {
            const types = {}
            let maxLimit
            const target = 'optMaxSize'

            if (id === 'pageviewSetting') {
                maxLimit = pvMaxLimit
                types.optPageviewMaxSize = optMaxSize
            } else if (id === 'pvequalizerSetting' || id === 'favoritesSetting') {
                maxLimit = etcMaxLimit

                if (id === 'pvequalizerSetting') {
                    types.optPvequalizerMaxSize = optMaxSize
                } else if (id === 'favoritesSetting') {
                    types.optFavoritesMaxSize = optMaxSize
                }
            }

            let weightMaxMsg
            const maxValueMsg = trl('management.components.msg.maxValue')
            if (lang === 'ko') {
                weightMaxMsg = maxValueMsg + `${maxLimit}` + '입니다.'
            } else if (lang === 'en') {
                weightMaxMsg = maxValueMsg + ' is ' + `${maxLimit}`
            } else if (lang === 'ja') {
                weightMaxMsg = maxValueMsg + `${maxLimit}` + 'です。'
            }

            for (const typeName in types) {
                const typeValue = types[typeName];

                if (util.isEmpty(typeValue)) {
                    this.setErrorMsg(target, requiredMsg);
                    util.emptyInput($optMaxSize)
                    return false;
                }

                if (typeValue > maxLimit) {
                    this.setErrorMsg(target, weightMaxMsg)
                    util.emptyInput($optMaxSize)
                    return false
                }
            }
            return types
        }
    }

    doSave(id) {
        const {func} = this
        const param = this.validateInput(id)

        if (!param) {
            return
        }

        ajaxCall('/gm/0302/modifyComponentConfig.maxy', param)
            .then(() => {
                const msg = trl('common.msg.success')
                toast(msg)
                const v = this
                this.closePopup(v).then(() => {
                    // 값 변경 후 팝업 닫히면 변경된 값으로 화면 새로 그리기
                    if (!func) {
                        GM0302.func.getData()
                    } else {
                        func()
                    }
                })
            }).catch(error => {
            console.log(error)
        })
    }

    setErrorMsg(type, error) {
        const errTxt = $('.err_txt')
        errTxt.text('')
        errTxt.hide()
        const targetErrTxt = $('#' + type + 'ErrTxt')
        targetErrTxt.text(error)
        targetErrTxt.show()
    }

    resetErrorMsg() {
        const errTxt = $('.err_txt')
        errTxt.text('')
        errTxt.hide()
    }

    // 팝업 열기 함수
    async openPopup() {
        const {id} = this
        $('.dimmed').show()

        const $target = $('#' + id + '__popup')
        $target.show()

        // logmeter 설정 팝업인 경우 옵션 4개, responsetime scatter인 경우는 2개, 아닌 경우는 1개
        if (id.includes('logmeter')) {
            $('#optLogMeterWrap').show()
        } else if (id.includes('scatter')) {
            $('#optScatterWrap').show()
        } else {
            $('#optOneWrap').show()
        }
        await util.sleep(200)
    }

    // 팝업 닫기 함수
    async closePopup(v) {
        let {id} = v

        if (!id) {
            id = 'versioncomparisonSetting'
        }
        const popup = '#' + id + '__popup'
        const input = popup + ' input'
        const $dimmed = $('.dimmed')
        this.resetErrorMsg()
        $(input).val('')
        $dimmed.off('click')
        $dimmed.hide()
        $(popup).hide()
    }

}