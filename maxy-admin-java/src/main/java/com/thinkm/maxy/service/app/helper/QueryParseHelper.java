package com.thinkm.maxy.service.app.helper;

import com.thinkm.common.util.Elastic;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.SearchHit;
import org.opensearch.search.SearchHits;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class QueryParseHelper {

    public static List<Map<String, Object>> parseSimpleList(SearchResponse searchResponse) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (searchResponse == null || searchResponse.getHits() == null) {
            return result;
        }
        SearchHits hits = searchResponse.getHits();
        for (SearchHit hit : hits) {
            result.add(Elastic.convertHit(hit));
        }
        return result;
    }
}
