package com.thinkm.maxy.dto.front.sessionreplay;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

/**
 * 세션 리플레이 스트리밍 데이터 조회 응답 DTO
 * FileDB의 getstreams 엔드포인트 응답을 위한 데이터 전송 객체
 */
@Schema(description = "세션 리플레이 스트림 응답 DTO")
@Getter
@Setter
public class SessionReplayResponseDto {
    
    /**
     * 세션 ID
     */
    @JsonProperty("sessionId")
    @Schema(description = "세션 ID", example = "session-1234")
    private String sessionId;

    /**
     * 세션 조회 시작 시간
     */
    @JsonProperty("sessionStartTm")
    @Schema(description = "세션 조회 시작 시간", example = "1719878400000")
    private Long sessionStartTm;

    /**
     * 세션 조회 시작 시간
     */
    @JsonProperty("sessionEndTm")
    @Schema(description = "세션 조회 종료 시간", example = "1719878400000")
    private Long sessionEndTm;

    /**
     * 페이지 체류 시간
     */
    @JsonProperty("intervaltime")
    @Schema(description = "페이지 체류 시간", example = "8590")
    private Long intervaltime;
    
    /**
     * 리플레이 데이터 (JSON 형태)
     */
    @JsonProperty("replayData")
    @Schema(description = "세션 리플레이 상세 데이터(JSON raw)")
    private Object replayData;
    
    /**
     * 응답 상태
     */
    @JsonProperty("status")
    @Schema(description = "응답 상태", example = "success")
    private String status;

    @Schema(description = "세션 리플레이 데이터의 시작 시각 (epoch milli)", example = "1719878400000")
    private Long from;

    @Schema(description = "세션 리플레이 데이터의 종료 시각 (epoch milli)", example = "1719878600000")
    private Long to;

    @Schema(description = "Action 목록")
    private List<SessionReplayResponseDto.ActionListData> actionList;

    @Getter
    @Setter
    @Schema(description = "Action 목록 항목")
    public static class ActionListData {
        @Schema(description = "디바이스 ID", example = "fee8074f-c296-45e4-bed0-c0eb9ae8ecde")
        private String deviceId;
        @Schema(description = "로그 타입", example = "131073")
        private Integer logType;
        @Schema(description = "", example = "1760332130521")
        private Long logTm;
        @Schema(description = "", example = "781")
        private Integer intervaltime;
        @Schema(description = "session이 시작되고 action이 시작된 시점", example = "781")
        private Long actionTm;
        @Schema(description = "페이지 URL", example = "http://127.0.0.1:8013/list/40/view")
        private String reqUrl;
        @Schema(description = "Click 데이터 정보", example = "JSON")
        private Map<String, Object> clickInfo;
        @Schema(description = "에러 정보", example = "Uncaught Error: Script error for")
        private String resMsg;

        @Schema(description = "로딩시간 (ms)", example = "1500")
        private Long loadingTime;

        public static SessionReplayResponseDto.ActionListData from(Map<String, Object> map, Long from) {
            try {
                ActionListData data = JsonUtil.convertValue(map, ActionListData.class);
                data.setActionTm(data.getLogTm() - from);
                return data;
            } catch (Exception e) {
                return new ActionListData();
            }
        }
    }
}
