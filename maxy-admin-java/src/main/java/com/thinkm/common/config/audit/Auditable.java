package com.thinkm.common.config.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    AuditType action(); // "LOGIN", "LOGOUT", "INSERT", "DELETE" 등

    String method() default "";
}
