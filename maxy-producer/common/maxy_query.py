from datetime import datetime,timedelta
import json
from common.maxy_common import list_year_months,list_year_month_days
def QueryPageLogCount(istoday):
    """
    page_log 테이블을 통하여 crash_count,error_count,js_error_count,log_count 의 카운트를 알아온다.
    T_DailyPLCnt 에서 사용함
    """
    query = f"""
    SELECT package_id, server_type,os_type,
            sum(sum_crash_count) as sum_crash_count,
		    sum(sum_error_count) as sum_error_count,
		    sum(sum_js_error_count) as sum_js_error_count,
		    sum(sum_log_count) as sum_log_count,
		    sum(sum_interval_tm) as sum_interval_tm,
		    sum(cnt) AS cnt
            FROM maxy2_page_model_hourly 
            %s
            GROUP BY package_id, server_type, os_type
            SETTINGS max_threads = 3
    """
    if istoday:
        query = query%("where hour_bucket >= toStartOfDay(today())")
    else:
        query = query%("where hour_bucket >= toStartOfDay(today() - 1)  and hour_bucket < toStartOfDay(today())")
    
    return query

def QueryPageLogCountMonth():
    """
    page_log 테이블을 통하여 crash_count,error_count,js_error_count,log_count 의 카운트를 알아온다.
    T_DailyPLCnt 에서 사용함
    sYearMonth : 2024-04
    sWhere : ex) ", query": {"bool": {"filter":[{"term": {"day": "30"}}]}}
    """
    query = """
    SELECT
    page_start_tm_dt,
    package_id,
    server_type,
    os_type,
    sumMerge(sum_crash_count)   AS crash_count,
    sumMerge(sum_error_count)   AS error_count,
    sumMerge(sum_js_error_count)   AS js_error_count,
    sumMerge(sum_log_count)   AS log_count,
    avgMerge(avg_interval_tm) as interval_tm,
    uniqExactMerge(uniq_device_count) AS unique_devices,
    countMerge(cnt)             AS cnt
FROM maxy2_page_daily
WHERE page_start_tm_dt >= today() - 31
GROUP BY page_start_tm_dt, package_id, server_type, os_type
    """
    
    return query
        
    


def ModelCPUPop(date,package,server_type,os_type):
    dtnow = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
    
    if date == 'day':
            sSDay = int(dtnow.timestamp() * 1000)
            sEDay = int((dtnow+timedelta(days=1)).timestamp() * 1000)
    elif date == 'week':
            sSDay = int((dtnow-timedelta(days=7)).timestamp() * 1000)
            sEDay = int((dtnow+timedelta(days=1)).timestamp() * 1000)
    elif date == 'month':
            sSDay = int((dtnow-timedelta(days=31)).timestamp() * 1000)
            sEDay = int((dtnow+timedelta(days=1)).timestamp() * 1000)
    sWhere = ""
    if os_type != 'all':
        sWhere = "server_type=%d and package_id='%s' and os_type='%s' and page_start_tm_dt >= toDateTime(%d/1000) and page_start_tm_dt < toDateTime(%d/1000)"%(server_type,package,os_type,sSDay,sEDay)                
    else:
        sWhere = "server_type=%d and package_id='%s' and page_start_tm_dt >= toDateTime(%d/1000) and page_start_tm_dt < toDateTime(%d/1000)"%(server_type,package,sSDay,sEDay)                
        
    
    query = """
        SELECT
            page_start_tm_dt,
            package_id,
            server_type,
            os_type,
            model,
            sumMerge(sum_cpu_usage)   AS sum_cpu_usage,
            sumMerge(sum_mem_usage)   AS sum_mem_usage,
            sumMerge(sum_log_count)   AS log_count,
            avgMerge(avg_interval_tm) as interval_tm,
            uniqExactMerge(uniq_device_count) AS unique_devices,
            countMerge(cnt)             AS cnt
        FROM maxy2_page_model_daily
        WHERE %s
        GROUP BY page_start_tm_dt, package_id, server_type, os_type , model
    """ % sWhere
    
    return query





def PageCountBySubUrlKey(sPackage,ServerType,sYearMonth1,swhere):
    index_name = f'maxy2_page_log-{sYearMonth1}'
    query = """
    {
        "size": 0, 
        "aggs": {
                    "models": {
                        "terms": {
                        "field": "url_sub_key.keyword",
                        "size": 200
                        },
                        "aggs": {
                        "unique_devices": {
                                "cardinality": {
                                    "field": "device_id_c"
                                }
                            }
                        }
                    }
                }
                %s
    }
    """
    query = query%swhere
    return index_name,query

def PageCountBySubUrlKeyClickhouse(target_date, package, server_type, os_type, sub_key_url):
    """
    Returns the ClickHouse query used by adminclickhouse/ajax/CommonAjax.GetPageCountBySubUrlKey.
    """
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    escaped_package = _escape(package)
    escaped_sub_key = _escape(sub_key_url)
    os_filter = ""
    if os_type != 'all':
        os_filter = f" AND os_type = '{os_type}'"

    query = f"""
        SELECT
            uniqExactMerge(uniq_device_count) AS unique_devices,
            countMerge(cnt) AS doc_count
        FROM maxy2_page_url_daily
        WHERE page_start_tm_dt = toDate('{target_date}')
          AND package_id = '{escaped_package}'
          AND server_type = {server_type}
          {os_filter}
          AND url_sub_key = '{escaped_sub_key}'
    """
    return query

def PageModelBySubKeyClickhouse(package, server_type, os_type, sub_key_url, start_dt, end_dt, limit=200, offset=0):
    """
    Returns the ClickHouse query to fetch page logs for a specific sub key.
    """
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    escaped_package = _escape(package)
    escaped_sub_key = _escape(sub_key_url)
    os_filter = ""
    if os_type != 'all':
        os_filter = f" AND os_type = '{os_type}'"

    start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')
    limit_clause = f"LIMIT {int(limit)} OFFSET {max(int(offset),0)}"

    query = f"""
        SELECT
            app_version,
            device_id,
            loading_tm,
            model,
            os_type,
            page_start_tm,
            interval_tm,
            url_sub_key,
            avg_cpu_usage,
            avg_mem_usage,
            signal,
            url
        FROM maxy2_page_log
        WHERE package_id = '{escaped_package}'
          AND server_type = {server_type}
          AND url_sub_key = '{escaped_sub_key}'
          AND page_start_tm_dt >= toDateTime('{start_str}')
          AND page_start_tm_dt < toDateTime('{end_str}')
          {os_filter}
        ORDER BY page_start_tm DESC
        {limit_clause}
    """
    return query

def PageModelBySubKeyClickhouse(package, server_type, os_type, sub_key_url, start_dt, end_dt, limit=200, offset=0):
    """
    Returns the ClickHouse query to fetch page logs for a specific sub key.
    """
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    escaped_package = _escape(package)
    escaped_sub_key = _escape(sub_key_url)
    os_filter = ""
    if os_type != 'all':
        os_filter = f" AND os_type = '{os_type}'"

    start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')
    limit_clause = f"LIMIT {int(limit)} OFFSET {max(int(offset),0)}"

    query = f"""
        SELECT
            app_version,
            device_id,
            loading_tm,
            model,
            os_type,
            page_start_tm,
            interval_tm,
            url_sub_key,
            avg_cpu_usage,
            avg_mem_usage,
            signal,
            url
        FROM maxy2_page_log
        WHERE package_id = '{escaped_package}'
          AND server_type = {server_type}
          AND url_sub_key = '{escaped_sub_key}'
          AND page_start_tm_dt >= toDateTime('{start_str}')
          AND page_start_tm_dt < toDateTime('{end_str}')
          {os_filter}
        ORDER BY page_start_tm DESC
        {limit_clause}
    """
    return query

