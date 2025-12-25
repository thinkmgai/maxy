package com.thinkm.common.config.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditLogAspect {

    private final AuditLogService auditLogService;
    private final HttpServletRequest request;

    @Value("${security.audit.enabled:false}")
    private boolean enabled;

    @Pointcut("@annotation(com.thinkm.common.config.audit.Auditable)")
    public void auditableMethods() {

    }

    @Around("auditableMethods()")
    public Object logAuditInfo(ProceedingJoinPoint joinPoint) throws Throwable {
        // audit log 사용하지 않으면 즉시 반환
        if (!enabled) {
            return joinPoint.proceed();
        }

        AuditType action = null;
        String methodName = null;
        try {
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Auditable auditable = signature.getMethod().getAnnotation(Auditable.class);

            action = auditable.action();
            String method = auditable.method();

            // 기능명
            methodName = "";
            if (!method.isBlank()) {
                methodName = method;
            } else if (action.equals(AuditType.NAVIGATION)) {
                String signatureName = signature.toShortString();
                methodName = signatureName.replaceFirst("go", "");
                methodName = methodName.replaceFirst("\\.maxy*", "");
            }
        } catch (Exception e) {
            log.error("Failed to get audit log info: {}", e.getMessage(), e);
        }

        // TODO: request body (vo) hooking

        long start = System.currentTimeMillis();
        Object result = joinPoint.proceed(); // 실제 메서드 실행
        long end = System.currentTimeMillis();

        // 로그인 유저 정보
        try {
            AuditLog auditLog = auditLogService.makeAuditLogByRequest(request);
            auditLog.setDuration(end - start);
            auditLog.setMethod(methodName);
            auditLog.setAction(action);

            auditLogService.saveAuditLog(auditLog);
        } catch (Exception e) {
            log.error("Failed to save audit log: {}", e.getMessage(), e);
        }

        return result;
    }
}
