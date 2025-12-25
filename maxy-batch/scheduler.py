"""
APScheduler-based runner to trigger batch jobs on intervals and daily at 1 AM.

Schedule:
- Every 5 seconds (logmeter + LoadingTime scatter cache)
- Every 30 seconds
- Every 1 minute
- Every day at 01:00
"""

from __future__ import annotations
import logging
import logging.handlers
import os
import sys
from datetime import datetime

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from settings import SETTINGS
from jobs.basic_information_device import run as basic_information_device_run
from jobs.basic_information_page import run as basic_information_page_run
from jobs.daily_device_page_summary import run as daily_device_page_summary_run
from jobs.batch_logmeter import run as batch_logmeter_run
from jobs.logmeter_stackmax import run as logmeter_stackmax_run
from jobs.loading_time_scatter import run as loading_time_scatter_run
from jobs.response_time_scatter import run as response_time_scatter_run
from jobs.favorites_info_list import run as favorites_info_list_run
from jobs.page_view import run as page_view_run
from jobs.resource_usage import run as resource_usage_run
from jobs.device_distribution import run as device_distribution_run

# Placeholder job implementations; replace with real batch tasks.


def configure_logging(index: str = "scheduler") -> None:
    """Set up console + daily rotating file handlers (no duplicate handlers)."""
    if logging.getLogger().handlers:
        return

    os.makedirs("log", exist_ok=True)
    file_handler = logging.handlers.TimedRotatingFileHandler(
        filename=os.path.join("log", f"batch_{index}.txt"),
        when="midnight",
        interval=1,
        encoding="utf-8",
    )
    file_handler.suffix = "log_%Y-%m-%d"
    stream_handler = logging.StreamHandler(sys.stdout)
    file_handler.setLevel(logging.ERROR)
    stream_handler.setLevel(logging.INFO)
    logging.basicConfig(
        format="P]%(asctime)s:%(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %p %I:%M:%S",
        handlers=[file_handler, stream_handler],
        level=logging.INFO,
    )
    



def run_bi_30s() -> None:
    basic_information_page_run()
    basic_information_device_run()
    favorites_info_list_run()


def resource_usage() -> None:
    resource_usage_run()


def device_distribution() -> None:
    """Refresh Device Distribution widget cache (Valkey)."""
    device_distribution_run()


def run_batch_logmeter_5s() -> None:
    batch_logmeter_run()
    loading_time_scatter_run()
    response_time_scatter_run()
    page_view_run()
    resource_usage()
    device_distribution()


def run_every_minute() -> None:
    logging.info("[1m] Tick at %s", datetime.utcnow().isoformat())


def run_daily_12am() -> None:
    daily_device_page_summary_run()
    logmeter_stackmax_run()


def main() -> None:
    configure_logging(SETTINGS.batch_log_index)

    scheduler = BlockingScheduler(
        timezone="UTC",
        executors={"default": ThreadPoolExecutor(max_workers=3)},
        job_defaults={"coalesce": True, "max_instances": 1},
    )

    
    scheduler.add_job(
        run_bi_30s,
        "interval",
        seconds=30,
        id="bi_every_30_seconds",
        replace_existing=True,
    )

    scheduler.add_job(
        run_batch_logmeter_5s,
        "interval",
        seconds=5,
        id="batch_logmeter_every_5_seconds",
        replace_existing=True,
    )

    scheduler.add_job(
        run_every_minute,
        "interval",
        minutes=1,
        id="every_minute",
        replace_existing=True,
    )

    scheduler.add_job(
        run_daily_12am,
        CronTrigger(hour=0, minute=0, second=1),
        id="daily_12am",
        replace_existing=True,
    )

    logging.info("Starting scheduler with jobs: %s", [job.id for job in scheduler.get_jobs()])

    # 초기 1회 실행 (시작 시점에 최신 캐시/집계 보장)
    try:
        run_bi_30s()
        run_every_minute()
        run_batch_logmeter_5s()
        run_daily_12am()
    except Exception:
        logging.exception("Initial run failed")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logging.info("Scheduler stopped.")


if __name__ == "__main__":
    main()