def PageModelBySubKey(sYearMonth1,sPackage,ServerType,os_type,sURLSubKey,sDay):
    index_name = f'maxy2_page_log-{sYearMonth1}'
    query = """
    {
        "size": 200, 
        "_source": ["page_start_tm","device_id","model","os_type","app_version",
                    "url_sub_key","url_sub_key","interval_tm","loading_tm","avg_cpu_usage","avg_mem_usage","signal","url"], 
         "sort": 
                {
                "page_start_tm": {
                    "order": "desc"
                }
              }
              ,
        "query": {"bool": {"filter":[
            {"term": {"package_id":"%s"}},
            {"term": {"server_type":%d}},
            {"term": {"url_sub_key.keyword":"%s"}},
            {"term": {"day":"%s"}}
            %s
            ]}}
    }
    """
    if os_type == 'all':
        query = query%(sPackage,ServerType,sURLSubKey,sDay,'')
    else:
        aqu = ',{"term": {"os_type":"%s"}}'%os_type
        query = query%(sPackage,ServerType,sURLSubKey,sDay,aqu)
    return index_name,query

def PageCountByHour(sYearMonth1,sPackage,ServerType,os_type,sDay):
    """
    콤포넌트 PVEqualizer 의 하단 차트..
    """
    index_name = f'maxy2_page_log-{sYearMonth1}'
    query = """
            {
                "size": 0,
                "aggs": {
                        "hour": {   "terms": {  "field": "hour", "size": 1000 },
                                    "aggs": {
                                        "unique_devices": {
                                                "cardinality": {
                                                    "field": "device_id_c" 
                                                }
                                            }
                                        }
                                }
                    },
                    "query": {
                        "bool": {
                            "filter": [ 
                                {"term": { "package_id": "%s" }},
                                {"term": { "server_type": %d }},
                                {"term": { "day": "%s" }}
                                %s
                            ]
                        }
                }
            }
        """
    if os_type == 'all':
        query = query%(sPackage,ServerType,sDay,'')
    else:
        aqu = ',{"term": {"os_type":"%s"}}'%os_type
        query = query%(sPackage,ServerType,sDay,aqu)
    return index_name,query


def PageCountByHourClickhouse(package_id, server_type, os_type, target_date, sub_key_url=None):
    """
    Returns a ClickHouse query that mimics the legacy OpenSearch aggregation used by GetPageCountByHour.
    """
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    escaped_package = _escape(package_id)
    os_filter = ""
    if os_type != 'all':
        os_filter = f" AND os_type = '{os_type}'"
    url_filter = ""
    if sub_key_url:
        url_filter = f" AND url_sub_key = '{_escape(sub_key_url)}'"

    start_dt = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_dt = start_dt + timedelta(days=1)
    start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')

    query = f"""
        SELECT
            formatDateTime(page_start_tm_dt, '%H') AS key,
            count() AS doc_count,
            uniqExact(device_id) AS unique_devices
        FROM maxy2_page_log
        WHERE package_id = '{escaped_package}'
          AND server_type = {server_type}
          {os_filter}
          {url_filter}
          AND page_start_tm_dt >= toDateTime('{start_str}')
          AND page_start_tm_dt < toDateTime('{end_str}')
        GROUP BY key
        ORDER BY key
    """
    return query


def PageCountByWeek(sPackage,ServerType,os_type,type, sub_key_url=None):
    dtnow = datetime.now()

    if type == '1w':
        day = 7
    else:
        day = 31

    start_dt = (dtnow - timedelta(days=day)).replace(hour=0, minute=0, second=0, microsecond=0)
    # include the whole end day by moving the upper bound to the next midnight
    end_dt = (dtnow.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1))

    start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')

    os_filter = ""
    if os_type != 'all':
        os_filter = f"AND os_type = '{os_type}'"
    url_filter = ""
    if sub_key_url:
        def _escape(value: str) -> str:
            return value.replace("\\", "\\\\").replace("'", "\\'")
        url_filter = f" AND url_sub_key = '{_escape(sub_key_url)}'"

    query = f"""
        SELECT
            toDate(page_start_tm_dt) AS log_date,
            countMerge(cnt) AS doc_count,
            uniqExactMerge(uniq_device_count) AS unique_devices
        FROM maxy2_page_daily
        WHERE package_id = '{sPackage}'
          AND server_type = {ServerType}
          {os_filter}
          {url_filter}
          AND page_start_tm_dt >= toDateTime('{start_str}')
          AND page_start_tm_dt < toDateTime('{end_str}')
        GROUP BY log_date
        ORDER BY log_date
    """

    return query


def GetResponsePopChart(sPackage,ServerType,url,type,typevalue):
    column = ''
    typesql = ''
    
    
    url_sub_key = url.split("?")[0]
    if type == None:
        column = ''
        typesql = ''
    elif type == 'model':
        column = ',model'
        typesql = "AND model = '%s'"%typevalue
    elif type == 'carrier':
        column = ',carrier'
        typesql = "AND carrier = '%s'"%typevalue
    elif type == 'network':
        column = ',network'
        typesql = "AND network = '%s'"%typevalue
    query = """
            SELECT
            package_id,
            server_type,
            url_key 
            %s,
            interval_bucket,
            countMerge(cnt) AS cnt,
            arrayElement(quantilesTDigestMerge(0.25,0.5,0.75)(q_state), 1) AS q1,
            arrayElement(quantilesTDigestMerge(0.25,0.5,0.75)(q_state), 3) AS q3
        FROM maxy2_network_historgram
        WHERE log_date >= today() - 7
        AND package_id = '%s'
        AND server_type = %s
        AND url_key = '%s'
        %s
        GROUP BY package_id,server_type,url_key %s , interval_bucket
        ORDER BY interval_bucket;
    """%(column,sPackage,ServerType,url_sub_key,typesql,column)
    return query

    
def PageURLSubKeyListByWeek(sPackage,ServerType,os_type,type):
    
    dtnow = datetime.now()
    sMonth = dtnow.strftime('%Y-%m')
    
    if type == '1w':
        day = 7
    else:
        day = 31
    
    sSDay = (dtnow-timedelta(days=day)).strftime('%Y-%m-%d')
    sEDay = dtnow.strftime('%Y-%m-%d')
    sBeforMonth = (dtnow-timedelta(days=day)).strftime('%Y-%m')
    
    range = '{"range": {"date":{"gte": "%s","lte": "%s"}}}' % (sSDay,sEDay)
             
    if sBeforMonth == sMonth:
        index_name = f'maxy2_page_log-{sMonth}'
    else:
        index_name = f'maxy2_page_log-{sMonth},maxy2_page_log-{sBeforMonth}'
        
    query = """
            {
                "size": 0,
                "aggs": {
                        "url_sub_key": {   "terms": {  "field": "url_sub_key.keyword", "size": 30 },
                                    "aggs": {
                                        "interval_tm": {"sum": {"field": "interval_tm"}},
                                        "unique_devices": {
                                                "cardinality": {
                                                    "field": "device_id_c" 
                                                }
                                            }
                                        }
                                }
                    },
                    "query": {
                        "bool": {
                            "filter": [ 
                                %s
                                %s
                            ]
                        }
                }
            }
        """
    if os_type == 'all':
        query = query%(range,'')
    else:
        aqu = ',{"term": {"os_type":"%s"}}'%os_type
        query = query%(range,aqu)
    return index_name,query

