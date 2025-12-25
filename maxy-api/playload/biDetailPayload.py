import random
import datetime
import models.biDetailModels as biDetailModels


def buildBIDetailResponse() -> biDetailModels.BIDetailResponse:
    """Generate mock BI detail data with daily Android/iOS series."""
    result = {
        "code": 200,
        "dailyAndroid": [
            {"date": "2025-01-01", "value": random.randint(500, 5000)},
            {"date": "2025-01-02", "value": random.randint(500, 5000)},
            {"date": "2025-01-03", "value": random.randint(500, 5000)},
            {"date": "2025-01-04", "value": random.randint(500, 5000)},
            {"date": "2025-01-05", "value": random.randint(500, 5000)},
            {"date": "2025-01-06", "value": random.randint(500, 5000)},
            {"date": "2025-01-07", "value": random.randint(500, 5000)},
        ],
        "dailyIOS": [
            {"date": "2025-01-01", "value": random.randint(400, 4000)},
            {"date": "2025-01-02", "value": random.randint(400, 4000)},
            {"date": "2025-01-03", "value": random.randint(400, 4000)},
            {"date": "2025-01-04", "value": random.randint(400, 4000)},
            {"date": "2025-01-05", "value": random.randint(400, 4000)},
            {"date": "2025-01-06", "value": random.randint(400, 4000)},
            {"date": "2025-01-07", "value": random.randint(400, 4000)},
        ],
    }
    return biDetailModels.BIDetailResponse(**result)


def buildBIDetailMAUResponse() -> biDetailModels.BIDetailResponse:
    """Generate mock MAU data (monthly buckets) for Android/iOS."""
    result = {
        "code": 200,
        "dailyAndroid": [
            {"date": "2025-01", "value": random.randint(1000, 10000)},
            {"date": "2025-02", "value": random.randint(1000, 10000)},
            {"date": "2025-03", "value": random.randint(1000, 10000)},
            {"date": "2025-04", "value": random.randint(1000, 10000)},
            {"date": "2025-05", "value": random.randint(1000, 10000)},
            {"date": "2025-06", "value": random.randint(1000, 10000)},
            {"date": "2025-07", "value": random.randint(1000, 10000)},
        ],
        "dailyIOS": [
            {"date": "2025-01", "value": random.randint(800, 9000)},
            {"date": "2025-02", "value": random.randint(800, 9000)},
            {"date": "2025-03", "value": random.randint(800, 9000)},
            {"date": "2025-04", "value": random.randint(800, 9000)},
            {"date": "2025-05", "value": random.randint(800, 9000)},
            {"date": "2025-06", "value": random.randint(800, 9000)},
            {"date": "2025-07", "value": random.randint(800, 9000)},
        ],
    }
    return biDetailModels.BIDetailResponse(**result)




