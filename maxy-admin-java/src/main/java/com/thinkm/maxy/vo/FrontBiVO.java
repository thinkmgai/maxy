package com.thinkm.maxy.vo;

import com.thinkm.maxy.dto.front.bi.BiRequestDto;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FrontBiVO {
    private String baseDate;
    private String packageNm;
    private String serverType;

    private String countNew;
    private String countMau;
    private String countDau;
    private String countCcu;
    private String countPv;
    private String countError;
    private String countRevisit;

    private String avgUseTime;
    private String avgLcp;
    private String avgInp;
    private String avgCls;
    private String avgFcp;
    private String avgTtfb;

    private String from;
    private String to;

    public FrontBiVO(BiRequestDto dto, String[] baseDate) {
        this.packageNm = dto.getPackageNm();
        this.serverType = dto.getServerType();
        this.from = baseDate[0];
        this.to = baseDate[1];
    }
}
