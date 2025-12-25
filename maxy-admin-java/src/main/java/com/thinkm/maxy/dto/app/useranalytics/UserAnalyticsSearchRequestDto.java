package com.thinkm.maxy.dto.app.useranalytics;

import com.thinkm.maxy.vo.AppInfoVO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserAnalyticsSearchRequestDto extends AppInfoVO {
    private String searchType;
    private String searchValue;
    private Long from;
    private Long to;
}
