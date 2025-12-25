i18next.use(i18nextXHRBackend).init({
        lng: 'ko', // 한국어인지, 영어인지 표시
        fallbackLng: 'ko',
        ns: ['common', 'dashboard', 'menu', 'alarm', 'management', 'system', 'alert', 'aibot'],
        defaultNS: 'common'
    },
    function (err) {
        if (err) {
            console.error(err, t)
        } else {
            // 에러가 없을 경우 설정한 언어로 json 안의 텍스트들 대입
            updateContent()
        }
    }
);

/**
 * 주어진 키를 번역하며, 선택적으로 네임스페이스와 매개변수 치환을 지원합니다.
 *
 * @function
 * @param {string} key - 번역할 키로, `namespace.key` 형식으로 작성합니다.
 * @param {Array|string|number|null} [param] - 번역된 문자열 내에서 치환할 매개변수로, 배열, 문자열, 숫자 또는 null을 허용합니다.
 *    - 배열이 제공되면 순서대로 `$1`, `$2` 등의 자리 표시자를 대체합니다.
 *    - 문자열이나 숫자가 제공되면 `$1` 자리 표시자를 대체합니다.
 *    - null이 제공되거나 생략되면 치환이 이루어지지 않습니다.
 *
 * @returns {string} - 제공된 매개변수가 치환된 번역된 문자열을 반환합니다. 오류가 발생한 경우 원래 키를 반환합니다.
 */
i18next.tns = (key, param) => {
    return trl(key, param)
}

/**
 * 주어진 키를 번역하며, 선택적으로 네임스페이스와 매개변수 치환을 지원합니다.
 *
 * @function
 * @param {string} key - 번역할 키로, `namespace.key` 형식으로 작성합니다.
 * @param {Array|string|number|null} [param] - 번역된 문자열 내에서 치환할 매개변수로, 배열, 문자열, 숫자 또는 null을 허용합니다.
 *    - 배열이 제공되면 순서대로 `$1`, `$2` 등의 자리 표시자를 대체합니다.
 *    - 문자열이나 숫자가 제공되면 `$1` 자리 표시자를 대체합니다.
 *    - null이 제공되거나 생략되면 치환이 이루어지지 않습니다.
 *
 * @returns {string} - 제공된 매개변수가 치환된 번역된 문자열을 반환합니다. 오류가 발생한 경우 원래 키를 반환합니다.
 */
function trl(key, param) {
    try {
        // `namespace.key` 구조인 key를 `.`로 나누어 namespace와 key를 분리
        const [namespace, ...rest] = key.split('.');
        const translationKey = rest.join('.');

        // 번역을 가져옴
        let str = String(i18next.t(translationKey, { ns: namespace }));

        if (param) {
            // 문자열이 배열처럼 보이는 경우 JSON.parse 시도
            if (typeof param === "string" && param.startsWith("[") && param.endsWith("]")) {
                try {
                    // 이스케이프된 문자열을 복원
                    const sanitizedParam = param
                        .replace(/\\\\/g, "\\") // '\\'를 '\'로 변환
                        .replace(/\\"/g, '"')  // '\"'를 '"'로 변환
                        .replace(/\\'/g, "'"); // "\'"를 "'"로 변환

                    param = JSON.parse(sanitizedParam); // JSON으로 변환
                } catch (e) {
                    console.error("Invalid array-like string format:", param, e.message);
                }
            }

            if (Array.isArray(param) && param.length > 0) {
                // 배열 매개변수를 순서대로 치환
                param = param.map(item => {
                    if (key.includes('popup')) {
                        if (item.length > 125) {
                            item = item.substring(0, 125) // 앞에서부터 120번째 문자까지만 자르기
                        }
                    }

                    // DOWN이면 '감소'로, UP이면 '증가', EQUAL이면 '동일' 변환
                    if (item === "DOWN") {
                        return trl('aibot.down')
                    } else if (item === "UP") {
                        return trl('aibot.up')
                    }
                    if (typeof item === 'number') {
                        return util.comma(item)
                    }
                    if (item.includes('iPad') || item.includes('iPhone')
                        || item.includes('SM-')) {
                        return getDeviceModel(item)
                    }
                    return item
                })

                let lang = localStorage.getItem('lang') || 'ko'
                // $2가 0이고 $3이 '동일'이면 특정 문구로 변경

                if (param[1] === '0' && isNaN(param[2])) {
                    if (lang === 'ko') {
                        str = str.replace(/\$1/, param[0]).replace(/전일 대비.*\./, trl('aibot.equal'))
                    } else if (lang === 'en') {
                        str = str.replace(/\$1/, param[0]).replace(/which is.*\./, trl('aibot.equal'))
                    }
                } else {
                    str = str.replace(/\$(\d+)/g, (match, index) =>
                        param.hasOwnProperty(index - 1) ? param[index - 1] : match
                    );
                }
            } else if (typeof param === "string" || typeof param === "number") {
                // 단일 매개변수 치환
                str = str.replace('$1', param);
            }
        }

        return str;
    } catch (e) {
        // 에러가 발생했을 경우 key를 그대로 반환
        return key;
    }
}

/**
 * html 요소의 `data-t` 항목에 대해 언어 설정에 따른 번역을 하는 함수
 */
function updateContent() {
    // 언어 설정을 미리 읽고, 초기 설정
    let lang = localStorage.getItem('lang') || 'ko'
    if (!localStorage.getItem('lang')) {
        localStorage.setItem('lang', lang)
    }

    // data-t 속성이 있는 모든 요소를 한 번에 선택하고, 요소가 없으면 바로 종료
    const list = document.querySelectorAll('[data-t]')
    if (list.length === 0) return

    // 요소들을 순회하며 data-t 속성을 기반으로 번역 대체
    list.forEach(el => {
        const data = el.getAttribute('data-t')
        if (data) {
            const [key, ...params] = data.split(' ')
            el.textContent = trl(key, params)  // `trl` 함수에 키와 나머지 파라미터 배열을 전달
        }
    })
}

function getLang() {
    return localStorage.getItem('lang')
}

// 언어 변환 시 이벤트 (위의 select에서 onchange="i18next.changeLanguage(this.value)" 이벤트)
i18next.on("languageChanged", updateContent)