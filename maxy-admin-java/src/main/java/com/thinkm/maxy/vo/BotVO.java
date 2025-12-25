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
public class BotVO extends AppInfoVO {
    private Long id;
    private String occurDate;
    private int roundInfo;
    private String roundTime;
    private String msg;
    private String parameter;
    private String type;
    private String groupCount;
    private String roundTime1;
    private String roundTime2;
    private String roundTime3;
    private String roundTime4;
    private String roundTime5;
    private String roundTime6;
    private String roundTime7;
    private String roundTime8;
    private String roundTime9;
    private String roundTime10;

    public static BotVO of(DashboardVO vo) {
        return BotVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .userNo(vo.getUserNo())
                .build();
    }
}
