"""
Loading Time 증분 조회/로그 스크립트.

- ClickHouse 쿼리 템플릿 `loadingtime.selectLoadingTimeIncremental`를 사용해 reg_dt 기준으로 증분 조회한다.
- 새로 들어온 행만 로깅(SendPageLoading)하고, 최근 5분 데이터만 메모리에 유지한다.
- SendPageLoading 시 Valkey에 기록한다.
"""

from __future__ import annotations

import gc
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Optional

import redis
import pandas as pd

from clickhouse import SQL
from ClickHouseComm.client import get_client
from settings import SETTINGS

g_loading_df: Optional[pd.DataFrame] = None
g_last_cursor: Optional[datetime] = None

MAX_SAMPLES = 2000  # SendPageLoading 샘플링 상한
MAX_WINDOW_SECOND = 300 #5분 기간동안.

SAMPLE_PER_SECOND = int(MAX_SAMPLES/MAX_WINDOW_SECOND + 0.5) #초당 받아들일 수 있는 수.
_valkey_client: Optional[redis.Redis] = None
_click_client = None


def _get_click_client():
    """Lazy singleton ClickHouse client pulled from SETTINGS."""
    global _click_client
    if _click_client is None:
        _click_client = get_client(SETTINGS.clickhouse)
    return _click_client


def _determine_start(now: datetime) -> datetime:
    """마지막 커서가 없으면 5분 전부터 시작."""
    if g_last_cursor:
        return g_last_cursor
    return now - timedelta(minutes=5)


def _get_valkey():
    global _valkey_client
    if _valkey_client is None:
        _valkey_client = redis.Redis(
            host=SETTINGS.valkey_host,
            port=SETTINGS.valkey_port,
            password=SETTINGS.valkey_password or None,
            db=SETTINGS.valkey_db,
            ssl=SETTINGS.valkey_ssl,
            decode_responses=True,
        )
    return _valkey_client


def _fetch_incremental(client, start: datetime) -> pd.DataFrame:
    """selectLoadingTimeIncremental 템플릿을 사용해 증분 조회."""
    params = {"start_iso": start.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]}
    sql = SQL.render("loadingtime.selectLoadingTimeIncremental", params)
    logging.info("[loadingtime] query start=%s sql=%s", params["start_iso"], sql)
    result = client.query(sql)
    df = pd.DataFrame(result.result_rows, columns=result.column_names)
    if not df.empty:
        # reg_dt를 UTC로 변환 후 tz 정보 제거해 커서/필터에 사용
        df["reg_dt"] = pd.to_datetime(df["reg_dt"], utc=True).dt.tz_convert(None)
    return df


def _prefer_new(df: pd.DataFrame, col: str) -> pd.Series:
    new_col = f"{col}_new"
    old_col = f"{col}_old"
    new_series = df[new_col]
    return new_series.where(new_series.notna(), df[old_col])


def SendPageLoading(df: pd.DataFrame, all_mode: bool, elapsed_sec: float) -> None:
    """
    신규 로딩타임 데이터를 로그로 남김 (웹소켓 대체).
    - all_mode=True: 1.5초 기준으로 분리해 1.5초 미만은 샘플링, 이상은 모두 보존.
    - package_nm, server_type 단위로 그룹핑해 각각 샘플링 처리.
    """
    if df.empty:
        return

    client = _get_valkey()

    for (pkg, srv), grp in df.groupby(["package_nm", "server_type"], dropna=False):
        srv = int(srv)
        if all_mode:
            high = grp[grp["loading_time"] >= 1500]
            lowmid = grp[grp["loading_time"] < 1500]
            lowmid_sampled = lowmid if len(lowmid) <= MAX_SAMPLES else lowmid.sample(n=MAX_SAMPLES, random_state=0)
            merged = pd.concat([lowmid_sampled, high], ignore_index=True)
            logging.info(
                "[loadingtime] All pkg=%s srv=%s total=%d elapsed=%.2fs",
                pkg,
                srv,
                len(merged),
                elapsed_sec
            )
        else:
            # elapsed_sec을 이용해 초당 비율로 샘플 수 결정 (최소 1)
            sample_count = max(1, min(len(grp), int(MAX_SAMPLES * max(elapsed_sec, 1.0) / 300.0)))
            high = grp[grp["loading_time"] >= 1500]
            lowmid = grp[grp["loading_time"] < 1500]
            #샘플링은 하지 말고 최근시간을 잘라오는 게 더 좋다.
            lowmid_sampled = lowmid if len(lowmid) <= sample_count else lowmid.iloc[-sample_count:]
            merged = pd.concat([lowmid_sampled, high], ignore_index=True)
            logging.info(
                "[loadingtime] Delta pkg=%s srv=%s total=%d elapsed=%.2fs",
                pkg,
                srv,
                len(merged),
                elapsed_sec
            )
        # Valkey 저장 (prefix:loadingtime:{pkg}:{srv}:{ts})
        try:
            # 오래된 키 정리
            prefix = f"{SETTINGS.valkey_prefix}:loadingtime:{pkg}:{srv}:"
            cutoff_ms = int((time.time() - MAX_WINDOW_SECOND) * 1000)
            try:
                existing_keys = client.keys(f"{prefix}*")
                for k in existing_keys:
                    try:
                        ts_part = str(k).split(":")[-1]
                        ts_val = int(ts_part)
                        if ts_val < cutoff_ms:
                            client.delete(k)
                            logging.info("[loadingtime] delete keys %s", datetime.fromtimestamp(int(ts_val) / 1000))
                    except Exception:
                        continue
            except Exception:
                logging.exception("[loadingtime] failed to prune old keys pkg=%s srv=%s", pkg, srv)

            key_ts = int(time.time() * 1000)
            redis_key = f"{SETTINGS.valkey_prefix}:loadingtime:{pkg}:{srv}:{key_ts}"
            merged_safe = merged.copy()
            for col in merged_safe.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
                merged_safe[col] = merged_safe[col].dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            payload = merged_safe.to_dict(orient="records")
            client.set(redis_key, json.dumps(payload, ensure_ascii=False))
            logging.info(f"[loadingtime] valkey write {redis_key}")
        except Exception as e:
            logging.exception("[loadingtime] valkey write failed pkg=%s srv=%s %s", pkg, srv,str(e))
    

