package com.thinkm.maxy.assembler;

import com.thinkm.maxy.domain.front.common.*;
import com.thinkm.maxy.domain.front.page.PageListSearchCondition;
import com.thinkm.maxy.dto.front.dashboard.page.PageRequestDto;
import com.thinkm.maxy.dto.front.webperf.page.PageRawListRequestDto;
import org.springframework.stereotype.Service;

@Service
public class FrontPageAssembler {
    public PageListSearchCondition toPageListSearchCondition(PageRequestDto dto) {
        return new PageListSearchCondition(
                new AppInfoSearchCondition(dto.getPackageNm(), dto.getServerType()),
                new RangeSearchCondition(dto.getFrom(), dto.getTo()),
                new YRangeSearchCondition(dto.getYFrom(), dto.getYTo()),
                new AreaSearchCondition(dto.getLocationCode()),
                new TypeAndValueSearchCondition(null, null)
        );
    }

    public PageListSearchCondition toPageListSearchCondition(PageRawListRequestDto dto) {
        return new PageListSearchCondition(
                new AppInfoSearchCondition(dto.getPackageNm(), dto.getServerType()),
                new RangeSearchCondition(dto.getFrom(), dto.getTo()),
                new YRangeSearchCondition(null, null),
                new AreaSearchCondition(null),
                new TypeAndValueSearchCondition(dto.getSearchType(), dto.getSearchValue())
        );
    }
}
