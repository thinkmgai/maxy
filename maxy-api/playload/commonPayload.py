from pydantic import BaseModel
from typing import Any
from models.commonModels import BIInfomationsResponse

import random
def buildBIInfomationsResponse():
    biInfomations = [
        {
            "ID": 0,
            "Name": "설치",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 1,
            "Name": "안드로이드",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 2,
            "Name": "ios",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 3,
            "Name": "mau",
            "Today":    random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 4,
            "Name": "ccu",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 5,
            "Name": "pv",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 6,
            "Name": "재방문",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 7,
            "Name": "휴면",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 8,
            "Name": "로그인",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 9,
            "Name": "체류",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 10,
            "Name": "로그",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 11,
            "Name": "에러",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 12,
            "Name": "크래시",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        },
        {
            "ID": 13,
            "Name": "dau",
            "Today": random.randint(1000, 10000),
            "Yesterday": random.randint(1000, 10000)
        }
    ]
    return BIInfomationsResponse(code=200, biInfomations=biInfomations, message="Success")
