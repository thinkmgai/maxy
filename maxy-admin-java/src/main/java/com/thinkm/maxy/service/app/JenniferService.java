package com.thinkm.maxy.service.app;

import com.google.gson.reflect.TypeToken;
import com.thinkm.common.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.lang.reflect.Type;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JenniferService {
    private static final Type typeToken = new TypeToken<HashMap<String, List<Map<String, Object>>>>() {
    }.getType();
    private final RestTemplate restTemplate;
    @Value("${network.jennifer.url}")
    private String url;
    @Value("${network.jennifer.token}")
    private String token;

    private String jenniferUrl;

    @PostConstruct
    public void init() {
        // Jennifer 연동
        if (url != null && token != null && !url.isBlank() && !token.isBlank()) {
            log.info("Jennifer integration: {}, {}", url, token);
            jenniferUrl = url + "/api/transaction/txid?domain_id=[jdomain]&time=[jtime]&txid=[jtxid]&token=" + token;
        }
    }

    /**
     * Jennifer 서버와 통신하여 결과값 반환
     *
     * @param domain logDetail 의 jdomain
     * @param time   logDetail 의 jtime
     * @param txid   logDetail 의 jtxid
     * @return 결과 map, 데이터 없으면 빈 map
     */
    public Map<String, Object> get(String domain, String time, String txid) {
        if (jenniferUrl == null || jenniferUrl.isBlank()) {
            return Collections.emptyMap();  // 빈 Map을 반환해 불변성 유지
        }

        if (domain == null || domain.isBlank()
            || time == null || time.isBlank()
            || txid == null || txid.isBlank()) {
            return Collections.emptyMap();
        }

        // URI 템플릿을 동적으로 설정
        String uri = jenniferUrl
                .replace("[jdomain]", domain)
                .replace("[jtime]", time)
                .replace("[jtxid]", txid);

        log.debug("Request URI: {}", uri);

        try {
            // HTTP GET 요청 전송
            ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);

            // HTTP 상태 코드가 200인 경우에만 처리
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.debug("Response Body: {}", response.getBody());

                // JSON 응답을 Map으로 파싱
                Map<String, List<Map<String, Object>>> parsedResult = JsonUtil.fromJson(response.getBody(), typeToken);

                // 결과 리스트가 비어있지 않은 경우 첫 번째 항목 반환
                List<Map<String, Object>> list = parsedResult.get("result");
                return (list != null && !list.isEmpty()) ? Collections.unmodifiableMap(list.get(0)) : Collections.unmodifiableMap(parsedResult);
            } else {
                log.warn("Response status code: {}", response.getStatusCodeValue());
            }
        } catch (Exception e) {
            log.error("Error retrieving data from Jennifer: ", e);
        }

        // 실패하거나 예외 발생 시 빈 결과 반환
        return Collections.emptyMap();
    }
}
