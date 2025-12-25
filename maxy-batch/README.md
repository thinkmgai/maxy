# maxy-batch

맥시 배치 작업을 위한 저장소이며, API 서버와 동일한 ClickHouse/Valkey 패턴을 사용합니다.

## ClickHouse 구성
- 공용 헬퍼: `maxy-batch/ClickHouseComm` (설정, 클라이언트 팩토리, SQL 로더)
- 쿼리 템플릿: `maxy-batch/clickhouse/sql/resources/*.xml` (예: `metrics.xml`)

## 환경 변수
- ClickHouse: `CLICKHOUSE_HOST`, `CLICKHOUSE_PORT`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DB`, `CLICKHOUSE_SECURE` (기본 `http://localhost:8123/default`)
- Valkey/Redis: `VALKEY_HOST`, `VALKEY_PORT`, `VALKEY_PASSWORD`, `VALKEY_DB`, `VALKEY_SSL`, `VALKEY_PREFIX` (기본 `stats:realtime`)

## 디렉터리 안내
- `ClickHouseComm/` – 커넥션/설정/SQL 로더
- `clickhouse/sql/resources/metrics.xml` – 스케줄러가 사용하는 3개 쿼리 정의
- `jobs/basic_information_device.py` – 디바이스 단위 통계 조회 후 Valkey에 저장
- `jobs/basic_information_page.py` – 페이지 흐름 통계 조회 후 Valkey에 저장
- `jobs/daily_device_page_summary.py` – 어제 데이터 기준 디바이스/페이지 통계를 ClickHouse(`max_device_statistic`)에 적재 후 Valkey에 캐시
- `jobs/batch_logmeter.py` – `maxy_app_total_log`을 reg_dt 기준으로 최근 구간을 조회해 Valkey에 저장
- `jobs/loading_time_scatter.py` – `maxy_device_page_flow`를 reg_dt 기준으로 조회해 LoadingTime 위젯용 최신 로그를 Valkey Sorted Set에 저장 (5분 이내 데이터만 유지, meta에 최신 저장 시간 기록, 10ms 미만은 무시, 100~1500ms 구간은 5분 내 최대 2000건으로 캡)
- `jobs/response_time_scatter.py` – `maxy_app_total_log`을 reg_dt 기준으로 조회해 ResponseTime 위젯용 최신 로그를 Valkey Sorted Set에 저장 (5분 이내 데이터만 유지, log_type in `(0x00080000 | 0x00000003, 0x00800000 | 0x00000004)`)
- `scheduler.py` – APScheduler 실행기 (5초/30초/1분/매일 0시); 5초 total-log, 30초 기본 잡, 0시에 일일 집계 실행
- `requirements.txt` – 의존성: `clickhouse-connect`, `jinja2`, `APScheduler`, `redis`

## 메트릭 작업 상세 (basic_information_device, basic_information_page)
### - `basic_information_device` (30초)
- 쿼리 1: `metrics.selectBITodayStatiistic1` (방문/설치/로그인 합계)
  - 대상: `maxy_device_access_history` (`log_date = today()`)
  - 반환 컬럼: `package_nm`, `server_type`, `os_type`, `total_visit`, `total_install`, `total_login`
- 쿼리 2: `metrics.selectBITodayStatiistic2` (DAU/재방문/MAU)
  - 대상: 비트맵 테이블 `maxy_device_access_bitmap`
  - 반환 컬럼: `package_nm`, `server_type`, `os_type`, `dau`, `revisit_7d`, `mau`
- 병합 규칙:
  - 키: (`package_nm`, `server_type`, `os_type`) 3개가 모두 있어야 하며, 없으면 경고 로그 후 스킵
  - 키별로 두 쿼리 결과를 합치고, 누락 필드는 0으로 채움
  - `updated_at`는 현재 UTC ISO 문자열로 설정
- Valkey 저장:
  - 키 형식: `{VALKEY_PREFIX}:{package_nm}:{server_type}:{os_type}` (기본 prefix `stats:realtime`)
  - 해시 필드: `package_nm`, `server_type`, `os_type`, `visit`, `install`, `login`, `dau`, `revisit_7d`, `mau`, `updated_at`
  - 저장 시 각 key/value를 INFO 로그로 출력
