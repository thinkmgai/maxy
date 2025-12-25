package com.thinkm.maxy.repository;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Setter
@Getter
@Component
@Slf4j
public class ModelRepository {
    private String modelInfoJson;
    private Map<String, Map<String, String>> modelInfo;

    /**
     * Model Name 으로 Model Identifier 목록 검색
     *
     * @param model name
     * @return Identifier set
     */
    public Set<String> search(String model) {
        Set<String> result = new HashSet<>();
        // 표준화 처리
        String modelStr = model.toLowerCase().replaceAll("\\s+", "");
        for (Map.Entry<String, Map<String, String>> entry : modelInfo.entrySet()) {
            Map<String, String> map = entry.getValue();
            if (map == null) continue;

            // 한글/영문에 대한 표준화 처리
            String nameKo = map.get("nameKo").toLowerCase().replaceAll("\\s+", "");
            String nameEn = map.get("nameEn").toLowerCase().replaceAll("\\s+", "");

            // 표준화 된 데이터 끼리의 검색
            if (nameKo.contains(modelStr) || nameEn.contains(modelStr)) {
                result.add(entry.getKey());
            }
        }
        if (result.isEmpty()) {
            result.add(model);
        }
        return result;
    }

    /**
     * Model Identifier 로 Model name 검색
     *
     * @param model  Identifier
     * @param locale ko / en
     * @return Model Name
     */
    public String search(String model, String locale) {
        Map<String, String> modelMap = modelInfo.get(model);
        if (locale.equalsIgnoreCase("ko")) {
            return modelMap.get("nameKo");
        } else {
            return modelMap.get("nameEn");
        }
    }
}
