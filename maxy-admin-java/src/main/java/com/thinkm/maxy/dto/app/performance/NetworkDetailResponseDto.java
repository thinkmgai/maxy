package com.thinkm.maxy.dto.app.performance;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class NetworkDetailResponseDto {
    private String docId;
    private Long logTm;
    private Integer intervaltime;
    private Integer logType;
    private String deviceId;
    private String osType;
    private String osVer;
    private String appVer;
    private String deviceModel;
    private String comType;
    private String comSensitivity;
    private String timezone;
    private String reqUrl;
    private String pageUrl;
    private String resMsg;
    private String statusCode;
    private String statusCodeGroup;
    private Integer responseSize;
    private Integer requestSize;
    private Double waitTime;
    private Double downloadTime;
    private String userId;
    private String reqMsg;
    private String clientNm;
    private String clientNo;
    private String birthDay;
    private String simOperatorNm;

    private String webviewVer;
    private String appBuildNum;
    private Integer storageUsage;
    private Integer storageTotal;
    private String batteryLvl;
    private Double cpuUsage;
    private Integer memUsage;

    private String jtxid;
    private String jdomain;
    private String jtime;
    private String jinstance;

    public static NetworkDetailResponseDto from(Map<String, Object> response, boolean userIdMasking) {
        return NetworkDetailResponseDto.builder()
                .docId((String) response.get(Elastic._ID))
                .deviceId((String) response.get(Elastic.deviceId))
                .osVer((String) response.get(Elastic.osVer))
                .appVer((String) response.get(Elastic.appVer))
                .osType((String) response.get(Elastic.osType))
                .comSensitivity((String) response.get(Elastic.comSensitivity))
                .logTm((Long) response.get(Elastic.logTm))
                .reqUrl((String) response.get(Elastic.reqUrl))
                .statusCode((String) response.get(Elastic.statusCode))
                .pageUrl((String) response.get(Elastic.pageUrl))
                .comType((String) response.get(Elastic.comType))
                .deviceModel((String) response.get(Elastic.deviceModel))
                .responseSize((Integer) response.get(Elastic.responseSize))
                .userId(CommonUtil.maskUserId((String) response.get(Elastic.userId), userIdMasking, 2))
                .statusCodeGroup((String) response.get(Elastic.statusCodeGroup))
                .timezone((String) response.get(Elastic.timezone))
                .resMsg((String) response.get(Elastic.resMsg))
                .logType((Integer) response.get(Elastic.logType))
                .intervaltime((Integer) response.get(Elastic.intervaltime))
                .requestSize((Integer) response.get(Elastic.requestSize))
                .waitTime((Double) response.get(Elastic.waitTime))
                .downloadTime((Double) response.get(Elastic.downloadTime))
                .reqMsg((String) response.get(Elastic.reqMsg))
                .clientNm((String) response.get(Elastic.clientNm))
                .clientNo((String) response.get(Elastic.clientNo))
                .birthDay((String) response.get(Elastic.birthDay))
                .simOperatorNm((String) response.get(Elastic.simOperatorNm))

                .webviewVer((String) response.get(Elastic.webviewVer))
                .appBuildNum((String) response.get(Elastic.appBuildNum))
                .storageUsage((Integer) response.get(Elastic.storageUsage))
                .storageTotal((Integer) response.get(Elastic.storageTotal))
                .batteryLvl((String) response.get(Elastic.batteryLvl))
                .cpuUsage((Double) response.get(Elastic.cpuUsage))
                .memUsage((Integer) response.get(Elastic.memUsage))

                .jtxid((String) response.get(Elastic.jtxid))
                .jtime((String) response.get(Elastic.jtime))
                .jdomain((String) response.get(Elastic.jdomain))
                .jinstance((String) response.get(Elastic.jinstance))
                .build();
    }
}
