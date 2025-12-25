package com.thinkm.maxy.controller.front;

import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.DateUtil;
import com.thinkm.maxy.controller.common.BaseReportController;
import com.thinkm.maxy.service.common.AppSettingsService;
import com.thinkm.maxy.service.app.ReportService;
import com.thinkm.maxy.service.app.ScheduledReportService;
import com.thinkm.maxy.vo.ReportVO;
import com.thinkm.maxy.vo.ScheduledMailVO;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 프론트 보고서 컨트롤러
 */
@Slf4j
@RestController
@Tag(name = "Front Report", description = "프론트 보고서 및 예약 메일 API")
public class FrontReportController extends BaseReportController {

    private final ScheduledReportService scheduledReportService;

    public FrontReportController(ReportService reportService, AppSettingsService appSettingsService,
                                 ScheduledReportService scheduledReportService) {
        super(reportService, appSettingsService);
        this.scheduledReportService = scheduledReportService;
    }

    /**
     * 프론트 보고서 페이지 이동
     */
    @Operation(summary = "프론트 보고서 화면", description = "front/report/report 뷰 페이지로 이동합니다.")
    @ApiResponse(responseCode = "200", description = "뷰 렌더링 성공", content = @Content(mediaType = "text/html"))
    @Auditable(action = AuditType.NAVIGATION, method = "프론트 보고서")
    @GetMapping(value = "/fr/0000/view.maxy")
    public ModelAndView goReportView() {
        return new ModelAndView("front/report/report");
    }

