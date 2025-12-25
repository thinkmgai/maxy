package com.thinkm.common.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RequestType {

    TOTAL("total"),
    NETWORK("network"),
    ERROR("error"),
    CRASH("crash"),
    PAGE("page"),
    BI_INFO("basicConfig"),
    NONE("none"),
    BI_USAGE_INFO("basicConfig"),
    RESOURCE_USAGE("usage"),
    LOGMETER("logmeter"),
    FAVORITES("favorites"),
    DEVICE_DISTRIBUTION("deviceAnalysis"),
    PAGE_VIEW("pageView"),
    PV_EQUALIZER("pvEqualizer"),
    BUSINESS_INFO("gauge"),
    LOADING_TIME("loadingTime"),
    RESPONSE_TIME("responseTime"),
    LOADING_TIME_SCATTER("loadingTimeScatter"),
    RESPONSE_TIME_SCATTER("responseTimeScatter"),
    ACCESSIBILITY("accessInfo");

    private final String type;
}