package com.thinkm.maxy.assembler;

import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.domain.front.common.*;
import com.thinkm.maxy.dto.front.dashboard.area.AreaRequestDto;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorRequestDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkRequestDto;
import org.springframework.stereotype.Component;

@Component
public class FrontCommonAssembler {

    public TimeSeriesChartSearchCondition toTimeSeriesChartSearchCondition(NetworkRequestDto dto) {
        return new TimeSeriesChartSearchCondition(
                new AppInfoSearchCondition(dto.getPackageNm(), dto.getServerType()),
                new RangeSearchCondition(dto.getFrom(), dto.getTo()),
                new AreaSearchCondition(dto.getLocationCode()),
                new TypeAndValueSearchCondition(Elastic.reqUrl, dto.getReqUrl())
        );
    }

    public TimeSeriesChartSearchCondition toTimeSeriesChartSearchCondition(ErrorRequestDto dto) {
        return new TimeSeriesChartSearchCondition(
                new AppInfoSearchCondition(dto.getPackageNm(), dto.getServerType()),
                new RangeSearchCondition(dto.getFrom(), dto.getTo()),
                new AreaSearchCondition(dto.getLocationCode()),
                new TypeAndValueSearchCondition(Elastic.resMsg, dto.getResMsg())
        );
    }

    public TimeSeriesChartSearchCondition toTimeSeriesChartSearchCondition(AreaRequestDto dto) {
        return new TimeSeriesChartSearchCondition(
                new AppInfoSearchCondition(dto.getPackageNm(), dto.getServerType()),
                new RangeSearchCondition(dto.getFrom(), dto.getTo()),
                new AreaSearchCondition(dto.getLocationCode()),
                new TypeAndValueSearchCondition(null, null)
        );
    }
}
