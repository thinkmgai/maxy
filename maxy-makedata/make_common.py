"""
Lightweight marketing log helper.

요구 사항
 - 압축풀기
 - 복호화
 - total-log 보내는 함수 SendTotal()
 - 페이지 로그 보내는 함수 SendPage()

이 파일 하나로 동작하도록 다른 프로젝트 모듈을 임포트하지 않는다.
"""

import base64
import zlib
import random
import json
from typing import Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from Crypto.Cipher import AES
import csv
from pathlib import Path
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Dict
from urllib.parse import quote
import numpy as np

# stest_core.TtoS 일부 발췌 (이름 -> 코드)
_LOG_TYPE_MAP = {
    "WS_Start": 0x00010000 | 0x00000001,  # 65537
    "WS_Error": 0x00010000 | 0x00000002,
    "WS_End": 0x00010000 | 0x00000003,
    "WN_Start": 0x00020000 | 0x00000001,  # 131073
    "WN_Res": 0x00020000 | 0x00000002,
    "WN_Finish": 0x00020000 | 0x00000003,
    "WN_Error": 0x00020000 | 0x00000004,
    "WN_J_Error": 0x00020000 | 0x00000005,
    "WN_D_Start": 0x00020000 | 0x00000007,
    "WN_D_Finish": 0x00020000 | 0x00000008,
    "HTTP_Req": 0x00080000 | 0x00000001,  # 524289
    "HTTP_Rep": 0x00080000 | 0x00000002,
    "HTTP_Finish": 0x00080000 | 0x00000003,
    "HTTP_Error": 0x00080000 | 0x00000004,
    "XMLHttpRequest_Submit": 0x00800000 | 0x00000001,
    "XMLHttpRequest_Response": 0x00800000 | 0x00000004,
    "WN_Web_Vital": 0x00020000 | 0x00000026,  # 131110
    "Action_Click": 0x00100000 | 0x00000013,  # 1048595
    "App_FirstStart": 0x00100000 | 0x00000015,
    "AppStart": 0x00100000 | 0x00000004,  # 1048580
    "Forground": 0x00100000 | 0x00000005,  # 1048581
    "Background": 0x00100000 | 0x00000006,  # 1048582
    "Terminate": 0x00100000 | 0x00000007,  # 1048583
    "Crash": 0x00200000,
    "Nat_Start" : 0x00100000|0x00000001, #1048577
    "Nat_End" : 0x00100000|0x00000002,#1048578
    'Nat_Page_Start' : 0x00100000|0x00000010,   #1048592
    'Nat_Page_Finish' : 0x00100000|0x00000011,
}

class AES128Crypto:
    """
    AES-CBC(PKCS7 padding) 편의 클래스.

    - encrypt          : 평문 -> AES(CBC, zero IV) -> base64 문자열
    - encrypt_zip      : 평문 -> zlib -> AES -> base64 문자열
    - zip              : 평문 -> zlib -> base64 문자열 (AES 미사용)
    - decrypt          : base64(AES 암호문) -> 평문
    """

    def __init__(self, encrypt_key: str):
        self.block_size = AES.block_size
        # 암호화 키는 16바이트만 사용한다.
        self.encrypt_key = encrypt_key[:16].encode("utf-8")

    def _pad(self, raw: bytes) -> bytes:
        padding_len = self.block_size - (len(raw) % self.block_size)
        return raw + bytes([padding_len] * padding_len)

    def _unpad(self, raw: bytes) -> bytes:
        return raw[: -raw[-1]]

    def encrypt(self, raw: str) -> str:
        iv = bytes(self.block_size)
        cipher = AES.new(self.encrypt_key, AES.MODE_CBC, iv)
        encrypted = cipher.encrypt(self._pad(raw.encode("utf-8")))
        return base64.b64encode(encrypted).decode("utf-8")

    def encrypt_zip(self, raw: str) -> str:
        compressed = zlib.compress(raw.encode("utf-8"))
        iv = bytes(self.block_size)
        cipher = AES.new(self.encrypt_key, AES.MODE_CBC, iv)
        encrypted = cipher.encrypt(self._pad(compressed))
        return base64.b64encode(encrypted).decode("utf-8")

    def zip(self, raw: str) -> str:
        compressed = zlib.compress(raw.encode("utf-8"))
        return base64.b64encode(compressed).decode("utf-8")

    def decrypt(self, encoded_cipher_text: str) -> str:
        iv = bytes(self.block_size)
        cipher = AES.new(self.encrypt_key, AES.MODE_CBC, iv)
        encrypted = base64.b64decode(encoded_cipher_text)
        plain = cipher.decrypt(encrypted)
        return self._unpad(plain).decode("utf-8")


def decompress_payload(encoded: str) -> str:
    """
    base64 인코딩된 zlib 압축 문자열을 풀어서 반환한다.
    """
    decoded = base64.b64decode(encoded)
    return zlib.decompress(decoded).decode("utf-8")


def decrypt_payload(encoded: str, key: str = "thinkmisthebestm") -> str:
    """
    base64 인코딩된 AES128(CBC) 암호문을 복호화한다.
    """
    cipher = AES128Crypto(key)
    return cipher.decrypt(encoded)


def load_waterfall_entries(csv_path: str, limit: Optional[int] = None) -> list[str]:
    """
    Data/res.csv 형태의 워터폴 값을 리스트로 읽어온다.
    """
    path = Path(csv_path)
    entries: list[str] = []
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            value = row.get("value")
            if value:
                entries.append(value)
            if limit is not None and len(entries) >= limit:
                break
    return entries


def load_script_errors(csv_path: str, *, log_type: str = "131077") -> list[str]:
    """
    crash.csv 형태에서 스크립트 에러(log_type=131077) 메시지를 읽어온다.
    """
    path = Path(csv_path)
    errors: list[str] = []
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("log_type") == log_type and row.get("value"):
                errors.append(row["value"])
    return errors



def send_target_app_check(
    *,
    device_id: str,
    app_id: str,
    os_ver: str,
    os_type: str,
    model: str,
    phone_no: str = "",
    base_url: Optional[str] = None,
) -> None:
    """
    minkSvc targetAppChk 호출.
    """
    url = f"{(base_url or gURL).rstrip('/')}/maxy/minkSvc?post=targetAppChk"
    postdata = f"deviceId={quote(device_id)}&appId={quote(app_id)}&serverType=0&osVer={quote(os_ver)}&osType={quote(os_type)}&model={quote(model)}&phoneNo={quote(phone_no)}"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    try:
        with requests.session() as session:
            session.keep_alive = False
            response = session.post(url, data=postdata, headers=headers)
            response.raise_for_status()
    except Exception as e:
        print(f"[Error] {url} {e}")


