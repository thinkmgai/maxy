CREATE TABLE maxy_app_total_log
(
    reg_dt DateTime64(3) DEFAULT now64(3),
    log_tm UInt64,
    device_id String,
    log_type UInt64,
    com_type Nullable(String),
    os_ver Nullable(String),
    app_ver Nullable(String),
    device_model Nullable(String),
    mem_usage UInt64,
    cpu_usage Nullable(UInt32),
    com_sensitivity Nullable(String),
    battery_lvl Nullable(String),
    req_url Nullable(String),
    res_msg Nullable(String),
    intervaltime Nullable(UInt32),
    storage_usage Nullable(UInt64),
    storage_total Nullable(UInt64),
    timezone Nullable(String),
    webview_ver Nullable(String),
    app_build_num Nullable(String),
    referer Nullable(String),
    ip Nullable(String),
    sim_operator_nm Nullable(String),
    login_yn Nullable(String),
    maxy_session_id Nullable(String),
    web_only_yn Nullable(String),
    package_nm Nullable(String),
    server_type Nullable(UInt32),
    os_type Nullable(String),
    deep_link Nullable(String),
    page_url Nullable(String),
    jennifer_data Nullable(String),
    user_id Nullable(String),
    optional Nullable(String),
    os_lang Nullable(String),
    webview_size Nullable(String),
    status_code Nullable(UInt32),
    response_size Nullable(UInt64),
    request_size Nullable(UInt64),
    wait_time Nullable(UInt32),
    download_time Nullable(UInt32),
    req_msg Nullable(String),
    page_id Nullable(String),
    url_path Nullable(String),  -- URL path
    url_query Nullable(String), -- URL query parameters
    log_tm_dt DateTime
)
ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMMDD(log_tm_dt)
ORDER BY (log_tm,device_id,mem_usage)
TTL toDateTime(log_tm_dt) + toIntervalDay(4)
SETTINGS index_granularity = 8192;



CREATE TABLE maxy_app_total_log_consumer
(
    `raw` String
)
ENGINE = Kafka
SETTINGS kafka_broker_list = '192.168.10.232:19092',
 kafka_topic_list = 'total-logs',
 kafka_group_name = 'total-logs-clickhouse',
 kafka_format = 'LineAsString',
 kafka_max_block_size = 10000,
 kafka_num_consumers = 2;

-- drop table maxy_app_total_log_consumer;



CREATE MATERIALIZED VIEW maxy_app_total_log_mv
TO maxy_app_total_log
AS
WITH
    splitByChar(',', raw) AS arr,
    toDateTime(coalesce(toInt64OrNull(arr[1]), 0) / 1000) AS log_tm_dt
SELECT
    coalesce(toUInt64OrNull(arr[1]), 0) AS log_tm,
    arr[2] AS device_id,
    coalesce(toUInt64OrNull(arr[3]), 0) AS log_type,
    arr[4] AS com_type,
    replaceAll(replaceAll(arrayElement(arr,5),'^',','),'|','\n') AS os_ver,
    replaceAll(replaceAll(arrayElement(arr,6),'^',','),'|','\n') AS app_ver,
    replaceAll(replaceAll(arrayElement(arr,7),'^',','),'|','\n') AS device_model,
    coalesce(toUInt64OrNull(arr[8]), 0) AS mem_usage,
    coalesce(toUInt32OrNull(arr[9]), 0) AS cpu_usage,
    arr[10] AS com_sensitivity,
    arr[11] AS battery_lvl,
    arr[12] AS req_url,
    replaceAll(replaceAll(arrayElement(arr,13),'^',','),'|','\n') AS res_msg,
    coalesce(toUInt32OrNull(arr[14]), 0) AS intervaltime,
    coalesce(toUInt64OrNull(arr[15]), 0) AS storage_usage,
    coalesce(toUInt64OrNull(arr[16]), 0) AS storage_total,
    arr[17] AS timezone,
    arr[18] AS webview_ver,
    arr[19] AS app_build_num,
    arr[20] AS referer,
    arr[21] AS ip,
    arr[22] AS sim_operator_nm,
    arr[23] AS login_yn,
    arr[24] AS maxy_session_id,
    arr[25] AS web_only_yn,
    arr[26] AS package_nm,
    coalesce(toUInt32OrNull(arr[27]), 0) AS server_type,
    arr[28] AS os_type,
    arr[29] AS deep_link,
    arr[30] AS page_url,
    arr[31] AS jennifer_data,
    arr[32] AS user_id,
    arr[33] AS optional,
    arr[34] AS os_lang,
    arr[35] AS webview_size,
    toUInt32OrNull(arr[36]) AS status_code,
    toUInt64OrNull(arr[37]) AS response_size,
    toUInt64OrNull(arr[38]) AS request_size,
    toUInt32OrNull(arr[39]) AS wait_time,
    toUInt32OrNull(arr[40]) AS download_time,
    replaceAll(replaceAll(arrayElement(arr,41),'^',','),'|','\n') AS req_msg,
    arr[42] AS page_id,
    splitByChar('?', arr[12])[1] AS url_path,
    splitByChar('?', arr[12])[2] AS url_query,
    log_tm_dt
