package com.thinkm.maxy.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class PackageVO extends AppInfoVO {

    private String displayNm;
    private String monitoringYn;
    private String useYn;
    private int level;

    private String googleServiceAccount;
    private String googleReportNum;
    private String googleCredentialsPath;
    private String itunesEmailId;
    private String itunesPassword;
    private String itunesAppleId;
    private String fcmServerKey;
    private String apnsCertificatePath;
    private String apnsPassword;
    private String apnsPrivateKey;
    private String apnsIssuer;
    private String apnsKeyId;
    private String packageYn;
    private String zipYn;
    private String fullMsgYn;
    private String fullReqMsgYn;
    private String infoYn;
    private String integrationYn;
    @JsonProperty("sReplayYn")
    private String sReplayYn;
    private int logBundleUnit;
    private int logPeriod;
    private int pageLogPeriod;
    private int sessionLogPeriod;
    private Long seq;
    private int order;
    // legacy 샘플링 정보
    private int loggingRate;

    // 모바일 샘플링 값
    private int loggingRateMobile;
    // PC 샘플링 값
    private int loggingRatePc;
    // 모바일 리플레이 샘플링 값
    private int sessionRateMobile;
    // PC 리플레이 샘플링 값
    private int sessionRatePc;
    // 세션 리플레이 기준 대상 값 (R: rate 기반, W: whitelist 기반)
    private String sessionBasedCriteria;
    private String userNoList;

    private int userCount;

    //search
    private String searchTp;
    private String searchServerTp;
    private String searchValue;
    private String searchPackageNm;

    private String type;

    //update
    private String updPackageNm;
    private String updDisplayNm;
    private String updServerType;
    private int updLoggingRate;

    //insert
    private String packageName;

    // code List
    private String[] userNoArray;

    // feeldex 설정
    private Integer lcp;
    private Integer inp;
    private Integer cls;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static List<SimplePackage> toSimplePackageList(List<PackageVO> list) {
        List<SimplePackage> result = new ArrayList<>();
        for (PackageVO info : list) {
            result.add(SimplePackage.builder()
                    .packageNm(info.getPackageNm())
                    .serverType(info.getServerType())
                    .order(info.getOrder())
                    .userCount(info.getUserCount())
                    .build());
        }
        return result;
    }

    @Getter
    @Builder
    public static class SimplePackage {
        private String packageNm;
        private String serverType;
        private int order;
        private int userCount;
    }
}
