package com.thinkm.maxy.controller.front;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.NotFoundException;
import com.thinkm.maxy.assembler.FrontCommonAssembler;
import com.thinkm.maxy.assembler.FrontErrorAssembler;
import com.thinkm.maxy.assembler.FrontNetworkAssembler;
import com.thinkm.maxy.assembler.FrontPageAssembler;
import com.thinkm.maxy.domain.front.common.TimeSeriesChartSearchCondition;
import com.thinkm.maxy.domain.front.error.ErrorListSearchCondition;
import com.thinkm.maxy.domain.front.network.NetworkListSearchCondition;
import com.thinkm.maxy.domain.front.page.PageListSearchCondition;
import com.thinkm.maxy.dto.front.common.*;
import com.thinkm.maxy.dto.front.dashboard.error.*;
import com.thinkm.maxy.dto.front.dashboard.feeldex.FeeldexRequestDto;
import com.thinkm.maxy.dto.front.dashboard.feeldex.FeeldexResponseDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkDetailRequestDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkListResponseDto;
import com.thinkm.maxy.dto.front.dashboard.network.NetworkRequestDto;
import com.thinkm.maxy.dto.front.dashboard.page.PageListResponseDto;
import com.thinkm.maxy.dto.front.dashboard.page.PageRequestDto;
import com.thinkm.maxy.dto.front.dashboard.session.SessionDetailRequestDto;
import com.thinkm.maxy.dto.front.dashboard.session.SessionDetailResponseDto;
import com.thinkm.maxy.dto.front.dashboard.user.UserListResponseDto;
import com.thinkm.maxy.dto.front.dashboard.user.UserRequestDto;
import com.thinkm.maxy.service.front.*;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/mf/0000")
@RequiredArgsConstructor
@Tag(name = "Front Dashboard", description = "대시보드(페이지/네트워크/에러/Feeldex/세션/사용자) API")
public class FrontDashboardController {

    private final FrontCommonAssembler frontCommonAssembler;
    private final FrontErrorAssembler frontErrorAssembler;
    private final FrontNetworkAssembler frontNetworkAssembler;
    private final FrontPageAssembler frontPageAssembler;
    private final FrontDashboardService frontDashboardService;
    private final FrontCommonService frontCommonService;
    private final FrontPageService frontPageService;
    private final FrontNetworkService frontNetworkService;
    private final FrontErrorService frontErrorService;

    @Operation(summary = "대시보드 메인 화면", description = "front/dashboard/dashboard 뷰 페이지로 이동")
    @ApiResponse(
            responseCode = "200",
            description = "뷰 렌더링 성공",
            content = @Content(mediaType = "text/html")
    )
    @Auditable(action = AuditType.NAVIGATION, method = "대시보드")
    @GetMapping("/view.maxy")
    public ModelAndView index() {
        return new ModelAndView("front/dashboard/dashboard");
    }

