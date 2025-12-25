package com.thinkm.maxy.dto.front.management.page;

import com.thinkm.maxy.dto.front.common.AppInfoRequestDto;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@RequiredArgsConstructor
public class MarkPagesRequestDto extends AppInfoRequestDto {
    private String reqUrl;
    private boolean mark;
    private Long userNo;

    public void withUserNo(Long userNo) {
        this.userNo = userNo;
    }
}
