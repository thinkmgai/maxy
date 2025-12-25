<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<script>
    'use strict';

    /**
     Makes an AJAX call to a specified URL with given parameters and options.
     @param {string} _url - The URL to send the request to.
     @param {Object} _param - The parameters to include in the request body.
     @param {Object} option - Options for customizing the request.
     @param {boolean} [option.disableCursor=false] - If true, disables the cursor during the request.
     @param {boolean} [option.responseHeader=false] - If true, includes response headers in the result.
     @param {boolean} [option.json=false] - If true, expects the server to return a JSON response.
     @param {boolean} [option.disableDimmed=false] - If true, disables the dimmed effect during the request.
     @returns {Promise} - A promise that resolves when the request is complete. */
    const ajaxCall = (_url, _param, {
        disableCursor = false,
        responseHeader = false,
        json = false,
        disableDimmed = false
    } = {}) => {
        return new Promise((resolve, reject) => {
            if (!disableCursor) {
                cursor.show(disableDimmed)
            }
            try {
                const ajaxOptions = {
                    url: _url,
                    dataType: 'JSON',
                    type: 'POST',
                    data: json ? JSON.stringify(_param) : _param,
                    success: (data, textStatus, jqXHR) => {
                        // 팝업에 상세데이터 요청인 경우만 응답 헤더 받아오기 (responseHeader가 true인 경우)
                        if (responseHeader) {
                            // 응답 헤더 가져오기
                            const responseHeaders = jqXHR.getAllResponseHeaders()
                            const headersArray = responseHeaders.trim().split(/[\r\n]+/)
                            const headers = {}
                            headersArray.forEach(line => {
                                const parts = line.split(': ')
                                const header = parts.shift()
                                headers[header] = parts.join(': ')
                            })

                            resolve({data, headers})
                        } else {
                            resolve(data)
                        }

                        if (!disableCursor) {
                            cursor.hide()
                        }
                    },
                    error: (error) => {
                        const {
                            status,
                            statusText,
                            responseText,
                            responseJSON
                        } = error

                        // ajax datatype 이 json 으로 되어 있기 때문에
                        // 빈 데이터 + 200 코드가 내려오면 에러로 리턴
                        // 200 코드일 경우는 성공을 의미 하기 때문에 resolve 를 실행한다.
                        if (status === 200) {
                            resolve()
                            cursor.hide()
                            return
                        }

                        // 권한 없는 경우 (
                        if (status === 403) {
                            location.href = '<c:url value="/ln/doLogout.maxy?denied=session.expired" />'
                        }

                        // 메시지 파싱
                        let msg
                        try {
                            // response entity 로 받아올 경우(Exception Advice 에서 반환)
                            msg = JSON.parse(responseText).msg
                        } catch (e) {
                            try {
                                // ModelAndView 에서 메시지를 반환하는 경우
                                msg = responseJSON.string
                            } catch (e) {
                                // 로그인 세션 만료인 경우 로그아웃 및 로그인 페이지 이동
                                if (statusText === 'parsererror'
                                    && responseText.indexOf(
                                        "location.replace('/ln/goLoginPage.maxy')") > 0) {
                                    location.href = '<c:url value="/ln/doLogout.maxy" />'
                                }
                                cursor.hide()
                            }
                        }
                        reject({status, msg})

                        if (!disableCursor) {
                            cursor.hide()
                        }
                    }
                }
                if (json) {
                    ajaxOptions.contentType = 'application/json'
                }
                $.ajax(ajaxOptions)
            } catch (e) {
                cursor.hide()
            }
        })
    }

    /**
     * modal
     */
    const modal = {
        /**
         * modal 열기
         * @param {object} config - 설정 객체
         * @param {string} config.id - 메시지를 표시할 요소의 id
         * @param {string} config.msg - 표시할 메시지
         * @param {string} [config.title] - 메시지 타이틀
         * @param {boolean} [config.confirm=false] - 메시지에 확인 버튼을 추가할지 여부
         * @param {function} [config.fn] - 확인 버튼을 눌렀을 때 실행할 콜백 함수
         * @param {boolean} config.pre - msg를 pre 태그로 감쌀지 여부
         */
        show({id, msg, confirm, fn, title, pre = false}) {
            const $body = $('body')

            // dimmed 추가
            if (!$body.children('.modal_dimmed').length) {
                $body.append('<div class="modal_dimmed"/>')
            }

            if (!$body.children('#' + id).length) {
                $body.append('<div class="popup_common maxy_modal" id="' + id + '"/>')
                const $modal = $('.maxy_modal')
                
                // 모달을 화면 정중앙에 고정하기 위한 스타일 적용
                $modal.css({
                    'position': 'fixed',
                    'top': '50%',
                    'left': '50%',
                    'transform': 'translate(-50%, -50%)',
                })
                if (title) {
                    $modal.append('<h4>' + title + '</h4>')
                } else {
                    const title = trl('common.btn.alarm')
                    $modal.append('<h4>' + title + '</h4>')
                }
                // pre flag가 들어오면 msg를 pre tag로 변경해준다. 줄바꿈과 공백 문자열도 들어가짐
                if (pre) {
                    $modal.append('<pre class="popup_msg">' + msg + '</pre>')
                } else {
                    $modal.append('<div class="popup_msg">' + msg + '</div>')
                }
                $modal.append('<div class="popup_footer"/>')
                const $footer = $('.maxy_modal .popup_footer')
                if (confirm) {
                    const txtCancel = trl('common.btn.cancel')
                    $footer.append('<button class="btn_common" id="btnMaxyCancel">' + txtCancel + '</button>')
                    $('button[id="btnMaxyCancel"]').on('click', modal.hide)
                }
                const txtConfirm = trl('common.btn.confirm')
                $footer.append('<button class="btn_common opposite" id="' + id + 'btnMaxyOk"> ' + txtConfirm + '</button>')

                const modalOkId = 'button[id="' + id + 'btnMaxyOk"]'
                const $btn = $(modalOkId)
                if (fn) {
                    $btn.on('click', () => {
                        fn()
                        modal.hide()
                    })
                } else {
                    $btn.on('click', modal.hide)
                }

                // body 객체에 엔터키 입력 이벤트 등록
                $body.on('keyup', (e) => {
                    // maxy_modal 클래스가 body 에 존재할 경우에만
                    if ($body.find('.maxy_modal').length > 0) {
                        if (e.keyCode === 13 || e.keyCode === 27) {
                            modal.hide()
                            $body.off('keyup', (e) => {
                                if (e.keyCode === 13 || e.keyCode === 27) {
                                    modal.hide()
                                }
                            })
                        }
                    }
                })

                // dimmed 클릭 시 hide
                const $dimmed = $('.modal_dimmed')
                $dimmed.on('click', () => {
                    if(!confirm && fn) {
                        fn()
                    }
                    modal.hide()
                })

                $('#' + id).show()
                $dimmed.show()
            }
        },
        hide() {
            $('.maxy_modal').remove()
            $('.modal_dimmed').hide()
        }
    }

    /**
     * alias 변경 팝업창
     */
    const alias = {
        /**
         * alias 변경 팝업창 열기
         * @param {string} reqUrl - alias 변경 Req URL
         * @param {string} dataType - URL 데이터 유형 ( 1-페이지, 2-Native)
         * @param {function} cb - 콜백함수
         */
        show({reqUrl, dataType, cb}) {
            const role = '${loginUser.roleGbn}'
            // 그룹관리자/슈퍼관리자가 아니면 팝업창 열리지 않음
            if (role !== '0011' && role !== '0012') {
                toast(trl('common.msg.notAllowedSave'))
                return
            }
            const $body = $('body')

            // dimmed 추가
            if (!$body.children('.alias_dimmed').length) {
                $body.append('<div class="alias_dimmed" data-content="dimmed"/>')
            }

            // 팝업 추가
            if (!$body.children('.alias_popup').length) {
                $body.append('<div class="popup_common alias_popup"/>')
                const $alias = $('.alias_popup')
                $alias.append(`
                    <h4 data-t="management.alias.text.aliasReg"></h4>
                    <ul class="popup_input_wrap">
                        <li>
                            <label for="commonAliasPopupRequestUrl" data-t="common.text.requestedUrl"></label>
                            <input id="commonAliasPopupRequestUrl" type="text" readonly>
                        </li>
                        <li>
                            <label for="commonAliasPopupAliasName" data-t="management.alias.text.aliasName"></label>
                            <input id="commonAliasPopupAliasName" type="text">
                        </li>
                    </ul>
                    <div class="popup_footer">
                        <button class="btn_common opposite" data-t="common.btn.save"></button>
                    </div>
                `)

                // 다국어 텍스트 적용
                updateContent()

                // 선택한 url
                $('.alias_popup #commonAliasPopupRequestUrl').val(reqUrl)

                // 이미 지정했던 alias가 있으면 세팅
                const aliasName = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), reqUrl, true)
                if (aliasName !== '') {
                    $('.alias_popup #commonAliasPopupAliasName').val(aliasName)
                }

                // 저장 버튼
                const $aliasSave = $('.alias_popup .popup_footer button')
                $aliasSave.on('click', async () => {
                    await alias.save(reqUrl, dataType, cb)
                })

                // dimmed 클릭 시 hide
                const $dimmed = $('.alias_dimmed')
                $dimmed.on('click', () => {
                    alias.hide()
                })

                $alias.show()
                $dimmed.show()
            }
        },
        callback(v, reqUrl) {
            const newAlias = getPageList(sessionStorage.getItem('packageNm'), sessionStorage.getItem('serverType'), reqUrl, true)

            // 팝업 타이틀 변경
            const $popup = $('#' + v.id + '__popup')
            // 바뀐 alias명으로 세팅
            if (newAlias) {
                $popup.find('#pAliasValue').show()
                $popup.find('#pAliasValue').text(newAlias)
            } else {
                $popup.find('#pAliasValue').hide()
            }
            $popup.find('#pReqUrl').text(reqUrl)
        },
        /**
         * alias 변경 팝업창 닫기
         */
        hide() {
            $('.alias_popup').remove()
            $('.alias_dimmed').hide()
        },
        /**
         * alias 변경 저장
         * @param {string} reqUrl - alias 변경 Req URL
         * @param {string} dataType - URL 데이터 유형 ( 1-페이지, 2-Native)
         * @param {function} cb - 콜백함수
         */
        save(reqUrl, dataType, cb) {
            const encoder = new TextEncoder(); // UTF-8 인코딩
            const byteLength = encoder.encode(reqUrl).length;

            // DB가 700byte 제한이라서 안전하게 500으로 validation 처리
            if (byteLength > 500) {
                toast(trl('alert.error.long.url'))
                return
            }

            const params = {
                'appPageNm': $('.alias_popup #commonAliasPopupAliasName').val(), // alias name
                'packageNm': sessionStorage.getItem('packageNm'),
                'serverType': sessionStorage.getItem('serverType'),
                'reqUrl': reqUrl, // alias 변경 Req URL
                'dataType': !dataType ? dataType : '1' // URL 데이터 유형 ( 1-페이지, 2-Native)
            }

            ajaxCall('/gm/0303/upsertPage.maxy', params).then(() => {
                // alias session 재매핑
                appInfo.getSessionAlias()

                const msg = trl('common.msg.success')
                toast(msg)
                alias.hide()

                // 콜백함수 호출
                if (typeof cb === 'function') {
                    cb()
                }
            }).catch((e) => {
                if (e.msg) {
                    toast(trl(e.msg))
                } else {
                    const msg = trl('common.msg.serverError')
                    toast(msg)
                }
            })
        }
    }

    Handlebars.registerHelper('isExist', function (data, options) {
        if (data) {
            return options.fn(this)
        } else {
            return options.inverse(this)
        }
    })

    Handlebars.registerHelper('comma', function (data) {
        try {
            if (!data) {
                return 0
            } else {
                let num
                if (typeof data === 'string') {
                    data = data.replace(/[^0-9]/g, '')
                    num = Number(data)
                    if (isNaN(num)) {
                        return 0
                    }
                } else if (typeof data === 'number') {
                    num = data
                } else {
                    return 0
                }
                return util.comma(num)
            }
        } catch (e) {
            return 0
        }
    })

    //조건문 처리
    //usage: {{#hif var1 '==' var2}} [참일때 보여줄 값] {{else}} [거짓일때 보여줄 값] {{/hif}}
    //usage: {{#hif var1 '==' var2}} [참일때 보여줄 값] {{/hif}}
    Handlebars.registerHelper('hif', function (v1, operator, v2, options) {
        v1 = (typeof v1 === "undefined" ? "" : v1);
        v2 = (typeof v2 === "undefined" ? "" : v2);

        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    });

</script>
