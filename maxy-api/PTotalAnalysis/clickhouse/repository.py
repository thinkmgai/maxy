from typing import List
from datetime import date, datetime
import logging
import inspect

from ClickHouseComm import get_client
from . import SQL
from .dto import (
    TotalQuery,
    TotalRow,
    InstallSeriesQuery,
    InstallSeriesRow,
    MetricSeriesQuery,
    MetricSeriesRow,
    MauMonthlyQuery,
    MauMonthlyRow,
)

_THIS_FILE = __file__


def _caller_name() -> str:
    """Return first caller outside this repository file for logging context."""
    for frame in inspect.stack()[2:]:
        if frame.filename != _THIS_FILE:
            return frame.function
    return "unknown"


def _log_query(tag: str, desc: str, sql: str, params: dict, context: str | None = None) -> None:
    ctx = context or _caller_name()
    logging.info(
        "[clickhouse][%s] desc=%s caller=%s sql=%s params=%s",
        tag,
        desc,
        ctx,
        sql,
        params,
    )


def fetch_total(query: TotalQuery, context: str | None = None) -> List[TotalRow]:
    params = query.model_dump()
    sql = SQL.render("total.selectSummary", params)
    _log_query(
        "fetch_total",
        "BI overview summary (total_overview table)",
        sql,
        params,
        context=context,
    )
    client = get_client()
    result = client.query(sql, params)
    return [TotalRow.model_validate(dict(zip(result.column_names, row))) for row in result.result_rows]


def fetch_install_series(query: InstallSeriesQuery, context: str | None = None) -> List[InstallSeriesRow]:
    params = query.model_dump()
    sql = SQL.render("total.selectInstallSeries", params)
    _log_query(
        "fetch_install_series",
        "BI Install daily series (maxy_device_statistic)",
        sql,
        params,
        context=context,
    )
    client = get_client()
    result = client.query(sql, params)
    rows: List[InstallSeriesRow] = []
    for row in result.result_rows:
        data = dict(zip(result.column_names, row))
        dt = data.get("date")
        if isinstance(dt, datetime):
            data["date"] = dt.date().isoformat()
        elif isinstance(dt, date):
            data["date"] = dt.isoformat()
        rows.append(InstallSeriesRow.model_validate(data))
    return rows


def fetch_metric_series(query: MetricSeriesQuery, context: str | None = None) -> List[MetricSeriesRow]:
    params = query.model_dump()
    sql = SQL.render("total.selectMetricSeries", params)
    _log_query(
        "fetch_metric_series",
        "BI metric daily series (install/login/dau/revisit/mau/pv/stay/log/error/crash from maxy_device_statistic)",
        sql,
        params,
        context=context,
    )
    client = get_client()
    result = client.query(sql, params)
    rows: List[MetricSeriesRow] = []
    for row in result.result_rows:
        data = dict(zip(result.column_names, row))
        dt = data.get("date")
        if isinstance(dt, datetime):
            data["date"] = dt.date().isoformat()
        elif isinstance(dt, date):
            data["date"] = dt.isoformat()
        rows.append(MetricSeriesRow.model_validate(data))
    return rows


def fetch_mau_monthly_series(query: MauMonthlyQuery, context: str | None = None) -> List[MauMonthlyRow]:
    params = query.model_dump()
    sql = SQL.render("total.selectMauMonthlySeries", params)
    _log_query(
        "fetch_mau_monthly_series",
        "BI MAU monthly max per month (maxy_device_statistic)",
        sql,
        params,
        context=context,
    )
    client = get_client()
    result = client.query(sql, params)
    rows: List[MauMonthlyRow] = []
    for row in result.result_rows:
        data = dict(zip(result.column_names, row))
        dt = data.get("date")
        if isinstance(dt, datetime):
            data["date"] = dt.date().isoformat()
        elif isinstance(dt, date):
            data["date"] = dt.isoformat()
        rows.append(MauMonthlyRow.model_validate(data))
    return rows
