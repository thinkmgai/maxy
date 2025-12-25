package com.thinkm.maxy.mapper;

import com.thinkm.common.config.audit.AuditLog;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface AuditLogMapper {
    void insertAuditLog(AuditLog auditLog);

    List<AuditLog> selectAuditLogList(AuditLog of);
}