def CrashPop(date,package,server_type,os_type):
    dtnow = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
    
    if date == 'day':
            sSDay = int(dtnow.timestamp() * 1000)
            sEDay = int((dtnow+timedelta(days=1)).timestamp() * 1000)
    elif date == 'week':
            sSDay = int((dtnow-timedelta(days=7)).timestamp() * 1000)
            sEDay = int((dtnow+timedelta(days=1)).timestamp() * 1000)
    elif date == 'month':
            sSDay = int((dtnow-timedelta(days=31)).timestamp() * 1000)
            sEDay = int((dtnow+timedelta(days=1)).timestamp() * 1000)
    sWhere = ""
    if os_type != 'all':
        sWhere = "server_type=%d and package_id='%s' and os_type='%s' and page_start_tm_dt >= toDateTime(%d/1000) and page_start_tm_dt < toDateTime(%d/1000)"%(server_type,package,os_type,sSDay,sEDay)                
    else:
        sWhere = "server_type=%d and package_id='%s' and page_start_tm_dt >= toDateTime(%d/1000) and page_start_tm_dt < toDateTime(%d/1000)"%(server_type,package,sSDay,sEDay)                
        
    query = """
        SELECT
            page_start_tm_dt,
            package_id,
            server_type,
            os_type,
            model,
            sumMerge(sum_crash_count)   AS crash_count,
            sumMerge(sum_error_count)   AS error_count,
            sumMerge(sum_js_error_count)   AS js_error_count,
            sumMerge(sum_log_count)   AS log_count,
            avgMerge(avg_interval_tm) as interval_tm,
            uniqExactMerge(uniq_device_count) AS unique_devices,
            countMerge(cnt)             AS cnt
        FROM maxy2_page_model_daily
        WHERE %s
        GROUP BY page_start_tm_dt, package_id, server_type, os_type , model
    """
    query = query%(sWhere)
    return query

def ListCrashErrorByModel(sPackage,ServerType,type,model,offset):
    """
    type = crash_count crash
    type = error_count error
    type = js_error_count jserror
    """
    if type == 'crash_count':
        sWhere = """
        log_tm >= (toUnixTimestamp(toDateTime(today())) * 1000) and log_type = 2097152 and model = '%s' and package_id = '%s' and server_type = %s
        """%(model,sPackage,ServerType)
    elif type == 'error_count':
        sWhere = """
        log_tm >= (toUnixTimestamp(toDateTime(today())) * 1000) and (log_type = 4194306 or log_type = 262148 or log_type = 524292 or log_type = 1048579 or log_type = 131077 or log_type = 131076) 
        and model = '%s' and package_id = '%s' and server_type = %s
        """%(model,sPackage,ServerType)
    elif type == 'js_error_count':
        sWhere = """
        log_tm >= (toUnixTimestamp(toDateTime(today())) * 1000) and log_type = 131077 and model = '%s' and package_id = '%s' and server_type = %s
        """%(model,sPackage,ServerType)
    else: #favorites (모든 에러?)
        sWhere = """
        log_tm >= (toUnixTimestamp(toDateTime(today())) * 1000) and (log_type = 2097152 or log_type = 4194306 or log_type = 262148 or log_type = 524292 or log_type = 1048579 or log_type = 131077 or log_type = 131076) 
        and model = '%s' and package_id = '%s' and server_type = %s
        """%(model,sPackage,ServerType)
    
    query = """
            select server_type,app_version,battery,build_version,carrier,cpu,device_id,
            free_disk,ip,log_tm,log_type,login,memory,os_type,
            os_version,package_id,referer,signal,timezone,total_disk,url,
            url_key,webkit,model,page_url,value,interval_time,network,log_tm_dt as date
            from maxy2_error_crash_log
            where %s
            LIMIT 100 offset %d
        """
    query = query%(sWhere,offset)
    return query







def FavoritesList(sPackage,ServerType,sYearMonth1,swhere):
    index_name = f'maxy2_page_log-{sYearMonth1}'
    query = """
    {
        "size": 0,
        "aggs": {
                "url_sub_key": {
                    "terms": { "field": "url_sub_key.keyword", "size": 100 },
                    "aggs": {
                        "crash_count": {"sum": {"field": "crash_count"}},
                        "error_count": {"sum": {"field": "error_count"}},
                        "js_error_count": {"sum": {"field": "js_error_count"}},
                        "interval_tm": {"sum": {"field": "interval_tm"}},
                        "loading_tm": {"sum": {"field": "loading_tm"}},
                        "response_tm": {"sum": {"field": "response_tm"}},
                        "request_count": {"sum": {"field": "request_count"}},
                        "event_count": {"sum": {"field": "event_count"}},
                        "log_count": {"sum": {"field": "log_count"}},
                        "cpu_usage": {"sum": {"field": "sum_cpu_usage"}},
                        "mem_usage": {"sum": {"field": "sum_mem_usage"}}
                        }
            }
        }
        %s
    }
    """
    query = query%swhere
    return index_name,query

def LoadPopList(sPackage,ServerType,sDate,swhere):
    index_name = f'maxy2_log_resdn-{sPackage}-{ServerType}-{sDate}'
    query = """
    {
        "size": 2000,
        "_source" : ["value"],
        %s
    }
    """
    query = query%swhere
    return index_name,query

def GetPopPage_ParentTM(log_tm,page_url,device_id,page_type):
    """
    page_url을 사용하지 않음... 그냥 log_tm으로만 알아온다.
    
    if page_type == 4: #PV
    """
    query = """
    select parent_log_tm from maxy2_page_log where page_start_tm > %s and page_start_tm <= %s and device_id = '%s' limit 1
    """%(log_tm - 30000,log_tm,device_id)
    return query



def GetPopPage(parent_log_tm,device_id):
    query = """
    select * from maxy2_page_log where page_start_tm >= %s and parent_log_tm = %s and device_id = '%s' order by flow_order asc
    """%(parent_log_tm,parent_log_tm,device_id)
    return query


def GetUserAnalFlowClickhouse(package, server_type, os_type, search_type, search_value,
                              start_ts, end_ts, session_limit=10, offset=0):
    """
    Returns the ClickHouse query used by the 사용자 분석 화면 to fetch page flow information.
    The query fetches up to `session_limit` parent_log_tm buckets (latest first) and returns
    every row that belongs to those sessions ordered by flow_order.
    """
    def _escape(value: str) -> str:
        if value is None:
            return ''
        return value.replace("\\", "\\\\").replace("'", "\\'")

    if session_limit <= 0:
        session_limit = 1
    elif session_limit > 50:
        session_limit = 50

    # start_dt = datetime.fromtimestamp(start_ts / 1000)
    # end_dt = datetime.fromtimestamp(end_ts / 1000)
    start_dt = start_ts
    end_dt = end_ts
    if end_dt <= start_dt:
        # end_dt = start_dt + timedelta(hours=1)
        end_dt = start_dt + 1000*60*60

    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    search_column = 'device_id'
    if isinstance(search_type, str) and search_type.lower() in ('deviceid', 'device'):
        search_column = 'device_id'

    base_filters = f"""
            WHERE package_id = '{_escape(package)}'
              AND server_type = {int(server_type)}
              {os_filter}
              AND page_start_tm >= {start_ts}
              AND page_start_tm < {end_ts}
              AND {search_column} = '{_escape(search_value)}'
              AND parent_log_tm > 0
    """

    query = f"""
        WITH sessions AS (
            SELECT parent_log_tm
            FROM maxy2_page_log
            {base_filters}
            GROUP BY parent_log_tm
            ORDER BY parent_log_tm DESC
            LIMIT {int(session_limit)}
            OFFSET {max(int(offset),0)}
        )
        SELECT *
        FROM maxy2_page_log
        WHERE parent_log_tm IN (SELECT parent_log_tm FROM sessions)
          AND package_id = '{_escape(package)}'
          AND server_type = {int(server_type)}
          {os_filter}
          AND page_start_tm >= {start_ts}
          AND page_start_tm < {end_ts}
          AND {search_column} = '{_escape(search_value)}'
        ORDER BY parent_log_tm DESC, flow_order ASC
    """
    return query


