from clickhouse_driver import Client
import logging
import pandas as pd
import time
logger = logging.getLogger('maxy')
g_debug_query_mode = False

def _log_clickhouse_query(action: str, query: str, duration_ms: float, rows=None, error: Exception = None):
    info = f"{action} duration_ms={duration_ms:.1f}"
    if rows is not None:
        info += f" rows={rows}"
    if error is not None:
        info += f" error={error}"
        logger.error(f"[CLICKHOUSE] {info}\nQUERY: {query}")
    else:
        logger.info(f"[CLICKHOUSE] {info}\nQUERY: {query}")

def open_clickhouse(url, user, password, database='default'):
    client = Client(host=url['host'], port=url['port'], user=user, password=password, database=database)
    return client


def search_clickhouse(client, query):
    global g_debug_query_mode
    start_ts = time.perf_counter()
    try:
        rows,cols = client.execute(query, with_column_types=True)
        cols = [col for col,_ in cols]
        duration = (time.perf_counter() - start_ts) * 1000
        if g_debug_query_mode:
            _log_clickhouse_query('search_clickhouse', query, duration, rows=len(rows))
        return 200,rows,cols
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_clickhouse_query('search_clickhouse', query, duration, error=e)
        return 500,str(e),None

def search_clickhouse_pandas(client, query):
    global g_debug_query_mode
    start_ts = time.perf_counter()
    try:
        rows,cols = client.execute(query, with_column_types=True)
        cols = [col for col,_ in cols]
        total_df = pd.DataFrame(rows,columns=cols)
        duration = (time.perf_counter() - start_ts) * 1000
        if g_debug_query_mode:
            _log_clickhouse_query('search_clickhouse_pandas', query, duration, rows=len(total_df))
        return 200,total_df
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_clickhouse_query('search_clickhouse_pandas', query, duration, error=e)
        return 500,str(e)
    
def close_clickhouse(client):
    client.disconnect() 
