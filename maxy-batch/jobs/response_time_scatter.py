"""
Response Time 증분 조회/로그 스크립트.

- ClickHouse 쿼리 템플릿 `responsetime.selectResponseTimeIncremental`를 사용해 reg_dt 기준으로 증분 조회한다.
- 새로 들어온 행만 로깅하고, 최근 5분 데이터만 메모리에 유지한다.
- Valkey 키: `{prefix}:responsetime:{package_nm}:{server_type}:{ts}`
"""

from __future__ import annotations

import gc
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import redis

from clickhouse import SQL
from ClickHouseComm.client import get_client
from settings import SETTINGS

g_response_df: Optional[pd.DataFrame] = None
g_last_cursor: Optional[datetime] = None

MAX_SAMPLES = 2000  # Valkey 저장 시 샘플링 상한
MAX_WINDOW_SECOND = 300  # 5분
SAMPLE_PER_SECOND = int(MAX_SAMPLES / MAX_WINDOW_SECOND + 0.5)

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
    """selectResponseTimeIncremental 템플릿을 사용해 증분 조회."""
    params = {"start_iso": start.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]}
    sql = SQL.render("responsetime.selectResponseTimeIncremental", params)
    logging.info("[responsetime] query start=%s sql=%s", params["start_iso"], sql)
    result = client.query(sql)
    df = pd.DataFrame(result.result_rows, columns=result.column_names)
    if not df.empty:
        df["reg_dt"] = pd.to_datetime(df["reg_dt"], utc=True).dt.tz_convert(None)
    return df


def _collapse_columns(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """suffix가 붙은 old/new 컬럼을 원래 이름으로 합친 DataFrame을 반환한다."""
    data = {}
    for col in cols:
        new_col = f"{col}_new"
        old_col = f"{col}_old"
        if col in df.columns:
            data[col] = df[col]
        elif new_col in df.columns and old_col in df.columns:
            # `Series.combine_first` can emit a pandas FutureWarning when one side is all-NA/object.
            new_series = df[new_col]
            data[col] = new_series.where(new_series.notna(), df[old_col])
        elif new_col in df.columns:
            data[col] = df[new_col]
        elif old_col in df.columns:
            data[col] = df[old_col]
    return pd.DataFrame(data)


def SendResponseTime(df: pd.DataFrame, all_mode: bool, elapsed_sec: float) -> None:
    """
    신규 ResponseTime 데이터를 Valkey에 기록.
    - all_mode=True: 1.5초 기준으로 분리해 1.5초 미만은 샘플링, 이상은 모두 보존.
    - package_nm, server_type 단위로 그룹핑해 각각 샘플링 처리.
    """
    if df.empty:
        return

    client = _get_valkey()

    for (pkg, srv), grp in df.groupby(["package_nm", "server_type"], dropna=False):
        srv = int(srv)
        if pkg is None or str(pkg) == "" or pd.isna(pkg):
            logging.warning("[responsetime] skip row with empty package_nm srv=%s", srv)
            continue
        if srv is None or str(srv) == "" or pd.isna(srv):
            logging.warning("[responsetime] skip row with empty server_type pkg=%s", pkg)
            continue

        srv_str = str(int(srv)) if str(srv).isdigit() else str(srv)
        if all_mode:
            high = grp[grp["intervaltime"] >= 1500]
            lowmid = grp[grp["intervaltime"] < 1500]
            lowmid_sampled = lowmid if len(lowmid) <= MAX_SAMPLES else lowmid.sample(n=MAX_SAMPLES, random_state=0)
            merged = pd.concat([lowmid_sampled, high], ignore_index=True)
            logging.info(
                "[responsetime] All pkg=%s srv=%s total=%d elapsed=%.2fs",
                pkg,
                srv_str,
                len(merged),
                elapsed_sec,
            )
        else:
            sample_count = max(1, min(len(grp), int(MAX_SAMPLES * max(elapsed_sec, 1.0) / MAX_WINDOW_SECOND)))
            high = grp[grp["intervaltime"] >= 1500]
            lowmid = grp[grp["intervaltime"] < 1500]
            # lowmid_sampled = lowmid if len(lowmid) <= sample_count else lowmid.iloc[-sample_count:]
            lowmid_len = len(lowmid)
            if lowmid_len <= sample_count:
                lowmid_sampled = lowmid
            else:
                if lowmid_len/100 >= sample_count:  #STGO 8000개 이상일때는 5분 지난것이 들어온다. (최신것만 가져오면 스케터가 빨래판으로 보인다.)
                    # -lowmid_len/100 최신 지점에서 샘플링을 한다.
                    lowmid_sampled = lowmid.iloc[int(-lowmid_len/100):].sample(n=sample_count, random_state=0,replace=False)
                else:
                    lowmid_sampled = lowmid.iloc[-sample_count:]
            merged = pd.concat([lowmid_sampled, high], ignore_index=True)
            logging.info(
                "[responsetime] Delta pkg=%s srv=%s total=%d elapsed=%.2fs",
                pkg,
                srv_str,
                len(merged),
                elapsed_sec,
            )

        try:
            prefix = f"{SETTINGS.valkey_prefix}:responsetime:{pkg}:{srv_str}:"
            cutoff_ms = int((time.time() - MAX_WINDOW_SECOND) * 1000)
            try:
                existing_keys = client.keys(f"{prefix}*")
                for k in existing_keys:
                    try:
                        ts_part = str(k).split(":")[-1]
                        ts_val = int(ts_part)
                        if ts_val < cutoff_ms:
                            client.delete(k)
                            logging.info("[responsetime] delete keys %s", datetime.fromtimestamp(int(ts_val) / 1000))
                    except Exception:
                        continue
            except Exception:
                logging.exception("[responsetime] failed to prune old keys pkg=%s srv=%s", pkg, srv_str)

            key_ts = int(time.time() * 1000)
            redis_key = f"{SETTINGS.valkey_prefix}:responsetime:{pkg}:{srv_str}:{key_ts}"
            merged_safe = merged.copy()
            for col in merged_safe.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]).columns:
                merged_safe[col] = merged_safe[col].dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            payload = merged_safe.to_dict(orient="records")
            client.set(redis_key, json.dumps(payload, ensure_ascii=False))
            logging.info(f"[responsetime] valkey write {redis_key}")
        except Exception as e:
            logging.exception("[responsetime] valkey write failed pkg=%s srv=%s %s", pkg, srv_str, str(e))