def send_set_maxy_info(
    *,
    device_id: str,
    app_id: str,
    os_ver: str,
    os_type: str,
    model: str,
    app_ver: str,
    user_id: str = "",
    base_url: Optional[str] = None,
) -> None:
    """
    minkSvc setMaxyInfo 호출.
    """
    url = f"{(base_url or gURL).rstrip('/')}/maxy/minkSvc?post=setMaxyInfo"
    postdata = (
        f"deviceId={quote(device_id)}&appId={quote(app_id)}&serverType=0"
        f"&osVer={quote(os_ver)}&osType={quote(os_type)}&model={quote(model)}&phoneNo="
        f"&appVerCd={quote(app_ver)}&maxyVer=1.3.1&userId={quote(user_id)}"
    )
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    with requests.session() as session:
        session.keep_alive = False
        response = session.post(url, data=postdata, headers=headers)
        response.raise_for_status()


def send_total_events(events: list[dict], *, defaults: Optional[dict] = None, base_url: Optional[str] = None) -> None:
    """
    이벤트 dict 목록을 받아 순차 전송한다.

    events 항목 예시:
        {"log_tm": 123, "device_id": "abc", "log_type": 131073, "req_url": "http://maxy.co.kr/page1", "event_params": "{}"}
    """
    defaults = defaults or {}
    events_sorted = sorted(events, key=lambda e: e.get("log_tm", 0))

    for event in events_sorted:
        payload = deepcopy(defaults)
        payload.update(event)

        event_type = payload.get("log_type")
        device_id = payload.get("device_id", "")
        state = _PAGE_STATE.get(device_id)

        if event_type in _PAGE_TRANSITION_TYPES:
            # 이전 페이지 flush
            if state:
                _emit_web_vitals(state, defaults, base_url)
                if event_type != log_type("Crash"):
                    SendPage(
                        **state.finalize(),
                        base_url=base_url,
                        compress=payload.get("compress", defaults.get("compress", True)),
                        encrypt=payload.get("encrypt", defaults.get("encrypt", True)),
                        key=payload.get("key", defaults.get("key", "thinkmisthebestm")),
                    )
            
            if event_type != log_type("Crash"):        
                # 새 페이지 시작
                state = _start_new_page(payload, defaults, state)
                _PAGE_STATE[device_id] = state

        # 페이지 상태 누적 (전환 이벤트 포함)
        if state:
            state.update_from_event(payload)
        
        payload["page_id"] = state.page_id
        payload["page_url"] = state.req_url
        SendTotal(base_url=base_url, **payload)

    # 남은 페이지 flush
    for state in _PAGE_STATE.values():
        _emit_web_vitals(state, defaults, base_url)
        SendPage(
            **state.finalize(),
            base_url=base_url,
            compress=defaults.get("compress", True),
            encrypt=defaults.get("encrypt", True),
            key=defaults.get("key", "thinkmisthebestm"),
        )
    _PAGE_STATE.clear()





def log_type(name: str) -> int:
    """사람 친화적인 이벤트 이름을 코드로 변환한다."""
    if name not in _LOG_TYPE_MAP:
        raise KeyError(f"log type '{name}' not found in map")
    return _LOG_TYPE_MAP[name]


# Web Vitals 기본 템플릿(stresstest/stest_actionlist.py 참조)
_WEB_VITAL_TEMPLATES = {
    "FCP": {
        "name": "FCP",
        "value": 0,
        "rating": "good",
        "delta": 0,
        "entries": [
            {
                "name": "first-contentful-paint",
                "entryType": "paint",
                "startTime": 0,
                "duration": 0,
            }
        ],
        "id": "",
        "navigationType": "navigate",
    },
    "TTFB": {
        "name": "TTFB",
        "value": 0,
        "rating": "good",
        "delta": 0,
        "entries": [
            {
                "name": "",
                "entryType": "navigation",
                "startTime": 0,
                "duration": 0,
                "initiatorType": "navigation",
                "deliveryType": "",
                "nextHopProtocol": "h2",
                "renderBlockingStatus": "non-blocking",
                "workerStart": 0,
                "redirectStart": 0,
                "redirectEnd": 0,
                "fetchStart": 0,
                "domainLookupStart": 0,
                "domainLookupEnd": 0,
                "connectStart": 0,
                "secureConnectionStart": 0,
                "connectEnd": 0,
                "requestStart": 0,
                "responseStart": 0,
                "firstInterimResponseStart": 0,
                "finalResponseHeadersStart": 0,
                "responseEnd": 0,
                "transferSize": 0,
                "encodedBodySize": 0,
                "decodedBodySize": 0,
                "responseStatus": 200,
                "serverTiming": [],
                "unloadEventStart": 0,
                "unloadEventEnd": 0,
                "domInteractive": 0,
                "domContentLoadedEventStart": 0,
                "domContentLoadedEventEnd": 0,
                "domComplete": 0,
                "loadEventStart": 0,
                "loadEventEnd": 0,
                "type": "navigate",
                "redirectCount": 0,
                "activationStart": 0,
                "criticalCHRestart": 0,
                "notRestoredReasons": 0,
            }
        ],
        "id": "",
        "navigationType": "navigate",
    },
    "LCP": {
        "name": "LCP",
        "value": 0,
        "rating": "good",
        "delta": 0,
        "entries": [
            {
                "name": "",
                "entryType": "largest-contentful-paint",
                "startTime": 0,
                "duration": 0,
                "size": 0,
                "renderTime": 0,
                "loadTime": 0,
                "id": "",
                "url": "",
            }
        ],
        "id": "",
        "navigationType": "navigate",
    },
    "INP": {
        "name": "INP",
        "value": 0,
        "rating": "good",
        "delta": 0,
        "entries": [
            {
                "name": "pointerdown",
                "entryType": "first-input",
                "startTime": 0,
                "duration": 0,
                "interactionId": 0,
                "processingStart": 0,
                "processingEnd": 0,
                "cancelable": True,
            }
        ],
        "id": "",
        "navigationType": "navigate",
    },
    "CLS": {
        "name": "CLS",
        "value": 0,
        "rating": "good",
        "delta": 0,
        "entries": [
            {
                "name": "",
                "entryType": "layout-shift",
                "startTime": 0,
                "duration": 0,
                "value": 0,
                "hadRecentInput": True,
                "lastInputTime": 0,
                "sources": [],
            }
        ],
        "id": "",
        "navigationType": "navigate",
    },
}


