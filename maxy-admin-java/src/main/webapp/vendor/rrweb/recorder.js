/*!
 * recorder.js - 고객 내부망용 rrweb 레코더 (세션 스토리지 버전)
 * Version: 1.0.0
 */
(function () {
    // ---- Config ----
    const SEND_INTERVAL = 1_000; // 1초마다 세션 스토리지에 저장
    const SESSION_ID =
        (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
        Date.now().toString(36) + Math.random().toString(36).slice(2);
    const STORAGE_KEY = "rrweb_session_data";
    const MAX_EVENTS_COUNT = 50000; // 최대 이벤트 개수 제한 (메모리 관리)

    let buf = [];
    let bufActions = [];
    let stopRecording = null; // 레코딩 중지 함수
    let isRecordingStopped = false; // 레코딩 중지 상태

    // rrweb 노드 ID와 실제 DOM 요소 매핑을 저장할 Map
    const nodeIdToElementMap = new Map();
    const elementToNodeIdMap = new Map();

    // 전역 변수로 레코드 데이터 저장
    window.rrwebGlobalData = {
        sessionId: SESSION_ID,
        events: [],
        actions: [],
        createdAt: new Date().toISOString(),
        lastUpdated: null
    };

    // ---- rrweb core 로드 ----
    const script = document.createElement("script");
    // 고객 내부망에 배포된 rrweb.min.js 경로
    script.src = "/vendor/rrweb/rrweb-all.min.js";
    script.onload = startRecording;
    document.head.appendChild(script);

    function startRecording() {
        if (!window.rrweb) {
            console.error("rrweb 로드 실패");
            return;
        }

        stopRecording = rrweb.record({
            emit(event) {
                // 레코딩이 중지된 상태면 이벤트를 받지 않음
                if (isRecordingStopped) {
                    return;
                }

                // 1. FullSnapshot이나 IncrementalSnapshot의 Mutation 이벤트에서 노드 매핑 정보 수집
                if (event.type === rrweb.EventType.FullSnapshot) {
                    // 전체 스냅샷에서 노드 매핑 정보 추출
                    extractNodeMapping(event.data.node);
                } else if (event.type === rrweb.EventType.IncrementalSnapshot &&
                    event.data?.source === rrweb.IncrementalSource.Mutation) {
                    // 증분 스냅샷에서 추가된 노드들의 매핑 정보 추출
                    if (event.data.adds) {
                        event.data.adds.forEach(add => {
                            extractNodeMapping(add.node);
                        });
                    }
                }

                // Click 감지
                if (isClickEvent(event)) {
                    const elementInfo = getClickedElementInfo(event);
                    // 저장 로직
                    bufActions.push({
                        "type": "click",
                        "timestamp": event.timestamp,
                        "element": elementInfo
                    });
                }

                buf.push(event);
            },
            blockClass: "rr-block",
            ignoreClass: "rr-ignore",
            maskAllInputs: true,
            maskTextClass: "rr-mask",
            checkoutEveryNth: 500,
            // 마우스 움직임 샘플링 - 더 자주 기록하여 부드러운 재생
            sampling: {
                mousemove: 20,  // 20ms마다 마우스 움직임 기록 (더 부드러운 재생)
                mouseInteraction: true,  // 마우스 클릭, 스크롤 등 상호작용 기록
                scroll: 200,  // 스크롤 이벤트 샘플링
                input: 'last'  // 입력 이벤트 기록
            },
            // 추가 레코딩 옵션
            recordCanvas: true,  // 캔버스 요소 기록
            collectFonts: true,  // 폰트 정보 수집
            // 성능 최적화
            slimDOMOptions: {
                script: true,
                comment: true,
                headFavicon: true,
                headWhitespace: true,
                headMetaDescKeywords: true,
                headMetaSocial: true,
                headMetaRobots: true,
                headMetaHttpEquiv: true,
                headMetaAuthorship: true,
                headMetaVerification: true
            }
        });

        // 주기적으로 전역 변수에 저장
        setInterval(saveToGlobalVariable, SEND_INTERVAL);

        // 페이지 종료 시 마지막 데이터 저장
        window.addEventListener("beforeunload", () => {
            if (buf.length > 0) {
                saveToGlobalVariable();
            }
        });
    }

    // 노드 매핑 정보 추출 함수 (재귀적으로 모든 자식 노드 처리)
    function extractNodeMapping(node) {
        if (!node || !node.id) return;

        // 현재 document에서 해당 요소를 찾아서 매핑
        const element = findElementByRRWebNode(node);
        if (element) {
            nodeIdToElementMap.set(node.id, {
                element: element,
                tagName: node.tagName,
                attributes: node.attributes,
                textContent: node.textContent
            });
            elementToNodeIdMap.set(element, node.id);
        }

        // 자식 노드들도 재귀적으로 처리
        if (node.childNodes) {
            node.childNodes.forEach(child => extractNodeMapping(child));
        }
    }

    // rrweb 노드 정보로 실제 DOM 요소 찾기
    function findElementByRRWebNode(node) {
        if (node.type !== 1) return null; // Element 노드가 아니면 스�ip

        try {
            // 속성들을 이용해서 요소 찾기
            const attributes = node.attributes || {};
            let selector = node.tagName ? node.tagName.toLowerCase() : '';

            // id 속성이 있으면 우선적으로 사용
            if (attributes.id) {
                const element = document.getElementById(attributes.id);
                if (element && element.tagName.toLowerCase() === selector) {
                    return element;
                }
            }

            // class 속성을 이용한 검색
            if (attributes.class) {
                selector += '.' + attributes.class.split(' ').join('.');
            }

            // 기타 고유한 속성들 활용
            if (attributes['data-testid']) {
                selector += `[data-testid="${attributes['data-testid']}"]`;
            }

            const elements = document.querySelectorAll(selector);

            // 텍스트 내용으로 추가 필터링
            if (elements.length > 1 && node.textContent) {
                for (let element of elements) {
                    if (element.textContent?.trim() === node.textContent?.trim()) {
                        return element;
                    }
                }
            }

            return elements[0] || null;

        } catch (error) {
            console.warn('요소 찾기 실패:', error, node);
            return null;
        }
    }

    // 클릭된 요소 정보 추출
    function getClickedElementInfo(event) {
        const nodeId = event.data.id;
        const mappedInfo = nodeIdToElementMap.get(nodeId);

        if (mappedInfo) {
            const element = mappedInfo.element;
            return {
                tagName: element.tagName,
                id: element.id || null,
                className: element.className || null,
                textContent: element.textContent?.trim() || null,
                attributes: {
                    'data-testid': element.getAttribute('data-testid'),
                    'data-track': element.getAttribute('data-track'),
                    'href': element.getAttribute('href'),
                    'type': element.getAttribute('type'),
                    'value': element.getAttribute('value')
                },
                // CSS 셀렉터 생성
                selector: generateCSSSelector(element),
                // 부모 정보
                parentInfo: element.parentElement ? {
                    tagName: element.parentElement.tagName,
                    id: element.parentElement.id,
                    className: element.parentElement.className
                } : null,
                // 페이지 URL 정보
                url: window.location.href
            };
        }

        // 매핑 정보가 없으면 현재 위치의 요소를 찾아보기
        const elementAtPosition = document.elementFromPoint(event.data.x, event.data.y);
        if (elementAtPosition) {
            return {
                tagName: elementAtPosition.tagName,
                id: elementAtPosition.id || null,
                className: elementAtPosition.className || null,
                textContent: elementAtPosition.textContent?.trim() || null,
                selector: generateCSSSelector(elementAtPosition),
                note: "위치 기반으로 추정된 요소",
                // 페이지 URL 정보
                url: window.location.href
            };
        }

        return {
            nodeId: nodeId,
            note: "요소 정보를 찾을 수 없음",
            // 페이지 URL 정보
            url: window.location.href
        };
    }

    // CSS 셀렉터 생성 함수
    function generateCSSSelector(element) {
        if (!element) return '';

        // ID가 있으면 ID 사용
        if (element.id) {
            return `#${element.id}`;
        }

        let selector = element.tagName.toLowerCase();

        // 클래스가 있으면 추가
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
                selector += '.' + classes.join('.');
            }
        }

        // 고유하지 않으면 부모 정보도 포함
        const elements = document.querySelectorAll(selector);
        if (elements.length > 1 && element.parentElement) {
            const parentSelector = generateCSSSelector(element.parentElement);
            if (parentSelector) {
                selector = parentSelector + ' > ' + selector;
            }
        }

        return selector;
    }


    let lastHref = location.href;

    // 공통 이벤트 디스패치 함수
    function fireRouteChange(reason) {
        const event = new CustomEvent("rrweb:route-change", {
            detail: { href: location.href, reason }
        });
        window.dispatchEvent(event);
    }

    // 1. 풀 리로드 감지 (load/unload)
    window.addEventListener("load", () => fireRouteChange("load"));
    window.addEventListener("beforeunload", () => fireRouteChange("beforeunload"));

    // 2. SPA 라우팅 (pushState/replaceState/popstate)
    (function (history) {
        ["pushState", "replaceState"].forEach((type) => {
            const orig = history[type];
            history[type] = function () {
                const rv = orig.apply(this, arguments);
                fireRouteChange(type);
                return rv;
            };
        });
    })(window.history);
    window.addEventListener("popstate", () => fireRouteChange("popstate"));

    // 3. Hash 라우팅
    window.addEventListener("hashchange", () => fireRouteChange("hashchange"));

    // 4. Polling fallback (URL 강제 비교)
    setInterval(() => {
        if (lastHref !== location.href) {
            lastHref = location.href;
            fireRouteChange("polling");
        }
    }, 1000);

    // 5. iframe 교체 감지
    document.addEventListener("load", (e) => {
        if (e.target.tagName === "IFRAME") {
            fireRouteChange("iframe-load");
        }
    }, true);

    // --- rrweb 연동 예시 ---
    window.addEventListener("rrweb:route-change", (e) => {
        // rrweb snapshot 찍기
        if (window.rrweb?.record?.takeFullSnapshot) {
            window.rrweb.record.takeFullSnapshot();

            // 필요한 경우 timestamp도 따로 기록
            const now = Date.now();

            bufActions.push({
                "type": "route-change",
                "timestamp": now,
                "href": e.detail.href
            })

            // 서버 저장 로직 예시
            // sendToServer({ type: "route-change", href: e.detail.href, reason: e.detail.reason, ts: now });
        }
    });

    // 클릭 이벤트 감지 함수
    function isClickEvent(event) {
        return event.type === rrweb.EventType.IncrementalSnapshot &&
            event.data?.source === rrweb.IncrementalSource.MouseInteraction &&
            event.data?.type === 2; // MouseInteractions.Click
    }

    // 제한 초과로 인한 레코딩 중지 함수
    function stopRecordingDueToLimit() {
        if (isRecordingStopped) return;

        isRecordingStopped = true;

        // 레코딩 중지
        if (stopRecording && typeof stopRecording === 'function') {
            stopRecording();
            console.log('rrweb 레코딩이 이벤트 개수 제한 초과로 인해 중지되었습니다.');
        }
    }

    function saveToGlobalVariable() {
        if (buf.length === 0) return;

        try {
            // 원본 데이터 크기
            const rawStr = JSON.stringify(buf);
            const rawSize = new Blob([rawStr]).size; // byte 단위

            // 압축 데이터 크기
            const packedData = rrweb.pack(buf)
            const packedStr = JSON.stringify(packedData);
            const packedSize = new Blob([packedStr]).size;

            //console.log(`원본 크기: ${util.convertFileSize(rawSize)}`);
            //console.log(`pack 후 크기: ${util.convertFileSize(packedSize)}`);
            //console.log(`압축률: ${((1 - packedSize / rawSize) * 100).toFixed(2)}%`);

            // 새 이벤트를 전역 변수에 추가
            window.rrwebGlobalData.events = window.rrwebGlobalData.events.concat(buf);
            window.rrwebGlobalData.actions = window.rrwebGlobalData.actions.concat(bufActions);
            window.rrwebGlobalData.lastUpdated = new Date().toISOString();

            // 이벤트 개수 제한 확인 (메모리 관리)
            if (window.rrwebGlobalData.events.length > MAX_EVENTS_COUNT) {
                console.warn(`이벤트 개수 제한 초과 (${window.rrwebGlobalData.events.length}/${MAX_EVENTS_COUNT})`);
                console.warn('레코딩을 중지합니다.');
                stopRecordingDueToLimit();
                return;
            }

            //console.log(`전역 변수에 ${buf.length}개 이벤트 저장됨 (총 ${window.rrwebGlobalData.events.length}개)`);

            buf = []; // 버퍼 초기화
            bufActions = [];
        } catch (err) {
            console.error("전역 변수 저장 오류:", err);
        }
    }

    // 전역 함수로 데이터 접근 가능하게 함 (재생기에서 사용)
    window.getRrwebGlobalData = function () {
        return window.rrwebGlobalData;
    };

    // 전역 데이터 초기화 함수
    window.clearRrwebGlobalData = function () {
        try {
            window.rrwebGlobalData = {
                sessionId: SESSION_ID,
                events: [],
                createdAt: new Date().toISOString(),
                lastUpdated: null
            };
            console.log("rrweb 전역 데이터 초기화됨");
            return true;
        } catch (error) {
            console.error("전역 데이터 초기화 오류:", error);
            return false;
        }
    };

    // 전역 데이터 사용량 확인 함수
    window.getRrwebGlobalInfo = function () {
        try {
            const data = window.rrwebGlobalData;
            const dataSize = JSON.stringify(data).length;

            return {
                eventCount: data.events ? data.events.length : 0,
                bufEventCount: buf.length,
                dataSize: dataSize,
                dataSizeKB: Math.round(dataSize / 1024 * 100) / 100,
                sessionId: data.sessionId,
                createdAt: data.createdAt,
                lastUpdated: data.lastUpdated,
                isRecordingStopped: isRecordingStopped,
                maxEventsCount: MAX_EVENTS_COUNT
            };
        } catch (error) {
            console.error("전역 데이터 정보 조회 오류:", error);
            return null;
        }
    };

    // 레코딩 상태 확인 함수
    window.isRrwebRecordingStopped = function () {
        return isRecordingStopped;
    };

    // 수동으로 레코딩 중지 함수
    window.stopRrwebRecording = function () {
        stopRecordingDueToLimit();
    };
})();
