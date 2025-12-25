package com.thinkm.common.exception;

import com.thinkm.common.util.CommonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.security.InvalidKeyException;
import java.util.HashMap;
import java.util.Map;

import static com.thinkm.common.code.ReturnCode.*;

@Slf4j
@RequiredArgsConstructor
@RestControllerAdvice(basePackages = "com.thinkm.maxy.controller")
public class ExceptionAdvice {

    @Value("${security.pass.error-count:5}")
    private int passCnt;
    @Value("${security.pass.expire-date:90}")
    private int expireDate;
    @Value("${security.otp.enabled:false}")
    private boolean useOtp;

    @ExceptionHandler({Exception.class})
    public ResponseEntity<?> defaultException(Exception e) {
        log.error(e.getMessage(), e);

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", INTERNAL_SERVER_ERROR.getMsg());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(resultMap);
    }

    @ExceptionHandler({BadRequestException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<?> badRequestException(Exception e) {
        Map<String, Object> resultMap = new HashMap<>();
        String msg;
        String m1 = e.getMessage();
        // 에러 메시지가 null, 혹은 비어 있으면
        if (m1 == null || m1.isEmpty()) {
            // 기본 메시지
            msg = ERR_EMPTY_PARAMS.getMsg();
        } else {
            msg = m1;
        }
        resultMap.put("msg", msg);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resultMap);
    }

    @ExceptionHandler({InvalidKeyException.class})
    public ResponseEntity<?> invalidKeyException(Exception e) {
        log.error(e.getMessage(), e);

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", ERR_EXPIRE_SESSION.getMsg());

        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(resultMap);
    }


    @ExceptionHandler({DuplicateKeyException.class, ConflictException.class})
    public ResponseEntity<?> duplicateKeyException(Exception e) {
        Map<String, Object> resultMap = new HashMap<>();
        String msg;
        String m1 = e.getMessage();
        // 에러 메시지가 null, 혹은 비어 있으면
        if (m1 == null || m1.isEmpty()) {
            // 기본 메시지
            msg = ERR_DUPL_VALUE.getMsg();
        } else {
            msg = m1;
        }
        resultMap.put("msg", msg);

        return ResponseEntity.status(HttpStatus.CONFLICT).body(resultMap);
    }

    @ExceptionHandler({AuthException.class})
    public ResponseEntity<?> authException(Exception e) {

        String messageArgs = null;

        // 비밀번호 실패 카운트 config 에서 가져옴
        if (ERR_PASSCNT_OVER.equals(e.getMessage())) {
            messageArgs = String.valueOf(passCnt);
        }
        // 비밀번호 만료 일자 config 에서 가져옴
        else if (ERR_UPT_PW_OVER.equals(e.getMessage())) {
            messageArgs = String.valueOf(expireDate);
        }

        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", e.getMessage() + (messageArgs == null ? "" : "." + messageArgs));

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(resultMap);
    }

    @ExceptionHandler({NoMailInfoException.class})
    public ResponseEntity<?> noMailInfoException() {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", ERR_NO_INFO_EMAIL.getMsg());

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(resultMap);
    }

    @ExceptionHandler({ForbiddenException.class})
    public ResponseEntity<?> forbiddenException() {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", ERR_NO_GRANTS);

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(resultMap);
    }


    @ExceptionHandler({FileParseException.class})
    public ResponseEntity<?> fileParseException(Exception e) {
        Map<String, Object> resultMap = new HashMap<>();
        if (!e.getMessage().isEmpty()) {
            log.debug("e.getMessage{}", e.getMessage());
            String[] tmp = e.getMessage().split("::");
            resultMap.put("msg", "(" + tmp[1] + ") " + tmp[0]);
            resultMap.put("line", tmp[1]);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resultMap);
    }

    @ExceptionHandler({MalformedInputException.class})
    public ResponseEntity<?> malformedInputException(Exception e) {
        log.error(e.getMessage(), e);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", ERR_WRONG_FILE_FORMAT.getMsg());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resultMap);
    }

    @ExceptionHandler({ArrayIndexOutOfBoundsException.class})
    public ResponseEntity<?> arrayIndexOutOfBoundsException(Exception e) {
        log.error(e.getMessage(), e);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", ERR_EMPTY_FILE.getMsg());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resultMap);
    }

    @ExceptionHandler({ReadFileException.class})
    public ResponseEntity<?> readFileException(Exception e) {
        log.error(e.getMessage(), e);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", ERR_READ_FILE.getMsg());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resultMap);
    }

    @ExceptionHandler({TooManyBucketException.class})
    public ResponseEntity<?> tooManyBucketException(Exception e) {
        log.error(e.getMessage(), e);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", ERR_TOO_MANY_BUCKETS.getMsg());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resultMap);
    }

    @ExceptionHandler({NotFoundException.class})
    public ResponseEntity<?> notFoundException(Exception e) {
        log.error(e.getMessage(), e);
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("msg", e.getMessage());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resultMap);
    }

    @ExceptionHandler({NeedOtpInfo.class})
    public ResponseEntity<?> needOtpInfo(NeedOtpInfo e) {
        Map<String, Object> result = CommonUtil.convertDtoToMap(e.getDto());
        result.put("msg", e.getMessage());
        return ResponseEntity.status(HttpStatus.OK).body(Map.of("msg", result));
    }

    @ExceptionHandler({NeedOtpReg.class})
    public ResponseEntity<?> needOtpReg(NeedOtpReg e) {
        Map<String, Object> result = CommonUtil.convertDtoToMap(e.getDto());
        result.put("msg", e.getMessage());
        return ResponseEntity.status(HttpStatus.OK).body(Map.of("msg", result));
    }

    @ExceptionHandler({OtpException.class})
    public ResponseEntity<?> OtpException(OtpException e) {
        if (e.getDto() != null) {
            Map<String, Object> result = CommonUtil.convertDtoToMap(e.getDto());
            result.put("msg", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("msg", result));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("msg", e.getMessage()));
        }
    }
}