# 페이지 전환으로 간주할 이벤트 집합
_PAGE_TRANSITION_TYPES = {
    log_type("App_FirstStart"),
    log_type("WN_Start"),
    log_type("Nat_Page_Start"),
    log_type("AppStart"),
    log_type("Forground"),
    log_type("Background"),
    log_type("Terminate"),
    log_type("Crash"),
}


@dataclass
class PageInfoState:
    device_id: str
    package_nm: str = ""
    server_type: str = ""
    os_type: str = ""
    app_ver: str = ""
    os_ver: str = ""
    app_build_num: str = ""
    device_model: str = ""
    sim_operator_nm: str = ""
    com_type: int = 0
    timezone: str = "Asia/Seoul"
    vip_yn: str = "N"
    login_yn: str = ""

    req_url: str = ""
    flow_order: int = 0
    page_start_tm: int = 0
    page_end_tm: int = 0
    parent_log_date: int = 0
    pre_url: str = ""
    pre_url_time: int = 0
    info: str = ""
    cls: float = 0
    inp: float = 0
    lcp: float = 0
    fcp: float = 0
    ttfb: float = 0

    # counters
    log_count: int = 0
    event_count: int = 0
    error_count: int = 0
    js_error_count: int = 0
    crash_count: int = 0
    request_count: int = 0
    event_intervaltime: int = 0
    last_log_tm: int = 0
    res: str = "N"  # 워터폴 여부
    loading_time: int = 0
    page_log_type: int = field(default_factory=lambda: log_type("WN_Start"))
    page_id: int = 0
    
    sum_mem_usage = 0
    sum_cpu_usage = 0

    def update_from_event(self, event: dict) -> None:
        tm = int(event.get("log_tm", self.page_end_tm or 0))
        if self.log_count > 0 and tm > self.last_log_tm:
            self.event_intervaltime += tm - self.last_log_tm
        self.last_log_tm = tm
        self.page_end_tm = tm
        
        

        etype = event.get("log_type")
        
        if etype != log_type("WN_D_Start"):
            self.log_count += 1
            self.event_count += 1
            self.sum_mem_usage += event.get("mem_usage")
            self.sum_cpu_usage += event.get("cpu_usage")
            
        # 워터폴 존재 여부 (현 페이지에서 WN_D_* 수신 시 Y)
        if etype in {log_type("WN_D_Start"), log_type("WN_D_Finish")}:
            self.res = "Y"
        if etype == log_type("WN_Finish") or etype == log_type("Nat_Page_Finish"):
            self.loading_time = max(0, tm - self.page_start_tm)
        if etype == log_type("WN_J_Error"):
            self.error_count += 1
            self.js_error_count += 1
        elif etype in {log_type("WN_Error"), log_type("HTTP_Error"), log_type("Crash")}:
            if etype == log_type("Crash"):
                self.crash_count += 1
            else:
                self.error_count += 1
        if etype in {log_type("HTTP_Req"), log_type("XMLHttpRequest_Submit")}:
            self.request_count += 1

    def finalize(self) -> dict:
        return {
            "log_tm": self.page_start_tm,
            "device_id": self.device_id,
            "package_nm": self.package_nm,
            "server_type": self.server_type,
            "os_type": self.os_type,
            "app_ver": self.app_ver,
            "os_ver": self.os_ver,
            "app_build_num": self.app_build_num,
            "device_model": self.device_model,
            "sim_operator_nm": self.sim_operator_nm,
            "com_type": self.com_type,
            "timezone": self.timezone,
            "vip_yn": self.vip_yn,
            "login_yn": self.login_yn,
            "req_url": self.req_url,
            "flow_order": self.flow_order,
            "page_start_tm": self.page_start_tm,
            "page_end_tm": self.page_end_tm or self.page_start_tm,
            "parent_log_date": self.parent_log_date or self.page_start_tm,
            "event_intervaltime": self.event_intervaltime,
            "intervaltime": self.page_end_tm - self.page_start_tm if self.page_end_tm else 0,
            "request_count": self.request_count,
            "event_count": self.event_count,
            "error_count": self.error_count,
            "js_error_count": self.js_error_count,
            "crash_count": self.crash_count,
            "log_count": self.log_count,
            "loading_time": self.loading_time,
            "wtf_flag": "Y" if self.res == "Y" else "N",
            "pre_url": self.pre_url,
            "pre_url_time": self.pre_url_time,
            "info": self.info,
            "sum_cpu_usage":self.sum_cpu_usage,
            "sum_mem_usage":self.sum_mem_usage,
            "cls": self.cls,
            "inp": self.inp,
            "lcp": self.lcp,
            "fcp": self.fcp,
            "ttfb": self.ttfb,
            "log_type": self.page_log_type,
            "page_id": self.page_id,
        }


# 디바이스별 페이지 상태 버퍼
_PAGE_STATE: Dict[str, PageInfoState] = {}


def _start_new_page(payload: dict, defaults: dict, prev_state: PageInfoState | None) -> PageInfoState:
    device_id = payload.get("device_id", "")
    event_type = payload.get("log_type")
    flow_order = 1 if prev_state is None else prev_state.flow_order + 1
    pre_url = "" if prev_state is None else prev_state.req_url
    pre_time = 0 if prev_state is None else prev_state.page_end_tm
    parent_log_date = payload.get("parent_log_date")
    if event_type == log_type("AppStart"):
        parent_log_date = payload.get("log_tm", 0)
    elif not parent_log_date and prev_state and prev_state.parent_log_date:
        parent_log_date = prev_state.parent_log_date
    if not parent_log_date:
        parent_log_date = payload.get("log_tm", 0)

    state = PageInfoState(
        device_id=device_id,
        package_nm=payload.get("package_nm", defaults.get("package_nm", "")),
        server_type=payload.get("server_type", defaults.get("server_type", "")),
        os_type=payload.get("os_type", defaults.get("os_type", "")),
        app_ver=payload.get("app_ver", defaults.get("app_ver", "")),
        os_ver=payload.get("os_ver", defaults.get("os_ver", "")),
        app_build_num=payload.get("app_build_num", defaults.get("app_build_num", "")),
        device_model=payload.get("device_model", defaults.get("device_model", "")),
        sim_operator_nm=payload.get("sim_operator_nm", defaults.get("sim_operator_nm", "")),
        com_type=payload.get("com_type", defaults.get("com_type", 0)),
        timezone=payload.get("timezone", defaults.get("timezone", "Asia/Seoul")),
        vip_yn=payload.get("vip_yn", defaults.get("vip_yn", "N")),
        login_yn=payload.get("login_yn", defaults.get("login_yn", "")),
        req_url=payload.get("req_url", ""),
        flow_order=flow_order,
        page_start_tm=payload.get("log_tm", 0),
        page_end_tm=payload.get("log_tm", 0),
        parent_log_date=parent_log_date,
        pre_url=pre_url,
        pre_url_time=pre_time,
        info=payload.get("info", ""),
        cls=payload.get("cls", 0),
        inp=payload.get("inp", 0),
        lcp=payload.get("lcp", 0),
        fcp=payload.get("fcp", 0),
        ttfb=payload.get("ttfb", 0),
        page_log_type=event_type if event_type is not None else log_type("WN_Start"),
    )
    state.res = "N"  # 기본은 N, 워터폴(WN_D_Start 등) 수신 시 Y로 전환
    state.page_id = payload.get("log_tm", 0) 
    return state


