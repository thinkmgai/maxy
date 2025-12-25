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
public class AlarmVO extends AppInfoVO {

    // maxy_alim_board
    private Long seq;
    private String alimDt;
    private String alimCd;
    private String contents;
    private AlimSt alimSt;

    // maxy_alim_standard
    private String errorUseYn;
    private String errorDuplYn;
    private String errorAlimStd;
    private String crashUseYn;
    private String crashDuplYn;
    private String crashAlimStd;
    private String cpuUseYn;
    private String cpuDuplYn;
    private String cpuAlimStd;
    private String pageloadingUseYn;
    private String pageloadingDuplYn;
    private String pageloadingAlimStd;
    private String responseUseYn;
    private String responseDuplYn;
    private String responseAlimStd;

    private String memUseYn;
    private String memDuplYn;
    private String memAlimStd;
    private String comSensitivityUseYn;
    private String comSensitivityDuplYn;
    private String comSensitivityAlimStd;
    private String installYdaUseYn;
    private String installYdaDuplYn;
    private String installYdaAlimStd;
    private String loginYdaUseYn;
    private String loginYdaDuplYn;
    private String loginYdaAlimStd;
    private String dauYdaUseYn;
    private String dauYdaDuplYn;
    private String dauYdaAlimStd;
    private String pvYdaUseYn;
    private String pvYdaDuplYn;
    private String pvYdaAlimStd;
    private String errorYdaUseYn;
    private String errorYdaDuplYn;
    private String errorYdaAlimStd;
    private String crashYdaUseYn;
    private String crashYdaDuplYn;
    private String crashYdaAlimStd;

    private String searchFromDt;
    private String searchFromDttm;
    private String searchToDt;
    private String searchToDttm;

    private List<Integer> seqList;
    private List<String> appVerList;

    @Getter
    @RequiredArgsConstructor
    public enum AlimSt {
        R("R"),
        D("D"),
        N("N");
        private final String type;
    }
}
