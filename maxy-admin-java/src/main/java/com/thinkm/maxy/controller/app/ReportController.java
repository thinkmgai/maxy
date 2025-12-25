package com.thinkm.maxy.controller.app;

import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.DateUtil;
import com.thinkm.maxy.controller.common.BaseReportController;
import com.thinkm.maxy.service.common.AppSettingsService;
import com.thinkm.maxy.service.app.ReportService;
import com.thinkm.maxy.service.app.ScheduledReportService;
import com.thinkm.maxy.vo.ReportVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.thinkm.maxy.vo.ScheduledMailVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.*;

/**
 * 보고서 컨트롤러
 */
@Slf4j
@RestController
@Tag(name = "Report Controller", description = "보고서 API 컨트롤러")
public class ReportController extends BaseReportController {

    private final ScheduledReportService scheduledReportService;

    public ReportController(ReportService reportService, AppSettingsService appSettingsService,
            ScheduledReportService scheduledReportService) {
        super(reportService, appSettingsService);
        this.scheduledReportService = scheduledReportService;
    }

    /**
     * 보고서 페이지 이동
     *
     * @return RT0000 jsp
     */
    @Operation(summary = "보고서 페이지 이동",
            description = "MAXY 보고서 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "보고서 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "보고서")
    @GetMapping(value = "/rt/0000/goReportView.maxy")
    public ModelAndView goReportView() {
        return new ModelAndView("rt/RT0001");
    }

    /**
     * 보고서 데이터 조회
     */
    @Operation(summary = "보고서 데이터 조회",
            description = "선택한 조건으로 보고서 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "보고서 데이터를 반환합니다."))
    @PostMapping(value = "/rt/0000/getReportData.maxy")
    public ResponseEntity<?> getReportData(ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY.getAppType());
        return ResponseEntity.ok(getReportDataCommon(vo));
    }

    @Override
    protected ReportVO.ReportType[] getAvailableReportTypes(ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY.getAppType());
        // 일반 보고서 컨트롤러는 MAXY 타입만 사용
        return ReportVO.ReportType.getReportTypesByAppType(ReportVO.AppType.MAXY);
    }

    @Operation(summary = "보고서 데이터 다운로드",
            description = "보고서 데이터를 RDB 기반으로 다운로드합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "파일 다운로드를 시작합니다."))
    @Auditable(action = AuditType.ACCESS, method = "보고서 정보 다운로드")
    @GetMapping(value = "/rt/0000/downloadReportDataByRDB.maxy")
    public void downloadReportDataByRDB(
            ReportVO vo,
            HttpServletRequest request,
            HttpServletResponse response) {
        downloadReportDataCommon(vo, request, response);
    }

    @Operation(summary = "에러/크래시 보고서 다운로드",
            description = "에러 및 크래시 정보를 포함한 보고서를 다운로드합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "파일 다운로드를 시작합니다."))
    @Auditable(action = AuditType.ACCESS, method = "보고서 정보(Error/Crash) 다운로드")
    @GetMapping(value = "/rt/0000/downloadErrorCrashReportData.maxy")
    public void downloadErrorCrashReportData(
            ReportVO vo,
            HttpServletRequest request,
            HttpServletResponse response) {
        try {
            // 앱 정보 갱신
            appSettingsService.update();
            Map<String, List<Map<String, Object>>> info = reportService.getTroubleLogList(vo);

            reportService.downloadErrorCrashReportData(vo, info, request, response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 보고서 유형 조회 및 SMTP연결 정보 확인
     */
    @Operation(summary = "보고서 유형 조회",
            description = "사용 가능한 보고서 유형과 SMTP 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "보고서 유형 목록을 반환합니다."))
    @PostMapping(value = "/rt/0000/getReportType.maxy")
    public ResponseEntity<?> getReportType(ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY.getAppType());
        return ResponseEntity.ok(getReportTypeCommon(vo));
    }

    // PDF를 Base64로 변환하여 화면에서 보여주기
    @Operation(summary = "PDF 보고서 조회",
            description = "보고서를 PDF로 생성해 Base64로 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "PDF 스트림을 반환합니다."))
    @GetMapping(value = "/rt/0000/maxyReport.maxy")
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
     * PDF 리포트를 이메일로 전송
     * BaseReportController의 공통 로직 사용
     *
     * @param vo 리포트 요청 정보
     * @return 이메일 전송 결과
     */
    @Operation(summary = "PDF 보고서 이메일 전송",
            description = "PDF 보고서를 이메일로 전송합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "메일 발송 결과를 반환합니다."))
    @Auditable(action = AuditType.ACCESS, method = "PDF 리포트를 이메일로 전송")
    @PostMapping(value = "/rt/0000/sendReportByEmail.maxy")
    public ResponseEntity<?> sendReportByEmail(ReportVO vo) {
        vo.setAppType(ReportVO.AppType.MAXY.getAppType());
        return sendReportByEmailCommon(vo);
    }

    /**
     * 예약된 리포트 메일 발송 (수동 실행용)
     * 실제 스케줄링은 ScheduledReportService에서 처리됨
     *
     * @return 발송 결과
     */
    @Operation(summary = "예약 리포트 수동 발송",
            description = "예약된 리포트 메일을 즉시 발송합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수동 발송 결과를 반환합니다."))
    @PostMapping(value = "/rt/0000/sendScheduledReports.maxy")
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
     * PDF 리포트 이메일 예약 등록/수정
     * BaseReportController의 공통 로직 사용
     *
     * @param request HTTP 요청
     * @param vo 예약 메일 정보
     * @return 처리 결과
     */
    @Operation(summary = "PDF 리포트 이메일 예약 등록",
            description = "보고서 이메일 예약을 등록하거나 수정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "예약 저장 결과를 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "PDF 리포트 이메일 예약 등록")
    @PostMapping(value = "/rt/0000/upsertScheduledEmail.maxy")
    public ResponseEntity<?> upsertScheduledEmail(HttpServletRequest request, ScheduledMailVO vo) {
        return upsertScheduledEmailCommon(request, vo);
    }

    /**
     * 예약된 이메일 목록 조회
     * BaseReportController의 공통 로직 사용
     *
     * @param request HTTP 요청
     * @return 예약된 이메일 목록
     */
    @Operation(summary = "예약된 이메일 목록 조회",
            description = "등록된 보고서 이메일 예약 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "예약된 이메일 목록을 반환합니다."))
    @PostMapping(value = "/rt/0000/getScheduledEmailList.maxy")
    public ResponseEntity<?> getScheduledEmailList(HttpServletRequest request) {
        return getScheduledEmailListCommon(request);
    }

    /**
     * 예약된 이메일 삭제
     * BaseReportController의 공통 로직 사용
     *
     * @param vo 삭제할 예약 메일 정보
     * @param request HTTP 요청
     * @return 삭제 후 예약된 이메일 목록
     */
    @Operation(summary = "예약된 이메일 삭제",
            description = "선택한 보고서 이메일 예약을 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 예약 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "PDF 리포트 예약된 이메일 삭제")
    @PostMapping(value = "/rt/0000/deleteScheduledEmail.maxy")
    public ResponseEntity<?> deleteScheduledEmail(ScheduledMailVO vo, HttpServletRequest request) {
        return deleteScheduledEmailCommon(vo, request);
    }
}
