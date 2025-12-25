package com.thinkm.maxy.controller.front;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.maxy.assembler.FrontErrorAssembler;
import com.thinkm.maxy.assembler.FrontNetworkAssembler;
import com.thinkm.maxy.assembler.FrontPageAssembler;
import com.thinkm.maxy.domain.front.error.ErrorListSearchCondition;
import com.thinkm.maxy.domain.front.network.NetworkListSearchCondition;
import com.thinkm.maxy.domain.front.page.PageListSearchCondition;
import com.thinkm.maxy.dto.front.common.DocumentIdRequestDto;
import com.thinkm.maxy.dto.front.common.PageDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorListResponseDto;
import com.thinkm.maxy.dto.front.dashboard.error.ErrorRequestDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkListResponseDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkRequestDto;
import com.thinkm.maxy.dto.front.dashboard.page.PageListResponseDto;
import com.thinkm.maxy.dto.front.webperf.error.ErrorAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.error.ErrorAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.network.NetworkAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.network.NetworkAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.page.MarkPageRequestDto;
import com.thinkm.maxy.dto.front.webperf.page.PageAggregateListRequestDto;
import com.thinkm.maxy.dto.front.webperf.page.PageAggregateListResponseDto;
import com.thinkm.maxy.dto.front.webperf.page.PageRawListRequestDto;
import com.thinkm.maxy.dto.front.webperf.ratio.RatioRequestDto;
import com.thinkm.maxy.dto.front.webperf.ratio.RatioResponseDto;
import com.thinkm.maxy.dto.front.webperf.vital.VitalRequestDto;
import com.thinkm.maxy.dto.front.webperf.vital.VitalResponseDto;
import com.thinkm.maxy.service.front.FrontErrorService;
import com.thinkm.maxy.service.front.FrontNetworkService;
import com.thinkm.maxy.service.front.FrontPageService;
import com.thinkm.maxy.service.front.FrontWebPerfService;
import com.thinkm.maxy.vo.FrontUrl;
import com.thinkm.maxy.vo.MaxyUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;

@Slf4j
@RestController
@RequestMapping("/fw/0000")
@RequiredArgsConstructor
@Tag(name = "Front Web Performance", description = "웹 성능(Vital/Page/Ratio) API")
public class FrontWebPerfController {
    private final FrontNetworkAssembler frontNetworkAssembler;
    private final FrontErrorAssembler frontErrorAssembler;
    private final FrontPageAssembler frontPageAssembler;
    private final FrontWebPerfService frontWebPerfService;
    private final FrontPageService frontPageService;
    private final FrontNetworkService frontNetworkService;
    private final FrontErrorService frontErrorService;


    @Operation(summary = "웹 성능 화면", description = "front/webperf/webperf 뷰 페이지로 이동")
    @ApiResponse(
            responseCode = "200",
            description = "뷰 렌더링 성공",
            content = @Content(mediaType = "text/html")
    )
    @Auditable(action = AuditType.NAVIGATION, method = "웹 성능 분석")
    @RequestMapping("/view.maxy")
    public ModelAndView index() {
        return new ModelAndView("front/webperf/webperf");
    }