FROM maxy_app_total_log_consumer;



-- trouble logs (crash/error/js error/custom error)
CREATE TABLE maxy_app_trouble_log
(
    reg_dt DateTime64(3) DEFAULT now64(3),
    log_tm UInt64,
    device_id String,
    log_type UInt64,
    com_type Nullable(String),
    os_ver Nullable(String),
    app_ver Nullable(String),
    device_model Nullable(String),
    mem_usage UInt64,
    cpu_usage Nullable(UInt32),
    com_sensitivity Nullable(String),
    battery_lvl Nullable(String),
    req_url Nullable(String),
    res_msg Nullable(String),
    intervaltime Nullable(UInt32),
    storage_usage Nullable(UInt64),
    storage_total Nullable(UInt64),
    timezone Nullable(String),
    webview_ver Nullable(String),
    app_build_num Nullable(String),
    referer Nullable(String),
    ip Nullable(String),
    sim_operator_nm Nullable(String),
    login_yn Nullable(String),
    maxy_session_id Nullable(String),
    web_only_yn Nullable(String),
    package_nm Nullable(String),
    server_type Nullable(UInt32),
    os_type Nullable(String),
    deep_link Nullable(String),
    page_url Nullable(String),
    jennifer_data Nullable(String),
    user_id Nullable(String),
    optional Nullable(String),
    os_lang Nullable(String),
    webview_size Nullable(String),
    status_code Nullable(UInt32),
    response_size Nullable(UInt64),
    request_size Nullable(UInt64),
    wait_time Nullable(UInt32),
    download_time Nullable(UInt32),
    req_msg Nullable(String),
    page_id Nullable(String),
    logName Nullable(String),
    url_path Nullable(String),  -- URL path
    url_query Nullable(String),  -- URL query parameters
    log_tm_dt DateTime
)
ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMMDD(log_tm_dt)
ORDER BY (log_tm,device_id,mem_usage)
TTL toDateTime(log_tm_dt) + toIntervalDay(180)
SETTINGS index_granularity = 8192;


/*
CREATE MATERIALIZED VIEW maxy_app_trouble_log_mv
TO maxy_app_trouble_log
AS
WITH
    splitByChar(',', raw) AS arr,
    toDateTime(coalesce(toInt64OrNull(arr[1]), 0) / 1000) AS log_tm_dt,
    nullIf(arrayElement(splitByChar('\n', replaceAll(ifNull(arr[13], ''), '\r\n', '\n')), 1), '') AS logName
SELECT
    now64(3) AS reg_dt,
    coalesce(toUInt64OrNull(arr[1]), 0) AS log_tm,
    arr[2] AS device_id,
    coalesce(toUInt64OrNull(arr[3]), 0) AS log_type,
    arr[4] AS com_type,
    arr[5] AS os_ver,
    arr[6] AS app_ver,
    arr[7] AS device_model,
    coalesce(toUInt64OrNull(arr[8]), 0) AS mem_usage,
    coalesce(toUInt32OrNull(arr[9]), 0) AS cpu_usage,
    arr[10] AS com_sensitivity,
    arr[11] AS battery_lvl,
    arr[12] AS req_url,
    arr[13] AS res_msg,
    coalesce(toUInt32OrNull(arr[14]), 0) AS intervaltime,
    coalesce(toUInt64OrNull(arr[15]), 0) AS storage_usage,
    coalesce(toUInt64OrNull(arr[16]), 0) AS storage_total,
    arr[17] AS timezone,
    arr[18] AS webview_ver,
    arr[19] AS app_build_num,
    arr[20] AS referer,
    arr[21] AS ip,
    arr[22] AS sim_operator_nm,
    arr[23] AS login_yn,
    arr[24] AS maxy_session_id,
    arr[25] AS web_only_yn,
    arr[26] AS package_nm,
    coalesce(toUInt32OrNull(arr[27]), 0) AS server_type,
    arr[28] AS os_type,
    arr[29] AS deep_link,
    arr[30] AS page_url,
    arr[31] AS jennifer_data,
    arr[32] AS info,
    arr[33] AS optional,
    arr[34] AS os_lang,
    arr[35] AS webview_size,
    toUInt32OrNull(arr[36]) AS status_code,
    toUInt64OrNull(arr[37]) AS response_size,
    toUInt64OrNull(arr[38]) AS request_size,
    toUInt32OrNull(arr[39]) AS wait_time,
    toUInt32OrNull(arr[40]) AS download_time,
    arr[41] AS req_msg,
    arr[42] AS page_id,
    log_tm_dt,
    logName
FROM maxy_app_total_log_consumer
WHERE log_type IN (2097152,65538,131076,131077,131109,262148,524292,8388613,1048579,1048594);
*/



