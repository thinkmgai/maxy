package com.thinkm.maxy.domain.front.page;

import com.thinkm.maxy.domain.front.common.*;

public record PageListSearchCondition(
        AppInfoSearchCondition appInfo,
        RangeSearchCondition range,
        YRangeSearchCondition yRange,
        AreaSearchCondition area,
        TypeAndValueSearchCondition typeAndValue) {
}
