package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
public class DashboardComponentVO extends AppInfoVO {
    private int seq;

    private int component1;
    private int component2;
    private int component3;
    private int component4;
    private int component5;
    private int component6;
    private int component7;
    private int component8;

    private Integer optLogmeterLogWeight;
    private Integer optLogmeterErrorWeight;
    private Integer optLogmeterCrashWeight;
    private Integer optLogmeterTime;
    private Integer optPvequalizerMaxSize;
    private Integer optPageviewMaxSize;
    private Integer optFavoritesMaxSize;
    private Integer optLoadingtimescatterRange;
    private Integer optLoadingtimescatterSize;
    private Integer optResponsetimescatterRange;
    private Integer optResponsetimescatterSize;

    private String optOsTypeA;
    private String optOsTypeB;
    private String optAppVerA;
    private String optAppVerB;

    private String preUrl;
    private String reqUrl;

    private String type;

    @Setter
    @Getter
    @ToString
    public static class VersionComparisonVO {
        private String packageNm;
        private String serverType;

        private String optOsTypeA;
        private String optOsTypeB;
        private String optAppVerA;
        private String optAppVerB;
        private Long userNo;
    }
}