def S_D_ResponseTime() -> None:
    """증분 ResponseTime 조회/전송."""
    global g_response_df, g_last_cursor
    df_result = None
    try:
        client = _get_click_client()
        now = datetime.utcnow()
        start = _determine_start(now)
        df_new = _fetch_incremental(client, start)

        if df_new.empty:
            logging.info("[responsetime] no new rows since %s", start)
            return

        prev_cursor = g_last_cursor or start
        g_last_cursor = df_new["reg_dt"].max()
        elapsed_sec = (g_last_cursor - prev_cursor).total_seconds() if g_last_cursor and prev_cursor else 0.0

        if g_response_df is None:
            g_response_df = df_new
            SendResponseTime(df_new, True, elapsed_sec)
        else:
            cols = list(df_new.columns)
            merged = g_response_df.merge(
                df_new,
                on=["reg_dt", "log_tm", "device_id"],
                how="outer",
                indicator=True,
                suffixes=("_old", "_new"),
            )

            new_df = merged[merged["_merge"] == "right_only"]
            if not new_df.empty:
                new_df = _collapse_columns(new_df, cols)
                SendResponseTime(new_df, False, elapsed_sec)

            df_result = _collapse_columns(merged, cols)
            cutoff = (pd.Timestamp.utcnow() - pd.Timedelta(minutes=5)).tz_localize(None)
            df_result = df_result.loc[df_result["reg_dt"] >= cutoff].reset_index(drop=True)
            g_response_df = df_result
            logging.info("[responsetime] retained rows=%d after merge/filter", len(g_response_df))

        client.close()
    except Exception as e:
        logging.exception(f"[responsetime] failed {e}")
    finally:
        if df_result is not None:
            del df_result
        gc.collect()


def run() -> None:
    S_D_ResponseTime()


__all__ = ["run", "S_D_ResponseTime"]
