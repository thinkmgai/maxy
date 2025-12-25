package com.thinkm.maxy.domain.front.network;

import com.thinkm.maxy.domain.front.common.*;

public record NetworkListSearchCondition(
        AppInfoSearchCondition appInfo,
        RangeSearchCondition range,
        YRangeSearchCondition yRange,
        AreaSearchCondition area,
        TypeAndValueSearchCondition typeAndValue) {
}
