package com.thinkm.maxy.vo;

import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class ExceptLogVO extends AppInfoVO {
    private Long seq;
    private Integer logType;
    private String exceptString;
    private String updDt;
}