    @Operation(
            summary = "페이지 북마크 설정/해제",
            description = "특정 페이지를 북마크 또는 북마크 해제"
    )
    @ApiResponse(responseCode = "200", description = "성공")
    @PostMapping("/{type}/mark.maxy")
    public ResponseEntity<?> markPage(
            @Parameter(hidden = true) HttpServletRequest request,
            @Parameter(
                    name = "type",
                    description = "즐겨찾기 대상 타입 (page/api/error)",
                    required = true,
                    schema = @Schema(allowableValues = {"page", "api", "error"})
            )
            @PathVariable String type,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = MarkPageRequestDto.class))
            )
            MarkPageRequestDto dto) {
        FrontUrl.Type markType = FrontUrl.Type.valueOf(type.toUpperCase());
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        String reqUrl = dto.getReqUrl();
        if (reqUrl == null || reqUrl.isBlank()) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }

        if (reqUrl.length() >= 500) {
            throw new BadRequestException(ReturnCode.ERR_TOO_LONG_PARAMS);
        }

        frontPageService.mark(dto.getPackageNm(),
                dto.getServerType(),
                markType,
                user.getUserNo(),
                reqUrl,
                dto.isMark());
        return ResponseEntity.ok().build();
    }

    @Operation(
            summary = "Vital 정보 조회",
            description = "LCP/INP/CLS 등 Vital 지표를 반환"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = VitalResponseDto.class)))
    @PostMapping("/webperf/vital.maxy")
    public ResponseEntity<VitalResponseDto> getVitalInfo(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = VitalRequestDto.class))
            )
            VitalRequestDto dto) {
        VitalResponseDto result = frontWebPerfService.getVitalInfo(dto);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "페이지 집계(Aggregate) 목록 조회",
            description = "페이지별 집계 데이터를 반환 (북마크 포함)"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = PageAggregateListResponseDto.class)))
    @PostMapping("/webperf/pages/aggregate.maxy")
    public ResponseEntity<PageAggregateListResponseDto> getPageAggregateList(
            @Parameter(hidden = true) HttpServletRequest request,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = PageAggregateListRequestDto.class))
            )
            PageAggregateListRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        PageAggregateListResponseDto result = frontWebPerfService.getPageAggregateList(dto, user.getUserNo());
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "페이지 Raw 데이터 목록 조회",
            description = "페이지 Raw 로그 목록을 반환"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = PageListResponseDto.class)))
    @PostMapping("/webperf/pages/raw.maxy")
    public ResponseEntity<PageListResponseDto> getPageRawList(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = PageRawListRequestDto.class))
            )
            PageRawListRequestDto dto) {
        PageListSearchCondition sc = frontPageAssembler.toPageListSearchCondition(dto);
        PageListResponseDto result = frontPageService.getPageListData(sc, true);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "페이지 상세 조회",
            description = "mxPageId 기준으로 페이지 상세 및 리소스 목록 반환"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = PageDetailResponseDto.class)))
    @PostMapping("/webperf/page.maxy")
    public ResponseEntity<PageDetailResponseDto> getPageDetail(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = DocumentIdRequestDto.class))
            )
            DocumentIdRequestDto dto) {
        PageDetailResponseDto result = frontPageService.getPageDetailData(dto);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "비율(Ratio) 데이터 조회",
            description = "타입별(platform/browser/os 등) 비율 데이터를 반환"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = RatioResponseDto.class)))
    @PostMapping("/webperf/ratio/{type}.maxy")
    public ResponseEntity<RatioResponseDto> getRatioList(
            @Parameter(
                    name = "type",
                    description = "비율 데이터를 조회할 기준 타입",
                    required = true,
                    schema = @Schema(implementation = RatioRequestDto.DataType.class)
            )
            @PathVariable RatioRequestDto.DataType type,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = RatioRequestDto.class))
            )
            RatioRequestDto dto) {
        RatioResponseDto result = frontWebPerfService.getRatioListData(type, dto);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "Network 요청 집계(Aggregate) 목록 조회",
            description = "Network 요청별 집계 데이터를 반환 (북마크 포함)"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = NetworkAggregateListResponseDto.class)))
    @PostMapping("/webperf/network/aggregate.maxy")
    public ResponseEntity<NetworkAggregateListResponseDto> getNetworkAggregateList(
            @Parameter(hidden = true) HttpServletRequest request,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = NetworkAggregateListRequestDto.class))
            )
            NetworkAggregateListRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        NetworkAggregateListResponseDto result = frontWebPerfService.getNetworkAggregateList(dto, user.getUserNo());
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "Error 집계(Aggregate) 목록 조회",
            description = "Error별 집계 데이터를 반환 (북마크 포함)"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = ErrorAggregateListResponseDto.class)))
    @PostMapping("/webperf/error/aggregate.maxy")
    public ResponseEntity<ErrorAggregateListResponseDto> getErrorAggregateList(
            @Parameter(hidden = true) HttpServletRequest request,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ErrorAggregateListRequestDto.class))
            )
            ErrorAggregateListRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        ErrorAggregateListResponseDto result = frontWebPerfService.getErrorAggregateList(dto, user.getUserNo());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "네트워크 목록 조회", description = "네트워크 리스트 데이터 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = NetworkListResponseDto.class)))
    @PostMapping("/webperf/network/raw.maxy")
    public ResponseEntity<NetworkListResponseDto> getNetworkListData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = NetworkRequestDto.class))
            )
            NetworkRequestDto dto) {
        NetworkListSearchCondition networkListSearchCondition = frontNetworkAssembler.toNetworkListSearchCondition(dto);
        NetworkListResponseDto result = frontNetworkService.getNetworkListData(networkListSearchCondition);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "에러 목록/차트 조회", description = "에러 리스트를 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = ErrorListResponseDto.class)))
    @PostMapping("/webperf/error/raw.maxy")
    public ResponseEntity<ErrorListResponseDto> getErrorListData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ErrorRequestDto.class))
            )
            ErrorRequestDto dto) {
        ErrorListSearchCondition errorListSearchCondition = frontErrorAssembler.toErrorListSearchCondition(dto);
        ErrorListResponseDto.ListData listData = frontErrorService.getErrorListData(errorListSearchCondition);
        ErrorListResponseDto result = new ErrorListResponseDto(listData);
        return ResponseEntity.ok(result);
    }
}
