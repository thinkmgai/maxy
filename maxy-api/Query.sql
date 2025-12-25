-- 비트맵을 사용한 금일 통계 수치 DAU,재방문,MAU
WITH
    today_users AS (
        SELECT 
            package_nm,
            server_type,
            os_type,
            groupBitmapMergeState(users) AS bm
        FROM maxy_device_access_bitmap
        WHERE log_date = today()
        GROUP BY package_nm, server_type, os_type
    ),
    last7_users AS (
        SELECT 
            package_nm,
            server_type,
            os_type,
            groupBitmapMergeState(users) AS bm
        FROM maxy_device_access_bitmap
        WHERE log_date >= today() - 7 
          AND log_date < today()
        GROUP BY package_nm, server_type, os_type
    ),
    mau_users AS (
        SELECT 
            package_nm,
            server_type,
            os_type,
            groupBitmapMergeState(users) AS bm
        FROM maxy_device_access_bitmap
        WHERE log_date >= today() - 30
        GROUP BY package_nm, server_type, os_type
    )
SELECT
    t.package_nm,
    t.server_type,
    t.os_type,
    bitmapCardinality(t.bm) AS dau,
    bitmapCardinality(bitmapAnd(t.bm, l.bm)) AS revisit_7d,
    bitmapCardinality(m.bm) AS mau
FROM today_users AS t
LEFT JOIN last7_users AS l USING (package_nm, server_type, os_type)
LEFT JOIN mau_users  AS m USING (package_nm, server_type, os_type)
WHERE t.package_nm  = 'hohak';   



-- 날짜별, 통계. Total_Visit,Total_Install,Total_Login
SELECT
    package_nm, server_type, os_type,
    sum(visit_cnt)      AS total_visit,
    sum(install_cnt)    AS total_install,
    sum(login_cnt)      AS total_login
    --countDistinct(device_id) AS dau --distinct는 자원을 많이 사용.
FROM maxy_device_access_history
WHERE log_date = today()
GROUP BY package_nm, server_type, os_type;


-- maxy_page_daily 통계
SELECT
        page_name AS reqUrl,
        countMerge(cnt) AS count,
        sumMerge(sum_log_count) AS logCount,
        sumMerge(sum_cpu_usage) AS sumCpuUsage,
        sumMerge(sum_mem_usage) AS sumMemUsage,
        avgMerge(avg_loading_tm) AS loadingTimeAvg,
        avgMerge(avg_interval_tm) AS intervaltimeAvg,
        sumMerge(sum_response_tm) AS sumResponseTm,
        sumMerge(sum_request_count) AS requestCount,
        sumMerge(sum_error_count) AS errorCount,
        sumMerge(sum_crash_count) AS crashCount
    FROM maxy_page_daily
    WHERE toDate(addHours(log_date, -9)) >= toDate('2025-12-18')
  AND toDate(addHours(log_date, -9)) <  toDate('2025-12-19')
      AND package_id = 'hohak'
    GROUP BY page_name
    ORDER BY count DESC, reqUrl ASC;


SELECT
        package_id,
        server_type,
        os_type AS os_type,
        page_name,
        countMerge(cnt) AS cnt,
        sumMerge(sum_log_count) AS log_count,
        sumMerge(sum_error_count) AS error_count,
        sumMerge(sum_crash_count) AS crash_count,
        avgMerge(avg_loading_tm) AS avg_loading_tm,
        avgMerge(avg_interval_tm) AS avg_interval_tm,
        sumMerge(sum_mem_usage) AS sum_mem_usage,
        sumMerge(sum_cpu_usage) AS sum_cpu_usage,
        sumMerge(sum_response_tm) AS sum_response_tm,
        sumMerge(sum_request_count) AS request_count,
        uniqExactMerge(uniq_device_count) AS uniq_device_count
    FROM maxy_page_daily
    WHERE log_date = today()
    GROUP BY package_id, server_type, os_type, page_name
    ORDER BY package_id, server_type, os_type, cnt DESC
    LIMIT 30 BY package_id, server_type, os_type
    

-- 특정 페이지 정보 조회     
SELECT
        log_tm AS logTm,
        device_id AS deviceId,
        user_id AS userId,
        log_type AS logType,
        os_type AS osType,
        app_ver AS appVer,
        device_model AS deviceModel,
        mem_usage AS memUsage,
        url_path as url_path
    FROM maxy_app_trouble_log
    WHERE log_tm_dt >= toDateTime('2025-12-18 00:00:00')
      AND log_tm_dt <  toDateTime('2025-12-19 00:00:00')
      AND package_nm = 'maxy'
      AND server_type = 0
      AND page_url = 'http://127.0.0.1:8013/main_menu.html'
      --AND (log_type != 2097152)  
    ORDER BY log_tm DESC, device_id DESC, mem_usage DESC;