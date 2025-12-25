package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
public class UserAppVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String packageNm;
    private String serverType;
    private String displayNm;
    private String osType;
    private String appVer;
    private Integer order;
    private Integer appType;
}