def GetUserAnalUserListClickhouse(package, server_type, os_type, start_ts, end_ts, limit=50):
    """
    Returns a ClickHouse query that aggregates active users (device list) for the 사용자 분석 화면.
    """
    def _escape(value: str) -> str:
        if value is None:
            return ''
        return value.replace("\\", "\\\\").replace("'", "\\'")

    if limit <= 0:
        limit = 10
    elif limit > 200:
        limit = 200

    start_dt = datetime.fromtimestamp(start_ts / 1000)
    end_dt = datetime.fromtimestamp(end_ts / 1000)
    if end_dt <= start_dt:
        end_dt = start_dt + timedelta(hours=1)

    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    query = f"""
        SELECT
            device_id,
            anyLast(app_version) AS app_version,
            anyLast(os_version) AS os_version,
            anyLast(os_type) AS os_type,
            anyLast(model) AS model,
            max(page_start_tm_dt) AS last_seen,
            sum(interval_tm) AS total_interval_tm,
            sum(request_count) AS request_count,
            sum(error_count) AS error_count,
            sum(crash_count) AS crash_count,
            uniqExact(parent_log_tm) AS session_count
        FROM maxy2_page_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {int(server_type)}
          {os_filter}
          AND page_start_tm_dt >= toDateTime('{start_dt.strftime("%Y-%m-%d %H:%M:%S")}')
          AND page_start_tm_dt < toDateTime('{end_dt.strftime("%Y-%m-%d %H:%M:%S")}')
        GROUP BY device_id
        ORDER BY last_seen DESC
        LIMIT {int(limit)}
    """
    return query


def GetLogAnalMin(sPackage,ServerType,OsType,sdate,edate,QueryType):
    """
    로그분석에서 1분단위로 히스토그램을 작성한다.
    QueryType : PV,Error,Crash
    """
    sYearMonth = sdate.strftime("%Y-%m")
    if sdate.month == edate.month:
        index_name = f'maxy2_page_log-{sYearMonth}'
    else:
        index_name = f'maxy2_page_log-{sYearMonth}'
        Months = list_year_months(sdate,edate)
        if len(Months) > 1:
            for month in Months:
                index_name = f'{index_name},maxy2_page_log-{month}'
            
    
    query = """
    {
        "size":0,
        "aggs": {
        "docs_per_minute": {
            "date_histogram": {
                "field": "page_start_tm",       
                "fixed_interval": "1m",     
                "min_doc_count": 0          
            }
            %s
        }
        },
        "query": {"bool": {
            "filter":[
                {"range": {"page_start_tm":{"gte": "%d","lt": "%d"}}},
                {"term": {"package_id":"%s"}},
                {"term": {"server_type":"%s"}}
                %s
                ]}}
    }
    """
    sOSType = ''
    if OsType == 0:
        sOSType = ',{"term": {"os_type":"Android"}}'
    elif OsType == 1:
        sOSType = ',{"term": {"os_type":"iOS"}}'
        
    ErrorCount = ''
    if QueryType == 'Crash':
        ErrorCount = """
            ,
            "aggs": {
                "count_sum": {
                    "sum": {
                        "field": "crash_count"
                    }
                }
            }
        """
    elif QueryType == 'Error':
        ErrorCount = """
            ,
            "aggs": {
                "count_sum": {
                    "sum": {
                        "field": "error_count"
                    }
                }
            }
        """
    
    edate = edate + timedelta(days=1)
    query = query%(
        ErrorCount,
        int(sdate.timestamp()*1000),
        int(edate.timestamp()*1000),
        sPackage,ServerType,sOSType)
    return index_name,query

def GetLogAnalMinClickhouse(sPackage, ServerType, OsType, sdate, edate, QueryType):
    """
    ClickHouse version of GetLogAnalMin.
    Returns a query that buckets maxy2_page_log rows per minute between sdate and edate (inclusive).
    """
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    start_dt = sdate.replace(hour=0, minute=0, second=0, microsecond=0)
    end_dt = (edate.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1))
    start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')

    os_filter = ""
    if OsType == 0:
        os_filter = " AND os_type = 'Android'"
    elif OsType == 1:
        os_filter = " AND os_type = 'iOS'"
    elif OsType == 2:
        os_filter = " AND os_type = 'Web'"

    metric_expr = "count() AS metric_value"
    if QueryType == 'Crash':
        metric_expr = "sum(crash_count) AS metric_value"
    elif QueryType == 'Error':
        metric_expr = "sum(error_count) AS metric_value"

    query = f"""
        SELECT
            toStartOfMinute(page_start_tm_dt) AS bucket,
            {metric_expr}
        FROM maxy2_page_log
        WHERE package_id = '{_escape(sPackage)}'
          AND server_type = {ServerType}
          {os_filter}
          AND page_start_tm_dt >= toDateTime('{start_str}')
          AND page_start_tm_dt < toDateTime('{end_str}')
        GROUP BY bucket
        ORDER BY bucket
    """
    return query, start_dt, end_dt


def GetLogAnalMinListErrorClickhouse(sPackage, ServerType, OsType, sdate_ts, edate_ts, QueryType, limit=100, offset=0):
    """
    Returns the ClickHouse query for Error/Crash log lists.
    """
    start_ts = int(sdate_ts)
    end_ts = int(edate_ts + 60000)  # include the full last minute

    if QueryType == 'Crash':
        log_filter = "log_type = 2097152"
    else:
        log_filter = "log_type IN (4194306,262148,524292,1048579,131077,131076)"

    os_filter = ""
    if OsType == 0:
        os_filter = " AND os_type = 'Android'"
    elif OsType == 1:
        os_filter = " AND os_type = 'iOS'"
    elif OsType == 2:
        os_filter = " AND os_type = 'Web'"

    query = f"""
        SELECT
            device_id,
            log_tm AS log_tm_ms,
            log_type,
            url,
            value
        FROM maxy2_error_crash_log
        WHERE package_id = '{sPackage}'
          AND server_type = {ServerType}
          {os_filter}
          AND {log_filter}
          AND log_tm >= {start_ts}
          AND log_tm < {end_ts}
        ORDER BY log_tm DESC
        LIMIT {int(limit)}
        OFFSET {max(int(offset), 0)}
    """
    return query


