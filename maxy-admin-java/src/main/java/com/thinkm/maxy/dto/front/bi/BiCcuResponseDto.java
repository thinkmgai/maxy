package com.thinkm.maxy.dto.front.bi;

import com.thinkm.common.util.CommonUtil;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Schema(description = "BI 동시 접속자(CCU) 응답 DTO")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class BiCcuResponseDto extends BiDefaultResponseDto {

    @ArraySchema(schema = @Schema(description = "시간별 CCU 값", implementation = Object[].class))
    private List<Object[]> chartData;
    @Schema(description = "최대 동시 접속자 수", example = "120")
    private Long peak;

    public static BiCcuResponseDto from(Map<String, Long> tmp) {
        long peak = 0;
        List<Object[]> result = new ArrayList<>();
        for (Map.Entry<String, Long> entry : tmp.entrySet()) {
            long val = entry.getValue();
            Object[] objects = new Object[]{CommonUtil.toLong(entry.getKey()), val};
            result.add(objects);
            if (val > peak) peak = val;
        }
        result.sort(Comparator.comparingLong(o -> (long) o[0]));
        return new BiCcuResponseDto(result, peak);
    }
}
