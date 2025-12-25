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
public class FrontFeeldexVO {
    private String packageNm;
    private String serverType;
    private Integer lcp;
    private Integer inp;
    private Integer cls;
    private Integer fcp;
    private Integer ttfb;
    private Long userNo;
    private String updDt;

    public FrontFeeldexVO(String packageNm, String serverType,
                          int lcp, int inp, int cls,
                          Long userNo) {
        this.packageNm = packageNm;
        this.serverType = serverType;
        this.lcp = lcp;
        this.inp = inp;
        this.cls = cls;
        this.userNo = userNo;
        this.updDt = DateUtil.format();
    }

    public FrontFeeldexVO(String packageNm, String serverType) {
        this.packageNm = packageNm;
        this.serverType = serverType;
    }
}