def GetLogAnalMinListPVClickhouse(sPackage, ServerType, OsType, sdate_ts, edate_ts, limit=100, offset=0):
    """
    Returns the ClickHouse query for PV aggregation in the log analytics view.
    """
    # start_dt = datetime.fromtimestamp(sdate_ts / 1000)
    # end_dt = datetime.fromtimestamp((edate_ts + 60000) / 1000)
    # start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    # end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')
    start_str = sdate_ts
    end_str = edate_ts + 60000

    os_filter = ""
    if OsType == 0:
        os_filter = " AND os_type = 'Android'"
    elif OsType == 1:
        os_filter = " AND os_type = 'iOS'"
    elif OsType == 2:
        os_filter = " AND os_type = 'Web'"

    query = f"""
        SELECT
            url_sub_key AS key,
            count() AS doc_count,
            sum(response_tm) AS sum_response_tm,
            uniqExact(device_id) AS device_id_count,
            sum(request_count) AS sum_request_count,
            sum(loading_tm) AS sum_loading_tm,
            sum(interval_tm) AS sum_interval_tm
        FROM maxy2_page_log
        WHERE package_id = '{sPackage}'
          AND server_type = {ServerType}
          {os_filter}
--           #AND page_start_tm_dt >= toDateTime('{start_str}')
--           #AND page_start_tm_dt < toDateTime('{end_str}')
          AND page_start_tm >= {start_str}
          AND page_start_tm < {end_str}
        GROUP BY key
        ORDER BY doc_count DESC
        LIMIT {int(limit)}
        OFFSET {max(int(offset),0)}
        SETTINGS max_threads = 3
    """
    return query



def GetLogAnalMinList(sPackage,ServerType,OsType,sdate_ts,edate_ts,QueryType):
    """
    로그분석에서 1분단위로 히스토그램을 작성한다.
    QueryType : PV,Error,Crash
    """
    sdate = datetime.fromtimestamp(sdate_ts/1000)
    edate = datetime.fromtimestamp(edate_ts/1000)
    table_name = ''
    if QueryType == 'Error' or QueryType == 'Crash':
        table_name = "maxy2_error_crash"
        time_field = "log_tm"
        
        if QueryType == 'Crash':
            source = '["log_tm","device_id","log_type","value"]'
            crash = ',{"term": {"log_type":2097152}}'
        else:
            source = '["log_tm","device_id","log_type","url"]'
            crash = ',{"terms": {"log_type": [4194306,262148,524292,1048579,131077,131076]}}'
    
        
        orderby = '"sort": [{"%s": {"order": "desc"}}]'%time_field
        
        sYearMonth = sdate.strftime("%Y-%m")
        if sdate.month == edate.month:
            index_name = f'{table_name}-{sYearMonth}'
        else:
            index_name = f'{table_name}-{sYearMonth}'
            Months = list_year_months(sdate,edate)
            if len(Months) > 1:
                for month in Months:
                    index_name = f'{index_name},{table_name}-{month}'   
                
        query = """
        {
            "size":100,
            "_source": %s,
            "query": {"bool": {
                "filter":[
                    {"range": {"%s":{"gte": "%d","lt": "%d"}}},
                    {"term": {"package_id":"%s"}},
                    {"term": {"server_type":"%s"}}
                    %s
                    %s
                    ]}},
            %s
        }
        """
        sOSType = ''
        if OsType == 0:
            sOSType = ',{"term": {"os_type.keyword":"Android"}}'
        elif OsType == 1:
            sOSType = ',{"term": {"os_type.keyword":"iOS"}}'
        
        query = query%(
            source,
            time_field,
            sdate_ts,
            edate_ts + 1000*60, #분단위 이기 때문에 +1분 이전으로 검색을 한다.
            sPackage,ServerType,
            crash,
            sOSType,
            orderby)
    else:
        table_name = "maxy2_page_log"
        
        sYearMonth = sdate.strftime("%Y-%m")
        if sdate.month == edate.month:
            index_name = f'{table_name}-{sYearMonth}'
        else:
            index_name = f'{table_name}-{sYearMonth}'
            Months = list_year_months(sdate,edate)
            if len(Months) > 1:
                for month in Months:
                    index_name = f'{index_name},{table_name}-{month}'   
                
        query = """
        {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {"range": {"page_start_tm": {"gte": %d, "lt": %d}}},
                        {"term": {"package_id": "%s"}},
                        {"term": {"server_type": "%d"}}
                        %s
                    ]
                }
            },
            "aggs": {
                "group_by_user_sub_key": {
                    "terms": {
                        "field": "url_sub_key.keyword",
                        "size": 1000  
                    },
                    "aggs": {
                        "device_id_count": {
                            "cardinality": {
                                "field": "device_id_c" 
                            }
                        },
                        "sum_loading_tm": {
                            "sum": {
                                "field": "loading_tm"
                            }
                        },
                        "sum_response_tm": {
                            "sum": {
                                "field": "response_tm"
                            }
                        },
                        "sum_request_count": {
                            "sum": {
                                "field": "request_count"
                            }
                        },
                        "sum_interval_tm": {
                            "sum": {
                                "field": "interval_tm"
                            }
                        }
                    }
                }
            }
        }
        """
        sOSType = ''
        if OsType == 0:
            sOSType = ',{"term": {"os_type":"Android"}}'
        elif OsType == 1:
            sOSType = ',{"term": {"os_type":"iOS"}}'
        
        query = query%(
            sdate_ts,
            edate_ts + 1000*60, #분단위 이기 때문에 +1분 이전으로 검색을 한다.
            sPackage,ServerType,
            sOSType)
    return index_name,query



def GetLogAnalPopError(package,server_type,os_type,log_tm,device_id,Reverse=True):
    sDate = datetime.fromtimestamp(log_tm/1000)
    sDate = sDate.strftime('%Y-%m-%d')
    index_name = f'maxy2_log-{package}-{server_type}-{sDate}'
    query = """
    {
        "size":11,
        "_source": ["log_tm","log_type","model","os_type","memory","cpu","signal","os_version","app_version","url","value","carrier","network","interval_time","page_url"], 
        "sort": [
            {
            "log_tm": {"order": "%s"}
            }
        ],
        "query": {
                "bool": {
                    "filter": [
                        {"term": {"package_id": "%s"}},
                        {"term": {"server_type": %s}},
                        %s,
                        {"term": {"device_id": "%s"}}
                        %s
                        ]
                }
            }
        }
    """    
    if Reverse:
        sRange = '{"range": {"log_tm":{"lte": %s}}}'%log_tm
        sSort = "desc"
    else:
        sRange = '{"range": {"log_tm":{"gt": %s}}}'%log_tm
        sSort = "asc"
        
    sOSType = ''
    if os_type == 0:
        sOSType = ',{"term": {"os_type.keyword":"Android"}}'
    elif os_type == 1:
        sOSType = ',{"term": {"os_type.keyword":"iOS"}}'
            
    query = query%(sSort,package,server_type,sRange,device_id,sOSType)
    return index_name,query

def GetLogAnalPopErrorClickhouse(package,server_type,os_type,log_tm,device_id,Reverse=True):
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    target_ts = int(log_tm)
    range_ms = 20 * 60 * 1000  # 20 minutes
    sort_order = "DESC" if Reverse else "ASC"
    limit = 11 if Reverse else 10
    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    if Reverse:
        start_ts = max(target_ts - range_ms, 0)
        time_filter = f"AND log_tm > {start_ts} AND log_tm <= {target_ts}"
    else:
        end_ts = target_ts + range_ms
        time_filter = f"AND log_tm > {target_ts} AND log_tm < {end_ts}"

    query = f"""
        SELECT
            app_version,
            carrier,
            cpu,
            interval_time,
            log_tm,
            log_type,
            memory,
            model,
            network,
            os_type,
            os_version,
            signal,
            url,
            value,
            page_url
        FROM maxy2_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {server_type}
          {os_filter}
          AND device_id = '{_escape(device_id)}'
          {time_filter}
        ORDER BY log_tm {sort_order}
        LIMIT {int(limit)}
        SETTINGS max_threads = 4
    """
    return query
        

