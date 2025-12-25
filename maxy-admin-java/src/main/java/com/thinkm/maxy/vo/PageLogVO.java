package com.thinkm.maxy.vo;

import com.thinkm.common.code.RequestType;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.util.Map;

@Getter
@Setter
@ToString
public class PageLogVO extends AppInfoVO implements Serializable {

    private String deviceId;
    private String deviceModel;
    private String reqUrl;
    private String appPageNm;
    private Long pageStartTm;
    private Long pageEndTm;
    private String logDate;
    private Long intervaltime;
    private Long responseTime;
    private Long loadingTime;
    private Long endItemCnt;
    private String startPageYn;
    private String parentLogDate;
    private String parentEndLogDate;
    private String vipYn;

    private String pageInterval;
    private String eventCnt;
    private String eventInterval;
    private String minMemUsage;
    private String maxMemUsage;
    private String minCpuUsage;
    private String maxCpuUsage;
    private String minComSensitivity;
    private String maxComSensitivity;
    private String minBatteryLvl;
    private String maxBatteryLvl;
    private String minStorageUsage;
    private String maxStorageUsage;

    private Long pageCount;
    private Long errorCount;
    private Long crashCount;
    private Long crashNum;
    private Long errorNum;

    private String searchValue;
    private String searchType;
    private Map<String, String> searchValues;
    private String searchVipType;
    private String searchOsType;
    private String searchToDttm;
    private String searchFromDttm;
    private String searchToDt;
    private String searchFromDt;
    private String aliasValue;
    private String userCnt;
    private String osVer;

    private Long from;
    private Long to;

    private String logType;
    private String size;
    private String lastLogTm;
    private String lastDeviceId;
    private String lastDeviceModel;
    private String lastMedian;
    private Integer offsetIndex;
    private Integer targetIndex;
    private String searchKey;
    private Integer flowOrder;
    private String mxPageId;

    private String type;

    private Long logTm;

    private Boolean existParam;

    private Map<String, Long> avgMap;

    private String afterKey;
    private RequestType requestType;
    private String docId;
}