def _emit_web_vitals(state: PageInfoState, defaults: dict, base_url: Optional[str]) -> None:
    if state.res != "Y":
        return
    metrics = []
    ts = state.page_end_tm or state.page_start_tm
    
    state.ttfb = np.random.uniform(state.loading_time/3,state.loading_time)
    state.fcp = np.random.uniform(state.ttfb,state.loading_time)
    state.cls = np.random.uniform(0,0.4)
    state.inp = np.random.uniform(state.fcp,state.loading_time)
    state.lcp = np.random.uniform(state.fcp,state.loading_time)
                        
                        
    if state.cls > 0:
        metrics.append(("CLS", state.cls, ts + 1))
    if state.inp > 0:
        metrics.append(("INP", state.inp, ts + 2))
    if state.lcp > 0:
        metrics.append(("LCP", state.lcp, ts + 3))
    if state.ttfb > 0:
        metrics.append(("TTFB", state.ttfb, ts + 4))
    if state.fcp > 0:
        metrics.append(("FCP", state.fcp, ts + 5))

    for name, value, log_tm in metrics:
        template = deepcopy(_WEB_VITAL_TEMPLATES.get(name, {"name": name}))
        template["value"] = value
        if "delta" in template:
            template["delta"] = value
        if "entries" in template and template["entries"]:
            entry = template["entries"][0]
            if "startTime" in entry:
                entry["startTime"] = value
            if "duration" in entry:
                entry["duration"] = 0
        template["id"] = f"v5-{log_tm}-{random.randint(0, 5460578609824)}"

        SendTotal(
            log_tm=log_tm,
            device_id=state.device_id,
            log_type=log_type("WN_Web_Vital"),
            com_type=state.com_type,
            os_ver=state.os_ver,
            app_ver=state.app_ver,
            device_model=state.device_model,
            mem_usage=1024,
            cpu_usage=50,
            com_sensitivity=state.com_type,
            battery_lvl=0,
            req_url=state.req_url,
            event_params=json.dumps(template),
            interval_time=0,
            storage_usage=0,
            storage_total=0,
            timezone=state.timezone,
            webview_ver="",
            app_build_num=state.app_build_num,
            referer="",
            ip="",
            sim_operator_nm=state.sim_operator_nm,
            login_yn=state.login_yn,
            maxy_session_id=None,
            web_only_yn="N",
            package_nm=state.package_nm,
            server_type=state.server_type,
            os_type=state.os_type,
            deep_link="",
            page_url=state.req_url,
            jennifer_data="",
            user_id="",
            optional="",
            os_lang="",
            webview_size="",
            status_code=0,
            response_size=0,
            request_size=0,
            wait_time=0,
            download_time=0,
            req_msg="",
            page_id=state.page_id,
            reserved_2="",
            traffic_source="",
            medium="",
            campaign="",
            event_id="",
            device_category="",
            os_category="",
            browser="",
            sex="",
            age="",
            geo_country="",
            geo_region="",
            geo_city="",
            user_properties="",
            is_important_event=0,
            is_first_install=0,
            is_first_open=0,
            base_url=base_url,
            compress=defaults.get("compress", True),
            encrypt=defaults.get("encrypt", True),
            key=defaults.get("key", "thinkmisthebestm"),
        )

gURL = ""
gMaxy = True
def _target_url(base_url: Optional[str]) -> str:
    """
    base_url 이 /maxy/w 를 포함하지 않으면 자동으로 붙여준다.
    """
    global gURL
    global gMaxy
    # base = base_url or "http://192.168.10.232:8085/maxy/logCollect.maxy"
    base = base_url or gURL
    # base = base_url or "http://127.0.0.1:8085/maxy/logCollect.maxy"
    if gMaxy:
        return base if base.endswith("/maxy/logCollect.maxy") else f"{base.rstrip('/')}/maxy/logCollect.maxy"
    return base if base.endswith("/maxy/w") else f"{base.rstrip('/')}/maxy/w"


def _page_url(base_url: Optional[str]) -> str:
    """
    pageInfoCollect endpoint 보조 함수.
    """
    global gURL
    global gMaxy
    base = base_url or gURL
    if gMaxy:
        return base if base.endswith("/maxy/pageInfoCollect.maxy") else f"{base.rstrip('/')}/maxy/pageInfoCollect.maxy"
    return base if base.endswith("/maxy/w") else f"{base.rstrip('/')}/maxy/w"


def _encode_message(message: str, *, compress: bool, encrypt: bool, key: str) -> str:
    print(message)
    cipher = AES128Crypto(key)
    if encrypt and compress:
        return cipher.encrypt_zip(message)
    if encrypt:
        return cipher.encrypt(message)
    if compress:
        return cipher.zip(message)
    return message


def _replace_mark(value: str) -> str:
    """
    콤마/개행이 있는 필드는 서버 규칙에 맞게 ^, | 로 치환한다.
    """
    return str(value).replace(",", "^").replace("\n", "|").replace("\r", "|")


# def _encode_json_field(value: str) -> str:
#     """
#     JSON/구조 문자열에서 콤마가 필드 구분자로 오인되지 않도록 clickhousecomma로 치환한다.
#     """
#     if value is None:
#         return ""
#     return str(value).replace(",", "clickhousecomma").replace("\n", "|").replace("\r", "|")


