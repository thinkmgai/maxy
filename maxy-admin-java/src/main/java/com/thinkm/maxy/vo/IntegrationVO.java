package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class IntegrationVO extends AppInfoVO {
    // integration config
    private IntegrationType type;
    private String token;
    private String url;
    private String channel;

    // landing page
    private Long id;
    private String reqUrl;
    private Long interval;

    private String insertType;
    private String fromHour;
    private String fromMin;
    private String toHour;
    private String toMin;

    @Getter
    public enum YnType {
        Y, N
    }

    @Getter
    public enum IntegrationType {
        SLACK
    }
}
