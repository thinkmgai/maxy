package com.thinkm.maxy.service.app;

import com.thinkm.maxy.dto.app.dashboard.DashboardIntegrationResponseDto;
import com.thinkm.maxy.mapper.DashboardIntegrationMapper;
import com.thinkm.maxy.model.AppInfo;
import com.thinkm.maxy.vo.AppInfoVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardIntegrationService {
    private static final String REDIS_KEY_PREFIX = "biInfo";
    private static final Set<String> TYPE_SET = Set.of(
            "appConnectCount",
            "appCrashCount",
            "appErrorCount",
            "appMauCount"
    );
    private final DashboardIntegrationMapper mapper;
    private final RedisService redisService;

    public List<AppInfo> getAppList(Long userNo) {
        List<AppInfo> result = new ArrayList<>();
        List<AppInfoVO> apps = mapper.selectAppInfoList(AppInfoVO.builder().userNo(userNo).build());
        apps.forEach(app -> {
            result.add(new AppInfo(app.getPackageNm(), app.getServerType()));
        });
        return result;
    }

    public DashboardIntegrationResponseDto getInfo(List<AppInfo> apps) {
        List<String> keys = new ArrayList<>();
        for (AppInfo app : apps) {
            for (String type : TYPE_SET) {
                String key = String.join(":", REDIS_KEY_PREFIX, app.getPackageNm(), app.getServerType(), "A", type);
                keys.add(key);
            }
        }
        log.info("keys.size() : {}", keys);
        Map<String, Map<String, Object>> result = new HashMap<>();
        List<Object> list = redisService.get(keys);
        for (int i = 0; i < keys.size(); i++) {
            String[] parts = keys.get(i).split(":");
            String packageNm = parts[1];
            String serverType = parts[2];

            Map<String, Object> dataMap = result.getOrDefault(packageNm + ":" + serverType, new HashMap<>());
            dataMap.put(parts[4], list.get(i));
            result.put(packageNm + ":" + serverType, dataMap);
        }
        return new DashboardIntegrationResponseDto(result, apps);
    }
}
