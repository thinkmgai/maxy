"""단일 시나리오 검증 스크립트.

page1/page2 워크플로우와 백그라운드 이벤트를 순차적으로 생성해 전송한다.
"""

import unittest
from datetime import datetime
from pathlib import Path

import make_common as mc


class VerifyScenarioTestCase(unittest.TestCase):
    def setUp(self):
        mc.sendCount = 0
        mc.gIndex = 0
        mc.gMaxy = True #Maxy : True, Front : False
        mc.gURL = "http://192.168.10.177:8085"
        # mc.gURL = "http://192.168.10.170:9999"
        # mc.gURL = "http://localhost:8081"
        
        self.package_nm = "hohak2"
        self.device_id = "ios_device_5"
        
        self.device_model = "iOS_Test_Device"
        self.os_ver = "13.0"
        self.app_ver = "1.0.0"

        mc.send_target_app_check(
            device_id=self.device_id,
            app_id=self.package_nm,
            os_ver=self.os_ver,
            os_type="iOS",
            model=self.device_model,
            base_url=mc.gURL,
        )
        mc.send_set_maxy_info(
            device_id=self.device_id,
            app_id=self.package_nm,
            os_ver=self.os_ver,
            os_type="iOS",
            model=self.device_model,
            app_ver=self.app_ver,
            user_id="",
            base_url=mc.gURL,
        )

    def _base_event(self, log_tm: int, log_type_name: str, req_url: str, event_params: str = "{}") -> dict:
        return {
            "log_tm": log_tm,
            "log_type": mc.log_type(log_type_name),
            "device_id": self.device_id,
            "maxy_session_id": self.maxy_session_id,
            "os_type": "iOS",
            "app_ver": self.app_ver,
            "os_ver": self.os_ver,
            "device_model": self.device_model,
            "package_nm": self.package_nm,
            "req_url": req_url,
            "event_params": event_params,
            "cpu_usage" : 80,
            "mem_usage" : 2048,
            "server_type":0
        }

    def test_verify_flow(self):
        now = int(datetime.now().timestamp() * 1000)
        
        self.maxy_session_id = datetime.now().strftime("%Y%m%d%H%M%S")

        # 참고용 경로
        data_dir = Path(__file__).parent / "Data"
        res_entries = mc.load_waterfall_entries(data_dir / "res.csv", limit=20)
        script_errors = mc.load_script_errors(data_dir / "crash.csv")
        script_error_msg = script_errors[0] if script_errors else ""

        events = []

        # AppStart
        events.append(self._base_event(mc.IncIndex(interval=0,log_tm=now), "AppStart", "AppStart"))

        # page1 시작 + 워터폴 + 클릭 + 종료
        page1_start = mc.IncIndex(500)
        events.append(self._base_event(page1_start, "WN_Start", "http://maxy.co.kr/page1"))
        
        for idx, entry in enumerate(res_entries, start=1):
            if 'htmlonload' in entry or 'settingMyPlanerDetlStudy' in entry:
                continue
            page1_start = page1_start + 1
            events.append(self._base_event(page1_start, "WN_D_Start", "http://maxy.co.kr/page1", event_params=entry))
            
        events.append(
            self._base_event(mc.IncIndex(200), "Action_Click", "http://maxy.co.kr/page1", event_params="click:cta")
        )
        events.append(self._base_event(mc.IncIndex(300), "WN_Finish", "http://maxy.co.kr/page1"))

        # page2 시작 + 통신 성공 + 스크립트 에러 + 종료
        events.append(self._base_event(mc.IncIndex(500), "WN_Start", "http://maxy.co.kr/page2"))
        # HTTP 성공 시퀀스
        events.append(self._base_event(mc.IncIndex(520), "HTTP_Req", "http://maxy.co.kr/request?a=2"))
        events.append(self._base_event(mc.IncIndex(560), "HTTP_Rep", "http://maxy.co.kr/request?a=2"))
        events.append(self._base_event(mc.IncIndex(600), "HTTP_Finish", "http://maxy.co.kr/request?a=2", event_params="data abcd"))
        # 스크립트 에러
        events.append(
            self._base_event(mc.IncIndex(650), "WN_J_Error", "http://maxy.co.kr/page2", event_params=script_error_msg)
        )
        events.append(self._base_event(mc.IncIndex(700), "WN_Finish", "http://maxy.co.kr/page2"))

        # Crash
        events.append(self._base_event(mc.IncIndex(800), "Background", "Background"))

        mc.send_total_events(events)
        print("전송된 로그 수 :", mc.sendCount)


if __name__ == "__main__":
    unittest.main()
