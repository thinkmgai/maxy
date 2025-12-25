package com.thinkm.maxy.dto.app.performance;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class PercentileDataResponseDto {
    private long top5;
    private long top95;
    private long percent;

    public PercentileDataResponseDto() {
        this.top5 = 0;
        this.top95 = 0;
        this.percent = 0;
    }
}