def build_page_log_line(
    *,
    device_id: str,
    package_nm: str,
    server_type: str,
    os_type: str,
    app_ver: str,
    os_ver: str,
    app_build_num: str,
    device_model: str,
    sim_operator_nm: str,
    com_type: str,
    timezone: str,
    vip_yn: str,
    login_yn: str,
    req_url: str,
    flow_order: int,
    page_start_tm: int,
    page_end_tm: int,
    parent_log_date: int,
    event_intervaltime: int,
    intervaltime: int,
    loading_time: int,
    response_time: int,
    request_count: int,
    event_count: int,
    error_count: int,
    js_error_count: int,
    crash_count: int,
    log_count: int,
    avg_battery_lvl: float,
    avg_com_sensitivity: float,
    avg_cpu_usage: float,
    avg_mem_usage: float,
    avg_storage_usage: float,
    max_battery_lvl: float,
    max_com_sensitivity: float,
    max_cpu_usage: float,
    max_mem_usage: float,
    max_storage_usage: float,
    min_battery_lvl: float,
    min_com_sensitivity: float,
    min_cpu_usage: float,
    min_mem_usage: float,
    min_storage_usage: float,
    sum_battery_lvl: float,
    sum_com_sensitivity: float,
    sum_cpu_usage: float,
    sum_mem_usage: float,
    sum_storage_usage: float,
    log_type: int,
    wtf_flag: str,
    pre_url: str,
    pre_url_time: int,
    info: str,
    cls: float,
    inp: float,
    lcp: float,
    fcp: float,
    ttfb: float,
    page_id:int
) -> str:
    """
    페이지 로그 한 줄 생성기 (랜덤 생성 없음, 모든 값 외부 입력).
    """
    fields = [
        device_id,
        package_nm,
        server_type,
        os_type,
        _replace_mark(app_ver),
        _replace_mark(os_ver),
        _replace_mark(app_build_num),
        _replace_mark(device_model),
        sim_operator_nm,
        com_type,
        timezone,
        vip_yn,
        login_yn,
        _replace_mark(req_url),
        flow_order,
        page_start_tm,
        page_end_tm,
        parent_log_date,
        event_intervaltime,
        intervaltime,
        loading_time,
        response_time,
        request_count,
        event_count,
        error_count,
        js_error_count,
        crash_count,
        log_count,
        int(avg_battery_lvl),
        int(avg_com_sensitivity),
        int(avg_cpu_usage),
        int(avg_mem_usage),
        int(avg_storage_usage),
        max_battery_lvl,
        max_com_sensitivity,
        max_cpu_usage,
        max_mem_usage,
        max_storage_usage,
        min_battery_lvl,
        min_com_sensitivity,
        min_cpu_usage,
        min_mem_usage,
        min_storage_usage,
        sum_battery_lvl,
        sum_com_sensitivity,
        sum_cpu_usage,
        sum_mem_usage,
        sum_storage_usage,
        log_type,
        _replace_mark(wtf_flag),
        _replace_mark(pre_url),
        pre_url_time,
        _replace_mark(info),
        cls,
        inp,
        lcp,
        fcp,
        ttfb,
        page_id
    ]
    return ",".join(map(str, fields))


def build_total_log_line(
    log_tm: int,
    device_id: str,
    log_type: int,
    com_type: str,
    os_ver: str,
    app_ver: str,
    device_model: str,
    mem_usage: int,
    cpu_usage: int,
    com_sensitivity: str,
    battery_lvl: int,
    req_url: str,
    event_params: str,
    interval_time: int,
    storage_usage: int,
    storage_total: int,
    timezone: str,
    webview_ver: str,
    app_build_num: str,
    referer: str = "",
    ip: str = "",
    sim_operator_nm: str = "",
    login_yn: str = "",
    maxy_session_id: Optional[str] = None,
    web_only_yn: str = "N",
    package_nm: str = "maxy",
    server_type: str = "0",
    os_type: str = "",
    deep_link: str = "",
    page_url: str = "",
    jennifer_data: str = "",
    user_id: str = "",
    optional: str = "",
    os_lang: str = "",
    webview_size: str = "",
    status_code: int = 0,
    response_size: int = 0,
    request_size: int = 0,
    wait_time: int = 0,
    download_time: int = 0,
    req_msg: str = "",
    page_id: int = 0,
    reserved_2: str = "",
    traffic_source: str = "",
    medium: str = "",
    campaign: str = "",
    event_id: str = "",
    device_category: str = "",
    os_category: str = "",
    browser: str = "",
    sex: str = "",
    age: str = "",
    geo_country: str = "",
    geo_region: str = "",
    geo_city: str = "",
    user_properties: str = "",
    is_important_event: int = 0,
    is_first_install: int = 0,
    is_first_open: int = 0,
) -> str:
    """
    total-log 한 줄 생성기 (ClickHouse MV arr[*] 순서와 동일).

    Args:
        [1] log_tm: 로그 기록 시각(ms).
        [2] device_id: 단말 UUID.
        [3] log_type: 이벤트 타입 코드.
        [4] com_type: 네트워크/통신 타입(WIFI/2G/3G/LTE/5G).
        [5] os_ver: OS 버전.
        [6] app_ver: 앱 버전.
        [7] device_model: 디바이스 모델명.
        [8] mem_usage: 메모리 사용량.
        [9] cpu_usage: CPU 사용량(%).
        [10] com_sensitivity: 통신 감도.
        [11] battery_lvl: 배터리 잔량(%).
        [12] req_url: 이벤트 이름/요청 URL.
        [13] event_params: 이벤트 파라미터(JSON, 콤마는 clickhousecomma로 치환).
        [14] interval_time: 인터벌 시간(ms).
        [15] storage_usage: 사용 스토리지.
        [16] storage_total: 총 스토리지.
        [17] timezone: 타임존.
        [18] webview_ver: 웹뷰 버전.
        [19] app_build_num: 빌드 버전.
        [20] referer: referrer.
        [21] ip: 클라이언트 IP.
        [22] sim_operator_nm: 통신사명.
        [23] login_yn: 로그인 여부.
        [24] maxy_session_id: 세션 ID.
        [25] web_only_yn: 웹 전용 여부.
        [26] package_nm: 패키지명.
        [27] server_type: 서버 타입.
        [28] os_type: 플랫폼 문자열(Android/iOS 등).
        [29] deep_link: 딥링크.
        [30] page_url: 페이지 URL.
        [31] jennifer_data: 제니퍼 로그.
        [32] user_id: 사용자 ID.
        [33] optional: 옵션 필드.
        [34] os_lang: OS 언어.
        [35] webview_size: 웹뷰 크기.
        [36] status_code: HTTP 상태 코드.
        [37] response_size: 응답 크기.
        [38] request_size: 요청 크기.
        [39] wait_time: 대기 시간.
        [40] download_time: 다운로드 시간.
        [41] req_msg: 요청 메시지.
        [42] page_id: 확장 필드(미사용 시 빈 값).
        [43] reserved_2: 확장 필드(미사용 시 빈 값).
        [44] traffic_source: 유입 소스.
        [45] medium: 유입 매체.
        [46] campaign: 유입 캠페인.
        [47] event_id: 이벤트 UUID(비우면 서버에서 생성).
        [48] device_category: mobile/tablet/desktop 등.
        [49] os_category: android/ios/windows 등.
        [50] browser: 브라우저명.
        [51] sex: 성별.
        [52] age: 연령대.
        [53] geo_country: 국가.
        [54] geo_region: 지역(도).
        [55] geo_city: 지역(시).
        [56] user_properties: 사용자 속성(JSON, 콤마는 clickhousecomma로 치환).
        [57] is_important_event: 중요 이벤트 여부(0/1).
        [58] is_first_install: 첫 설치 여부(0/1).
        [59] is_first_open: 첫 실행 여부(0/1).
    """
    fields = [
        log_tm,
        device_id,
        log_type,
        com_type,
        _replace_mark(os_ver),
        _replace_mark(app_ver),
        _replace_mark(device_model),
        mem_usage,
        cpu_usage,
        _replace_mark(com_sensitivity),
        battery_lvl,
        _replace_mark(req_url),
        _replace_mark(event_params),#_encode_json_field(event_params),
        interval_time,
        storage_usage,
        storage_total,
        timezone,
        _replace_mark(webview_ver),
        _replace_mark(app_build_num),
        _replace_mark(referer),
        ip,
        sim_operator_nm,
        login_yn,
        _replace_mark(maxy_session_id or ""),
        web_only_yn,
        package_nm,
        server_type,
        os_type,
        _replace_mark(deep_link),
        _replace_mark(page_url),
        _replace_mark(jennifer_data),
        user_id,
        _replace_mark(optional),
        _replace_mark(os_lang),
        _replace_mark(webview_size),
        status_code,
        response_size,
        request_size,
        wait_time,
        download_time,
        _replace_mark(req_msg),
        page_id,
        _replace_mark(reserved_2),
        _replace_mark(traffic_source),
        _replace_mark(medium),
        _replace_mark(campaign),
        event_id,
        device_category,
        os_category,
        browser,
        sex,
        age,
        geo_country,
        geo_region,
        geo_city,
        _replace_mark(user_properties),#_encode_json_field(user_properties),
        is_important_event,
        is_first_install,
        is_first_open,
    ]
    return ",".join(map(str, fields))