def buildBIDetailCCUResponse(startDate: str) -> biDetailModels.BIDetailResponse:
    """Generate mock CCU detail data (Android/iOS minute series).

    If the requested start date is today, generate data from 00:00 up to the current
    time (minute precision). Otherwise, return a full-day series ending at 23:29.
    """
    result = {
        "code": 200,
        "dailyAndroid": [],
        "dailyIOS": [],
    }

    now = datetime.datetime.now()
    today = now.date()

    target_date = today
    is_today = True
    special_today_aliases = {"2025-10-10"}

    if startDate:
        try:
            parsed_date = datetime.datetime.strptime(startDate, "%Y-%m-%d").date()
            if parsed_date == today or startDate in special_today_aliases:
                target_date = today
                is_today = True
            else:
                target_date = parsed_date
                is_today = False
        except ValueError:
            # 포맷이 맞지 않으면 오늘 날짜 기준으로 처리
            target_date = today
            is_today = True

    start_of_day = datetime.datetime.combine(target_date, datetime.time.min)
    if is_today:
        end_point = now.replace(second=0, microsecond=0)
    else:
        end_point = datetime.datetime.combine(target_date, datetime.time(hour=23, minute=29))

    total_minutes = int(max(0, (end_point - start_of_day).total_seconds() // 60))

    for offset in range(total_minutes + 1):
        timestamp = start_of_day + datetime.timedelta(minutes=offset)
        time_str = timestamp.strftime("%H:%M")

        result["dailyAndroid"].append(
            {
                "hour": time_str,
                "value": random.randint(500, 5000),
            }
        )
        result["dailyIOS"].append(
            {
                "hour": time_str,
                "value": random.randint(500, 5000),
            }
        )

    return biDetailModels.BIDetailResponse(**result)

    
    
def buildBIDetailCrashResponse() -> biDetailModels.BIDetailResponse:
    """Generate mock crash detail data (Android/iOS daily series)."""
    return buildBIDetailResponse()


def buildBIDetailErrorResponse() -> biDetailModels.BIDetailResponse:
    """Generate mock error detail data (Android/iOS daily series)."""
    return buildBIDetailResponse()


def buildBIDetailErrorTop10Response(os_type: str | None = None) -> biDetailModels.BIDetailTop10Response:
    """Generate mock Top10 error causes for Android and iOS."""

    def random_error(osType: str):
        return [
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] Thread starting during runtime shutdown",
                "Message": "Thread starting during runtime shutdown 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] Network Authentication Required",
                "Message": "Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.NullPointerException",
                "Message": "NullPointerException Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.ArrayIndexOutOfBoundsException",
                "Message": "ArrayIndexOutOfBoundsException Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.ArithmeticException",
                "Message": "ArithmeticException Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.ClassCastException",
                "Message": "ClassCastException Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.ClassNotFoundException",
                "Message": "ClassNotFoundException Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.InstantiationException",
                "Message": "InstantiationException Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.OutOfMemoryError",
                "Message": "OutOfMemoryError Network Authentication Required 더많은 데이터",
            },
            {
                "Count": random.randint(100, 10000),
                "Error Type": f"[{osType}] class java.lang.StackOverflowError",
                "Message": "StackOverflowError Network Authentication Required 더많은 데이터",
            },
        ]

    result = {
        "code": 200,
        "androidTop10": random_error("Android"),
        "iosTop10": random_error("iOS"),
    }

    if os_type:
        normalised = os_type.strip().lower()
        if normalised == "android":
            result["iosTop10"] = []
        elif normalised == "ios":
            result["androidTop10"] = []

    return biDetailModels.BIDetailTop10Response(**result)

def buildBIDetailTop10Response(os_type: str | None = None) -> biDetailModels.BIDetailTop10Response:
    """Generate mock Top10 crash causes for Android and iOS.

    Args:
        os_type: Optional platform filter. When provided, the opposite platform list is cleared.
    """
    def random_top10(osType: str):
        return [
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]Crash",
                "Caused By": "Thread starting during runtime shutdown",
                "Message": "Thread starting during runtime shutdown 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.InternalError",
                "Caused By": "Network Authentication Required",
                "Message": "InternalError Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.NullPointerException",
                "Caused By": "Network Authentication Required",
                "Message": "NullPointerException Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.ArrayIndexOutOfBoundsException",
                "Caused By": "Network Authentication Required",
                "Message": "ArrayIndexOutOfBoundsException Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.ArithmeticException",
                "Caused By": "Network Authentication Required",
                "Message": "ArithmeticException Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.ClassCastException",
                "Caused By": "Network Authentication Required",
                "Message": "ClassCastException Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.ClassNotFoundException",
                "Caused By": "Network Authentication Required",
                "Message": "ClassNotFoundException Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.InstantiationException",
                "Caused By": "Network Authentication Required",
                "Message": "InstantiationException Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.OutOfMemoryError",
                "Caused By": "Network Authentication Required",
                "Message": "OutOfMemoryError Network Authentication Required 더많은 데이터"
            },
            {
                "Count": random.randint(100, 10000),
                "Cause Name": f"[{osType}]class java.lang.StackOverflowError",
                "Caused By": "Network Authentication Required",
                "Message": "StackOverflowError Network Authentication Required 더많은 데이터"
            }
        ]

    result = {
        "code": 200,
        "androidTop10": random_top10("Android"),
        "iosTop10": random_top10("iOS"),
    }

    if os_type:
        normalised = os_type.strip().lower()
        if normalised == "android":
            result["iosTop10"] = []
        elif normalised == "ios":
            result["androidTop10"] = []

    return biDetailModels.BIDetailTop10Response(**result)
