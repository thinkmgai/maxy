package com.thinkm.maxy.dto.front.dashboard.user;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@RequiredArgsConstructor
@Schema(description = "사용자 목록 응답 DTO")
public class UserListResponseDto {
    public static final String[] FIELDS = {
            Elastic.deviceId,
            Elastic.userId,
            Elastic.platform,
            Elastic.appStartTm,
            Elastic.appEndTm,
            Elastic.accessCnt,
            Elastic.ip,
            Elastic.usingTime
    };
    @Schema(description = "전체 건수", example = "1000")
    private Long totalHits;

    @Schema(description = "평균 사용시간 (ms)", example = "300000")
    private Double avg;

    @Schema(description = "사용자 데이터 목록")
    private List<ListData> data;

    @Getter
    @Setter
    @RequiredArgsConstructor
    @Schema(description = "사용자 목록 항목")
    public static class ListData {
        @Schema(description = "문서 ID", example = "abc123")
        private String docId;

        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "사용자 ID", example = "user123")
        private String userId;

        @Schema(description = "플랫폼", example = "Mobile")
        private String platform;

        @Schema(description = "앱 시작 시간 (Unix timestamp)", example = "1672531200000")
        private Long appStartTm;

        @Schema(description = "앱 종료 시간 (Unix timestamp)", example = "1672531200000")
        private Long appEndTm;

        @Schema(description = "당일 앱 사용 수", example = "3")
        private Integer accessCnt;

        @Schema(description = "IP", example = "127.0.0.1")
        private String ip;

        @Schema(description = "사용시간 (ms)", example = "300000")
        private Long usingTime;

        public static ListData from(String docId, Map<String, Object> map, boolean userIdMasking) {
            try {
                ListData data = JsonUtil.convertValue(map, ListData.class);
                data.setDocId(docId);
                data.setUserId(CommonUtil.maskUserId(data.getUserId(), userIdMasking, 2));
                return data;
            } catch (Exception e) {
                return new ListData();
            }
        }
    }
}