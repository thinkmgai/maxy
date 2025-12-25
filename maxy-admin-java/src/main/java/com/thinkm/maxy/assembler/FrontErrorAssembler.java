package com.thinkm.maxy.assembler;

import com.thinkm.maxy.domain.front.common.AppInfoSearchCondition;
import com.thinkm.maxy.domain.front.common.AreaSearchCondition;
import com.thinkm.maxy.domain.front.common.RangeSearchCondition;
import com.thinkm.maxy.domain.front.common.ResMsgSearchCondition;
import com.thinkm.maxy.domain.front.error.ErrorListSearchCondition;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorRequestDto;
import org.springframework.stereotype.Service;

@Service
public class FrontErrorAssembler {
    public ErrorListSearchCondition toErrorListSearchCondition(ErrorRequestDto dto) {
        return new ErrorListSearchCondition(
                new AppInfoSearchCondition(dto.getPackageNm(), dto.getServerType()),
                new RangeSearchCondition(dto.getFrom(), dto.getTo()),
                new AreaSearchCondition(dto.getLocationCode()),
                new ResMsgSearchCondition(dto.getResMsg())
        );
    }
}
