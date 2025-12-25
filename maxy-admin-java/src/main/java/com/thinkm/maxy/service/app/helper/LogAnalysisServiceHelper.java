package com.thinkm.maxy.service.app.helper;

import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.Elastic;
import org.opensearch.action.search.SearchResponse;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static com.thinkm.common.code.MaxyLogType.T_Native_App_Start;

public class LogAnalysisServiceHelper extends QueryParseHelper {

    public static List<Map<String, Object>> parseLogStackList(SearchResponse response,
                                                              String type,
                                                              boolean userIdMasking) {
        List<Map<String, Object>> list = parseSimpleList(response);

        // logTm 순으로 sort (asc)
        list.sort(Comparator.comparingLong(el -> (Long) el.get(Elastic.logTm)));

        // AppStart 위치 검색
        int appStartIndex = IntStream.range(0, list.size())
                .filter(i -> T_Native_App_Start.equalsByLogType((Integer) list.get(i).get(Elastic.logType)))
                .findFirst()
                .orElse(-1);

        // userId 마스킹 처리
        for (Map<String, Object> map : list) {
            int logType = (int) map.get(Elastic.logType);
            MaxyLogType m = MaxyLogType.findByLogType(logType);
            if (m != null) {
                map.put("logTypeNm", m.getGroup());
                map.put("logTypeDnm", m.getDetail());
            }

            String userId = (String) map.get(Elastic.userId);
            if (userId != null) {
                map.put(Elastic.userId, CommonUtil.maskUserId(userId, userIdMasking, 2));
            } else {
                map.put(Elastic.userId, "-");
            }
        }

        // AppStart 에 따른 List 자르기
        if (appStartIndex != -1) {
            if ("before".equalsIgnoreCase(type)) {
                // before 에서 AppStart 이후 데이터를 결과로 반환
                return list.subList(appStartIndex, list.size());
            } else {
                // after 에서 AppStart 이전 데이터까지 결과로 반환
                return list.subList(0, appStartIndex);
            }
        }
        return list;
    }
}
