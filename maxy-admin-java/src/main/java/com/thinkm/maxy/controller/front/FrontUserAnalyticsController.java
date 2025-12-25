package com.thinkm.maxy.controller.front;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.dto.front.user.*;
import com.thinkm.maxy.service.app.PerformanceAnalysisService;
import com.thinkm.maxy.service.front.FrontUserAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;
import java.util.Map;

/**
 * 사용자 분석 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/fu/0000")
@RequiredArgsConstructor
@Tag(name = "Front User Analytics", description = "사용자 분석(페이지 플로우) API")
public class FrontUserAnalyticsController {
    private final FrontUserAnalyticsService frontUserAnalyticsService;
    private final PerformanceAnalysisService performanceAnalysisService;

    @Value("${maxy.search-client-info:false}")
    private boolean useSearchClientInfo;

    /**
     * 사용자 분석 화면 이동
     *
     * @return front/userAnalysis/userAnalysis
     */
    @Operation(
            summary = "사용자 분석 화면",
            description = """
                    사용자 분석 뷰 페이지로 이동합니다.
                    - popup=false(기본값): front/userAnalysis/userAnalysis
                    - popup=true: front/userAnalysis/userAnalysis-popup
                    """,
            parameters = {
                    @Parameter(
                            name = "popup",
                            in = ParameterIn.QUERY,
                            description = "새창(팝업) 전용 화면으로 이동할지 여부",
                            schema = @Schema(type = "boolean", defaultValue = "false"),
                            examples = {
                                    @ExampleObject(name = "기본(새창 아님)", value = "false"),
                                    @ExampleObject(name = "새창 화면", value = "true")
                            }
                    )
            },
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "뷰 반환 성공",
                            content = @Content(
                                    mediaType = "text/html",
                                    examples = {
                                            @ExampleObject(
                                                    name = "기본 화면",
                                                    description = "front/userAnalysis/userAnalysis 로 렌더링",
                                                    value = "<!-- server-side rendered html -->"
                                            )
                                    }
                            )
                    )
            }
    )
    @Auditable(action = AuditType.NAVIGATION, method = "사용자 분석")
    @GetMapping(value = "/view.maxy")
    public ModelAndView goUserAnalysisView(
            @RequestParam(name = "popup", required = false, defaultValue = "false") Boolean popup
    ) {
        ModelAndView mv;
        if (Boolean.TRUE.equals(popup)) {
            mv = new ModelAndView("front/userAnalysis/userAnalysis-popup");
        } else {
            mv = new ModelAndView("front/userAnalysis/userAnalysis");
        }
        mv.addObject("useSearchClientInfo", useSearchClientInfo);
        return mv;
    }

    @Operation(
            summary = "사용자 페이지 플로우 목록 조회",
            description = "사용자의 페이지 플로우 리스트를 반환"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = PageFlowResponseDto.class)))
    @PostMapping(value = "/pages.maxy")
    public ResponseEntity<PageFlowResponseDto> getUserFlowList(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = PageFlowRequestDto.class))
            )
            PageFlowRequestDto dto) {
        List<List<PageFlowResponseDto.PageInfo>> pageFlowList = frontUserAnalyticsService.getUserFlowList(dto);
        PageFlowResponseDto result = new PageFlowResponseDto(pageFlowList);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "페이지 상세 정보 및 이벤트 조회",
            description = "특정 페이지의 상세 정보와 연관 이벤트 목록을 반환"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = PageFlowDetailResponseDto.class)))
    @PostMapping(value = "/page.maxy")
    public ResponseEntity<PageFlowDetailResponseDto> getPageDetailList(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = PageFlowDetailRequestDto.class))
            )
            PageFlowDetailRequestDto dto) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, dto.getDocId());

        Map<String, Long> avgMap = performanceAnalysisService.getAvgValueByAppInfo("loading", dto.getPackageNm(), dto.getServerType());

        PageFlowDetailResponseDto.PageInfo pageInfo = frontUserAnalyticsService.getPageInfo(dto, avgMap);
        if (pageInfo == null) {
            log.error("pageInfo is null. docId: {}", dto);
            return ResponseEntity.notFound().build();
        }
        List<PageFlowDetailResponseDto.EventInfo> eventInfoList = frontUserAnalyticsService.getEvents(dto, pageInfo);
        PageFlowDetailResponseDto.ChartData chartData = frontUserAnalyticsService.getLoadingTimeChartData(dto, pageInfo);
        PageFlowDetailResponseDto result = new PageFlowDetailResponseDto(eventInfoList, pageInfo, chartData);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "사용자의 상세 정보 조회",
            description = "사용자의 접속시간, 접속일 등의 상세 정보를 반환"
    )
    @ApiResponse(
            responseCode = "200",
            description = "성공",
            content = @Content(schema = @Schema(implementation = UserDetailResponseDto.class)))
    @PostMapping(value = "/user.maxy")
    public ResponseEntity<UserDetailResponseDto> getUserDetail(
            @RequestBody(
                    required = true,
                    content = @Content(
                            schema = @Schema(
                                    implementation = UserDetailRequestDto.class))) UserDetailRequestDto dto) {
        UserDetailResponseDto result = frontUserAnalyticsService.getUserDetail(dto);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "사용자 목록 조회",
            description = "검색 조건에 맞는 사용자 목록을 반환합니다."
    )
    @ApiResponse(
            responseCode = "200",
            description = "성공",
            content = @Content(schema = @Schema(implementation = UserListResponseDto.class)))
    @PostMapping(value = "/users.maxy")
    public ResponseEntity<UserListResponseDto> getUserList(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = UserListRequestDto.class))
            )
            UserListRequestDto dto) {
        UserListResponseDto result = frontUserAnalyticsService.getUserList(dto);
        return ResponseEntity.ok(result);
    }
}
