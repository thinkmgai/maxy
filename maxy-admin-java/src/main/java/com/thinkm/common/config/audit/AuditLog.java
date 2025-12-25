package com.thinkm.common.config.audit;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.thinkm.common.util.DateUtil;
import com.thinkm.maxy.dto.audit.AuditLogRequestDto;
import lombok.*;

import java.time.LocalDateTime;

@Setter
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuditLog {
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime issuedAt;
    private String userId;
    private String sessionId;
    private AuditType action;
    private String method;
    private String url;
    private String ip;
    private String message;
    private String parameter;
    private Long duration;

    @JsonIgnore
    private LocalDateTime from;
    @JsonIgnore
    private LocalDateTime to;

    public static AuditLog of(AuditLogRequestDto dto) {
        AuditLog auditLog = new AuditLog();
        if (dto.getUserId() != null && !dto.getUserId().isBlank()) {
            auditLog.setUserId(dto.getUserId());
        }
        if (dto.getAction() != null && !dto.getAction().isBlank()) {
            auditLog.setAction(AuditType.valueOf(dto.getAction()));
        }
        if (dto.getFrom() != null && dto.getFrom() > 0) {
            auditLog.setFrom(DateUtil.convert(dto.getFrom()));
        }
        if (dto.getTo() != null && dto.getTo() > 0) {
            auditLog.setTo(DateUtil.convert(dto.getTo()));
        }
        return auditLog;
    }
}
