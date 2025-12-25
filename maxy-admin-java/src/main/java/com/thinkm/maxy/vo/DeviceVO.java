package com.thinkm.maxy.vo;

import com.fasterxml.jackson.core.type.TypeReference;
import com.thinkm.common.util.JsonUtil;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.apache.commons.text.StringEscapeUtils;

import java.util.List;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceVO extends PageVO {

    private String deviceId;
    private String modelNo;
    private String osVer;
    private String phoneNo;
    private String wifiMacAddr;
    private String btMacAddr;
    private String activeSt;
    private String deviceSt;
    private String deleteYn;
    private String pushToken;
    private String updatedDate;
    private String reinstalledDate;
    private String deletedDate;
    private String createdDate;
    private String pushedDate;
    private String sleepDate;
    private String userId;
    private Long targetId;
    private String userNm;
    private String emailAddr;
    private Long logLevelId;
    private String mFromDt;
    private String mToDt;
    private String loggingInterval;
    private String loggingBundleUnits;
    private String useYn;
    private String vipYn;
    private int targetIndex;
    private int offsetIndex;
    private Integer limit;
    private Integer offset;
    private String bundleId;
    private String pushType;
    private String vipRegDt;
    private String vipRemoveDt;
    private String sex;
    private String birthDay;
    private String makeType;
    private String cntryCd;
    private String residence;
    private Long cnt;
    private String downloadType;
    private String dataType;

    private Long createdCnt;
    private Long reinstalledCnt;
    private Long deletedCnt;

    private Long vipCntY;
    private Long vipCntN;
    private Long activeCntY;
    private Long activeCntN;
    private Long targetCntY;
    private Long targetCntN;

    private String targetSt;

    private String seq;
    private String pageSeq;
    private String reqUrl;
    private String appPageNm;

    /**
     * 검색
     */
    private String searchOsType;
    private String searchTextType;
    private String searchValue;
    private String searchPackageNm;
    private String searchServerType;
    private String searchFromDt;
    private String searchToDt;
    private String searchMakeType;
    private String searchTargetSt;

    // bulk reg
    private String deviceListStr;
    private List<String> deviceIdList;
    private List<DeviceVO> deviceList;

    // bulk del
    private List<Integer> targetIdList;

    // retention into
    private String accessDate;
    private String accessDateY;
    private int retentionDay;
    private String searchFromDay;
    private String searchToDay;
    private String searchYear;
    private String searchMonth;
    private String searchDate;
    private String searchDateY;
    private String webPerfCheckYn;

    private Long regNo;
    private String clientNm;

    /**
     * JSON String 으로 만들어진 List VO를 현재 VO 객체의 deviceList 에 변환하여 넣음
     */
    public void makeVOList() {
        this.deviceList = JsonUtil.readValue(
                StringEscapeUtils.unescapeHtml3(deviceListStr),
                new TypeReference<>() {
                });
    }
}
