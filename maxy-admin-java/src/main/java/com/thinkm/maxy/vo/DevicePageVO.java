package com.thinkm.maxy.vo;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class DevicePageVO extends AppInfoVO {

    private String deviceId;
    private String reqUrl;
    private Long seq;
    private String pageUrl;
    private String appPageNm;
    private Long regNo;
    private Long updNo;

    /**
     * 검색
     */
    private String searchPageText;
    private String searchTextType;
    private String searchPopupTextType;

    // bulk del
    private List<Integer> seqList;

    private List<String> reqUrlList;

    /**
     * 저장 파라메터
     */
    private String appPageUrls;
}