def GetRealTimeLogListClickhouse(package,
                                 server_type,
                                 session_os_type,
                                 start_ts,
                                 end_ts,
                                 log_types=None,
                                 search_field=None,
                                 search_value=None,
                                 os_version_filters=None,
                                 limit=200,
                                 offset=0):
    """
    Builds a ClickHouse query that mirrors the real-time log search used by the legacy Java admin.
    """

    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    def _normalize_os(value):
        if value in (None, '', 'all', 'All', -1):
            return None
        try:
            ival = int(value)
            if ival == 0:
                return 'Android'
            if ival == 1:
                return 'iOS'
        except (ValueError, TypeError):
            pass
        lowered = str(value).strip().lower()
        if lowered in ('android', 'ios', 'web', 'windows'):
            return lowered.capitalize()
        return None

    def _parse_log_types(values):
        result = []
        if values is None:
            return result
        if isinstance(values, str):
            values = values.split(',')
        for item in values:
            if item in (None, ''):
                continue
            try:
                result.append(int(item))
            except (ValueError, TypeError):
                continue
        return result

    def _prepare_like(value: str) -> str:
        return _escape(value or '')

    where = [
        f"package_id = '{_escape(package)}'",
        f"server_type = {int(server_type)}",
        f"log_tm >= {int(start_ts)}",
        f"log_tm <= {int(end_ts)}"
    ]

    base_os = _normalize_os(session_os_type)
    if base_os:
        where.append(f"os_type = '{base_os}'")

    parsed_types = _parse_log_types(log_types)
    if parsed_types:
        in_values = ",".join(str(v) for v in parsed_types)
        where.append(f"log_type IN ({in_values})")

    os_version_filters = os_version_filters or []
    if isinstance(os_version_filters, str):
        try:
            os_version_filters = json.loads(os_version_filters)
        except Exception:
            os_version_filters = []

    combos = {}
    if isinstance(os_version_filters, list):
        for item in os_version_filters:
            if not isinstance(item, dict):
                continue
            os_type_val = item.get('osType', item.get('os_type'))
            app_ver_val = item.get('appVer', item.get('app_version'))
            norm_os = _normalize_os(os_type_val)
            if not norm_os or not app_ver_val:
                continue
            combos.setdefault(norm_os, set()).add(_escape(str(app_ver_val)))
    if combos:
        clauses = []
        for os_name, versions in combos.items():
            version_list = ", ".join(f"'{ver}'" for ver in versions if ver)
            if version_list:
                clauses.append(f"(os_type = '{os_name}' AND app_version IN ({version_list}))")
        if clauses:
            where.append(f"({' OR '.join(clauses)})")

    column_map = {
        'deviceId': 'device_id',
        'device_id': 'device_id',
        'reqUrl': 'url',
        'req_url': 'url',
        'resMsg': 'value',
        'res_msg': 'value',
        'logType': 'log_type',
        'log_type': 'log_type',
        'osVer': 'os_version',
        'appVer': 'app_version',
        'model': 'model',
        'userId': 'user_id',
        'user_id': 'user_id'
    }

    if search_field and search_value:
        column = column_map.get(search_field)
        if column == 'log_type':
            try:
                where.append(f"log_type = {int(search_value)}")
            except (TypeError, ValueError):
                pass
        elif column in ('url', 'value', 'user_id'):
            like_value = _prepare_like(str(search_value))
            where.append(f"{column} ILIKE '%{like_value}%'")
        elif column:
            where.append(f"{column} = '{_escape(str(search_value))}'")

    limit = max(1, min(int(limit or 200), 1000))
    offset = max(0, int(offset or 0))
    where_clause = " AND ".join(where)

    query = f"""
        SELECT
            log_tm,
            device_id,
            log_type,
            interval_time,
            url,
            value,
            model,
            os_type,
            os_version,
            app_version,
            login,
            user_id,
            network,
            carrier,
            signal,
            cpu,
            memory,
            page_url
        FROM maxy2_log
        WHERE {where_clause}
        ORDER BY log_tm DESC
        LIMIT {limit}
        OFFSET {offset}
        SETTINGS max_threads = 3
    """
    return query

def GetLogAnalPVDetailList(package,server_type,os_type,url,sdate,edate):
    sDate = datetime.fromtimestamp(sdate/1000)
    eDate = datetime.fromtimestamp(edate/1000)
    Months = list_year_months(sDate,eDate)
    
    sYearMonth = sDate.strftime("%Y-%m")
    index_name = f'maxy2_page_log-{sYearMonth}'
    if len(Months) > 1:
        for month in Months:
            index_name = f'{index_name},maxy2_page_log-{month}'
    
    sOSType = ''
    if os_type == 0:
        sOSType = ',{"term": {"os_type.keyword":"Android"}}'
    elif os_type == 1:
        sOSType = ',{"term": {"os_type.keyword":"iOS"}}'
        
    query = """
    {
        "size":200,
        "_source": ["page_start_tm","device_id","interval_tm","loading_tm"], 
        "sort": [
            {
            "page_start_tm": {"order": "desc"}
            }
        ],
        "query": {
                "bool": {
                    "filter": [
                        {"term": {"package_id": "%s"}},
                        {"term": {"server_type": %s}},
                        {"term": {"url_sub_key.keyword": "%s"}},
                        {"range": {"page_start_tm":{"gte": "%d","lt": "%d"}}}
                        %s
                        ]
                }
            }
        }
    """
    query = query%(package,server_type,url,sdate,edate,sOSType)
    return index_name,query

def GetLogAnalPVDetailListClickhouse(package,server_type,os_type,url,start_ts,end_ts,limit=200,offset=0):
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    query = f"""
        SELECT
            page_start_tm,
            device_id,
            interval_tm,
            loading_tm
        FROM maxy2_page_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {server_type}
          {os_filter}
          AND url_sub_key = '{_escape(url)}'
          AND page_start_tm >= {int(start_ts)}
          AND page_start_tm < {int(end_ts)}
        ORDER BY page_start_tm DESC
        LIMIT {int(limit)}
        OFFSET {max(int(offset),0)}
    """
    return query
    
    
    
    
    
def GetPerAnalMinClickhouse(sPackage,ServerType,OsType,sdate,edate,QueryType):
    """
    ClickHouse version of GetPerAnalMin that buckets metrics per minute between sdate and edate.
    """
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    os_filter = ""
    if OsType == 0:
        os_filter = " AND os_type = 'Android'"
    elif OsType == 1:
        os_filter = " AND os_type = 'iOS'"
    elif OsType == 2:
        os_filter = " AND os_type = 'Web'"

    start_dt = sdate.replace(hour=0, minute=0, second=0, microsecond=0)
    end_dt = (edate.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1))
    start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')

    if QueryType == 'Loading':
        metric_fields = """
            min(loading_tm) AS loading_tm_min,
            avg(loading_tm) AS loading_tm_avg,
            max(loading_tm) AS loading_tm_max
        """
        value_filter = " AND loading_tm > 0"
        query = f"""
            SELECT
                toUnixTimestamp(toStartOfMinute(page_start_tm_dt)) * 1000 AS bucket_ms,
                {metric_fields}
            FROM maxy2_page_log
            WHERE package_id = '{_escape(sPackage)}'
              AND server_type = {ServerType}
              {os_filter}
              AND page_start_tm_dt >= toDateTime('{start_str}')
              AND page_start_tm_dt < toDateTime('{end_str}')
              {value_filter}
            GROUP BY bucket_ms
            ORDER BY bucket_ms
            SETTINGS max_threads = 3
        """
    elif QueryType == 'Response':
        start_ts = int(start_dt.timestamp() * 1000)
        end_ts = int(end_dt.timestamp() * 1000)
        query = f"""
            SELECT
                toUnixTimestamp(toStartOfMinute(toDateTime(log_tm / 1000))) * 1000 AS bucket_ms,
                min(interval_time) AS response_tm_min,
                sum(interval_time) AS response_tm_sum,
                max(interval_time) AS response_tm_max,
                count() AS request_count_sum
            FROM maxy2_log
            WHERE package_id = '{_escape(sPackage)}'
              AND server_type = {ServerType}
              {os_filter}
              AND log_tm >= {start_ts}
              AND log_tm < {end_ts}
              AND log_type IN (524290, 8388612)
              AND interval_time > 0
            GROUP BY bucket_ms
            ORDER BY bucket_ms
            SETTINGS max_threads = 3
        """
    else:
        raise ValueError(f'Unsupported QueryType: {QueryType}')

    return query