sendCount = 0
def SendTotal(
    log_tm: int,
    device_id: str,
    log_type: int = 6291457,
    com_type: str = "WIFI",
    os_ver: str = "16.0",
    app_ver: str = "1.0.0",
    device_model: str = "iPhone 14 Pro",
    mem_usage: int = 1024,
    cpu_usage: int = 10,
    com_sensitivity: str = "5",
    battery_lvl: int = 100,
    req_url: str = "https://example.com",
    event_params: str = "{}",
    interval_time: int = 1000,
    storage_usage: int = 1024,
    storage_total: int = 1024,
    timezone: str = "Asia/Seoul",
    webview_ver: str = "8613.1.17.0.7",
    app_build_num: str = "1.1.1",
    referer: str = "",
    ip: str = "",
    sim_operator_nm: str = "",
    login_yn: str = "",
    maxy_session_id: Optional[str] = None,
    web_only_yn: str = "N",
    package_nm: str = "maxy",
    server_type: str = "0",
    os_type: str = "",
    deep_link: str = "",
    page_url: str = "",
    jennifer_data: str = "",
    user_id: str = "",
    optional: str = "",
    os_lang: str = "",
    webview_size: str = "",
    status_code: int = 0,
    response_size: int = 0,
    request_size: int = 0,
    wait_time: int = 0,
    download_time: int = 0,
    req_msg: str = "",
    page_id: int = 0,
    reserved_2: str = "",
    traffic_source: str = "",
    medium: str = "",
    campaign: str = "",
    event_id: str = "",
    device_category: str = "",
    os_category: str = "",
    browser: str = "",
    sex: str = "",
    age: str = "",
    geo_country: str = "",
    geo_region: str = "",
    geo_city: str = "",
    user_properties: str = "{}",
    is_important_event: int = 0,
    is_first_install: int = 0,
    is_first_open: int = 0,
    base_url: Optional[str] = None,
    compress: bool = True,
    encrypt: bool = True,
    key: str = "thinkmisthebestm",
) -> requests.Response:
    """
    total-log 전송 (모든 필드 외부 입력, 내부 랜덤 없음).

    Args:
        [1] log_tm: 로그 시각(ms).
        [2] device_id: 단말 UUID.
        [3] log_type: 이벤트 타입 코드.
        [4] com_type: 네트워크/통신 타입.
        [5] os_ver: OS 버전.
        [6] app_ver: 앱 버전.
        [7] device_model: 디바이스 모델.
        [8] mem_usage: 메모리 사용량.
        [9] cpu_usage: CPU 사용률.
        [10] com_sensitivity: 통신 감도.
        [11] battery_lvl: 배터리 잔량.
        [12] req_url: 이벤트 이름/요청 URL.
        [13] event_params: 이벤트 파라미터(JSON, 콤마는 clickhousecomma로 치환).
        [14] interval_time: 인터벌(ms).
        [15] storage_usage: 사용 스토리지.
        [16] storage_total: 전체 스토리지.
        [17] timezone: 타임존.
        [18] webview_ver: 웹뷰 버전.
        [19] app_build_num: 빌드 버전.
        [20] referer: referrer.
        [21] ip: 클라이언트 IP.
        [22] sim_operator_nm: 통신사.
        [23] login_yn: 로그인 여부.
        [24] maxy_session_id: 세션 ID.
        [25] web_only_yn: 웹 전용 여부.
        [26] package_nm: 앱 패키지명.
        [27] server_type: 서버 타입.
        [28] os_type: 플랫폼 문자열(Android/iOS 등).
        [29] deep_link: 딥링크.
        [30] page_url: 페이지 URL.
        [31] jennifer_data: 제니퍼 로그.
        [32] user_id: 사용자 ID.
        [33] optional: 옵션 필드.
        [34] os_lang: OS 언어.
        [35] webview_size: 웹뷰 크기.
        [36] status_code: HTTP 상태 코드.
        [37] response_size: 응답 바이트.
        [38] request_size: 요청 바이트.
        [39] wait_time: 대기 시간.
        [40] download_time: 다운로드 시간.
        [41] req_msg: 요청 메시지.
        [42] reserved_1: 확장 필드(미사용 시 빈 값).
        [43] reserved_2: 확장 필드(미사용 시 빈 값).
        [44] traffic_source: 유입 소스.
        [45] medium: 유입 매체.
        [46] campaign: 유입 캠페인.
        [47] event_id: 이벤트 UUID(비우면 서버에서 생성).
        [48] device_category: mobile/tablet/desktop 등.
        [49] os_category: android/ios/windows 등.
        [50] browser: 브라우저명.
        [51] sex: 성별.
        [52] age: 연령대.
        [53] geo_country: 국가.
        [54] geo_region: 지역(도).
        [55] geo_city: 지역(시).
        [56] user_properties: 사용자 속성(JSON, 콤마는 clickhousecomma로 치환).
        [57] is_important_event: 중요 이벤트 여부(0/1).
        [58] is_first_install: 첫 설치 여부(0/1).
        [59] is_first_open: 첫 실행 여부(0/1).
        base_url: 전송 대상 URL.
        compress: zlib 압축 여부.
        encrypt: AES128 암호화 여부.
        key: 암복호화 키.
    """
    global sendCount
    global gMaxy
    sendCount += 1
    log_line = build_total_log_line(
        log_tm=log_tm,
        device_id=device_id,
        log_type=log_type,
        com_type=com_type,
        os_ver=os_ver,
        app_ver=app_ver,
        device_model=device_model,
        mem_usage=mem_usage,
        cpu_usage=cpu_usage,
        com_sensitivity=com_sensitivity,
        battery_lvl=battery_lvl,
        req_url=req_url,
        event_params=event_params,
        interval_time=interval_time,
        storage_usage=storage_usage,
        storage_total=storage_total,
        timezone=timezone,
        webview_ver=webview_ver,
        app_build_num=app_build_num,
        referer=referer,
        ip=ip,
        sim_operator_nm=sim_operator_nm,
        login_yn=login_yn,
        maxy_session_id=maxy_session_id,
        web_only_yn=web_only_yn,
        package_nm=package_nm,
        server_type=server_type,
        os_type=os_type,
        deep_link=deep_link,
        page_url=page_url,
        jennifer_data=jennifer_data,
        user_id=user_id,
        optional=optional,
        os_lang=os_lang,
        webview_size=webview_size,
        status_code=status_code,
        response_size=response_size,
        request_size=request_size,
        wait_time=wait_time,
        download_time=download_time,
        req_msg=req_msg,
        page_id=page_id,
        reserved_2=reserved_2,
        traffic_source=traffic_source,
        medium=medium,
        campaign=campaign,
        event_id=event_id,
        device_category=device_category,
        os_category=os_category,
        browser=browser,
        sex=sex,
        age=age,
        geo_country=geo_country,
        geo_region=geo_region,
        geo_city=geo_city,
        user_properties=user_properties,
        is_important_event=is_important_event,
        is_first_install=is_first_install,
        is_first_open=is_first_open,
    )
    
    if gMaxy:
        payload = {
            "deviceId": device_id,
            "logTm": str(log_tm),
            "encrypt": "Y" if encrypt else "N",
            "serverType": server_type,
            "appId": package_nm,
            "mpasMsg": _encode_message(log_line, compress=compress, encrypt=encrypt, key=key),
        }
    else:
        payload = {
                'deviceId': device_id,
                'logTm': str(log_tm),
                'encrypt': 'N',
                'serverType':'0',
                'appId':package_nm,
                'm': _encode_message(log_line, compress=compress, encrypt=False, key=key),
            }
    
    headers = {'Connection':'close'}
    if encrypt:
        headers['Content-Encoding'] = 'mz'
        
    if gMaxy:
        response = requests.post(_target_url(base_url), data=payload, headers=headers)
    else:
        response = requests.post(_target_url(base_url), json=payload, headers=headers)
    response.raise_for_status()
    return response


