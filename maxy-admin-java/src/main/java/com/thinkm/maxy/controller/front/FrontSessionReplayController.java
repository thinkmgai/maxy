package com.thinkm.maxy.controller.front;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.NotFoundException;
import com.thinkm.maxy.dto.front.sessionreplay.SessionReplayRequestDto;
import com.thinkm.maxy.dto.front.sessionreplay.SessionReplayResponseDto;
import com.thinkm.maxy.service.front.FrontSessionReplayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.List;

/**
 * 세션 리플레이 FileDB 조회 컨트롤러
 * 외부 FileDB 서버와의 통신을 통해 세션 리플레이 데이터를 조회하는 REST API를 제공합니다.
 */
@Slf4j
@RestController
@RequestMapping("/mf/0000")
@RequiredArgsConstructor
@Tag(name = "Front Session Replay", description = "세션 리플레이 데이터 API")
public class FrontSessionReplayController {

    private final FrontSessionReplayService frontSessionReplayService;

    /**
     * 세션 리플레이 스트리밍 데이터를 조회합니다.
     * FileDB의 getstreams 엔드포인트를 통해 특정 세션의 상세 리플레이 데이터를 스트림으로 가져옵니다.
     *
     * @param requestDto 세션 리플레이 조회 요청 데이터 (인덱스, startKey)
     * @return 세션 리플레이 스트림 데이터
     */
    @Operation(
            summary = "세션 리플레이 스트림 조회",
            description = "FileDB에서 세션 리플레이 스트림을 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "성공")
    @PostMapping("/sessionReplay/stream.maxy")
    public ResponseEntity<StreamingResponseBody> getSessionReplayStream(
            @org.springframework.web.bind.annotation.RequestBody SessionReplayRequestDto requestDto) {
        
        Long sessionStartData = frontSessionReplayService.getSessionStartData(requestDto);

        if (sessionStartData == null) {
            throw new NotFoundException(ReturnCode.ERR_NOT_FOUND_DOC);
        }
        requestDto.setSessionStartTm(String.valueOf(sessionStartData));

        StreamingResponseBody stream = outputStream -> {
            try {
                frontSessionReplayService.streamSessionReplayData(requestDto, outputStream);
            } catch (Exception e) {
                log.error("Failed to stream session replay data", e);
                throw new RuntimeException("Failed to stream session replay data", e);
            }
        };

        return ResponseEntity
                .status(HttpStatus.OK)
                .contentType(MediaType.APPLICATION_JSON)
                .body(stream);
    }

    /**
     * 세션 리플레이 액션 리스트를 조회합니다.
     * 세션의 시작 시간과 종료 시간을 기준으로 액션 목록과 로딩 시간 정보를 가져옵니다.
     *
     * @param requestDto 세션 리플레이 조회 요청 데이터 (sessionId)
     * @return 액션 리스트를 포함한 응답
     */
    @Operation(
            summary = "세션 리플레이 액션 리스트 조회",
            description = "세션의 액션 목록과 로딩 시간 정보를 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "성공", content = @Content(schema = @Schema(implementation = SessionReplayResponseDto.class)))
    @PostMapping("/sessionReplay/actionList.maxy")
    public ResponseEntity<SessionReplayResponseDto> getSessionReplayActionList(
            @org.springframework.web.bind.annotation.RequestBody SessionReplayRequestDto requestDto) {
        Long sessionStartData = frontSessionReplayService.getSessionStartData(requestDto);
        Long sessionEndData = frontSessionReplayService.getSessionEndData(requestDto);

        if (sessionStartData == null || sessionEndData == null) {
            throw new NotFoundException(ReturnCode.ERR_NOT_FOUND_DOC);
        }

        // from과 to 설정 (String을 Long으로 변환)
        requestDto.setFrom(sessionStartData);
        requestDto.setTo(sessionEndData);

        // ActionList 조회 및 로딩 시간 정보 추가
        List<SessionReplayResponseDto.ActionListData> actionList = frontSessionReplayService.getActionListWithLoadingTime(requestDto);

        SessionReplayResponseDto result = new SessionReplayResponseDto();
        result.setSessionId(requestDto.getSessionId());
        result.setSessionStartTm(sessionStartData);
        result.setSessionEndTm(sessionEndData);
        result.setActionList(actionList);
        result.setStatus("success");

        return ResponseEntity.ok(result);
    }
}
