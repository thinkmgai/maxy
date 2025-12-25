package com.thinkm.maxy.controller.front;

import com.thinkm.maxy.dto.front.bi.BiDefaultResponseDto;
import com.thinkm.maxy.dto.front.bi.BiErrorResponseDto;
import com.thinkm.maxy.dto.front.bi.BiRequestDto;
import com.thinkm.maxy.service.front.FrontBiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/mf/0000")
@RequiredArgsConstructor
@Tag(name = "Front BI", description = "Business Intelligence 지표 API")
public class FrontBiController {
    private final FrontBiService frontBiService;

    @Operation(
            summary = "BI 데이터 조회",
            description = """
                    BI 차트 데이터를 조회합니다.
                    - MAU: 월간 활성 사용자 지표
                    - CCU: 동시 접속자 지표
                    - 기타 타입: FrontBiService의 공통 BI 데이터"""
    )
    @ApiResponse(
            responseCode = "200",
            description = "성공",
            content = @Content(schema = @Schema(implementation = BiDefaultResponseDto.class))
    )
    @PostMapping("/bi/{type}.maxy")
    public ResponseEntity<BiDefaultResponseDto> getBiInfoChart(
            @PathVariable BiRequestDto.Type type,
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = BiRequestDto.class))
            )
            BiRequestDto dto) {
        log.info("{} {}", type.name(), dto.toString());
        BiDefaultResponseDto result = switch (type) {
            case MAU -> frontBiService.getBiMauInfo(dto);
            case CCU -> frontBiService.getCcuInfo(dto);
            default -> frontBiService.getBiInfo(type, dto);
        };

        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "BI 오류 데이터 조회",
            description = """
                    BI 오류 발생 현황을 조회합니다.
                    - 오류 메시지별 발생 건수 및 비율
                    - 차트 데이터와 상세 오류 정보 목록 제공"""
    )
    @ApiResponse(
            responseCode = "200",
            description = "성공",
            content = @Content(schema = @Schema(implementation = BiErrorResponseDto.class))
    )
    @PostMapping("/bi/ERROR.maxy")
    public ResponseEntity<BiErrorResponseDto> getBiErrorInfo(
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = BiRequestDto.class))
            )
            BiRequestDto dto) {
        BiErrorResponseDto result = frontBiService.getBiErrorInfo(dto);

        return ResponseEntity.ok(result);
    }
}
