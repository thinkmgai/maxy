package com.thinkm.common.config.audit;

import com.thinkm.common.code.CommonCode;
import com.thinkm.maxy.dto.audit.AuditLogRequestDto;
import com.thinkm.maxy.mapper.AuditLogMapper;
import com.thinkm.maxy.vo.MaxyUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {
    private final AuditLogMapper auditLogMapper;

    @Async
    public void saveAuditLog(AuditLog auditLog) {
        auditLogMapper.insertAuditLog(auditLog);
    }

    public List<AuditLog> getAuditLogList(AuditLogRequestDto dto) {
        return auditLogMapper.selectAuditLogList(AuditLog.of(dto));
    }

    public String getCurrentSessionId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return "anonymous";
        }
        return session.getId();
    }

    public String getCurrentUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return "anonymous";
        }
        Object user = session.getAttribute(CommonCode.loginUserKey());
        if (user instanceof MaxyUser) {
            return ((MaxyUser) user).getUserId();
        }
        return "anonymous";
    }

    public String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) {
            return xri.trim();
        }
        return request.getRemoteAddr();
    }

    public String getEndpoint(HttpServletRequest request) {
        return request.getRequestURI();
    }

    public AuditLog makeAuditLogByRequest(HttpServletRequest request) {
        String userId = getCurrentUserId(request);
        String sessionId = getCurrentSessionId(request);
        String url = getEndpoint(request);
        String ip = getClientIp(request);
        return AuditLog.builder()
                .issuedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")))
                .userId(userId)
                .sessionId(sessionId)
                .url(url)
                .ip(ip)
                .build();
    }
}
