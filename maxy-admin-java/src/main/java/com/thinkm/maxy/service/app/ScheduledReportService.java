package com.thinkm.maxy.service.app;

import com.thinkm.common.util.DateUtil;
import com.thinkm.maxy.service.common.MailService;
import com.thinkm.maxy.vo.MailVO;
import com.thinkm.maxy.vo.ReportVO;
import com.thinkm.maxy.vo.ScheduledMailVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * 예약된 리포트 메일 발송을 담당하는 서비스
 * 스케줄링 기능을 별도로 분리하여 중복 실행을 방지
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledReportService {

    private final ReportService reportService;
    
    @Autowired
    private MailService mailService;

    @Value("${network.context-url}")
    private String contextUrl;

    /**
     * 매일 오전 12시에 예약된 리포트 메일 발송
     * <p>
     * cron 표현식: 초 분 시 일 월 요일
     * 0 0 12 * * * = 매일 오후 12시 0분 0초
     * 
     * 이 메서드는 ReportController와 FrontReportController에서 공통으로 사용되며,
     * 스케줄링은 한 번만 실행되도록 설계됨
     */
    @Scheduled(cron = "0 0 12 * * *")
    public void sendScheduledReports() {
        log.info("예약 리포트 메일 발송 작업 시작");

        try {
            // 예약 리포트 수신자 목록 조회
            List<ScheduledMailVO> recipients = reportService.selectActiveScheduledEmail();

            if (recipients == null || recipients.isEmpty()) {
                log.info("예약 리포트 수신자가 없습니다.");
                return;
            }

            log.info("예약 리포트 수: {}", recipients.size());

            // 예약 요청별로 PDF 한 번만 생성하고 모든 수신자에게 발송
            for (ScheduledMailVO recipient : recipients) {
                try {
                    processScheduledReport(recipient);
                } catch (Exception e) {
                    log.error("개별 리포트 생성 중 오류 발생: {}", e.getMessage(), e);
                }
            }

            log.info("예약 리포트 메일 발송 작업 완료");
        } catch (Exception e) {
            log.error("예약 리포트 메일 발송 작업 중 오류 발생: {}", e.getMessage(), e);
        }
    }

    /**
     * 개별 예약 리포트 처리
     * ReportController와 FrontReportController에서 공통으로 사용할 수 있는 메서드
     * 
     * @param recipient 예약 메일 정보
     */
    public void processScheduledReport(ScheduledMailVO recipient) {
        try {
            // 리포트 요청 정보 생성
            ReportVO reportVO = createReportVO(recipient);
            
            // 발송 주기 확인
            if (!shouldSendReport(recipient)) {
                log.debug("발송 주기가 아님: {}", recipient.getSendCycle());
                return;
            }

            // PDF 생성
            ByteArrayOutputStream pdfStream = reportService.createPdfReport(reportVO);

            // 이메일 발송
            boolean success = sendReportEmail(pdfStream, reportVO, recipient);

            if (success) {
                log.info("예약 리포트 메일 발송 성공: {}", recipient.getToEmailListStr());
            } else {
                log.error("예약 리포트 메일 발송 실패: {}", recipient.getToEmailListStr());
            }

            // 리소스 정리
            closeStream(pdfStream);

        } catch (Exception e) {
            log.error("예약 리포트 처리 중 오류 발생: {}", e.getMessage(), e);
        }
    }

    /**
     * 예약 메일 정보를 기반으로 ReportVO 생성
     * 
     * @param recipient 예약 메일 정보
     * @return 생성된 ReportVO
     */
    private ReportVO createReportVO(ScheduledMailVO recipient) {
        ReportVO reportVO = new ReportVO();

        // 날짜 설정
        setReportDates(reportVO, recipient.getSendCycle());

        // 패키지, OS, 앱 버전 설정
        reportVO.setPackageNm(recipient.getPackageNm());
        reportVO.setServerType(recipient.getServerType());
        reportVO.setOsType(recipient.getOsType());
        reportVO.setAppVer(recipient.getAppVer());
        reportVO.setPackageNmText(recipient.getPackageNmText());
        reportVO.setOsTypeText(recipient.getOsTypeText());
        reportVO.setAppVerText(recipient.getAppVerText());
        reportVO.setLocale(recipient.getLocale());

        // 리포트 유형 및 제목 설정
        reportVO.setReportType(recipient.getReportType());
        reportVO.setReportSubject(recipient.getReportSubject());

        return reportVO;
    }

    /**
     * 발송 주기에 따른 날짜 설정
     * 
     * @param reportVO 리포트 VO
     * @param sendCycle 발송 주기
     */
    private void setReportDates(ReportVO reportVO, String sendCycle) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());

        long fromTimestamp;
        long toTimestamp = ZonedDateTime
                .of(now.plusDays(-1).toLocalDate(), LocalTime.MAX, ZoneId.systemDefault())
                .toInstant().toEpochMilli();

        // 발송 주기에 따른 시작 날짜 계산
        switch (sendCycle) {
            case "7d":
                fromTimestamp = ZonedDateTime
                        .of(now.plusDays(-7).toLocalDate(), LocalTime.MIDNIGHT, ZoneId.systemDefault())
                        .toInstant().toEpochMilli();
                break;
            case "1M":
                fromTimestamp = ZonedDateTime
                        .of(now.plusMonths(-1).toLocalDate(), LocalTime.MIDNIGHT, ZoneId.systemDefault())
                        .toInstant().toEpochMilli();
                break;
            case "3M":
                fromTimestamp = ZonedDateTime
                        .of(now.plusMonths(-3).toLocalDate(), LocalTime.MIDNIGHT, ZoneId.systemDefault())
                        .toInstant().toEpochMilli();
                break;
            default: // "1d"
                fromTimestamp = ZonedDateTime
                        .of(now.plusDays(-1).toLocalDate(), LocalTime.MIDNIGHT, ZoneId.systemDefault())
                        .toInstant().toEpochMilli();
                break;
        }

        // 날짜 형식 변환
        reportVO.setFrom(fromTimestamp);
        reportVO.setTo(toTimestamp);
        reportVO.setFromDt(DateUtil.timestampToDate(fromTimestamp, DateUtil.DATE_PATTERN));
        reportVO.setToDt(DateUtil.timestampToDate(toTimestamp, DateUtil.DATE_PATTERN));
        reportVO.setSearchFromDt(String.valueOf(fromTimestamp));
        reportVO.setSearchToDt(String.valueOf(toTimestamp));

        // 날짜 차이 계산
        long diffMillis = Math.abs(toTimestamp - fromTimestamp);
        long diff = TimeUnit.MILLISECONDS.toDays(diffMillis) + 1L;
        reportVO.setDiff((int) diff);
    }

    /**
     * 발송 주기 확인
     * 
     * @param recipient 예약 메일 정보
     * @return 발송 여부
     */
    private boolean shouldSendReport(ScheduledMailVO recipient) {
        String sendCycle = recipient.getSendCycle();
        LocalDate today = LocalDate.now();
        LocalDate sendStartDt = LocalDate.parse(recipient.getSendStartDt());

        log.debug("sendCycle: {}, sendStartDt: {}", sendCycle, sendStartDt);

        // 지정한 발송 주기가 아니면 메일을 보내지 않음
        if (!today.equals(sendStartDt)) {
            if ("7d".equals(sendCycle) && !DateUtil.isWeeklyInterval(sendStartDt, today)) {
                return false;
            } else if ("1M".equals(sendCycle) && !DateUtil.isMonthlyInterval(sendStartDt, today, 1)) {
                return false;
            } else if ("3M".equals(sendCycle) && !DateUtil.isMonthlyInterval(sendStartDt, today, 3)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 리포트 이메일 발송
     * 
     * @param pdfStream PDF 스트림
     * @param reportVO 리포트 VO
     * @param recipient 예약 메일 정보
     * @return 발송 성공 여부
     */
    private boolean sendReportEmail(ByteArrayOutputStream pdfStream, ReportVO reportVO, ScheduledMailVO recipient) {
        try {
            // 이메일 수신자 설정
            List<String> toEmailList = Arrays.asList(recipient.getToEmailListStr().split(","));

            // 날짜 범위 문자열 생성
            SimpleDateFormat dateFormat = new SimpleDateFormat(DateUtil.DATE_WITH_DASH_PATTERN);
            String dateRange = dateFormat.format(new Date(reportVO.getFrom())) +
                    " ~ " +
                    dateFormat.format(new Date(reportVO.getTo()));

            // MailVO 생성
            MailVO mailVO = new MailVO();
            mailVO.setToEmailList(toEmailList);
            mailVO.setSubject(recipient.getSubject());

            // 이메일 내용 설정
            String content = createEmailContent(reportVO, dateRange);
            if (StringUtils.isEmpty(content)) {
                log.error("이메일 템플릿 생성 실패");
                return false;
            }

            mailVO.setContent(content);

            // PDF 첨부 및 이메일 발송
            return reportService.sendReportByEmail(pdfStream, reportVO, mailVO);

        } catch (Exception e) {
            log.error("이메일 발송 중 오류 발생: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 이메일 내용 생성
     * 
     * @param reportVO 리포트 VO
     * @param dateRange 날짜 범위
     * @return 이메일 내용
     */
    private String createEmailContent(ReportVO reportVO, String dateRange) {
        Map<String, String> contentParam = new HashMap<>();
        contentParam.put("contextUrl", contextUrl);
        contentParam.put("dateRange", dateRange);
        contentParam.put("packageNmText", reportVO.getPackageNmText());
        if (reportVO.getOsTypeText() != null) contentParam.put("osTypeText", reportVO.getOsTypeText());
        if (reportVO.getAppVerText() != null) contentParam.put("appVerText", reportVO.getAppVerText());

        return mailService.getTemplate("send-report.html", contentParam);
    }

    /**
     * 스트림 리소스 정리
     * 
     * @param stream 닫을 스트림
     */
    private void closeStream(ByteArrayOutputStream stream) {
        try {
            if (stream != null) {
                stream.close();
            }
        } catch (IOException e) {
            log.error("PDF 스트림 닫기 실패: {}", e.getMessage(), e);
        }
    }
}