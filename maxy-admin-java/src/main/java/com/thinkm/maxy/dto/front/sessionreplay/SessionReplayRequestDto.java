package com.thinkm.maxy.dto.front.sessionreplay;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.thinkm.maxy.dto.front.common.DefaultRequestDto;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 세션 리플레이 스트리밍 데이터 조회 요청 DTO
 * FileDB의 getstreams 엔드포인트 호출을 위한 데이터 전송 객체
 */
@Schema(description = "세션 리플레이 스트림 조회 요청 DTO")
@Getter
@Setter
public class SessionReplayRequestDto extends DefaultRequestDto {
    
    /**
     * 인덱스 명 (sess_replay)
     */
    @JsonProperty("index")
    @Schema(description = "세션 리플레이 인덱스 명", example = "sess_replay")
    private String index;

    /**
     * 검색 파라미터
     */
    @JsonProperty("sessionId")
    @Schema(description = "세션 ID", example = "session-1234")
    private String sessionId;

    /**
     * 검색 파라미터
     */
    @JsonProperty("sessionStartTm")
    @Schema(description = "세션리플레이 조회 시작 시간", example = "1760935427370")
    private String sessionStartTm;

    /**
     * 검색 파라미터
     */
    @JsonProperty("intervaltime")
    @Schema(description = "페이지 체류 시간", example = "8590")
    private String intervaltime;
}
