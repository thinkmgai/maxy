package com.thinkm.maxy.controller.common;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.ReportService;
import com.thinkm.maxy.service.common.MailService;
import com.thinkm.maxy.service.common.AppSettingsService;
import com.thinkm.maxy.vo.MailVO;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.ReportVO;
import com.thinkm.maxy.vo.ReportVO.ReportType;
import com.thinkm.maxy.vo.ScheduledMailVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 보고서 컨트롤러 공통 기능 추상 클래스
 */
@Slf4j
@RequiredArgsConstructor
public abstract class BaseReportController {

    @Resource
    protected final ReportService reportService;
    @Resource
    protected final AppSettingsService appSettingsService;
    @Autowired
    protected MailService mailService;

    @Value("${network.context-url}")
    protected String contextUrl;

    @Value("${spring.mail.host}")
    protected String host;
    @Value("${spring.mail.username}")
    protected String mailId;
    @Value("${spring.mail.password}")
    protected String mailPw;
    @Value("${spring.mail.username}")
    protected String mailFrom;

    /**
     * 특정 ReportType에 따른 데이터 조회 로직
     */
    protected Object getReportDataByType(ReportType type, ReportVO vo) {
        return switch (type) {
            case STATUS_INFO -> reportService.getStatusInfoDB(vo);
            case VERSION_SUMMARY -> reportService.getTotalVersionInfoDB(vo);
            case LOADING_SUMMARY -> reportService.getRenderingSummaryDB(vo);
            case LOADING_10 -> reportService.getRenderingTop(vo);
            case RESPONSE_SUMMARY -> reportService.getResponseSummaryDB(vo);
            case RESPONSE_10 -> reportService.getResponseTop(vo);
            case PAGEVIEW_INFO -> reportService.getPageViewInfoDB(vo);
            case ERROR_INFO -> reportService.getErrorInfo(vo);
            case CRASH_INFO -> reportService.getCrashInfo(vo);
            case TOP10_DEVICE_ERROR_INFO -> reportService.deviceErrorInfo(vo);
            case TOP10_DEVICE_CRASH_INFO -> reportService.deviceCrashInfo(vo);
            case NETWORK_ERROR_INFO -> reportService.getNetworkErrorInfo(vo); // 네트워크 에러 정보
            case NETWORK_CRASH_INFO -> reportService.getNetworkCrashInfo(vo); // 네트워크 크래시 정보
            case F_STATUS_INFO -> reportService.getFrontBasicInfo(vo);
            case F_BROWSER_10 -> reportService.getFrontPageInfoByBrowser(vo);
            case F_LOCATION_10 -> reportService.getFrontPageInfoByLocation(vo);
            case F_PAGE_LOAD_10 -> reportService.getFrontPageLoadTop10(vo);
            case F_PAGE_LOAD_WORST_10 -> reportService.getFrontPageLoadWorst10(vo);
            case F_LCP_WORST_10 -> reportService.getFrontLcpWorst10(vo);
            case F_CLS_WORST_10 -> reportService.getFrontClsWorst10(vo);
            case F_INP_WORST_10 -> reportService.getFrontInpWorst10(vo);
            case F_ERROR_PAGE_10 -> reportService.getFrontPageInfoByPageUrl(vo);
            case F_ERROR_MSG_10 -> reportService.getFrontPageInfoByErrorMsg(vo);
            case F_ERROR_NET_10 -> reportService.getFrontPageInfoByNetworkErrorMsg(vo);
        };
    }

    /**
     * 현재 컨트롤러에서 사용할 ReportType 배열을 반환
     * appType에 따라 적절한 ReportType을 반환
     */
    protected ReportVO.ReportType[] getAvailableReportTypes(ReportVO vo) {
        return ReportVO.ReportType.getReportTypesByAppType(vo.getAppType());
    }

    /**
     * 공통 보고서 데이터 조회 로직
     */
    protected Map<String, Object> getReportDataCommon(ReportVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ReportVO.ReportType[] reportTypes = getAvailableReportTypes(vo);

        // 특정 항목 단건 조회 여부
        if (vo.getType() != null) {
            String key = vo.getType().toString();
            Object tmp = getReportDataByType(vo.getType(), vo);
            resultMap.put(key, tmp);
        } else {
            Map<String, Object> tmp = new ConcurrentHashMap<>();
            // ReportType 모두 조회
            Arrays.stream(reportTypes).parallel().forEach(type ->
                    tmp.put(type.toString(), getReportDataByType(type, vo)));

            for (String key : tmp.keySet()) {
                resultMap.put(key, tmp.get(key));
            }
        }

        return resultMap;
    }

