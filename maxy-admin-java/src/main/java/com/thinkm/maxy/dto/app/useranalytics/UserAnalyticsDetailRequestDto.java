package com.thinkm.maxy.dto.app.useranalytics;

import com.thinkm.maxy.vo.AppInfoVO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserAnalyticsDetailRequestDto extends AppInfoVO {
    private String deviceId;
    private Long from;
    private Long to;
}
