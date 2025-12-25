package com.thinkm.maxy.dto.front.common;

import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Schema(description = "단일 페이지 정보를 보관하는 DTO")
@Getter
@Setter
@RequiredArgsConstructor
public class SinglePageInfo extends DefaultRequestDto {

    @Schema(description = "요청 URL", example = "/dashboard/main")
    private String reqUrl;

    @Schema(description = "Elasticsearch 문서 ID", example = "F5NrAokB3V0RkD4bGd1P")
    private String docId;

    @Schema(description = "수집된 디바이스 ID", example = "device-1234")
    private String deviceId;

    @Schema(description = "페이지 시작 시각 (epoch milli)", example = "1719878500000")
    private long pageStartTm;

    @Schema(description = "페이지 종료 시각 (epoch milli)", example = "1719878560000")
    private long pageEndTm;

    @Schema(description = "부모 로그 수집 시각 (epoch milli)", example = "1719878400000")
    private Long parentLogDate;

    @Schema(description = "Waterfall 여부", example = "Y/N")
    private String wtfFlag;

    public static SinglePageInfo from(Map<String, Object> source) {
        try {
            return JsonUtil.convertValue(source, SinglePageInfo.class);
        } catch (Exception e) {
            return new SinglePageInfo();
        }
    }
}
