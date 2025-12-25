package com.thinkm.maxy.dto.front.management.page;

import com.thinkm.maxy.dto.front.common.AppInfoRequestDto;
import com.thinkm.maxy.vo.FrontUrl;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@RequiredArgsConstructor
public class PageListRequestDto extends AppInfoRequestDto {
    private String reqUrl;
    private Long userNo;
    private FrontUrl.Type type;

    public void withUserNo(Long userNo) {
        this.userNo = userNo;
    }
}