def GetPerAnalMinListLoadingClickhouse(package,server_type,os_type,sdate_ts,edate_ts,limit=200,after_key=None):
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    def _after_clause():
        if not after_key:
            return ""
        url_value = after_key.get('url_sub_key')
        model_value = after_key.get('model') or ''
        if url_value in (None, ''):
            return ""
        return f" HAVING (url_sub_key, model) > ('{_escape(url_value)}', '{_escape(model_value)}')"

    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    query = f"""
        SELECT
            url_sub_key,
            model,
            count() AS doc_count,
            min(loading_tm) AS loading_tm_min,
            avg(loading_tm) AS loading_tm_avg,
            max(loading_tm) AS loading_tm_max
        FROM maxy2_page_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {server_type}
          {os_filter}
          AND page_start_tm >= {int(sdate_ts)}
          AND page_start_tm < {int(edate_ts + 60000)}
          AND loading_tm > 0
        GROUP BY url_sub_key, model
        {_after_clause()}
        ORDER BY doc_count DESC, url_sub_key, model
        LIMIT {int(limit)}
    """
    return query


def GetPerAnalMinListResponseClickhouse(package,server_type,os_type,sdate_ts,edate_ts,limit=200,after_key=None):
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    def _after_clause():
        if not after_key:
            return ""
        url_value = after_key.get('url_key')
        model_value = after_key.get('model') or ''
        if url_value in (None, ''):
            return ""
        return f" HAVING (url_key, model) > ('{_escape(url_value)}', '{_escape(model_value)}')"

    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    query = f"""
        SELECT
            url_key,
            model,
            count() AS doc_count,
            min(interval_time) AS interval_time_min,
            avg(interval_time) AS interval_time_avg,
            max(interval_time) AS interval_time_max
        FROM maxy2_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {server_type}
          {os_filter}
          AND log_tm >= {int(sdate_ts)}
          AND log_tm < {int(edate_ts + 60000)}
          AND log_type IN (524290, 8388612)
          AND interval_time > 0
        GROUP BY url_key, model
        {_after_clause()}
        ORDER BY url_key, model
        LIMIT {int(limit)}
    """
    return query


def GetPerAnalModelTopLoadingClickhouse(package,server_type,os_type,start_dt,end_dt,limit=5):
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")
    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    start_str = start_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_str = end_dt.strftime('%Y-%m-%d %H:%M:%S')

    query = f"""
        SELECT
            model,
            count() AS doc_count,
            avg(loading_tm) AS avg_loading_tm
        FROM maxy2_page_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {server_type}
          {os_filter}
          AND page_start_tm_dt >= toDateTime('{start_str}')
          AND page_start_tm_dt < toDateTime('{end_str}')
          AND loading_tm > 0
        GROUP BY model
        ORDER BY avg_loading_tm DESC
        LIMIT {int(limit)}
    """
    return query


def GetPerAnalModelTopResponseClickhouse(package,server_type,os_type,start_dt,end_dt,limit=5):
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")
    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    start_ts = int(start_dt.timestamp()*1000)
    end_ts = int(end_dt.timestamp()*1000)

    query = f"""
        SELECT
            model,
            count() AS doc_count,
            avg(interval_time) AS avg_interval_time
        FROM maxy2_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {server_type}
          {os_filter}
          AND log_tm >= {start_ts}
          AND log_tm < {end_ts}
          AND log_type IN (524290, 8388612)
          AND interval_time > 0
        GROUP BY model
        ORDER BY avg_interval_time DESC
        LIMIT {int(limit)}
    """
    return query


def GetPerAnalMin(sPackage,ServerType,OsType,sdate,edate,QueryType):
    """
    로그분석에서 1분단위로 히스토그램을 작성한다.
    QueryType : PV,Error,Crash
    """
    sYearMonth = sdate.strftime("%Y-%m")
    if sdate.month == edate.month:
        index_name = f'maxy2_page_log-{sYearMonth}'
    else:
        index_name = f'maxy2_page_log-{sYearMonth}'
        Months = list_year_months(sdate,edate)
        if len(Months) > 1:
            for month in Months:
                index_name = f'{index_name},maxy2_page_log-{month}'
    
    query = """
    {
        "size":0,
        "aggs": {
        "docs_per_minute": {
            "date_histogram": {
                "field": "page_start_tm",       
                "fixed_interval": "1m",     
                "min_doc_count": 0          
            }
            %s
        }
        },
        "query": {"bool": {
            "filter":[
                {"range": {"page_start_tm":{"gte": "%d","lt": "%d"}}},
                {"term": {"package_id":"%s"}},
                {"term": {"server_type":"%s"}}
                %s
                %s
                ]}}
    }
    """
    sOSType = ''
    if OsType == 0:
        sOSType = ',{"term": {"os_type":"Android"}}'
    elif OsType == 1:
        sOSType = ',{"term": {"os_type":"iOS"}}'
        
    ErrorCount = ''
    if QueryType == 'Loading':
        ErrorCount = """
            ,
            "aggs": {
                        "loading_tm_mean": {
                            "avg": {
                                "field": "loading_tm"
                            }
                        },
                        "loading_tm_min": {
                            "min": {
                                "field": "loading_tm"
                            }
                        },
                        "loading_tm_max": {
                            "max": {
                                "field": "loading_tm"
                            }
                        }
                    }
        """
        AppendFilter = ',{"range": {"loading_tm":{"gt": 0}}}'
    elif QueryType == 'Response':
        ErrorCount = """
            ,
            "aggs": {
                "response_tm_sum": {
                    "sum": {
                        "field": "response_tm"
                    }
                },
                "response_tm_min": {
                    "min": {
                        "field": "response_tm"
                    }
                },
                "response_tm_max": {
                    "max": {
                        "field": "response_tm"
                    }
                },
                "request_count_sum": {
                    "sum": {
                        "field": "request_count"
                    }
                }
            }
        """
        AppendFilter = ',{"range": {"response_tm":{"gt": 0}}}'
    
    edate = edate + timedelta(days=1)
    query = query%(
        ErrorCount,
        int(sdate.timestamp()*1000),
        int(edate.timestamp()*1000),
        sPackage,ServerType,sOSType,AppendFilter)
    return index_name,query