CREATE MATERIALIZED VIEW maxy_app_trouble_log_mv
TO maxy_app_trouble_log
AS
SELECT
    reg_dt,
    log_tm,
    device_id,
    log_type,
    com_type,
    os_ver,
    app_ver,
    device_model,
    mem_usage,
    cpu_usage,
    com_sensitivity,
    battery_lvl,
    req_url,
    res_msg,
    intervaltime,
    storage_usage,
    storage_total,
    timezone,
    webview_ver,
    app_build_num,
    referer,
    ip,
    sim_operator_nm,
    login_yn,
    maxy_session_id,
    web_only_yn,
    package_nm,
    server_type,
    os_type,
    deep_link,
    page_url,
    jennifer_data,
    user_id,
    optional,
    os_lang,
    webview_size,
    status_code,
    response_size,
    request_size,
    wait_time,
    download_time,
    req_msg,
    page_id,
    log_tm_dt,
    nullIf(arrayElement(splitByChar('\n', replaceAll(ifNull(res_msg, ''), '\r\n', '\n')), 1), '') AS logName,
    url_path,
    url_query
FROM maxy_app_total_log
WHERE log_type IN (2097152,65538,131076,131077,131109,262148,524292,8388613,1048579,1048594);




CREATE TABLE maxy_device_page_flow
(
    reg_dt DateTime64(3) DEFAULT now64(3),
    device_id String,                          -- NOT NULL
    package_nm Nullable(String),
    server_type Nullable(UInt32),
    os_type Nullable(String),
    app_ver Nullable(String),
    os_ver Nullable(String),
    app_build_num Nullable(String),
    device_model Nullable(String),
    sim_operator_nm Nullable(String),
    com_type Nullable(String),
    timezone Nullable(String),
    vip_yn Nullable(String),
    login_yn Nullable(String),
    req_url Nullable(String),
    flow_order Nullable(UInt32),
    page_start_tm UInt64,                      -- NOT NULL
    page_end_tm Nullable(UInt64),
    parent_log_date Nullable(UInt64),
    event_intervaltime Nullable(UInt32),
    intervaltime Nullable(UInt32),
    loading_time Nullable(UInt32),
    response_time Nullable(UInt32),
    request_count Nullable(UInt32),
    event_count Nullable(UInt32),
    error_count Nullable(UInt32),
    js_error_count Nullable(UInt32),
    crash_count Nullable(UInt32),
    log_count Nullable(UInt64),
    avg_battery_lvl Nullable(UInt32),
    avg_com_sensitivity Nullable(UInt32),
    avg_cpu_usage Nullable(UInt32),
    avg_mem_usage Nullable(UInt64),
    avg_storage_usage Nullable(UInt64),
    max_battery_lvl Nullable(UInt32),
    max_com_sensitivity Nullable(UInt32),
    max_cpu_usage Nullable(UInt32),
    max_mem_usage Nullable(UInt32),
    max_storage_usage Nullable(UInt32),
    min_battery_lvl Nullable(UInt32),
    min_com_sensitivity Nullable(UInt32),
    min_cpu_usage Nullable(UInt32),
    min_mem_usage Nullable(UInt32),
    min_storage_usage Nullable(UInt32),
    sum_battery_lvl Nullable(UInt32),
    sum_com_sensitivity Nullable(UInt32),
    sum_cpu_usage Nullable(UInt64),
    sum_mem_usage UInt64,                      -- NOT NULL
    sum_storage_usage Nullable(UInt64),
    log_type Nullable(UInt64),
    wtf_flag Nullable(String),
    pre_url Nullable(String),
    pre_url_time Nullable(UInt64),
    user_id Nullable(String),
    cls Nullable(Float64),
    inp Nullable(Float64),
    lcp Nullable(Float64),
    fcp Nullable(Float64),
    ttfb Nullable(Float64),
    page_id Nullable(String),
    page_start_tm_dt DateTime,
    page_name Nullable(String),
    log_date Nullable(Date)
)
ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMMDD(page_start_tm_dt)
ORDER BY (page_start_tm, device_id, sum_mem_usage)
TTL page_start_tm_dt + toIntervalDay(93)
SETTINGS index_granularity = 8192;


CREATE TABLE maxy_device_page_flow_consumer
(
    `raw` String
)
ENGINE = Kafka
SETTINGS kafka_broker_list = '192.168.10.232:19092',
 kafka_topic_list = 'page-logs',
 kafka_group_name = 'page-logs-clickhouse',
 kafka_format = 'LineAsString',
 kafka_max_block_size = 10000,
 kafka_num_consumers = 2;
    


