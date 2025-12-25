package com.thinkm.common.util.retrace;

import com.thinkm.maxy.repository.RetraceRepository;
import com.thinkm.maxy.vo.ReTraceInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class ObfArxan {

    @Resource
    private final RetraceRepository retraceRepository;

    /**
     * Arxan 난독화 해제
     *
     * @param info             {@link ReTraceInfo}
     * @param obfuscatedString 난독화 문자열
     * @return retraced 문자열
     */
    protected String retrace(ReTraceInfo info, String obfuscatedString) {
        try {
            List<Map<String, String>> list = retraceRepository.getRULE_MAP().get(info.key());
            // 난독화 정보가 없으면 기존 string 을 반환
            if (list == null || list.isEmpty()) {
                return obfuscatedString;
            }

            long s1 = System.currentTimeMillis();

            String retracedString = obfuscatedString;
            // 난독화 룰을 순차적으로 읽어들여 replace
            // 순차적으로 읽어야하는 이유는 rule list 를 넣을 때
            // key 문자열 길이의 desc 로 sort 했기 때문
            for (Map<String, String> map : list) {
                for (String str : map.keySet()) {
                    retracedString = obfuscatedString.replaceAll(Pattern.quote(str), map.get(str));
                }
            }
            log.info("[RETRACE]: " + (System.currentTimeMillis() - s1) + " ms");
            return retracedString;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return obfuscatedString;
        }
    }
}