def GetPerAnalMinList(sPackage,ServerType,OsType,sdate_ts,edate_ts,QueryType,after=''):
    """
    로그분석에서 1분단위로 히스토그램을 작성한다.
    QueryType : PV,Error,Crash
    """
    sdate = datetime.fromtimestamp(sdate_ts/1000)
    edate = datetime.fromtimestamp(edate_ts/1000)
    table_name = ''
    if QueryType == 'Loading':
        table_name = "maxy2_page_log"
        time_field = "page_start_tm"
        
        sYearMonth = sdate.strftime("%Y-%m")
        if sdate.month == edate.month:
            index_name = f'{table_name}-{sYearMonth}'
        else:
            index_name = f'{table_name}-{sYearMonth}'
            Months = list_year_months(sdate,edate)
            if len(Months) > 1:
                for month in Months:
                    index_name = f'{index_name},{table_name}-{month}'   
                
        query = """
        {
            "size":0,
            "aggs": {
            "datas": {
                    "composite": {
                        "size": 200,
                        "sources": [
                        {"url_sub_key": {"terms": {"field": "url_sub_key.keyword"}}},
                        {"model": {"terms": {"field": "model"}}}
                        ]
                    %s
                    },
                    "aggs": {
                        "loading_tm_min": {"min": {"field": "loading_tm"}},
                        "loading_tm_max": {"max": {"field": "loading_tm"}},
                        "loading_tm_avg": {"avg": {"field": "loading_tm"}}
                        }
                    
                }
            } ,
            
            "query": {"bool": {
                "filter":[
                    {"range": {"%s":{"gte": %d,"lt": %d}}},
                    {"term": {"package_id":"%s"}},
                    {"term": {"server_type":"%s"}}
                    %s
                    ]}}
        }
        """
        sOSType = ''
        if OsType == 0:
            sOSType = ',{"term": {"os_type":"Android"}}'
        elif OsType == 1:
            sOSType = ',{"term": {"os_type":"iOS"}}'
        
        query = query%(
            after,
            time_field,
            sdate_ts,
            edate_ts + 1000*60, #분단위 이기 때문에 +1분 이전으로 검색을 한다.
            sPackage,
            ServerType,
            sOSType)
    elif QueryType == 'Response':
        table_name = "maxy2_log"
        time_field = "log_tm"
        
        sDay = sdate.strftime("%Y-%m-%d")
        if sdate.month == edate.month and sdate.day == edate.day:
            index_name = f'{table_name}-{sPackage}-{ServerType}-{sDay}'
        else:
            index_name = f'{table_name}-{sPackage}-{ServerType}-{sDay}'
            Days = list_year_month_days(sdate,edate)
            if len(Days) > 1:
                for d in Days:
                    index_name = f'{index_name},{table_name}-{sPackage}-{ServerType}-{d}'   
                
        query = """
        {
            "size":0,
            "aggs": {
            "datas": {
                    "composite": {
                        "size": 200,
                        "sources": [
                        {"url_key": {"terms": {"field": "url_key.keyword"}}},
                        {"model": {"terms": {"field": "model"}}}
                        ]
                    %s
                    },
                    "aggs": {
                        "interval_time_min": {"min": {"field": "interval_time"}},
                        "interval_time_max": {"max": {"field": "interval_time"}},
                        "interval_time_avg": {"avg": {"field": "interval_time"}}
                        }
                    
                }
            } ,
            "query": {"bool": {
                "filter":[
                    {"range": {"%s":{"gte": %d,"lt": %d}}},
                    {"terms": {"log_type":[524290, 8388612]}},
                    {"term": {"package_id":"%s"}},
                    {"term": {"server_type":"%s"}}
                    %s
                    ]}}
        }
        """
        sOSType = ''
        if OsType == 0:
            sOSType = ',{"term": {"os_type":"Android"}}'
        elif OsType == 1:
            sOSType = ',{"term": {"os_type":"iOS"}}'
        
        query = query%(
            after,
            time_field,
            sdate_ts,
            edate_ts + 1000*60, #분단위 이기 때문에 +1분 이전으로 검색을 한다.
            sPackage,
            ServerType,
            sOSType)
   
    return index_name,query




def GetPerAnalLoadingList(package,server_type,os_type,sdate_ts,edate_ts,url_sub_key,model):
    
    sdate = datetime.fromtimestamp(sdate_ts/1000)
    edate = datetime.fromtimestamp(edate_ts/1000)
    
    sYearMonth = sdate.strftime("%Y-%m")
    if sdate.month == edate.month:
        index_name = f'maxy2_page_log-{sYearMonth}'
    else:
        index_name = f'maxy2_page_log-{sYearMonth}'
        Months = list_year_months(sdate,edate)
        if len(Months) > 1:
            for month in Months:
                index_name = f'{index_name},maxy2_page_log-{month}'

    #0:server_type,1:package_id,2:log_type,3:log_tm,4:interval_time,5:signal,6:model,
    #7:network,8:cpu,9:os_type,10:carrier,11:timezone,12:url_sub_key,13:device_id,14:appver,15:osver,16:시분
    query = """
    {
        "size":10000,
        "_source": ["server_type","package_id","log_type","page_start_tm","loading_tm",\
            "signal","model","avg_com_sens","avg_cpu_usage","os_type",\
                "carrier","timezone","url_sub_key","device_id","app_version",\
                    "os_version","url","wtf_flag"], 
        "query": {
                "bool": {
                    "filter": [
                        {"range": {"page_start_tm":{"gte": %d,"lt": %d}}},
                        {"term": {"package_id": "%s"}},
                        {"term": {"server_type": %s}},
                        {"term": {"model": "%s"}},
                        {"term": {"url_sub_key.keyword": "%s"}}
                        %s
                        ]
                }
            }
        }
    """    
    os_type = ''
    if os_type == 0:
        os_type = ',{"term": {"os_type":"Android"}}'
    elif os_type == 1:
        os_type = ',{"term": {"os_type":"iOS"}}'  
    query = query%(
            sdate_ts,
            edate_ts + 1000*60, #분단위 이기 때문에 +1분 이전으로 검색을 한다.
            package,
            server_type,
            model,
            url_sub_key,
            os_type)
    
    return index_name,query


def GetPerAnalLoadingListClickhouse(package,server_type,os_type,sdate_ts,edate_ts,url_sub_key,model,limit=100,offset=0):
    def _escape(value: str) -> str:
        return value.replace("\\", "\\\\").replace("'", "\\'")

    limit = max(int(limit), 1)
    offset = max(int(offset), 0)

    os_filter = ""
    if os_type == 0:
        os_filter = " AND os_type = 'Android'"
    elif os_type == 1:
        os_filter = " AND os_type = 'iOS'"
    elif os_type == 2:
        os_filter = " AND os_type = 'Web'"

    query = f"""
        SELECT
            server_type,
            package_id,
            log_type,
            page_start_tm,
            loading_tm,
            interval_tm,
            signal,
            model,
            avg_com_sens,
            avg_cpu_usage,
            os_type,
            carrier,
            timezone,
            url_sub_key,
            device_id,
            app_version,
            os_version,
            url,
            wtf_flag
        FROM maxy2_page_log
        WHERE package_id = '{_escape(package)}'
          AND server_type = {server_type}
          {os_filter}
          AND model = '{_escape(model)}'
          AND url_sub_key = '{_escape(url_sub_key)}'
          AND page_start_tm >= {int(sdate_ts)}
          AND page_start_tm < {int(edate_ts + 60000)}
        ORDER BY page_start_tm DESC
        LIMIT {limit} OFFSET {offset}
    """
    return query