def S_D_LoadingTime() -> None:
    """증분 로딩타임 조회/전송."""
    global g_loading_df, g_last_cursor
    df_result = None
    try:
        client = _get_click_client()
        now = datetime.utcnow()
        start = _determine_start(now)
        df_new = _fetch_incremental(client, start)

        if df_new.empty:
            logging.info("[loadingtime] no new rows since %s", start)
            return

        # 커서 갱신 및 경과 시간 계산
        prev_cursor = g_last_cursor or start
        g_last_cursor = df_new["reg_dt"].max()
        elapsed_sec = (g_last_cursor - prev_cursor).total_seconds() if g_last_cursor and prev_cursor else 0.0

        if g_loading_df is None:
            g_loading_df = df_new
            SendPageLoading(df_new, True, elapsed_sec)
        else:
            cols = list(df_new.columns)
            merged = g_loading_df.merge(
                df_new,
                on=["reg_dt", "page_start_tm", "device_id", "page_id"],
                how="outer",
                indicator=True,
                suffixes=("_old", "_new"),
            )

            # 신규 건만 전송
            new_df = merged[merged["_merge"] == "right_only"]
            if not new_df.empty:
                new_df = (new_df.assign(
                        package_nm=_prefer_new(new_df, "package_nm"),
                        server_type=_prefer_new(new_df, "server_type"),
                        os_type=_prefer_new(new_df, "os_type"),
                        device_model=_prefer_new(new_df, "device_model"),
                        req_url=_prefer_new(new_df, "req_url"),
                        com_type=_prefer_new(new_df, "com_type"),
                        user_id=_prefer_new(new_df, "user_id"),
                        avg_com_sensitivity=_prefer_new(new_df, "avg_com_sensitivity"),
                        avg_cpu_usage=_prefer_new(new_df, "avg_cpu_usage"),
                        sim_operator_nm=_prefer_new(new_df, "sim_operator_nm"),
                        app_ver=_prefer_new(new_df, "app_ver"),
                        page_end_tm=_prefer_new(new_df, "page_end_tm"),
                        intervaltime=_prefer_new(new_df, "intervaltime"),
                        loading_time=_prefer_new(new_df, "loading_time"),
                        response_time=_prefer_new(new_df, "response_time"),
                        log_type=_prefer_new(new_df, "log_type"),
                        wtf_flag=_prefer_new(new_df, "wtf_flag"),
                    )[cols]
                )
                
                
                logging.info(new_df.columns)
                SendPageLoading(new_df, False, elapsed_sec)

            # old/new 병합하여 최신 상태 유지
            df_result = (
                merged.assign(
                    package_nm=_prefer_new(merged, "package_nm"),
                    server_type=_prefer_new(merged, "server_type"),
                    os_type=_prefer_new(merged, "os_type"),
                    device_model=_prefer_new(merged, "device_model"),
                    req_url=_prefer_new(merged, "req_url"),
                    com_type=_prefer_new(merged, "com_type"),
                    user_id=_prefer_new(merged, "user_id"),
                    avg_com_sensitivity=_prefer_new(merged, "avg_com_sensitivity"),
                    avg_cpu_usage=_prefer_new(merged, "avg_cpu_usage"),
                    sim_operator_nm=_prefer_new(merged, "sim_operator_nm"),
                    app_ver=_prefer_new(merged, "app_ver"),
                    page_end_tm=_prefer_new(merged, "page_end_tm"),
                    intervaltime=_prefer_new(merged, "intervaltime"),
                    loading_time=_prefer_new(merged, "loading_time"),
                    response_time=_prefer_new(merged, "response_time"),
                    log_type=_prefer_new(merged, "log_type"),
                    wtf_flag=_prefer_new(merged, "wtf_flag"),
                )[cols]
            )

            # 최근 5분만 유지
            cutoff = (pd.Timestamp.utcnow() - pd.Timedelta(minutes=5)).tz_localize(None)
            df_result = df_result.loc[df_result["reg_dt"] >= cutoff].reset_index(drop=True)
            g_loading_df = df_result
            logging.info("[loadingtime] retained rows=%d after merge/filter", len(g_loading_df))

        client.close()
    except Exception as e:
        logging.exception(f"[loadingtime] failed {e}")
    finally:
        if df_result is not None:
            del df_result
        gc.collect()


def run() -> None:
    S_D_LoadingTime()


__all__ = ["run", "S_D_LoadingTime"]