    /**
     * 공통 다운로드 로직
     */
    protected void downloadReportDataCommon(ReportVO vo, HttpServletRequest request, HttpServletResponse response
    ) {
        try {
            HashMap<String, Object> reportData = new HashMap<>();
            String[] typeList = vo.getReportType().split(",");

            for (String type : typeList) {
                // ReportType.fromType() 메서드를 직접 사용
                ReportVO.ReportType reportType = ReportVO.ReportType.fromType(type);
                reportData.put(type, getReportDataByType(reportType, vo));
            }

            reportService.downloadReportData(reportData, request, response, vo);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 공통 메일 서비스 확인 및 보고서 유형 조회
     */
    protected Map<String, Object> getReportTypeCommon(ReportVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        resultMap.put("reportType", reportService.getReportType(vo));

        if (host.isEmpty() || mailId.isEmpty() || mailPw.isEmpty() || mailFrom.isEmpty()) {
            resultMap.put("isMailService", false);
        } else {
            resultMap.put("isMailService", true);
        }

        return resultMap;
    }

    /**
     * 예약된 이메일 등록/수정 공통 로직
     * ReportController와 FrontReportController에서 공통으로 사용
     *
     * @param request HTTP 요청
     * @param vo      예약 메일 정보
     * @return 처리 결과
     */
    protected ResponseEntity<?> upsertScheduledEmailCommon(HttpServletRequest request, ScheduledMailVO vo) {
        // 필수 파라미터 검증
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getAppVer(),
                vo.getReportType(), vo.getSendStartDt(), vo.getUsagePeriod(), vo.getSendCycle(),
                vo.getSubject(), vo.getReportSubject(), vo.getToEmailListStr());

        // 사용자 세션 정보 확인
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        // 발송 종료 날짜 계산
        LocalDate sendStartDt = LocalDate.parse(vo.getSendStartDt());
        LocalDate sendEndDt = sendStartDt.plusMonths(vo.getUsagePeriod());
        vo.setSendEndDt(sendEndDt.toString());
        vo.setUserNo(user.getUserNo());

        // 등록 또는 수정 처리
        if (vo.getSeq() == null) {
            // 신규 등록
            vo.setRegDt(DateUtil.format());
            reportService.insertScheduledEmail(vo);
        } else {
            // 기존 데이터 수정
            vo.setUpdDt(DateUtil.format());
            reportService.updateScheduledEmail(vo);
        }

        return ResponseEntity.ok().build();
    }

    /**
     * 예약된 이메일 목록 조회 공통 로직
     * ReportController와 FrontReportController에서 공통으로 사용
     *
     * @param request HTTP 요청
     * @return 예약된 이메일 목록
     */
    protected ResponseEntity<?> getScheduledEmailListCommon(HttpServletRequest request) {
        Map<String, Object> resultMap = new HashMap<>();

        // 사용자 세션 정보 확인
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        // 예약된 이메일 목록 조회
        List<ScheduledMailVO> scheduledEmails = reportService.selectScheduledEmail(user.getUserNo());

        // 수신자 수 계산 및 결과 가공
        List<Map<String, Object>> emailList = reportService.scheduledEmailListReform(scheduledEmails);

        resultMap.put("emailList", emailList);
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 예약된 이메일 삭제 공통 로직
     * ReportController와 FrontReportController에서 공통으로 사용
     *
     * @param vo      삭제할 예약 메일 정보
     * @param request HTTP 요청
     * @return 삭제 후 예약된 이메일 목록
     */
    protected ResponseEntity<?> deleteScheduledEmailCommon(ScheduledMailVO vo, HttpServletRequest request) {
        // 필수 파라미터 검증
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getSeq());

        Map<String, Object> resultMap = new HashMap<>();

        // 사용자 세션 정보 확인
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        // 예약된 이메일 삭제
        reportService.deleteScheduledEmail(vo);

        // 삭제 후 예약된 이메일 목록 재조회
        List<ScheduledMailVO> scheduledEmails = reportService.selectScheduledEmail(user.getUserNo());

        // 수신자 수 계산 및 결과 가공
        List<Map<String, Object>> emailList = reportService.scheduledEmailListReform(scheduledEmails);

        resultMap.put("emailList", emailList);
        return ResponseEntity.ok(resultMap);
    }

    /**
     * PDF 리포트를 이메일로 전송하는 공통 로직
     * ReportController와 FrontReportController에서 공통으로 사용
     *
     * @param vo 리포트 요청 정보
     * @return 이메일 전송 결과
     */
    protected ResponseEntity<?> sendReportByEmailCommon(ReportVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        String appType = vo.getAppType();

        try {
            // 날짜 형식 변환
            vo.setFromDt(DateUtil.timestampToDate(vo.getFrom(), DateUtil.DATE_PATTERN));
            vo.setToDt(DateUtil.timestampToDate(vo.getTo(), DateUtil.DATE_PATTERN));
            vo.setSearchFromDt(vo.getFrom().toString());
            vo.setSearchToDt(vo.getTo().toString());

            // MailVO 생성
            MailVO mailVO = new MailVO();
            mailVO.setToEmailList(vo.getToEmailList());

            // 날짜 범위 문자열 생성
            SimpleDateFormat dateFormat = new SimpleDateFormat(DateUtil.DATE_WITH_DASH_PATTERN);
            String dateRange = dateFormat.format(new Date(vo.getFrom())) +
                               " ~ " +
                               dateFormat.format(new Date(vo.getTo()));

            // 이메일 제목 설정
            if (!vo.getEmailSubject().trim().isEmpty()) {
                mailVO.setSubject(vo.getEmailSubject());
            } else if (appType.equals(ReportVO.AppType.MAXY.getAppType())) {
                mailVO.setSubject("MAXY Report (" + dateRange + ")");
            } else if (appType.equals(ReportVO.AppType.MAXY_FRONT.getAppType())) {
                mailVO.setSubject("MAXY Front Report (" + dateRange + ")");
            }

            // 리포트 제목 설정
            if (vo.getReportSubject().trim().isEmpty() && appType.equals(ReportVO.AppType.MAXY.getAppType())) {
                // 기본 보고서 파일명
                vo.setReportSubject("MAXY_Report");
            } else if (vo.getReportSubject().trim().isEmpty() && appType.equals(ReportVO.AppType.MAXY_FRONT.getAppType())) {
                // 기본 보고서 파일명
                vo.setReportSubject("MAXY_Front_Report");
            }

            // 이메일 내용 생성
            String content = createEmailContentForReport(vo, dateRange);
            if (StringUtils.isEmpty(content)) {
                resultMap.put("success", false);
                resultMap.put("message", "이메일 템플릿 생성에 실패했습니다.");
                return ResponseEntity.ok(resultMap);
            }

            mailVO.setContent(content);

            // PDF 생성 및 이메일 전송
            ByteArrayOutputStream outputStream = reportService.createPdfReport(vo);
            boolean success = reportService.sendReportByEmail(outputStream, vo, mailVO);

            // 결과 설정
            resultMap.put("success", success);
            if (success) {
                resultMap.put("message", "이메일이 성공적으로 전송되었습니다.");
            } else {
                resultMap.put("message", "이메일 전송에 실패했습니다.");
            }

        } catch (Exception e) {
            log.error("이메일 전송 중 오류 발생: {}", e.getMessage(), e);
            resultMap.put("success", false);
            resultMap.put("message", "이메일 전송 중 오류가 발생했습니다: " + e.getMessage());
        }

        return ResponseEntity.ok(resultMap);
    }

    /**
     * 리포트 이메일 내용 생성
     *
     * @param vo        리포트 VO
     * @param dateRange 날짜 범위
     * @return 이메일 내용
     */
    private String createEmailContentForReport(ReportVO vo, String dateRange) {
        Map<String, String> contentParam = new HashMap<>();
        contentParam.put("contextUrl", contextUrl);
        contentParam.put("dateRange", dateRange);
        contentParam.put("packageNmText", vo.getPackageNmText());
        if (vo.getOsTypeText() != null) contentParam.put("osTypeText", vo.getOsTypeText());
        if (vo.getAppVerText() != null) contentParam.put("appVerText", vo.getAppVerText());

        if (vo.getAppType().equals(ReportVO.AppType.MAXY_FRONT.getAppType())) {
            return mailService.getTemplate("send-front-report.html", contentParam);
        } else {
            return mailService.getTemplate("send-report.html", contentParam);
        }
    }
}