CREATE MATERIALIZED VIEW maxy_device_page_flow_mv
TO maxy_device_page_flow
AS
WITH splitByChar(',', raw) AS arr
SELECT
    now64(3) AS reg_dt,
    arr[1] AS device_id,
    arr[2] AS package_nm,
    --toUInt32OrNull(arr[3]) AS server_type,
    coalesce(toUInt32OrNull(arr[3]), 0) AS server_type,
    arr[4] AS os_type,
    replaceAll(replaceAll(arrayElement(arr,5),'^',','),'|','\n') AS app_ver,
    replaceAll(replaceAll(arrayElement(arr,6),'^',','),'|','\n') AS os_ver,
    replaceAll(replaceAll(arrayElement(arr,7),'^',','),'|','\n') AS app_build_num,
    replaceAll(replaceAll(arrayElement(arr,8),'^',','),'|','\n') AS device_model,
    arr[9] AS sim_operator_nm,
    arr[10] AS com_type,
    arr[11] AS timezone,
    arr[12] AS vip_yn,
    arr[13] AS login_yn,
    arr[14] AS req_url,
    toUInt32OrNull(arr[15]) AS flow_order,
    toUInt64OrNull(arr[16]) AS page_start_tm,
    toUInt64OrNull(arr[17]) AS page_end_tm,
    toUInt64OrNull(arr[18]) AS parent_log_date,
    toUInt32OrNull(arr[19]) AS event_intervaltime,
    toUInt32OrNull(arr[20]) AS intervaltime,
    toUInt32OrNull(arr[21]) AS loading_time,
    toUInt32OrNull(arr[22]) AS response_time,
    toUInt32OrNull(arr[23]) AS request_count,
    toUInt32OrNull(arr[24]) AS event_count,
    toUInt32OrNull(arr[25]) AS error_count,
    toUInt32OrNull(arr[26]) AS js_error_count,
    toUInt32OrNull(arr[27]) AS crash_count,
    toUInt64OrNull(arr[28]) AS log_count,
    toUInt32OrNull(arr[29]) AS avg_battery_lvl,
    toUInt32OrNull(arr[30]) AS avg_com_sensitivity,
    toUInt32OrNull(arr[31]) AS avg_cpu_usage,
    toUInt64OrNull(arr[32]) AS avg_mem_usage,
    toUInt64OrNull(arr[33]) AS avg_storage_usage,
    toUInt32OrNull(arr[34]) AS max_battery_lvl,
    toUInt32OrNull(arr[35]) AS max_com_sensitivity,
    toUInt32OrNull(arr[36]) AS max_cpu_usage,
    toUInt32OrNull(arr[37]) AS max_mem_usage,
    toUInt32OrNull(arr[38]) AS max_storage_usage,
    toUInt32OrNull(arr[39]) AS min_battery_lvl,
    toUInt32OrNull(arr[40]) AS min_com_sensitivity,
    toUInt32OrNull(arr[41]) AS min_cpu_usage,
    toUInt32OrNull(arr[42]) AS min_mem_usage,
    toUInt32OrNull(arr[43]) AS min_storage_usage,
    toUInt32OrNull(arr[44]) AS sum_battery_lvl,
    toUInt32OrNull(arr[45]) AS sum_com_sensitivity,
    toUInt64OrNull(arr[46]) AS sum_cpu_usage,
    coalesce(toUInt64OrNull(arr[47]), 0) AS sum_mem_usage,     -- NOT NULL
    toUInt64OrNull(arr[48]) AS sum_storage_usage,
    toUInt64OrNull(arr[49]) AS log_type,
    arr[50] AS wtf_flag,
    arr[51] AS pre_url,
    toUInt64OrNull(arr[52]) AS pre_url_time,
    arr[53] AS user_id,
    toFloat64OrNull(arr[54]) AS cls,
    toFloat64OrNull(arr[55]) AS inp,
    toFloat64OrNull(arr[56]) AS lcp,
    toFloat64OrNull(arr[57]) AS fcp,
    toFloat64OrNull(arr[58]) AS ttfb,
    arr[59] AS page_id,
    toDateTime(toUInt64OrNull(arr[16]) / 1000) AS page_start_tm_dt,
    splitByChar('?', arr[14])[1] AS page_name,
    toDate(page_start_tm_dt) AS log_date
FROM maxy_device_page_flow_consumer;

