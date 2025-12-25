package com.thinkm.maxy.vo;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@ToString
public class PageSummaryVO extends AppInfoVO implements Serializable {

    private int flowOrder;
    private String reqUrl;
    private String parentUrl;
    private String childUrl;
    private Long reqCount;
    private Long errorCount;
    private Long crashCount;
    private Long sumIntervaltime;
    private Long minIntervaltime;
    private Long maxIntervaltime;
    private Long sumLoadingTime;
    private Long sumResponseTime;
    private float avgLoadingTime;
    private float avgResponseTime;
    private String pageStartTm;
    private String pageEndTm;

    private Long nodeEndErrorCount;
    private Long nodeEndCrashCount;
    private Long nodeEndReqCount;
    private Long nodeEndSumIntervaltime;
    private Long nodeEndMinIntervaltime;
    private Long nodeEndMaxIntervaltime;
    private float avgCpuUsage;
    private float avgMemUsage;

    private String searchToDt;
    private String searchFromDt;
    private String vipYn;
    private String deviceId;
    private String userId;
    private String searchKey;
    private String searchValue;
    private String page_count;

    private String fromDt;
    private String toDt;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public Map<String, Object> of() {
        Map<String, Object> result = new HashMap<>();

        result.put("avgCpuUsage", this.avgCpuUsage);
        result.put("avgLoadingTime", this.avgLoadingTime);
        result.put("avgMemUsage", this.avgMemUsage);
        result.put("avgResponseTime", this.avgResponseTime);

        result.put("childUrl", this.childUrl);
        result.put("crashCount", this.crashCount);
        result.put("errorCount", this.errorCount);
        result.put("flowOrder", this.flowOrder);

        result.put("maxIntervaltime", this.maxIntervaltime);
        result.put("minIntervaltime", this.minIntervaltime);
        result.put("sumIntervaltime", this.sumIntervaltime);

        result.put("nodeEndCrashCount", this.nodeEndCrashCount);
        result.put("nodeEndErrorCount", this.nodeEndErrorCount);
        result.put("nodeEndMaxIntervaltime", this.nodeEndMaxIntervaltime);
        result.put("nodeEndMinIntervaltime", this.nodeEndMinIntervaltime);
        result.put("nodeEndReqCount", this.nodeEndReqCount);
        result.put("nodeEndSumIntervaltime", this.nodeEndSumIntervaltime);

        result.put("reqCount", this.reqCount);
        result.put("reqUrl", this.reqUrl);

        return result;
    }
}
