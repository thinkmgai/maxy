package com.thinkm.maxy.vo;

import com.thinkm.common.util.DateUtil;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@RequiredArgsConstructor
@AllArgsConstructor
public class FrontUrl {
    private String packageNm;
    private String serverType;
    private String reqUrl;
    private Type type;
    private String updDt;
    private Long userNo;
    private Long updNo;
    private Boolean mark;

    public FrontUrl(String packageNm, String serverType, Type type, Long userNo) {
        this.packageNm = packageNm;
        this.serverType = serverType;
        this.type = type;
        this.userNo = userNo;
    }

    public FrontUrl(String packageNm, String serverType, Type type, Long userNo, String reqUrl, Boolean mark) {
        this.packageNm = packageNm;
        this.serverType = serverType;
        this.type = type;
        this.userNo = userNo;
        this.reqUrl = reqUrl;
        this.mark = mark;
        this.updDt = DateUtil.format();
    }

    @Getter
    public enum Type {
        PAGE,
        API,
        ERROR
    }
}
