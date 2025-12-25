package com.thinkm.common.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@Aspect
public class AopConfig {

    @Around("execution(* com.thinkm.maxy.controller..go*(..)) "
            + "|| execution(* com.thinkm.maxy.controller.front..view*(..))"
            + "|| execution(* com.thinkm.maxy.controller..getSessionInfo*(..))"
    )
    public Object logPage(ProceedingJoinPoint joinPoint) throws Throwable {
        return logExecutionTime(joinPoint, "PAGE");
    }

    @Around("execution(* com.thinkm.maxy.controller.front..*(..))"
            + "&& !execution(* com.thinkm.maxy.controller.front..view*(..)) ")
    public Object logFrontController(ProceedingJoinPoint joinPoint) throws Throwable {
        return logExecutionTime(joinPoint, "CONTROLLER");
    }

    @Around("execution(* com.thinkm.maxy.service.front..*(..))")
    public Object logFrontService(ProceedingJoinPoint joinPoint) throws Throwable {
        return logExecutionTime(joinPoint, "SERVICE");
    }

    private Object logExecutionTime(ProceedingJoinPoint joinPoint, String prefix) throws Throwable {
        long startTime = System.currentTimeMillis();
        try {
            return joinPoint.proceed();
        } catch (Throwable ex) {
            log.error("[EXCEPTION DURING {}] {} after {} ms", prefix, joinPoint.getSignature().toShortString(), System.currentTimeMillis() - startTime, ex);
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            if (duration > 1000) {
                log.warn("[ELAPSED {} SLOW] {}: {} ms", prefix, joinPoint.getSignature().toShortString(), duration);
            } else {
                log.info("[ELAPSED {}] {}: {} ms", prefix, joinPoint.getSignature().toShortString(), duration);
            }
        }
    }
}
