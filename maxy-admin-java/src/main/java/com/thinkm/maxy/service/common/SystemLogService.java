package com.thinkm.maxy.service.common;

import com.google.gson.reflect.TypeToken;
import com.thinkm.common.code.system.ContainerStatus;
import com.thinkm.common.code.system.ProgramType;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.mapper.SystemLogMapper;
import com.thinkm.maxy.service.app.RedisService;
import com.thinkm.maxy.vo.ExceptLogVO;
import com.thinkm.maxy.vo.SystemLogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.DependsOn;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.annotation.Resource;
import java.lang.reflect.Type;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@DependsOn({"elasticSearchTemplate"}) // elasticClient 에 config 를 설정하는 bean 에 의존
public class SystemLogService {
    private static final Type typeToken = new TypeToken<List<ContainerStatus>>() {
    }.getType();

    @Resource
    private final SystemLogMapper mapper;

    @Resource
    private final RestTemplate restTemplate;
    @Resource
    private final RedisService redisService;

    @Value("${network.pulse.url:N}")
    private String pulseUrl;

    /**
     * 시스템 로그 목록 조회
     *
     * @param vo {@link ExceptLogVO}
     * @return exceptLogList
     */
    public List<SystemLogVO> getSystemLogList(SystemLogVO vo) {
        return mapper.selectSystemLogList(vo);
    }

    public List<Map<String, Object>> getSystemHealth(
            String programName,
            int nodeNumber,
            String logType
    ) {
        Map<String, Map<Long, Integer>> intermediate = new HashMap<>();

        try {
            Set<String> keySet = redisService.keys("sys:" + programName + ":" + nodeNumber + ":*:" + logType + ":*");
            if (keySet.isEmpty()) {
                return Collections.emptyList();
            }

            List<String> keys = new ArrayList<>(keySet);
            Collections.sort(keys); // timestamp 오름차순 정렬
            List<Object> values = redisService.get(keys);

            if (values == null || values.size() != keys.size()) {
                log.warn("Redis get result size mismatch. keys: {}, values: {}", keys.size(), values != null ? values.size() : -1);
            }

            int limit = Math.min(keys.size(), values != null ? values.size() : 0);
            for (int i = 0; i < limit; i++) {
                String key = keys.get(i);
                Object val = values.get(i);

                if (val == null) {
                    log.warn("{} value is null.", key);
                    continue;
                }

                String[] parts = key.split(":");
                if (parts.length != 6) {
                    log.warn("{} part is incorrect.", key);
                    continue;
                }

                String name = parts[3];
                long timestamp;
                try {
                    timestamp = Long.parseLong(parts[5]);
                } catch (NumberFormatException e) {
                    log.warn("Invalid timestamp in key: {}", key);
                    continue;
                }

                int intVal;
                try {
                    intVal = Integer.parseInt(val.toString());
                } catch (NumberFormatException e) {
                    log.warn("Invalid value in redis: {}", val);
                    continue;
                }

                Map<Long, Integer> dataMap = intermediate.computeIfAbsent(name, k -> new TreeMap<>());
                dataMap.put(timestamp, intVal);
            }
        } catch (Exception e) {
            log.error("getSystemHealth failed: {}", e.getMessage(), e);
        }

        // 기준 시간
        long now = System.currentTimeMillis();
        long interval = 60_000; // 1분

        List<Map<String, Object>> result = new ArrayList<>();

        for (Map.Entry<String, Map<Long, Integer>> entry : intermediate.entrySet()) {
            Map<Long, Integer> dataMap = entry.getValue();
            if (dataMap.isEmpty()) {
                continue;
            }

            List<List<Object>> dataList = new ArrayList<>();
            long end = now - (now % interval); // 가장 가까운 1분
            long start = end - (24 * 60 * interval); // 24시간 전

            for (long ts = start; ts <= end; ts += interval) {
                int value = dataMap.getOrDefault(ts, 0);
                dataList.add(List.of(ts, value));
            }

            Map<String, Object> row = new HashMap<>();
            row.put("name", entry.getKey());
            row.put("data", dataList);
            result.add(row);
        }

        return result;
    }

    /**
     * Infra Service 정상적으로 올라와 있는지 체크
     */
    public Map<String, Boolean> check() {
        if ("N".equals(pulseUrl)) {
            return Collections.emptyMap();
        }
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(pulseUrl + "/summary", String.class);
            String body = response.getBody();
            log.debug("body: {}", body);
            List<ContainerStatus> list = JsonUtil.fromJson(body, typeToken);

            log.debug("response: {}", list);

            return ProgramType.toMap(list);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return Collections.emptyMap();
        }
    }
}