package com.thinkm.maxy.service.app;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.mapper.DashboardMapper;
import com.thinkm.maxy.vo.DashboardComponentVO;
import com.thinkm.maxy.vo.DashboardVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardConfigService {
    @Resource
    private final DashboardMapper mapper;
    @Resource
    private final RedisService redisService;

    public DashboardVO getDashboardBasicConfig(DashboardVO vo) throws BadRequestException {
        return mapper.selectBiUseInfo(vo);
    }

    public void addDashboardBasicConfig(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());
        mapper.insertBiUseInfo(vo);
    }

    public void modifyDashboardBasicConfig(DashboardVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());
        mapper.updateBiUseInfo(vo);
    }

    /**
     * 컴포넌트 정보를 가져오고, 만약 없으면 default 값으로 추가하여 가져온다.
     *
     * @param vo userNo
     * @return 컴포넌트 정보
     */
    public Map<Integer, Object> getComponentsConfig(DashboardComponentVO vo) {
        Map<Integer, Object> chartConfig = getChartConfig(vo);
        // config 가 생성되었는지 확인
        if (isEmptyConfig(chartConfig)) {
            // 생성되지 않았으면 새로운 config 추가
            addChartConfig(vo);
            chartConfig = getChartConfig(vo);
        }
        return chartConfig;
    }

    public Map<Integer, Object> getChartConfig(DashboardComponentVO vo) {
        List<Map<String, Object>> componentList = mapper.selectChartComponentList();
        Map<String, Object> config = mapper.selectChartConfigByUserNo(vo);

        if (config == null || config.isEmpty()) {
            log.warn("config is null or empty");
            return null;
        }

        Map<Integer, Map<String, Object>> componentMap = new HashMap<>();
        for (Map<String, Object> info : componentList) {
            componentMap.put((Integer) info.get("seq"), info);
        }

        Map<String, Object> configResult = new HashMap<>(config);
        for (int i = 1; i <= 8; i++) {
            // i 번째 config 에 있는 component seq
            int seq = (int) configResult.get("component" + i);

            // seq 가 componentMap 에 없으면 (0 처리하기 때문)
            Map<String, Object> component = componentMap.get(seq);
            if (component == null || component.isEmpty()) {
                continue;
            }
            component.put("use", true);
            component.put("order", i);
        }

        Map<String, Object> componentConfigMap = new HashMap<>();
        for (String key : configResult.keySet()) {
            if (!key.startsWith("opt")) {
                continue;
            }
            componentConfigMap.put(key, configResult.get(key));
        }

        // config 에 없는 컴포넌트 처리
        int componentSize = componentMap.size();
        for (Integer i : componentMap.keySet()) {
            Map<String, Object> m = componentMap.get(i);
            m.putIfAbsent("use", false);
            m.putIfAbsent("order", 999 - (componentSize + (int) m.get("seq")));
        }

        Map<Integer, Object> resultMap = new HashMap<>();
        for (Integer k : componentMap.keySet()) {
            Map<String, Object> tmp = componentMap.get(k);
            resultMap.put((int) tmp.get("order"), new HashMap<>(tmp));
        }

        for (Integer i : resultMap.keySet()) {
            Map<String, Object> o = (HashMap<String, Object>) resultMap.get(i);
            for (String k : componentConfigMap.keySet()) {
                String ku = k.toUpperCase();
                String nu = o.get("key")
                        .toString()
                        .replaceAll("\\s", "")
                        .toUpperCase();
                if (ku.contains(nu)) {
                    o.put(k, componentConfigMap.get(k));
                }
            }
        }

        return resultMap;
    }

    public DashboardComponentVO getWarningLimitValue(DashboardVO vo) {
        return mapper.selectWarningLimitValue(vo);
    }

    public boolean isEmptyConfig(Map<Integer, Object> config) {
        return config == null || config.isEmpty();
    }

    public void addChartConfig(DashboardComponentVO vo) {
        vo.setComponent1(1);
        vo.setComponent2(2);
        vo.setComponent3(3);
        vo.setComponent4(4);
        vo.setComponent5(5);
        vo.setComponent6(6);
        vo.setComponent7(7);
        vo.setComponent8(8);

        mapper.insertChartConfig(vo);
    }

    public void modifyChartConfig(DashboardComponentVO vo) {
        if (vo.getComponent1() < 0) {
            vo.setComponent1(0);
        }
        if (vo.getComponent2() < 0) {
            vo.setComponent2(0);
        }
        if (vo.getComponent3() < 0) {
            vo.setComponent3(0);
        }
        if (vo.getComponent4() < 0) {
            vo.setComponent4(0);
        }
        if (vo.getComponent5() < 0) {
            vo.setComponent5(0);
        }
        if (vo.getComponent6() < 0) {
            vo.setComponent6(0);
        }
        if (vo.getComponent7() < 0) {
            vo.setComponent7(0);
        }
        if (vo.getComponent8() < 0) {
            vo.setComponent8(0);
        }

        mapper.updateChartConfig(vo);
    }

    public void modifyComponentConfig(DashboardComponentVO vo) {
        // 모두 null 이면 동작하지 않음
        if (vo.getOptLogmeterLogWeight() == null
            && vo.getOptLogmeterErrorWeight() == null
            && vo.getOptLogmeterCrashWeight() == null
            && vo.getOptLogmeterTime() == null
            && vo.getOptPvequalizerMaxSize() == null
            && vo.getOptPageviewMaxSize() == null
            && vo.getOptFavoritesMaxSize() == null
            && vo.getOptLoadingtimescatterRange() == null
            && vo.getOptLoadingtimescatterSize() == null
            && vo.getOptResponsetimescatterRange() == null
            && vo.getOptResponsetimescatterSize() == null
        ) {
            log.info("nothing to modify option");
        } else {
            mapper.updateComponentConfig(vo);
        }
    }

    public DashboardComponentVO getComponentConfig(DashboardComponentVO vo) {
        if ("versioncomparison".equalsIgnoreCase(vo.getType())) {
            String key = String.join(":", CommonCode.COMPONENT_CONFIG_VERSION_COMPARISON.getValue(),
                    vo.getUserNo() + "",
                    vo.getPackageNm(),
                    vo.getServerType());

            Object value = redisService.get(key);
            if (value != null) {
                return JsonUtil.fromJson(value.toString(), DashboardComponentVO.class);
            } else {
                return new DashboardComponentVO();
            }
        } else {
            return mapper.selectComponentConfig(vo);
        }
    }

    public DashboardComponentVO getMarketingInsightConfig(DashboardVO vo) {
        return mapper.selectMarketingInsightConfig(vo);
    }

    public void upsertPageMarketingInsight(DashboardVO vo) {
        mapper.upsertPageMarketingInsight(vo);
    }
}


