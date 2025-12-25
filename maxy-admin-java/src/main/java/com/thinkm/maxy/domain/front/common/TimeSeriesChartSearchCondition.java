package com.thinkm.maxy.domain.front.common;

public record TimeSeriesChartSearchCondition(

        AppInfoSearchCondition appInfo,
        RangeSearchCondition range,
        AreaSearchCondition area,
        TypeAndValueSearchCondition typeAndValue
) {

}
