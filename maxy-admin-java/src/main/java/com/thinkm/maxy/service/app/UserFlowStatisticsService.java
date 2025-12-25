package com.thinkm.maxy.service.app;

import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.mapper.PageAnalyticsMapper;
import com.thinkm.maxy.vo.PageSummaryVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
@Slf4j
@Service
@RequiredArgsConstructor
public class UserFlowStatisticsService {

    @Resource
    private final PageAnalyticsMapper pageAnalyticsMapper;

    @Resource
    private final ElasticClient elasticClient;

    public List<PageSummaryVO> getPageFlowSummaryListByLandingPage(PageSummaryVO vo) {

        return pageAnalyticsMapper.selectPageFlowSummaryList(vo);
    }

    /**
     * 앱 페이지 사용 집계 조회 - ES 데이타
     *
     * @param vo serverType, packageNm
     * @return pageFlowSummaryList
     */
    public List<Map<String, Object>> getPageFlowSummaryList(PageSummaryVO vo) {
        List<Map<String, Object>> result = null;

        try {
            //if(!vo.getLastLogTm().isEmpty())  vo.setSearchFromDt(String.valueOf(vo.getLastLogTm()));

            // Request 매개변수
            Map<String, String> requestParams
                    = new HashMap<>(Collections.singletonMap("format", "txt"));// 쿼리에서 대체할 변수
            Map<String, Object> queryParams = new HashMap<>();
            queryParams.put("searchFromDt", vo.getFromDt());
            queryParams.put("searchToDt", vo.getToDt());
            queryParams.put("packageNm", vo.getPackageNm());
            queryParams.put("serverType", vo.getServerType());
            queryParams.put("vipYn", vo.getVipYn());

            // ElasticSearch 조회 변수
            Elastic elastic = Elastic.builder().method("GET")// or POST, PUT
                    .endpoint("maxy_page_flow_summary/_count")
                    .requestParams(requestParams)   // optional
                    .queryFile("pa/appPageFlowSummary-count.json")
                    .queryParams(queryParams)       // optional
                    .build();      // get() 함수를 사용하여 조회하고 Map 으로 반환

            try {
                Map<String, Object> res = elasticClient.get(elastic);
                if (res.get("count") != null
                    && Long.parseLong(String.valueOf(res.get("count"))) > 0L) {
                    queryParams.put("size", Integer.valueOf(String.valueOf(res.get("count"))));
                } else {
                    queryParams.put("size", 500);
                }

            } catch (Exception e) {
                throw new RuntimeException(e);
            }

            // ElasticSearch 조회 변수
            elastic = Elastic.builder().method("GET")// or POST, PUT
                    .endpoint("maxy_page_flow_summary/_search")
                    .requestParams(requestParams)   // optional
                    .queryFile("pa/appPageFlowSummary-search.json")
                    .queryParams(queryParams)       // optional
                    .build();      // get() 함수를 사용하여 조회하고 Map 으로 반환
            Map<String, Object> res;
            try {
                res = elasticClient.getRaw(elastic);

                String[] aggsKeyAr = {"flowOrder", "reqUrl", "packageDisplayNm", "childUrl",
                        "pageNm", "childPageNm"};
                String[] elementsAr = {"nodeEndSumIntervaltime", "nodeEndMaxIntervaltime",
                        "sumIntervaltime", "reqCount",
                        "crashCount", "nodeEndMinIntervaltime", "nodeEndReqCount", "nodeEndErrorCount",
                        "nodeEndCrashCount",
                        "minIntervaltime", "maxIntervaltime", "errorCount", "avgResponseTime",
                        "avgLoadingTime", "avgCpuUsage",
                        "avgMemUsage"
                };

                result = elasticClient.aggsParser((Map<String, Object>) res.get("aggregations"), aggsKeyAr,
                        elementsAr);

            } catch (Exception e) {
                throw new RuntimeException(e);
            }


        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public List<PageSummaryVO> getLandingPageList(PageSummaryVO vo) {
        return pageAnalyticsMapper.selectLandingPageList(vo);
    }
}
