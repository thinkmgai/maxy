/*
    maxy-loader.js v1.0.0
    maxy.umd.js등을 안전하게 로드한다.
 */
(function (win, doc) {
    try {
        if (win.__maxyLoaderExecuted) return;
        win.__maxyLoaderExecuted = true;

        const SDK_URL = "https://maxy.thinkm.co.kr/update/maxy.umd.js";
        const LOAD_TIMEOUT = 3000;

        //callback용 함수
        function safe(fn) {
            try { fn(); } catch (e) {}
        }

        function loadSDK() {
            safe(() => {
                const s = doc.createElement("script");
                s.src = SDK_URL + "?t=" + Date.now();
                s.async = true;

                let completed = false;

                function finish(success) {
                    if (completed) return;
                    completed = true;
                    if (!success) {
                        // 실패 시 아무 일도 하지 않음
                        return;
                    }
                    // 성공도 아무것도 하지 않음
                    safe(() => {
                        //if (win.maxy && win.maxy.init) {
                        //    win.maxy.init({ appId: "maxyfront" });
                        //}
                    });
                }

                s.onload = () => finish(true);
                s.onerror = () => finish(false);

                setTimeout(() => finish(false), LOAD_TIMEOUT);

                doc.head.appendChild(s);
            });
        }

        // entry
        loadSDK();
    } catch (fatal) {
        // loader 자체가 실패해도 절대 크래시시키지 않음
    }
})(window, document);