def SendPage(
    log_tm: int = 0,
    device_id: str = "",
    package_nm: str = "",
    server_type: str = "",
    os_type: str = "",
    app_ver: str = "",
    os_ver: str = "",
    app_build_num: str = "",
    device_model: str = "",
    sim_operator_nm: str = "",
    com_type: int = 0,
    timezone: str = "",
    vip_yn: str = "",
    login_yn: str = "",
    req_url: str = "",
    flow_order: int = 0,
    page_start_tm: int = 0,
    page_end_tm: int = 0,
    parent_log_date: int = 0,
    event_intervaltime: int = 0,
    intervaltime: int = 0,
    loading_time: int = 0,
    response_time: int = 0,
    request_count: int = 0,
    event_count: int = 0,
    error_count: int = 0,
    js_error_count: int = 0,
    crash_count: int = 0,
    log_count: int = 0,
    avg_battery_lvl: float = 0,
    avg_com_sensitivity: float = 0,
    avg_cpu_usage: float = 0,
    avg_mem_usage: float = 0,
    avg_storage_usage: float = 0,
    max_battery_lvl: float = 0,
    max_com_sensitivity: float = 0,
    max_cpu_usage: float = 0,
    max_mem_usage: float = 0,
    max_storage_usage: float = 0,
    min_battery_lvl: float = 0,
    min_com_sensitivity: float = 0,
    min_cpu_usage: float = 0,
    min_mem_usage: float = 0,
    min_storage_usage: float = 0,
    sum_battery_lvl: float = 0,
    sum_com_sensitivity: float = 0,
    sum_cpu_usage: float = 0,
    sum_mem_usage: float = 1024,
    sum_storage_usage: float = 1024,
    log_type: int | None = None,
    wtf_flag: str = "N",
    pre_url: str = "",
    pre_url_time: int = 0,
    info: str = "",
    cls: float = 0,
    inp: float = 0,
    lcp: float = 0,
    fcp: float = 0,
    ttfb: float = 0,
    page_id: int = 0,
    base_url: Optional[str] = None,
    compress: bool = True,
    encrypt: bool = True,
    key: str = "thinkmisthebestm",
) -> requests.Response:
    """
    페이지 로그 전송 (모든 값 외부 입력, 내부 랜덤 없음).

    Args:
        log_tm: payload용 로그 시각(ms), ClickHouse arr에는 포함되지 않음.
        [1] device_id: 단말 UUID.
        [2] package_nm: 패키지명.
        [3] server_type: 서버 타입.
        [4] os_type: OS 타입 문자열.
        [5] app_ver: 앱 버전.
        [6] os_ver: OS 버전.
        [7] app_build_num: 빌드 번호.
        [8] device_model: 디바이스 모델.
        [9] sim_operator_nm: 통신사 이름.
        [10] com_type: 네트워크 타입(WIFI/5G 등).
        [11] timezone: 타임존.
        [12] vip_yn: VIP 여부.
        [13] login_yn: 로그인 여부.
        [14] req_url: 요청 URL.
        [15] flow_order: 페이지 순서.
        [16] page_start_tm: 페이지 시작 시각(ms).
        [17] page_end_tm: 페이지 종료 시각(ms).
        [18] parent_log_date: 부모 로그 시각(ms).
        [19] event_intervaltime: 이벤트 인터벌(ms).
        [20] intervaltime: 페이지 체류 시간(ms).
        [21] loading_time: 로딩 시간(ms).
        [22] response_time: 응답 시간(ms).
        [23] request_count: 요청 수.
        [24] event_count: 이벤트 수.
        [25] error_count: 에러 수.
        [26] js_error_count: JS 에러 수.
        [27] crash_count: 크래시 수.
        [28] log_count: 로그 수.
        [29] avg_battery_lvl: 평균 배터리.
        [30] avg_com_sensitivity: 평균 통신 감도.
        [31] avg_cpu_usage: 평균 CPU 사용률.
        [32] avg_mem_usage: 평균 메모리 사용률.
        [33] avg_storage_usage: 평균 저장공간 사용률.
        [34] max_battery_lvl: 최대 배터리.
        [35] max_com_sensitivity: 최대 통신 감도.
        [36] max_cpu_usage: 최대 CPU 사용률.
        [37] max_mem_usage: 최대 메모리 사용률.
        [38] max_storage_usage: 최대 저장공간 사용률.
        [39] min_battery_lvl: 최소 배터리.
        [40] min_com_sensitivity: 최소 통신 감도.
        [41] min_cpu_usage: 최소 CPU 사용률.
        [42] min_mem_usage: 최소 메모리 사용률.
        [43] min_storage_usage: 최소 저장공간 사용률.
        [44] sum_battery_lvl: 배터리 합계.
        [45] sum_com_sensitivity: 통신 감도 합계.
        [46] sum_cpu_usage: CPU 사용률 합계.
        [47] sum_mem_usage: 메모리 사용률 합계.
        [48] sum_storage_usage: 저장공간 사용률 합계.
        [49] log_type: 로그 타입.
        [50] wtf_flag: wtf 플래그.
        [51] pre_url: 이전 페이지 URL.
        [52] pre_url_time: 이전 페이지 시간.
        [53] user_id: 기타 정보.
        [54] cls: CLS.
        [55] inp: INP.
        [56] lcp: LCP.
        [57] fcp: FCP.
        [58] ttfb: TTFB.
        base_url: 전송 대상 URL.
        compress: zlib 압축 여부.
        encrypt: AES128 암호화 여부.
        key: 암복호화 키.
    """
    global gMaxy
    page_log_type = log_type if log_type is not None else _LOG_TYPE_MAP.get("WN_Start", 1)
    waterfall_flag = "Y" if str(wtf_flag).upper() == "Y" else "N"

    log_line = build_page_log_line(
        device_id=device_id,
        package_nm=package_nm,
        server_type=server_type,
        os_type=os_type,
        app_ver=app_ver,
        os_ver=os_ver,
        app_build_num=app_build_num,
        device_model=device_model,
        sim_operator_nm=sim_operator_nm,
        com_type=com_type,
        timezone=timezone,
        vip_yn=vip_yn,
        login_yn=login_yn,
        req_url=req_url,
        flow_order=flow_order,
        page_start_tm=page_start_tm,
        page_end_tm=page_end_tm,
        parent_log_date=parent_log_date,
        event_intervaltime=event_intervaltime,
        intervaltime=intervaltime,
        loading_time=loading_time,
        response_time=response_time,
        request_count=request_count,
        event_count=event_count,
        error_count=error_count,
        js_error_count=js_error_count,
        crash_count=crash_count,
        log_count=log_count,
        avg_battery_lvl=avg_battery_lvl,
        avg_com_sensitivity=avg_com_sensitivity,
        avg_cpu_usage=avg_cpu_usage,
        avg_mem_usage=avg_mem_usage,
        avg_storage_usage=avg_storage_usage,
        max_battery_lvl=max_battery_lvl,
        max_com_sensitivity=max_com_sensitivity,
        max_cpu_usage=max_cpu_usage,
        max_mem_usage=max_mem_usage,
        max_storage_usage=max_storage_usage,
        min_battery_lvl=min_battery_lvl,
        min_com_sensitivity=min_com_sensitivity,
        min_cpu_usage=min_cpu_usage,
        min_mem_usage=min_mem_usage,
        min_storage_usage=min_storage_usage,
        sum_battery_lvl=sum_battery_lvl,
        sum_com_sensitivity=sum_com_sensitivity,
        sum_cpu_usage=sum_cpu_usage,
        sum_mem_usage=sum_mem_usage,
        sum_storage_usage=sum_storage_usage,
        log_type=page_log_type,
        wtf_flag=waterfall_flag,
        pre_url=pre_url,
        pre_url_time=pre_url_time,
        info=info,
        cls=cls,
        inp=inp,
        lcp=lcp,
        fcp=fcp,
        ttfb=ttfb,
        page_id=page_id
    )
    if gMaxy:
        payload = {
            "deviceId": device_id,
            "logTm": str(log_tm),
            "encrypt": "Y" if encrypt else "N",
            "serverType": server_type,
            "appId": package_nm,
            "mpasMsg": _encode_message(log_line, compress=compress, encrypt=encrypt, key=key),
        }
    else:
        payload = {
                    'deviceId': device_id,
                    'logTm': str(log_tm),
                    'encrypt': 'N',
                    'serverType':'0',
                    'appId':package_nm,
                    'p': _encode_message(log_line, compress=compress, encrypt=False, key=key),
                }

    headers = {"Connection": "close"}
    if encrypt:
        headers["Content-Encoding"] = "mz"

    try:
        with requests.session() as session:
            session.keep_alive = False
            retry = Retry(connect=5, backoff_factor=0.5)
            adapter = HTTPAdapter(max_retries=retry)
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            
            if gMaxy:
                response = session.post(_page_url(base_url), data=payload, headers=headers)
            else:
                response = session.post(_page_url(base_url), json=payload, headers=headers)
        response.raise_for_status()
    except Exception as e:
        print(f"Error sending page log: {session.post(_page_url(base_url))} {e}")
        return None
    
    return response



# log_tm = 2025.1.1 00:00:00의 타임스탬프
# packege_id='marketing',
# sanitized_url = 1
# device_id = 'device_id_1'
# server_type = '0'
# os_type = 'Android'
# app_ver = '1.0.0'

glog_tm = 0
def IncIndex(interval,log_tm = None):
    global glog_tm
    if log_tm is not None:
        glog_tm = log_tm
    glog_tm += interval
    return glog_tm
