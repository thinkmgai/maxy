package com.thinkm.common.util.retrace;

import com.thinkm.maxy.repository.RetraceRepository;
import com.thinkm.maxy.vo.ReTraceInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReTrace {

    @Resource
    private final RetraceRepository repository;

    @Resource
    private final ObfProGuard obfProGuard;
    @Resource
    private final ObfArxan obfArxan;

    public String convert(ReTraceInfo info, String obfuscatedString) {
        try {
            return switch (repository.getOBF_TYPE_MAP().get(info.key())) {
                case ARXAN -> obfArxan.retrace(info, obfuscatedString);
                case PROGUARD -> obfProGuard.retrace(info, obfuscatedString);
            };
        } catch (Exception ignore) {
            return obfuscatedString;
        }
    }
}