    /**
     * 프론트 보고서 데이터 조회
     */
    @Operation(
            summary = "프론트 보고서 데이터 조회",
            description = "요청 조건에 맞는 프론트 보고서 데이터를 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "성공", content = @Content(mediaType = "application/json"))
    @PostMapping(value = "/fr/0000/getReportData.maxy")
    public ResponseEntity<?> getReportData(
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReportVO.class))
            )
            ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY_FRONT.getAppType());
        return ResponseEntity.ok(getReportDataCommon(vo));
    }

    @Override
    protected ReportVO.ReportType[] getAvailableReportTypes(ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY_FRONT.getAppType());
        // 프론트 컨트롤러는 FRONT 타입만 사용
        return ReportVO.ReportType.getReportTypesByAppType(ReportVO.AppType.MAXY_FRONT);
    }

    /**
     * 프론트 보고서 다운로드
     */
    @Operation(
            summary = "프론트 보고서 다운로드",
            description = "조회된 프론트 보고서를 파일로 다운로드합니다."
    )
    @ApiResponse(responseCode = "200", description = "파일 다운로드 성공", content = @Content(mediaType = "application/octet-stream"))
    @Auditable(action = AuditType.ACCESS, method = "프론트 보고서 정보 다운로드")
    @GetMapping(value = "/fr/0000/downloadReportData.maxy")
    public void downloadReportData(
            ReportVO vo,
            HttpServletRequest request,
            HttpServletResponse response) {
        downloadReportDataCommon(vo, request, response);
    }

    /**
     * 프론트 보고서 타입 조회
     */
    @Operation(
            summary = "프론트 보고서 타입 조회",
            description = "프론트 서비스에서 지원하는 보고서 타입 목록을 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "성공", content = @Content(mediaType = "application/json"))
    @PostMapping(value = "/fr/0000/getReportType.maxy")
    public ResponseEntity<?> getReportType(
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReportVO.class))
            )
            ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY_FRONT.getAppType());
        return ResponseEntity.ok(getReportTypeCommon(vo));
    }

    // PDF를 Base64로 변환하여 화면에서 보여주기
    @Operation(
            summary = "프론트 보고서 PDF 미리보기",
            description = "요청한 기간의 프론트 보고서를 PDF로 생성하여 응답 스트림에 전송합니다."
    )
    @ApiResponse(responseCode = "200", description = "PDF 스트림 전송", content = @Content(mediaType = "application/pdf"))
    @GetMapping(value = "/fr/0000/maxyReport.maxy")
    public void viewPdf(ReportVO vo, HttpServletRequest request, HttpServletResponse response) {
        try {
            vo.setFromDt(DateUtil.timestampToDate(vo.getFrom(), DateUtil.DATE_PATTERN));
            vo.setToDt(DateUtil.timestampToDate(vo.getTo(), DateUtil.DATE_PATTERN));
            vo.setSearchFromDt(vo.getFrom().toString());
            vo.setSearchToDt(vo.getTo().toString());

            reportService.makePdf(vo, request, response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 프론트 PDF 리포트를 이메일로 전송
     * BaseReportController의 공통 로직 사용
     *
     * @param vo 리포트 요청 정보
     * @return 이메일 전송 결과
     */
    @Operation(
            summary = "프론트 보고서 이메일 전송",
            description = "생성된 프론트 PDF 리포트를 이메일로 전송합니다."
    )
    @ApiResponse(responseCode = "200", description = "이메일 전송 성공", content = @Content(mediaType = "application/json"))
    @Auditable(action = AuditType.ACCESS, method = "프론트 PDF 리포트를 이메일로 전송")
    @PostMapping(value = "/fr/0000/sendReportByEmail.maxy")
    public ResponseEntity<?> sendReportByEmail(
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ReportVO.class))
            )
            ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY_FRONT.getAppType());
        return sendReportByEmailCommon(vo);
    }

    /**
     * 예약된 리포트 메일 발송 (수동 실행용)
     * 실제 스케줄링은 ScheduledReportService에서 처리됨
     *
     * @return 발송 결과
     */
    @Operation(
            summary = "예약된 프론트 리포트 메일 발송",
            description = "예약된 프론트 리포트 이메일을 즉시 발송합니다."
    )
    @ApiResponse(responseCode = "200", description = "발송 결과", content = @Content(mediaType = "application/json"))
    @PostMapping(value = "/fr/0000/sendScheduledReports.maxy")
    public ResponseEntity<?> sendScheduledReports() {
        Map<String, Object> resultMap = new HashMap<>();

        try {
            scheduledReportService.sendScheduledReports();
            resultMap.put("success", true);
            resultMap.put("message", "예약된 리포트 메일 발송이 완료되었습니다.");
        } catch (Exception e) {
            log.error("예약 리포트 메일 발송 중 오류 발생: {}", e.getMessage(), e);
            resultMap.put("success", false);
            resultMap.put("message", "예약 리포트 메일 발송 중 오류가 발생했습니다: " + e.getMessage());
        }

        return ResponseEntity.ok(resultMap);
    }

    /**
     * 프론트 PDF 리포트 이메일 예약 등록/수정
     * BaseReportController의 공통 로직 사용
     *
     * @param request HTTP 요청
     * @param vo      예약 메일 정보
     * @return 처리 결과
     */
    @Operation(
            summary = "프론트 리포트 이메일 예약 등록/수정",
            description = "프론트 PDF 리포트의 예약 메일을 등록하거나 수정합니다."
    )
    @ApiResponse(responseCode = "200", description = "등록/수정 성공", content = @Content(mediaType = "application/json"))
    @Auditable(action = AuditType.INSERT, method = "프론트 PDF 리포트 이메일 예약 등록")
    @PostMapping(value = "/fr/0000/upsertScheduledEmail.maxy")
    public ResponseEntity<?> upsertScheduledEmail(
            HttpServletRequest request,
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ScheduledMailVO.class))
            )
            ScheduledMailVO vo) {
        // maxy front에서는 appVer, osType이 필요없지만 기존 maxy 서비스의 형식에 맞춰야해서 필요
        vo.setAppVer("A");
        vo.setAppVerText("");
        vo.setOsType("A");
        vo.setOsTypeText("");
        return upsertScheduledEmailCommon(request, vo);
    }

    /**
     * 프론트 예약된 이메일 목록 조회
     * BaseReportController의 공통 로직 사용
     *
     * @param request HTTP 요청
     * @return 예약된 이메일 목록
     */
    @Operation(
            summary = "프론트 리포트 예약 이메일 목록 조회",
            description = "등록된 프론트 리포트 예약 이메일 목록을 조회합니다."
    )
    @ApiResponse(responseCode = "200", description = "조회 성공", content = @Content(mediaType = "application/json"))
    @PostMapping(value = "/fr/0000/getScheduledEmailList.maxy")
    public ResponseEntity<?> getScheduledEmailList(HttpServletRequest request) {
        return getScheduledEmailListCommon(request);
    }

    /**
     * 프론트 예약된 이메일 삭제
     * BaseReportController의 공통 로직 사용
     *
     * @param vo      삭제할 예약 메일 정보
     * @param request HTTP 요청
     * @return 삭제 후 예약된 이메일 목록
     */
    @Operation(
            summary = "프론트 리포트 예약 이메일 삭제",
            description = "선택한 프론트 리포트 예약 이메일을 삭제합니다."
    )
    @ApiResponse(responseCode = "200", description = "삭제 성공", content = @Content(mediaType = "application/json"))
    @Auditable(action = AuditType.DELETE, method = "프론트 PDF 리포트 예약된 이메일 삭제")
    @PostMapping(value = "/fr/0000/deleteScheduledEmail.maxy")
    public ResponseEntity<?> deleteScheduledEmail(
            @RequestBody(
                    required = true,
                    content = @Content(schema = @Schema(implementation = ScheduledMailVO.class))
            )
            ScheduledMailVO vo,
            HttpServletRequest request) {
        return deleteScheduledEmailCommon(vo, request);
    }

    @Operation(
            summary = "프론트 보고서 다운로드 (RDB)",
            description = "RDB 기반 프론트 보고서를 다운로드합니다."
    )
    @ApiResponse(responseCode = "200", description = "파일 다운로드 성공", content = @Content(mediaType = "application/octet-stream"))
    @Auditable(action = AuditType.ACCESS, method = "보고서 정보 다운로드")
    @GetMapping(value = "/fr/0000/downloadReportDataByRDB.maxy")
    public void downloadReportDataByRDB(ReportVO vo, HttpServletRequest request, HttpServletResponse response) {
        downloadReportDataCommon(vo, request, response);
    }

    @Operation(
            summary = "에러/크래시 보고서 다운로드",
            description = "에러/크래시 리포트를 생성하여 파일로 다운로드합니다."
    )
    @ApiResponse(responseCode = "200", description = "파일 다운로드 성공", content = @Content(mediaType = "application/octet-stream"))
    @Auditable(action = AuditType.ACCESS, method = "보고서 정보(Error/Crash) 다운로드")
    @GetMapping(value = "/fr/0000/downloadErrorCrashReportData.maxy")
    public void downloadErrorCrashReportData(ReportVO vo, HttpServletRequest request, HttpServletResponse response) {
        try {
            // 앱 정보 갱신
            appSettingsService.update();
            Map<String, List<Map<String, Object>>> info = reportService.getTroubleLogList(vo);

            reportService.downloadErrorCrashReportData(vo, info, request, response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }
}
