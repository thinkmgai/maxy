package com.thinkm.maxy.assembler;

import com.thinkm.common.util.Elastic;
import com.thinkm.maxy.domain.front.common.*;
import com.thinkm.maxy.domain.front.network.NetworkListSearchCondition;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkRequestDto;
import org.springframework.stereotype.Service;

@Service
public class FrontNetworkAssembler {
    public NetworkListSearchCondition toNetworkListSearchCondition(NetworkRequestDto dto) {
        return new NetworkListSearchCondition(
                new AppInfoSearchCondition(dto.getPackageNm(), dto.getServerType()),
                new RangeSearchCondition(dto.getFrom(), dto.getTo()),
                new YRangeSearchCondition(dto.getYFrom(), dto.getYTo()),
                new AreaSearchCondition(dto.getLocationCode()),
                new TypeAndValueSearchCondition(Elastic.reqUrl, dto.getReqUrl())
        );
    }
}
