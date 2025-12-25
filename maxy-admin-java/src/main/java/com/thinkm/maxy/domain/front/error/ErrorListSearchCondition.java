package com.thinkm.maxy.domain.front.error;

import com.thinkm.maxy.domain.front.common.AppInfoSearchCondition;
import com.thinkm.maxy.domain.front.common.AreaSearchCondition;
import com.thinkm.maxy.domain.front.common.RangeSearchCondition;
import com.thinkm.maxy.domain.front.common.ResMsgSearchCondition;

public record ErrorListSearchCondition(
        AppInfoSearchCondition appInfo,
        RangeSearchCondition range,
        AreaSearchCondition area,
        ResMsgSearchCondition resMsg) {

}