    @Operation(
            summary = "페이지 스캐터/라인 차트 목록",
            description = "yFrom, yTo가 있으면 스캐터, 없으면 라인 차트 데이터 반환"
    )
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = PageListResponseDto.class)))
    @PostMapping("/dashboard/page/list.maxy")
    public ResponseEntity<PageListResponseDto> getPageListData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = PageRequestDto.class))
            )
            PageRequestDto dto) {
        PageListSearchCondition pageSc = frontPageAssembler.toPageListSearchCondition(dto);
        PageListResponseDto result = frontPageService.getPageListData(pageSc, false);
        TimeSeriesChartSearchCondition timeSeriesChartSearchCondition = frontCommonAssembler.toTimeSeriesChartSearchCondition(dto);
        TimeSeriesChart chartData = frontCommonService.getTimeSeriesChartData(TimeSeriesChart.DataType.PAGE, timeSeriesChartSearchCondition);
        result.setChartData(chartData);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "페이지 상세 조회", description = "mxPageId 기준으로 상세 및 리소스 목록 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = PageDetailResponseDto.class)))
    @PostMapping("/dashboard/page/detail.maxy")
    public ResponseEntity<PageDetailResponseDto> getPageDetailData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = DocumentIdRequestDto.class))
            )
            DocumentIdRequestDto dto) {
        PageDetailResponseDto result = frontPageService.getPageDetailData(dto);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "네트워크 목록 조회", description = "네트워크 리스트 데이터 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = NetworkListResponseDto.class)))
    @PostMapping("/dashboard/network/list.maxy")
    public ResponseEntity<NetworkListResponseDto> getNetworkListData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = NetworkRequestDto.class))
            )
            NetworkRequestDto dto) {
        NetworkListSearchCondition networkListSearchCondition = frontNetworkAssembler.toNetworkListSearchCondition(dto);
        NetworkListResponseDto result = frontNetworkService.getNetworkListData(networkListSearchCondition);
        TimeSeriesChartSearchCondition timeSeriesChartSearchCondition = frontCommonAssembler.toTimeSeriesChartSearchCondition(dto);
        TimeSeriesChart chartData = frontCommonService.getTimeSeriesChartData(TimeSeriesChart.DataType.NETWORK, timeSeriesChartSearchCondition);
        result.setChartData(chartData);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "네트워크 상세 조회", description = "상세/제니퍼/차트 데이터를 함께 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = NetworkDetailResponseDto.class)))
    @PostMapping("/dashboard/network/detail.maxy")
    public ResponseEntity<NetworkDetailResponseDto> getNetworkDetailData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = NetworkDetailRequestDto.class))
            )
            NetworkDetailRequestDto dto) {
        NetworkDetailResponseDto.DetailData detailData = frontNetworkService.getNetworkDetailData(dto);
        NetworkDetailResponseDto.JenniferInfo jenniferData = frontNetworkService.getNetworkJenniferData(detailData);
        NetworkDetailResponseDto.ChartData chartData = frontNetworkService.getNetworkChartData(dto, detailData);
        boolean hasPage = frontPageService.existsPageLog(new ExistsPageInfoRequestDto(
                dto.getPackageNm(),
                dto.getServerType(),
                detailData.getMxPageId(),
                detailData.getDeviceId(),
                detailData.getLogTm()));
        NetworkDetailResponseDto result = new NetworkDetailResponseDto(detailData, jenniferData, chartData, hasPage);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "에러 목록/차트 조회", description = "에러 리스트와 차트 데이터를 함께 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = ErrorListResponseDto.class)))
    @PostMapping("/dashboard/error/list.maxy")
    public ResponseEntity<ErrorListResponseDto> getErrorListData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ErrorRequestDto.class))
            )
            ErrorRequestDto dto) {
        TimeSeriesChartSearchCondition timeSeriesChartSearchCondition = frontCommonAssembler.toTimeSeriesChartSearchCondition(dto);
        TimeSeriesChart chartData = frontCommonService.getTimeSeriesChartData(TimeSeriesChart.DataType.ERROR, timeSeriesChartSearchCondition);
        ErrorListSearchCondition errorListSearchCondition = frontErrorAssembler.toErrorListSearchCondition(dto);
        ErrorListResponseDto.ListData listData = frontErrorService.getErrorListData(errorListSearchCondition);
        ErrorListResponseDto result = new ErrorListResponseDto(listData, chartData);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "에러 상세 조회", description = "에러 단건 상세 정보")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = ErrorDetailResponseDto.class)))
    @PostMapping("/dashboard/error/detail.maxy")
    public ResponseEntity<ErrorDetailResponseDto> getErrorDetailData(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ErrorDetailRequestDto.class))
            )
            ErrorDetailRequestDto dto) {
        ErrorDetailResponseDto.DetailData detailData = frontErrorService.getErrorDetailData(dto);
        SinglePageInfo singlePageInfo = frontPageService.getSinglePageInfo(new PageInfoRequestDto(
                detailData.getPackageNm(),
                detailData.getServerType(),
                detailData.getMxPageId(),
                detailData.getLogTm()));
        boolean hasPage = false;
        List<ErrorDetailResponseDto.EventInfo> eventInfoList = new ArrayList<>();
        if (singlePageInfo != null) {
            eventInfoList = frontErrorService.getErrorEventInfoList(singlePageInfo, detailData.getLogTm());
            hasPage = true;
        }
        return ResponseEntity.ok(new ErrorDetailResponseDto(detailData, eventInfoList, hasPage));
    }

    @Operation(summary = "에러 읽음/해제", description = "에러 상세의 읽음 상태를 마킹/해제")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = ReadStatusResponseDto.class)))
    @PostMapping("/dashboard/error/detail/mark.maxy")
    public ResponseEntity<ReadStatusResponseDto> markErrorDetailData(
            @Parameter(hidden = true) HttpServletRequest request,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ErrorMarkRequestDto.class))
            )
            ErrorMarkRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);

        dto.setRegNo(user.getUserNo());

        ReadStatusResponseDto result = dto.isRead()
                ? frontCommonService.markAsRead(dto)
                : frontCommonService.unmarkAsRead(dto);

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Feeldex 설정 조회", description = "세션 사용자 기준 Feeldex 설정 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = FeeldexResponseDto.class)))
    @PostMapping("/dashboard/feeldex/config.maxy")
    public ResponseEntity<FeeldexResponseDto> getFeeldexConfig(
            @Parameter(hidden = true) HttpServletRequest request,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = DefaultRequestDto.class))
            )
            DefaultRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);

        FeeldexResponseDto result = frontCommonService.getFeeldexConfig(dto, user.getUserNo());
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Feeldex 설정 저장", description = "세션 사용자 기준 Feeldex 설정 추가/갱신")
    @ApiResponse(responseCode = "200", description = "성공")
    @PostMapping("/dashboard/feeldex/save.maxy")
    public ResponseEntity<?> saveFeeldexConfig(
            @Parameter(hidden = true) HttpServletRequest request,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = FeeldexRequestDto.class))
            )
            FeeldexRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);

        frontCommonService.addFeeldexConfig(dto, user.getUserNo());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "세션 상세 조회", description = "세션 프로필/바이탈/페이지/이벤트를 함께 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = SessionDetailResponseDto.class)))
    @PostMapping("/dashboard/session/detail.maxy")
    public ResponseEntity<SessionDetailResponseDto> getSessionDetail(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = SessionDetailRequestDto.class))
            )
            SessionDetailRequestDto dto) {

        SessionDetailResponseDto.Profile result = frontDashboardService.getSessionProfileInfo(dto);

        // parentLogDate 가 없거나 0 이하인 경우에 대한 예외처리
        Long from = Optional.ofNullable(result)
                .map(SessionDetailResponseDto.Profile::getParentLogDate)
                .filter(v -> v > 0)
                .orElseThrow(() -> new NotFoundException(ReturnCode.ERR_NOT_FOUND_DOC));

        SessionDetailResponseDto.Vital vital = frontDashboardService.getSessionVitalInfo(dto, from);
        List<SessionDetailResponseDto.PageInfo> pageInfoList = frontDashboardService.getSessionPageInfo(dto, from);
        List<SessionDetailResponseDto.EventInfo> eventInfoList = frontDashboardService.getSessionEventInfo(dto, from);
        return ResponseEntity.ok(new SessionDetailResponseDto(result, vital, pageInfoList, eventInfoList));
    }

    @Operation(summary = "사용자 목록", description = "사용자 리스트 반환")
    @ApiResponse(responseCode = "200", description = "성공",
            content = @Content(schema = @Schema(implementation = UserListResponseDto.class)))
    @PostMapping("/dashboard/user/list.maxy")
    public ResponseEntity<UserListResponseDto> getUserList(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = UserRequestDto.class))
            )
            UserRequestDto dto) {
        UserListResponseDto result = frontDashboardService.getUserList(dto);
        return ResponseEntity.ok(result);
    }
}
