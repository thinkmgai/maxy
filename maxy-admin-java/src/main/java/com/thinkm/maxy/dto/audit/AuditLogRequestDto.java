package com.thinkm.maxy.dto.audit;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@RequiredArgsConstructor
public class AuditLogRequestDto {
    private String userId;
    private String action;
    private Long from;
    private Long to;
}
