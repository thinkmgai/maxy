"""마케팅 로그 테스트 엔트리 포인트.
실제 전송 로직은 make_common.py를 참고하세요.
"""

from datetime import datetime
import unittest

import make_common as mc


class MarketingTestCase(unittest.TestCase):
    def setUp(self):
        mc.sendCount = 0
        mc.gIndex = 0
        mc.gURL = "http://192.168.10.177:8085/maxy/logCollect.maxy"
        self.package_nm = "maxy"

    def test_send_total(self):
        # mc.gURL = "http://192.168.10.232:8085/maxy/logCollect.maxy"
        start_date = int(datetime(2025, 11, 28).timestamp())
        log_tm = start_date * 1000
        log_type = 6291457
        # log_type = 300

        os_type = 'Android'
        app_ver = '1.0.0'

        prefix_device_id = 'hoho_id_'
        prefix_maxy_session_id = 'maxy_session_id_'

        log_tm = start_date * 1000
        # 폐쇄형 성공---  ****************************************************
        device_id=f'{prefix_device_id}2'
        maxy_session_id = f'{prefix_maxy_session_id}1'
        events = [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
        ]
        # mc.SendTotal(log_tm=mc.IncIndex(log_tm),log_type=log_type,device_id=device_id,maxy_session_id=maxy_session_id,os_type=os_type,app_ver=app_ver,req_url='이벤트화면-추가버튼',req_msg='{"url":"이벤트화면",name="추가",value=20000}')
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]

        log_tm += 3*24*60*60*1000 # 3일 후
        # 폐쇄형 실패--- first_open=>login=>메인화면=>이벤트화면(이벤트화면?? 추가버튼)=>상품목록
        device_id=f'{prefix_device_id}3'
        maxy_session_id = f'{prefix_maxy_session_id}2'
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]
        # mc.SendTotal(log_tm=mc.IncIndex(log_tm),device_id=device_id,maxy_session_id=maxy_session_id,os_type=os_type,app_ver=app_ver,url='이벤트화면')
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
        ]
        # mc.SendTotal(log_tm=mc.IncIndex(log_tm),device_id=device_id,maxy_session_id=maxy_session_id,os_type=os_type,app_ver=app_ver,url='이벤트화면-추가버튼',message='{"url":"이벤트화면",name="추가"}')
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]

        # 폐쇄형 실패--- first_open=>login=>메인화면=>이벤트화면(이벤트화면?? "탈퇴버튼")=>상품목록
        device_id=f'{prefix_device_id}4'
        maxy_session_id = f'{prefix_maxy_session_id}3'
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-이탈버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]


        # 도달 실패 ---
        device_id=f'{prefix_device_id}5'
        maxy_session_id = f'{prefix_maxy_session_id}4'
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]

        ################### 새로운 사용자 ###################
        log_tm = start_date * 1000
        os_type = 'Android'
        app_ver = '1.0.0'
        # 폐쇄형 성공 ---  ****************************************************
        device_id=f'{prefix_device_id}6'
        maxy_session_id = f'{prefix_maxy_session_id}5'
        events += [
            {"log_tm": mc.IncIndex(log_tm,reset=True), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
        ]


        # 폐쇄형 실패 ---
        device_id=f'{prefix_device_id}7'
        maxy_session_id = f'{prefix_maxy_session_id}6'
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
        ]


        # 폐쇄형 실패 --- 
        device_id=f'{prefix_device_id}1'
        maxy_session_id = f'{prefix_maxy_session_id}0'
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
        ]
        # mc.SendTotal(log_tm=mc.IncIndex(log_tm),device_id=device_id,maxy_session_id=maxy_session_id,os_type=os_type,app_ver=app_ver,url='이벤트화면-추가버튼',message='{"url":"이벤트화면",name="추가"}')
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]


        ################### 새로운 사용자 ###################
        log_tm = start_date * 1000
        os_type = 'Android'
        app_ver = '2.0.0'
        # 폐쇄형 성공 --- 버전이 틀림 (그냥 버전무시하자.) ****************************************************
        device_id=f'{prefix_device_id}7'
        maxy_session_id = f'{prefix_maxy_session_id}6'
        events += [
            {"log_tm": mc.IncIndex(log_tm,reset=True), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
        ]


        ################### 새로운 사용자 ###################
        log_tm = start_date * 1000
        os_type = 'iOS'
        app_ver = '1.0.0'
        # 폐쇄형 실패--- 로그인 없음
        device_id=f'{prefix_device_id}8'
        maxy_session_id = f'{prefix_maxy_session_id}7'
        events += [
            {"log_tm": mc.IncIndex(log_tm,reset=True), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
        ]
        # mc.SendTotal(log_tm=mc.IncIndex(log_tm),device_id=device_id,maxy_session_id=maxy_session_id,os_type=os_type,app_ver=app_ver,url='login')
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]


        # 폐쇄형 실패 - 
        device_id=f'{prefix_device_id}9'
        maxy_session_id = f'{prefix_maxy_session_id}10'
        events += [
            {"log_tm": mc.IncIndex(log_tm,reset=True), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]


        #폐쇄형실패, 개방형성공.  ****************************************************?????????????????????????????????????
        device_id=f'{prefix_device_id}10'
        maxy_session_id = f'{prefix_maxy_session_id}11'
        events += [
            {"log_tm": mc.IncIndex(log_tm,reset=True), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]



        device_id=f'{prefix_device_id}11'
        maxy_session_id = f'{prefix_maxy_session_id}12'
        events += [
            {"log_tm": mc.IncIndex(log_tm,reset=True), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'first_open'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '아무이벤트'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": 'login'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '아무이벤트'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '아무이벤트'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면-추가버튼'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '이벤트화면'},
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '상품목록'},
        ]
        #부가정보
        events += [
            {"log_tm": mc.IncIndex(log_tm), "log_type": log_type, "device_id": device_id, "maxy_session_id": maxy_session_id, "os_type": os_type, "app_ver": app_ver, "package_nm": self.package_nm, "req_url": '메인화면'},
        ]


        for event in events:
            mc.SendTotal(**event)
        print('전송된 로그 수 : ', mc.sendCount)


if __name__ == "__main__":
    unittest.main()