-- 페이지 로그 일별 집계 테이블/뷰
CREATE TABLE IF NOT EXISTS maxy_page_daily
(
    log_date Date,
    package_id String,
    server_type UInt32,
    os_type String,
    page_name String,
    sum_event_count AggregateFunction(sum, UInt32),
    avg_interval_tm AggregateFunction(avg, UInt32),
    sum_interval_tm AggregateFunction(sum, UInt32),
    avg_loading_tm AggregateFunction(avg, UInt32),
    sum_loading_tm AggregateFunction(sum, UInt32),
    sum_response_tm AggregateFunction(sum, UInt32),
    sum_request_count AggregateFunction(sum, UInt32),
    sum_mem_usage AggregateFunction(sum, UInt64),
    sum_cpu_usage AggregateFunction(sum, UInt64),
    sum_error_count AggregateFunction(sum, UInt32),
    sum_js_error_count AggregateFunction(sum, UInt32),
    sum_crash_count AggregateFunction(sum, UInt32),
    sum_log_count AggregateFunction(sum, UInt64),
    uniq_device_count AggregateFunction(uniqExact, String),
    cnt AggregateFunction(count, UInt32)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (log_date, package_id, server_type, os_type,page_name)
TTL log_date + INTERVAL 365 DAY DELETE;

CREATE MATERIALIZED VIEW IF NOT EXISTS maxy_page_daily_mv
TO maxy_page_daily
AS
WITH
    ifNull(package_nm, '') AS package_id_c,
    toUInt32(ifNull(server_type, toUInt32(0))) AS server_type_c,
    ifNull(os_type, '') AS os_type_c,
    ifNull(page_name, '') AS page_name_c
SELECT
    log_date,
    package_id_c AS package_id,
    server_type_c AS server_type,
    os_type_c AS os_type,
    page_name_c AS page_name,
    sumState(ifNull(event_count, toUInt32(0))) AS sum_event_count,
    avgStateIf(toUInt32(intervaltime), intervaltime IS NOT NULL) AS avg_interval_tm,
    sumState(ifNull(intervaltime, toUInt32(0))) AS sum_interval_tm,
    avgStateIf(toUInt32(loading_time), loading_time IS NOT NULL) AS avg_loading_tm,
    sumState(ifNull(loading_time, toUInt32(0))) AS sum_loading_tm,
    sumState(ifNull(response_time, toUInt32(0))) AS sum_response_tm,
    sumState(ifNull(request_count, toUInt32(0))) AS sum_request_count,
    sumState(sum_mem_usage) AS sum_mem_usage,
    sumState(ifNull(sum_cpu_usage, toUInt64(0))) AS sum_cpu_usage,
    sumState(ifNull(error_count, toUInt32(0))) AS sum_error_count,
    sumState(ifNull(js_error_count, toUInt32(0))) AS sum_js_error_count,
    sumState(ifNull(crash_count, toUInt32(0))) AS sum_crash_count,
    sumState(ifNull(log_count, toUInt64(0))) AS sum_log_count,
    uniqExactState(device_id) AS uniq_device_count,
    countState(toUInt32(1)) AS cnt
FROM maxy_device_page_flow
GROUP BY
    log_date,
    package_id_c,
    server_type_c,
    os_type_c,
    page_name_c;











/*

-- 페이지 로그 일별 집계 테이블/뷰
CREATE TABLE IF NOT EXISTS maxy_model_daily
(
    log_date Date,
    package_id String,
    server_type UInt32,
    os_type String,
    device_model String,
    sum_event_count AggregateFunction(sum, UInt32),
    avg_interval_tm AggregateFunction(avg, UInt32),
    sum_interval_tm AggregateFunction(sum, UInt32),
    avg_loading_tm AggregateFunction(avg, UInt32),
    sum_loading_tm AggregateFunction(sum, UInt32),
    sum_response_tm AggregateFunction(sum, UInt32),
    sum_request_count AggregateFunction(sum, UInt32),
    sum_mem_usage AggregateFunction(sum, UInt64),
    sum_cpu_usage AggregateFunction(sum, UInt64),
    sum_error_count AggregateFunction(sum, UInt32),
    sum_js_error_count AggregateFunction(sum, UInt32),
    sum_crash_count AggregateFunction(sum, UInt32),
    sum_log_count AggregateFunction(sum, UInt64),
    uniq_device_count AggregateFunction(uniqExact, String),
    cnt AggregateFunction(count, UInt32)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (log_date, package_id, server_type, os_type,device_model)
TTL log_date + INTERVAL 365 DAY DELETE;

CREATE MATERIALIZED VIEW IF NOT EXISTS maxy_model_daily_mv
TO maxy_model_daily
AS
WITH
    ifNull(package_nm, '') AS package_id_c,
    toUInt32(ifNull(server_type, toUInt32(0))) AS server_type_c,
    ifNull(os_type, '') AS os_type_c,
    ifNull(device_model, '') AS device_model_c
SELECT
    log_date,
    package_id_c AS package_id,
    server_type_c AS server_type,
    os_type_c AS os_type,
    device_model_c AS device_model,
    sumState(ifNull(event_count, toUInt32(0))) AS sum_event_count,
    avgStateIf(toUInt32(intervaltime), intervaltime IS NOT NULL) AS avg_interval_tm,
    sumState(ifNull(intervaltime, toUInt32(0))) AS sum_interval_tm,
    avgStateIf(toUInt32(loading_time), loading_time IS NOT NULL) AS avg_loading_tm,
    sumState(ifNull(loading_time, toUInt32(0))) AS sum_loading_tm,
    sumState(ifNull(response_time, toUInt32(0))) AS sum_response_tm,
    sumState(ifNull(request_count, toUInt32(0))) AS sum_request_count,
    sumState(sum_mem_usage) AS sum_mem_usage,
    sumState(ifNull(sum_cpu_usage, toUInt64(0))) AS sum_cpu_usage,
    sumState(ifNull(error_count, toUInt32(0))) AS sum_error_count,
    sumState(ifNull(js_error_count, toUInt32(0))) AS sum_js_error_count,
    sumState(ifNull(crash_count, toUInt32(0))) AS sum_crash_count,
    sumState(ifNull(log_count, toUInt64(0))) AS sum_log_count,
    uniqExactState(device_id) AS uniq_device_count,
    countState(toUInt32(1)) AS cnt
FROM maxy_device_page_flow
GROUP BY
    log_date,
    package_id_c,
    server_type_c,
    os_type_c,
    device_model_c;
    */

-- 디바이스 모델 시간별 집계 테이블/뷰
CREATE TABLE IF NOT EXISTS maxy_model_hourly
(
    hour_bucket DateTime,
    package_id String,
    server_type UInt32,
    os_type String,
    device_model String,
    sum_event_count AggregateFunction(sum, UInt32),
    avg_interval_tm AggregateFunction(avg, UInt32),
    sum_interval_tm AggregateFunction(sum, UInt32),
    avg_loading_tm AggregateFunction(avg, UInt32),
    sum_loading_tm AggregateFunction(sum, UInt32),
    sum_response_tm AggregateFunction(sum, UInt32),
    sum_request_count AggregateFunction(sum, UInt32),
    sum_mem_usage AggregateFunction(sum, UInt64),
    sum_cpu_usage AggregateFunction(sum, UInt64),
    sum_error_count AggregateFunction(sum, UInt32),
    sum_js_error_count AggregateFunction(sum, UInt32),
    sum_crash_count AggregateFunction(sum, UInt32),
    sum_log_count AggregateFunction(sum, UInt64),
    uniq_device_count AggregateFunction(uniqExact, String),
    cnt AggregateFunction(count, UInt32)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMMDD(hour_bucket)
ORDER BY (hour_bucket, package_id, server_type, os_type,device_model)
TTL hour_bucket + INTERVAL 365 DAY DELETE;

CREATE MATERIALIZED VIEW IF NOT EXISTS maxy_model_hourly_mv
TO maxy_model_hourly
AS
WITH
    ifNull(package_nm, '') AS package_id_c,
    toUInt32(ifNull(server_type, toUInt32(0))) AS server_type_c,
    ifNull(os_type, '') AS os_type_c,
    ifNull(device_model, '') AS device_model_c,
    toStartOfHour(page_start_tm_dt) AS hour_bucket_c
SELECT
    hour_bucket_c AS hour_bucket,
    package_id_c AS package_id,
    server_type_c AS server_type,
    os_type_c AS os_type,
    device_model_c AS device_model,
    sumState(ifNull(event_count, toUInt32(0))) AS sum_event_count,
    avgStateIf(toUInt32(intervaltime), intervaltime IS NOT NULL) AS avg_interval_tm,
    sumState(ifNull(intervaltime, toUInt32(0))) AS sum_interval_tm,
    avgStateIf(toUInt32(loading_time), loading_time IS NOT NULL) AS avg_loading_tm,
    sumState(ifNull(loading_time, toUInt32(0))) AS sum_loading_tm,
    sumState(ifNull(response_time, toUInt32(0))) AS sum_response_tm,
    sumState(ifNull(request_count, toUInt32(0))) AS sum_request_count,
    sumState(sum_mem_usage) AS sum_mem_usage,
    sumState(ifNull(sum_cpu_usage, toUInt64(0))) AS sum_cpu_usage,
    sumState(ifNull(error_count, toUInt32(0))) AS sum_error_count,
    sumState(ifNull(js_error_count, toUInt32(0))) AS sum_js_error_count,
    sumState(ifNull(crash_count, toUInt32(0))) AS sum_crash_count,
    sumState(ifNull(log_count, toUInt64(0))) AS sum_log_count,
    uniqExactState(device_id) AS uniq_device_count,
    countState(toUInt32(1)) AS cnt
FROM maxy_device_page_flow
GROUP BY
    hour_bucket_c,
    package_id_c,
    server_type_c,
    os_type_c,
    device_model_c;











-- user_id 매핑 테이블
CREATE TABLE maxy_mkt_user_identity
(
    device_id String,
    user_id String,
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY device_id;

-- user_id 최신 값 뷰
--CREATE VIEW maxy_mkt_user_identity_latest AS
--SELECT
--    device_id,
--    argMax(user_id, updated_at) AS user_id
--FROM maxy_mkt_user_identity
--GROUP BY device_id;

-- user_id 딕셔너리
CREATE DICTIONARY dict_user_identity
(
    device_id String,
    user_id String
)
PRIMARY KEY device_id
SOURCE(CLICKHOUSE(table 'maxy_mkt_user_identity'))
LAYOUT(HASHED())
LIFETIME(MIN 60 MAX 300);

-- 검색엔진 관리 테이블(트래픽 소스)
CREATE TABLE search_engine_domains
(
    domain String,
    engine_name String DEFAULT domain
)
ENGINE = TinyLog;

-- 검색엔진(주기적으로 업데이트 해준다.)
INSERT INTO search_engine_domains (domain, engine_name) VALUES
('google.com', 'google'),
('google.co.kr', 'google'),
('google.co.jp', 'google'),
('naver.com', 'naver'),
('m.naver.com', 'naver'),
('search.naver.com', 'naver'),
('daum.net', 'daum'),
('search.daum.net', 'daum'),
('bing.com', 'bing'),
('yahoo.com', 'yahoo'),
('duckduckgo.com', 'duckduckgo'),
('baidu.com', 'baidu'),
('yandex.ru', 'yandex'),
('ecosia.org', 'ecosia'),
('search.brave.com', 'brave');

-- 검색엔진 딕셔너리 생성
CREATE DICTIONARY dict_search_engines
(
    domain String,
    engine_name String
)
PRIMARY KEY domain
SOURCE(CLICKHOUSE(
    host 'localhost'
    port 9000
    user 'maxy'
    password 'maxy!@#'
    db 'default'
    table 'search_engine_domains'
))
LIFETIME(300)  -- 5분마다 자동 새로고침
LAYOUT(HASHED());

-- 마케팅 테이블 정보
CREATE TABLE maxy_mkt_event_log (
    event_id UUID,	-- uuid
	application_id Nullable(String),	-- 프로젝트 구분(app id)
	server_type UInt8,	-- 프로젝트 구분(server type)
    user_id Nullable(String),	-- user id
    device_id Nullable(String),	-- device id
    user_key Nullable(String), -- USER id OR device id
    session_id Nullable(String),	-- SESSION id
    event_name Nullable(String),	-- 이벤트 이름
    event_time DateTime,	-- 이벤트 발생시간
    event_date Date MATERIALIZED toDate(event_time),	-- 이벤트 발생 날짜
    platform Nullable(String),	-- android, ios, web
	os_category Nullable(String),	-- android, ios, windows, macos, linux, chrome os, others
    app_version Nullable(String),	-- 앱 버전
    os_version Nullable(String),	-- OS 버전
	device_category Nullable(String),	-- mobile, tablet, desktop
    device_model Nullable(String),	-- 단말기 모델
	browser Nullable(String),	-- Chrome, Safari, Edge, Firefox, Opera, Samsung Internet, Android Webview, Safari (in-app)
    geo_country Nullable(String),	-- 지역(국가)
    geo_region Nullable(String),	-- 지역(도)
    geo_city Nullable(String),		-- 지역(시)
    traffic_source Nullable(String),	-- 유입 소스
	medium Nullable(String),	-- 유입 매체
    campaign Nullable(String),	-- 유입 캠페인
	sex Nullable(String),	-- 성별(m,f)
	age Nullable(String),	-- 나이대(10대, 20대, 30대, 40대, 50대, ...)
    event_params JSON,	-- 이벤트 파라미터
    user_properties JSON,	-- 속성 파라미터
	is_important_event UInt8,	-- 중요 이벤트 여부
    is_first_install UInt8,	-- 첫 설치(설치된 날은 1, 나머지는 0)
    is_first_open UInt8,	-- 첫 실행(첫실행 날은 1, 나머지는 0)
    version UInt64 DEFAULT 1   -- 중복 제거 버전
)
ENGINE = ReplacingMergeTree(version)
PARTITION BY event_date
ORDER BY (event_id);

CREATE TABLE default.maxy_mkt_event_log_consumer
(
    `raw` String
)
ENGINE = Kafka
SETTINGS kafka_broker_list = '192.168.10.232:19092',
kafka_topic_list = 'marketing-logs',
kafka_group_name = 'marketing-logs-g2',
kafka_format = 'LineAsString',
kafka_max_block_size = 10000,
kafka_num_consumers = 1;
 
CREATE MATERIALIZED VIEW maxy_mkt_event_log_mv
TO maxy_mkt_event_log
AS WITH splitByChar(',', raw) AS arr
SELECT
	coalesce(toUUIDOrNull(trim(BOTH '"' FROM trim(arr[47]))), generateUUIDv7()) AS event_id,
	arr[26] AS application_id,
	toUInt8OrNull(arr[27]) AS server_type,
	arr[32] AS user_id,
	arr[2] AS device_id,
--	coalesce(nullIf(arr[32], ''), arr[2]) AS user_key,
	coalesce(
	    dictGetOrDefault('default.dict_user_identity', 'user_id', arr[2], arr[2]),
	    coalesce(nullIf(arr[32], ''), arr[2])
	) AS user_key,
	arr[24] AS session_id,
	arr[12] AS event_name,
	toDateTime(toInt64OrNull(arr[1]) / 1000) AS event_time,
	arr[28] AS platform,
	arr[49] AS os_category,
	arr[6] AS app_version,
	arr[5] AS os_version,
	arr[48] AS device_category,
	arr[7] AS device_model,
	arr[50] AS browser,
	arr[53] AS geo_country,
	arr[54] AS geo_region,
	arr[55] AS geo_city,
--	arr[44] AS traffic_source,
	CASE
        WHEN lower(arr[28]) = 'web' THEN
            CASE
                WHEN arr[44] != '' THEN arr[44]
                WHEN dictHas('dict_search_engines', arr[43])
                    THEN dictGetString('dict_search_engines', 'engine_name', arr[43])
                WHEN arr[43] != '' THEN arr[43]
                ELSE 'direct'
            END
        ELSE
            nullIf(arr[44], '')
    END AS traffic_source,
--	arr[45] AS medium,
    CASE
        WHEN lower(arr[28]) = 'web' THEN
            CASE
                WHEN arr[45] != '' THEN arr[45]
                WHEN dictHas('dict_search_engines', arr[43]) THEN 'organic'
                WHEN arr[43] != '' THEN 'referral'
                ELSE 'none'
            END
        ELSE
            nullIf(arr[45], '')
    END AS medium,
	arr[46] AS campaign,
	arr[51] AS sex,
	arr[52] AS age,
	multiIf(
	   arr[13] IS NULL OR trim(arr[13]) = '',
	        '{}',
	    startsWith(trim(replaceAll(arr[13], 'clickhousecomma', ',')), '{') OR
	    startsWith(trim(replaceAll(arr[13], 'clickhousecomma', ',')), '['),
	        trim(replaceAll(arr[13], 'clickhousecomma', ',')),
	        '{}'
	) AS event_params,
	-- user_properties
	multiIf(
	    arr[56] IS NULL OR trim(arr[56]) = '',
	        '{}',
	    startsWith(trim(replaceAll(arr[56], 'clickhousecomma', ',')), '{') OR
	    startsWith(trim(replaceAll(arr[56], 'clickhousecomma', ',')), '['),
	        trim(replaceAll(arr[56], 'clickhousecomma', ',')),
	        '{}'
	) AS user_properties,
	toUInt8OrNull(arr[57]) AS is_important_event,
	toUInt8OrNull(arr[58]) AS is_first_install,
	toUInt8OrNull(arr[59]) AS is_first_open
FROM default.maxy_mkt_event_log_consumer;



-- setMaxyInfo시에 user_id를 인서트한다.
-- INSERT INTO maxy_mkt_user_identity VALUES ('hs6', 'thinkm007', now());

-- 기존 user_key정보를 user_id로 변경
-- ALTER TABLE maxy_mkt_event_log UPDATE user_key = 'thinkm007' WHERE device_id = 'hs6' AND user_key != 'thinkm007';




-- 날짜별 디바이스의 방문수, 설치수, 로그인수
CREATE TABLE maxy_device_access_history
(
    `log_date` Date,
    `package_nm` String,
    `server_type` UInt32,
    `os_type` String,
    `device_id` String,
    `visit_cnt` UInt64,
    `install_cnt` UInt64,
    `login_cnt` UInt64 default 0
)
ENGINE = SummingMergeTree
PARTITION BY log_date
ORDER BY (log_date,
 package_nm,
 server_type,
 os_type,
 device_id)
TTL toDateTime(log_date) + toIntervalDay(365)
SETTINGS index_granularity = 8192;


CREATE MATERIALIZED VIEW maxy_device_access_history_mv
TO maxy_device_access_history
AS
SELECT
    log_date,
    package_nm,
    server_type,
    os_type,
    device_id,
    count() AS visit_cnt,
    countIf(log_type = 1048597) AS install_cnt,
    -- countIf(log_type = 1048577 OR log_type = 131073) AS visit_cnt,
    0  AS login_cnt -- 로그인은 별도 테이블로 처리
FROM maxy_device_page_flow
WHERE log_type IN (1048597, 1048580) -- install,app start
GROUP BY
    log_date,
    package_nm,
    server_type,
    os_type,
    device_id;

-- 날짜별 디바이스의 비트맵
CREATE TABLE maxy_device_access_bitmap
(
    `log_date` Date,
    `package_nm` String,
    `server_type` UInt32,
    `os_type` String,
    `users` AggregateFunction(groupBitmap, UInt64)
)
--ENGINE = SummingMergeTree
ENGINE = AggregatingMergeTree
PARTITION BY log_date
ORDER BY (log_date,
 package_nm,
 server_type,
 os_type)
TTL toDateTime(log_date) + toIntervalDay(365)
SETTINGS index_granularity = 8192;


CREATE MATERIALIZED VIEW maxy_device_access_bitmap_mv
TO maxy_device_access_bitmap
AS
SELECT
    log_date,
    package_nm,
    server_type,
    os_type,
    groupBitmapState(crc64(device_id)) AS users
FROM maxy_device_page_flow
WHERE log_type IN (1048597, 1048580) -- install,app start
GROUP BY log_date,
 package_nm,
 server_type,
 os_type;


CREATE TABLE IF NOT EXISTS maxy_device_statistic
(
    stat_date Date,
    package_nm String,
    server_type UInt32,
    os_type String,
    visit UInt64,
    install UInt64,
    login UInt64,
    dau UInt64,
    revisit_7d UInt64,
    mau UInt64,
    crash_count UInt64,
    error_count UInt64,
    js_error_count UInt64,
    log_count UInt64,
    intervaltime_avg Float64,
    lcp_avg Float64,
    ttfb_avg Float64,
    fcp_avg Float64,
    inp_avg Float64,
    pv UInt64,
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(stat_date) - 60
ORDER BY (stat_date, package_nm, server_type, os_type)
SETTINGS index_granularity = 8192;



-- webperf logs
CREATE TABLE maxy_app_webperf_log
(
    reg_dt DateTime64(3) DEFAULT now64(3),
    log_tm UInt64,
    device_id String,
    log_type UInt64,
    mx_page_id UInt64 DEFAULT 0,
    os_type Nullable(String),
    package_nm Nullable(String),
    res_msg Nullable(String),
    server_type Nullable(String),
    log_tm_dt DateTime MATERIALIZED toDateTime(intDiv(log_tm, 1000))
)
ENGINE = ReplacingMergeTree
PARTITION BY toYYYYMMDD(log_tm_dt)
ORDER BY (log_tm, device_id, log_type, mx_page_id)
SETTINGS index_granularity = 8192;