### - `basic_information_page` (30초)
  - 쿼리: `metrics.selectBITodayPageSummary` (오늘 0시~내일 0시)
    - 대상: `maxy_device_page_flow`
    - 반환 컬럼: `package_nm`, `server_type`, `os_type`, `crash_count`, `error_count`, `js_error_count`, `log_count`, `intervaltime_avg`, `lcp_avg`, `ttfb_avg`, `fcp_avg`, `inp_avg`, `pv`
  - 저장 규칙:
    - 키: (`package_nm`, `server_type`, `os_type`) 모두 있어야 함, 없으면 스킵
    - Valkey 키: `{VALKEY_PREFIX}:page:{package_nm}:{server_type}:{os_type}`
    - 해시 필드: 위 반환 컬럼 + `updated_at` (UTC ISO)
    - 저장 시 각 key/value를 INFO 로그로 출력
### - `daily_device_page_summary` (00:00 실행)
  - 쿼리: `metrics.selectBIDailyStatiistic1`, `selectBIDailyStatiistic2`, `selectBIDailyPageSummary` (모두 어제 데이터 대상)
  - 병합 규칙:
    - 키: (`package_nm`, `server_type`, `os_type`) 모두 있어야 함, 없으면 스킵
    - 디바이스/페이지 메트릭을 합치고 누락 필드는 0으로 채움
    - `stat_date`는 어제 날짜, `updated_at`는 현재 UTC ISO
  - ClickHouse 적재: `maxy_device_statistic` 테이블에 일 단위 행 삽입
  - Valkey 캐시: 키 `{VALKEY_PREFIX}:daily:{stat_date}:{package_nm}:{server_type}:{os_type}`, 필드=합쳐진 메트릭 + `stat_date`, `updated_at`
  - 저장 시 각 key/value를 INFO 로그로 출력
- `batch_logmeter` (5초, reg_dt 최근 구간)
  - 쿼리: `metrics.selectTotalLogIncremental`
    - 대상: `maxy_app_total_log`
    - 범위: `reg_dt`가 마지막 커서(`{VALKEY_PREFIX}:totallog:cursor`) 초과 (상한 없음)
    - 집계: 패키지/서버타입별 `log_count`, `max(reg_dt)` → 커서로 사용
  - Valkey 저장:
    - 데이터 키: `{VALKEY_PREFIX}:totallog:{package_nm}:{server_type}`
    - 필드: `package_nm`, `server_type`, `log_count`(이번 윈도우 건수), `updated_at`, `last_reg_dt`, `window_start`, `window_end`
    - 커서 키: `{VALKEY_PREFIX}:totallog:cursor` (UTC ISO, ms) – 새 데이터가 있을 때만 갱신

## metrics.xml 쿼리 ID / 호출 함수 매핑
- `selectBITodayStatiistic1`: 오늘 방문/설치/로그인 집계 → `jobs/basic_information_device._fetch_visit_metrics()`
- `selectBITodayStatiistic2`: 오늘 DAU/재방문/MAU 집계 → `jobs/basic_information_device._fetch_bitmap_metrics()`
- `selectBITodayPageSummary`: 오늘 페이지 흐름 집계 → `jobs/basic_information_page._fetch_page_metrics()`
- `selectBIDailyStatiistic1`: 어제 방문/설치/로그인 집계 → `jobs/daily_device_page_summary._fetch_device_metrics()`
- `selectBIDailyStatiistic2`: 어제 DAU/재방문/MAU 집계 → `jobs/daily_device_page_summary._fetch_device_metrics()`
- `selectBIDailyPageSummary`: 어제 페이지 흐름 집계 → `jobs/daily_device_page_summary._fetch_page_metrics()`

## 다음 단계
- 필요한 배치 작업을 추가하고, 전용 SQL 템플릿을 `clickhouse/sql/resources/`에 정의
- 새 작업을 `scheduler.py`에 연결하여 실행 스케줄 확장
