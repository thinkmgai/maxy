package com.thinkm.maxy.service.common;

import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.MailUtil;
import com.thinkm.maxy.vo.MailVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.mail.*;
import javax.mail.internet.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.NoSuchFileException;
import java.util.Date;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    @Value("${spring.mail.host}")
    private String host;
    @Value("${spring.mail.username}")
    private String mailId;
    @Value("${spring.mail.password}")
    private String mailPw;
    @Value("${spring.mail.username}")
    private String mailFrom;

    /**
     * 메일 발송
     *
     * @param vo MailVO
     * @return 성공여부
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            noRollbackFor = {Exception.class}
    )
    public boolean sendMail(MailVO vo) {
        boolean sendYn = false;
        // mail 정보가 없을 경우 메일을 보내지 않는다. SMTP 정보 없는 경우 !
        if (checkMailDisabled()) {
            log.info("mail info is not exist.");
            return false;
        }
        try {
            Properties props = new Properties();
            // Host 설정
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.host", host);
            props.put("mail.smtp.auth", "true");

            // Mail 보내는 사람 세팅
            Session session;

            // Mail Session 세팅
            if (StringUtils.isNotEmpty(mailId) && StringUtils.isNotEmpty(mailPw)) {
                session = Session.getDefaultInstance(props, new Authenticator() {
                    @Override
                    protected PasswordAuthentication getPasswordAuthentication() {
                        return new PasswordAuthentication(mailId, mailPw);
                    }
                });
            } else {
                session = Session.getDefaultInstance(props, null);
            }

            // 메일 메시지 세팅
            Multipart mp = new MimeMultipart();
            MimeMessage msg = new MimeMessage(session);

            // 보내는 메일 계정 세팅
            msg.setFrom(new InternetAddress(mailFrom));

            // 받는 사람
            InternetAddress[] toAddress = MailUtil.listToArray(vo.getToEmailList());
            msg.setRecipients(Message.RecipientType.TO, toAddress);
            // 참조
            InternetAddress[] ccAddress = MailUtil.listToArray(vo.getCcEmailList());
            if (ccAddress != null && ccAddress.length > 0) {
                msg.addRecipients(Message.RecipientType.CC, ccAddress);
            }
            // 숨은 참조
            InternetAddress[] bccAddress = MailUtil.listToArray(vo.getBccEmailList());
            if (bccAddress != null && bccAddress.length > 0) {
                msg.addRecipients(Message.RecipientType.BCC, bccAddress);
            }

            // 제목
            msg.setSubject(MimeUtility.encodeText(vo.getSubject(), "UTF-8", "B"));

            // 메일 내용
            MimeBodyPart mbp1 = new MimeBodyPart();
            mbp1.setContent(vo.getContent(), "text/html; charset=UTF-8");
            mp.addBodyPart(mbp1);

            // 첨부 파일 처리
            if (vo.getAttachFileList() != null && !vo.getAttachFileList().isEmpty()) {
                for (String filePath : vo.getAttachFileList()) {
                    try {
                        MimeBodyPart attachPart = new MimeBodyPart();
                        attachPart.attachFile(filePath);

                        // 파일 경로에서 파일명 추출
                        String fileName = new File(filePath).getName();

                        // 원본 파일명 복원 (임시 파일 패턴 제거)
                        if (fileName.contains(".pdf")) {
                            // 정규식을 사용하여 임시 파일 패턴 제거
                            // 임시 파일 패턴: 원본파일명_임의문자열.확장자
                            fileName = fileName.replaceAll("(_[0-9a-zA-Z]{8,})\\.", ".");
                        }

                        // 첨부 파일 이름 설정
                        attachPart.setFileName(MimeUtility.encodeText(fileName, "UTF-8", "B"));

                        mp.addBodyPart(attachPart);
                        log.info("Attached file: {}", filePath);
                    } catch (Exception e) {
                        log.error("Failed to attach file: {}", filePath, e);
                    }
                }
            }

            msg.setContent(mp);

            // 보낸 시간
            msg.setSentDate(new Date());

            // 발송
            Transport.send(msg);

            log.info("Mail Send Success: {}", vo.getToEmailList().toString());
            sendYn = true;
        } catch (Exception e) {
            log.error("Mail Send Error: {}", e.getMessage());
            log.error(e.getMessage(), e);
        }

        vo.setSendYn(sendYn ? "Y" : "N");
        vo.setSendDt(DateUtil.format());

        // todo: 추후 history 기능 있을때 까지 보류
//        try {
//            mapper.insertSendMessageHistory(vo);
//        } catch (Exception e) {
//            log.warn("message history insert 실패");
//            log.warn(e.getMessage());
//        }

        return sendYn;
    }

    /**
     * 파일 명으로 템플릿 가지고 오기
     *
     * @param fileName classpath://templates/[file name]
     * @return template
     */
    public String getTemplate(String fileName) {
        String result = "";
        try {
            InputStream is = getClass().getResourceAsStream("/templates/" + fileName);
            if (is != null) {
                InputStreamReader reader = new InputStreamReader(is);
                Stream<String> stream = new BufferedReader(reader).lines();
                result = stream.collect(Collectors.joining(System.lineSeparator()));
            } else {
                throw new NoSuchFileException(fileName);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    /**
     * 파일 명으로 템플릿을 가지고와서 param 넣어 출력
     *
     * @param fileName  classpath://templates/[file name]
     * @param mailParam Map<String, String>
     * @return param 까지 넣어진 메일 템플릿
     */
    public String getTemplate(String fileName, Map<String, String> mailParam) {
        String result = getTemplate(fileName);
        if (!mailParam.isEmpty()) {
            final String prefix = "\\$\\{";
            final String suffix = "}";
            for (String param : mailParam.keySet()) {
                String value = Matcher.quoteReplacement(mailParam.get(param));
                result = result.replaceAll(prefix + param + suffix, value);
            }
        }
        return result;
    }

    /**
     * 메일 서비스 사용여부 반환
     *
     * @return 사용할 수 없음: true, 사용할 수 있음: false
     */
    public boolean checkMailDisabled() {
        return host == null || host.isEmpty()
                || mailId == null || mailId.isEmpty()
                || mailPw == null || mailPw.isEmpty();
    }
}
