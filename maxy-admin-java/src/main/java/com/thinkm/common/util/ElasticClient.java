package com.thinkm.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.ElasticConfig;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.NotFoundException;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpEntity;
import org.apache.http.entity.ContentType;
import org.apache.http.nio.entity.NStringEntity;
import org.apache.http.util.EntityUtils;
import org.jetbrains.annotations.NotNull;
import org.opensearch.action.delete.DeleteRequest;
import org.opensearch.action.get.GetRequest;
import org.opensearch.action.get.GetResponse;
import org.opensearch.action.get.MultiGetRequest;
import org.opensearch.action.get.MultiGetResponse;
import org.opensearch.action.index.IndexRequest;
import org.opensearch.action.search.MultiSearchRequest;
import org.opensearch.action.search.MultiSearchResponse;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.action.support.IndicesOptions;
import org.opensearch.client.*;
import org.opensearch.client.core.MainResponse;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.SearchHit;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.*;
import java.util.regex.Matcher;

import static com.thinkm.common.util.Elastic.*;

/**
 * ElasticSearch 에서 JSON Search, Sql Query 를 간편하게 요청할 수 있는 유틸 클래스
 * <p>
 * - 호출 예시
 * <pre>
 * {@code
 * // `GET host/[INDEX]/_search?format=txt`
 *
 * @Resource
 * private final ElasticClient elasticClient;
 *
 * // Request 매개변수
 * Map<String, String> requestParams = new HashMap<>();
 * requestParams.put("format", "txt");
 *
 * // 쿼리에서 대체할 변수들
 * Map<String, Object> queryParams = new HashMap<>();
 * queryParams.put("logYear", "2022");
 * queryParams.put("logMonth", "10");
 * queryParams.put("size", 20);
 *
 * // 동적쿼리를 위한 변수들
 * Map<String, Boolean> dynamicParams = new HashMap<>();
 * dynamicParams.put("searchLogMonth", true);
 * dynamicParams.put("searchLogDate", false);
 *
 * // ElasticSearch 조회 변수
 * Elastic elastic = Elastic.builder()
 *     .method("GET")                  // or POST, PUT
 *     .endpoint("[INDEX]/_search")
 *     .requestParams(requestParams)   // optional
 *     .queryFile("[JSON_FILE].json")
 *     .dynamicParams(dynamicParams)   // optional
 *     .queryParams(queryParams)       // optional
 *     .build();
 *
 * // get() 함수를 사용하여 조회하고 Map 으로 반환
 * Map<String, Object> result = elasticClient.get(elastic);
 * }
 * </pre>
 */
@Slf4j
@Builder
@Component
@RequiredArgsConstructor
public class ElasticClient {
    private final RestHighLevelClient esClient;
    /* 문자열 모음 */
    // Double Quotes
    private final String DQ = "\"";
    private final String SQ = "'";
    /* 문자열 모음 끝 */

    /**
     * 객체가 비어있는지 판단
     *
     * @param o Object
     * @return boolean
     */
    private static boolean isEmpty(Object o) {
        if (null == o) {
            return true;
        }
        try {
            if (o instanceof String str) {
                return str.isEmpty();
            }
            if (o instanceof Map<?, ?> map) {
                return map.isEmpty();
            }
            if (o instanceof List<?> list) {
                Object l = list.get(0);
                return null == l || "".equals(l);
            }
            if (o instanceof Set<?> set) {
                return set.isEmpty();
            }
            return false;
        } catch (Exception ignore) {
            return true;
        }
    }

    private static Request getRequestByQuery(Elastic elastic, String query) {
        HttpEntity entity = new NStringEntity(query, ContentType.APPLICATION_JSON);
        String endpoint = elastic.getEndpoint();
        if (endpoint == null || endpoint.isBlank()) {
            endpoint = elastic.getIndex() + "/" + elastic.getApi();
        }
        // Request 생성
        Request request = new Request(elastic.getMethod(), endpoint);
        // Request Parameter 추가
        Map<String, String> requestParams = elastic.getRequestParams();
        if (requestParams != null && !requestParams.isEmpty()) {
            request.addParameters(requestParams);
        }
        // Request Entity 설정
        request.setEntity(entity);
        return request;
    }

    private static Request getRequestByMultiQuery(String query) {
        HttpEntity entity = new NStringEntity(query, ContentType.APPLICATION_JSON);

        // Request 생성
        Request request = new Request("POST", "/_msearch");

        // Request Entity 설정
        request.setEntity(entity);
        return request;
    }

    private static String getResultFromInputStream(InputStream is) throws IOException {
        // 시스템 별 개행 문자
        String newLine = System.lineSeparator();
        // InputStream 을 BufferedReader 로 읽어들임
        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
        StringBuilder result = new StringBuilder();
        // 라인별로 추가
        for (String line; (line = reader.readLine()) != null; ) {
            if (!result.isEmpty()) {
                result.append(newLine);
            }
            result.append(line);
        }
        return result.toString();
    }

    /**
     * 필수 입력값 valid
     *
     * @param elastic Elastic
     */
    private static void validMulti(Elastic elastic) throws Exception {
        if (elastic == null) {
            throw new Exception("Elastic is null");
        }
        if (isEmpty(elastic.getIndex())) {
            throw new Exception("Elastic index is null");
        }
        if (isEmpty(elastic.getQueryFile())) {
            throw new Exception("Elastic queryFile is null");
        }
    }

    /**
     * 결과 Map 에서 각 쿼리 유형 별 필요한 값만 추출
     *
     * @param map 결과 Map
     * @return 추출 처리된 Map
     */
    @SuppressWarnings({"rawtypes", "unchecked"})
    public static Map<String, Object> parser(Map<String, Object> map) {

        // 결과 미리 선언
        Map<String, Object> result = new HashMap<>();
        // 매개변수 Map 이 비어 있으면 빈 Map 반환
        if (map.isEmpty()) {
            log.warn("result is empty.");
            return result;
        }

        try {
            if (map.get(AGGREGATIONS) != null) {
                // result > aggregations
                Map aggregations = (Map) map.get(AGGREGATIONS);
                if (aggregations.get(GROUPBY) != null) {
                    // result > aggregations > groupby
                    Map groupby = (Map) aggregations.get(GROUPBY);
                    // result > aggregations > groupby > buckets
                    result.put(RES, groupby.get(BUCKETS));
                } else {
                    // result > aggregations > "[AGGREGATION NAME]"

                    // aggregation name Set
                    Set<String> aggregationNameSet = aggregations.keySet();

                    if (aggregationNameSet.size() > 1) {
                        // 다중 집계일 경우
                        for (String aggregationName : aggregationNameSet) {
                            Map<String, Object> data = (Map<String, Object>) aggregations.get(aggregationName);
                            Map<String, Object> tmpAggsMap = new HashMap<>();
                            getValueInBuckets(data, tmpAggsMap);
                            result.put(aggregationName, tmpAggsMap);
                        }
                    } else {
                        // 단일 집계일 경우 (사이드 이펙트 방지)
                        // 첫 번째 aggregationName 의 값을 가져옴
                        for (String aggregationName : aggregationNameSet) {
                            Map<String, Object> data = (Map<String, Object>) aggregations.get(aggregationName);
                            getValueInBuckets(data, result);
                            break;
                        }
                    }
                }
            } else {
                if (map.get(HITS) != null) {
                    // result > hits
                    Map<String, Object> hits = (Map<String, Object>) map.get(HITS);

                    if (hits.get(HITS) != null) {
                        // result > hits > hits
                        List<Map<String, Object>> hitsList = (List<Map<String, Object>>) hits.get(HITS);
                        // 결과가 없으면 빈 List 반환
                        if (hitsList.isEmpty() || hitsList.get(0) == null) {
                            // result > hits > total
                            if (hits.get(TOTAL) != null) {
                                result.put(RES, hits.get(TOTAL));
                            } else {
                                log.warn("list is empty");
                                log.warn(hits.toString());
                            }
                            return result;
                        }

                        // hits list 의 첫 번째 요소의 fields 여부 판단
                        Map<String, Object> hitsListFst = hitsList.get(0);
                        List<Map<String, Object>> resultList = new ArrayList<>();
                        if (hitsListFst.get(FIELDS) != null) {
                            // fields 가 있는 경우 keySet 으로 만들어 list 를 다시 생성
                            Map<String, Object> fieldsMap = (Map<String, Object>) hitsListFst.get(FIELDS);
                            Set<String> fieldSet = fieldsMap.keySet();

                            // _source 여부 판단
                            boolean isExistSource = hitsListFst.get(SOURCE) != null;

                            // 뽑아낸 keySet 으로 hits list 다시 순회하면서 값 뽑기
                            for (Map<String, Object> hitsMap : hitsList) {
                                Map<String, Object> tmp = new HashMap<>();
                                for (String field : fieldSet) {
                                    if (isExistSource) {
                                        // source 가 있으면 hitsMap 에서 source 조회
                                        Map<String, Object> item = (Map<String, Object>) hitsMap.get(SOURCE);
                                        tmp.put(field, item.get(field));
                                    } else {
                                        // source 가 없으면 hitsMap 에서 field 조회
                                        Map<String, Object> item = (Map<String, Object>) hitsMap.get(FIELDS);
                                        // field 로 get 한 결과는 List
                                        List<Object> itemList = (List<Object>) item.get(field);
                                        if (itemList != null) {
                                            tmp.put(field, itemList.get(0));
                                        }
                                    }
                                }
                                resultList.add(tmp);
                            }
                            result.put(RES, resultList);
                        } else {
                            // fields 없으면 hits > _source 기반으로 한 list 새로 만들기
                            for (Map<String, Object> hitsMap : hitsList) {
                                if (hitsMap.get(SOURCE) instanceof Map tmp) {
                                    // source map 에 _id 를 추가
                                    tmp.put("_id", hitsMap.get("_id"));
                                    resultList.add(tmp);
                                }
                            }

                            result.put(RES, resultList);
                        }
                    } else {
                        // result > hits
                        // TODO: 하위 별도 값 있는 경우 추가 처리 필요
                        log.debug("TODO: result > hits");
                        result = map;
                    }
                } else {
                    if (map.get(COUNT) != null) {
                        result.put(RES, map.get(COUNT));
                        return result;
                    }
                    // TODO: 하위 별도 값 있는 경우 추가 처리 필요
                    result = map;
                }
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            // TODO: 에러났을 경우 추가 처리 필요
            result = map;
        }

        if (result.isEmpty()) {
            log.warn("result is empty");
        }

        return result;
    }

    private static void getValueInBuckets(Map<String, Object> data, Map<String, Object> tmpAggsMap) {
        if (!data.containsKey("buckets")) {
            // result > aggregations > "KEY" > value
            if (data.get("values") != null) {
                tmpAggsMap.put(RES, data.get("values"));
            } else {
                tmpAggsMap.put(RES, data.get("value"));
            }
        } else {
            // result > aggregations > "KEY" > buckets
            tmpAggsMap.put(RES, data.get("buckets"));
        }
        tmpAggsMap.put("doc_count_error_upper_bound", data.get("doc_count_error_upper_bound"));
        tmpAggsMap.put("sum_other_doc_count", data.get("sum_other_doc_count"));
    }

    /**
     * {@link RestHighLevelClient}를 사용하여 ListMap 을 반환
     *
     * @param searchRequest {@link SearchRequest}
     * @return ListMap
     */
    @NotNull
    public List<Map<String, Object>> getListMap(SearchRequest searchRequest) {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            SearchResponse response = esClient.search(searchRequest, RequestOptions.DEFAULT);
            for (SearchHit hit : response.getHits()) {
                Map<String, Object> item = hit.getSourceAsMap();
                item.put("_id", hit.getId());
                result.add(item);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }

    /**
     * ElasticSearch 에서 JSON Query 로 조회 // logging 기능 추가
     *
     * @param elastic {method, endpoint, queryFile, requestParams, queryParams}
     * @return Map
     */
    public Map<String, Object> get(Elastic elastic, boolean logging) throws Exception {
        String query = "";

        // Closable RestClient 선언
        try (RestClient restClient = ElasticConfig.initRestClient()) {

            // elastic 검증
            valid(elastic);

            // after_key 가 있으면 넣어주기
            String afterKey = elastic.getAfterKey();
            if (afterKey != null && !afterKey.isEmpty()) {
                afterKey = afterKey
                        .replace("{", "")
                        .replace("}", "");

                elastic.getQueryParams().put(AFTER_KEY, afterKey);
                elastic.getDynamicParams().put(AFTER_KEY, true);
            }

            // 쿼리에 파라미터 넣어 생성
            query = makeQuery(elastic);

            // JSON String 을 JSON 으로 변환하여 HttpEntity 로 생성
            Request request = getRequestByQuery(elastic, query);

            // Request 발송 및 Response 받아옴
            Response response = restClient.performRequest(request);

            // 결과값의 Entity 를 Map 으로 변환하여 반환
            Map<String, Object> resultMap = stringToMap(EntityUtils.toString(response.getEntity()));

            // logging 하는 경우
            if (logging) {
                log.debug("[elastic]: {}", elastic);
                log.debug("[query]: {}", query);
                log.debug("[result]: {}", resultMap);
            }

            return resultMap;
        } catch (ConnectException e) {
            log.debug(elastic.toString());
            log.debug(query);
            throw new Exception(e.getMessage());
        } catch (InterruptedException ignore) {
            throw new InterruptedException("");
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            log.debug(elastic.toString());
            log.debug(query);
            throw new Exception(e.getMessage());
        }
    }

    public Map<String, Object> get(ElasticIndex elastic, String id) throws Exception {
        return get(elastic, id, false);
    }

    public Map<String, Object> get(String index, String id) throws Exception {
        return get(index, id, false);
    }

    /**
     * Document id를 통해 한 건의 document 를 조회
     *
     * @param elastic elastic index enum
     * @param id      doc id
     * @return Map 형태의 source 결과물
     * @throws Exception docId가 올바르지 않는 경우, 혹은 데이터가 없는 경우
     */
    public Map<String, Object> get(ElasticIndex elastic, String id, boolean logging) throws Exception {
        try {
            if (id == null || id.length() < 13) {
                log.error("wrong id: {}", id);
                throw new BadRequestException(ReturnCode.ERR_INVALID_DOC_ID);
            }

            String index = elastic.getIndex() + "*";
            SearchRequest searchRequest = new SearchRequest(index);
            SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();
            searchSourceBuilder.query(QueryBuilders.termQuery("_id", id));
            searchRequest.source(searchSourceBuilder);

            // 검색 실행
            SearchResponse searchResponse = esClient.search(searchRequest, RequestOptions.DEFAULT);

            if (logging) {
                log.debug(searchRequest.toString());
                log.debug(searchResponse.toString());
            }
            // 문서가 발견되었는지 확인
            if (Objects.requireNonNull(searchResponse.getHits().getTotalHits()).value > 0) {
                return searchResponse.getHits().getAt(0).getSourceAsMap();
            } else {
                log.error("not found document: {}, {}", elastic.getIndex(), id);
                throw new NotFoundException(ReturnCode.ERR_NOT_FOUND_DOC);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw new Exception(e.getMessage());
        }
    }

    /**
     * Document id를 통해 한 건의 document 를 조회
     *
     * @param index elastic index enum
     * @param id    doc id
     * @return Map 형태의 source 결과물
     * @throws Exception docId가 올바르지 않는 경우, 혹은 데이터가 없는 경우
     */
    public Map<String, Object> get(String index, String id, boolean logging) throws Exception {
        try {

            // GET 요청 생성
            GetRequest getRequest = new GetRequest(index, id);

            // GET 요청 수행
            GetResponse getResponse = esClient.get(getRequest, RequestOptions.DEFAULT);

            if (logging) {
                log.debug(getRequest.toString());
                log.debug(getResponse.toString());
            }
            // 응답에서 문서 내용 출력
            if (getResponse.isExists()) {
                return getResponse.getSource();
            } else {
                log.error("not found document: {}, {}", index, id);
                throw new NotFoundException(ReturnCode.ERR_NOT_FOUND_DOC);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw new Exception(e.getMessage());
        }
    }

    public Map<String, Object> get(String[] indexes, String id) {
        for (String index : indexes) {
            try {
                GetRequest getRequest = new GetRequest(index, id);
                GetResponse getResponse = esClient.get(getRequest, RequestOptions.DEFAULT);

                if (getResponse.isExists()) {
                    return getResponse.getSource();
                } else {
                    log.debug("Document not found in index: {}, id: {}", index, id);
                }
            } catch (IOException e) {
                log.error("Elasticsearch request failed. index: {}, id: {}", index, id, e);
                throw new RuntimeException("Failed to get document from Elasticsearch", e);
            }
        }
        throw new NotFoundException(ReturnCode.ERR_NOT_FOUND_DOC);
    }

    /**
     * ElasticSearch 에서 JSON Query 로 조회 // logging 하지 않음
     *
     * @param elastic {method, endpoint, queryFile, requestParams, queryParams}
     * @return Map
     */
    public Map<String, Object> get(Elastic elastic) throws Exception {
        return get(elastic, false);
    }

    public Map<String, Object> getRaw(Elastic elastic, boolean logging) throws Exception {
        String query = "";

        // Closable RestClient 선언
        try (RestClient restClient = ElasticConfig.initRestClient()) {

            // elastic 검증
            valid(elastic);

            // 쿼리에 파라미터 넣어 생성
            query = makeQuery(elastic);

            // JSON String 을 JSON 으로 변환하여 HttpEntity 로 생성
            Request request = getRequestByQuery(elastic, query);

            long s1 = System.currentTimeMillis();
            // Request 발송 및 Response 받아옴
            Response response = restClient.performRequest(request);
            long e1 = System.currentTimeMillis();

            String entityStr = EntityUtils.toString(response.getEntity());
            Map<String, Object> resultMap = JsonUtil.readValue(entityStr, new TypeReference<>() {
            });

            // logging 하는 경우
            if (logging) {
                log.debug("[elastic]: {}", elastic);
                log.debug("[query]: {}", query);
                log.debug("[result]: {}", resultMap);
                log.debug("[duration]: {}ms", (e1 - s1));
            }

            // 결과값의 Entity 를 Map 으로 변환하여 반환
            return resultMap;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            log.debug(query);
            throw new Exception(e.getMessage());
        }
    }

    /**
     * ElasticSearch 에서 JSON Query 로 조회 - 결과 그대로 반환
     *
     * @param elastic {method, endpoint, queryFile, requestParams, queryParams}
     * @return Map
     */
    public Map<String, Object> getRaw(Elastic elastic) throws Exception {
        return getRaw(elastic, false);
    }

    public List<Map<String, Object>> get(List<Elastic> elasticList) throws Exception {
        // msearch 시 app 정보가 비어 있는 경우 빈값 반환 하도록 예외처리
        if (elasticList == null || elasticList.isEmpty()) {
            return new ArrayList<>();
        }
        return get(elasticList, false);
    }

    /**
     * _msearch
     *
     * @param elasticList List<{@link Elastic>}
     * @return 결과 List
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> get(List<Elastic> elasticList, boolean logging) throws Exception {
        StringBuilder querys = new StringBuilder();
        List<String> keyList = new ArrayList<>();
        for (Elastic elastic : elasticList) {
            try {
                validMulti(elastic);
                // 쿼리에 파라미터 넣어 생성
                String query = makeQuery(elastic);
                querys.append("{\"index\": \"")
                        .append(elastic.getIndex())
                        .append("\"}\n")
                        .append(query)
                        .append("\n");
                keyList.add(elastic.getKey());
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }

        Request request = getRequestByMultiQuery(querys.toString());

        // Closable RestClient 선언
        try (RestClient restClient = ElasticConfig.initRestClient()) {

            long s1 = System.currentTimeMillis();
            // Request 발송 및 Response 받아옴
            Response response = restClient.performRequest(request);
            long e1 = System.currentTimeMillis();
            // 결과값의 Entity 를 Map 으로 변환하여 반환
            Map<String, Object> resultMap = stringToMap(EntityUtils.toString(response.getEntity()), true);

            // logging 하는 경우
            if (logging) {
                log.debug("[elastic]: {}", elasticList);
                log.debug("[query]: {}", querys);
                log.debug("[result]: {}", resultMap);
                log.debug("[duration]: {}ms", (e1 - s1));
            }

            Object resObj = resultMap.get("responses");
            if (resObj instanceof List<?>) {
                List<Map<String, Object>> responses = (List<Map<String, Object>>) resObj;
                for (int i = 0; i < responses.size(); i++) {
                    Map<String, Object> tmpMap = responses.get(i);
                    tmpMap.put("reqKey", keyList.get(i));
                }
                return (List<Map<String, Object>>) resObj;
            } else {
                return new ArrayList<>();
            }
        } catch (ResponseException e) {
            log.warn(elasticList.toString());
            log.warn(querys.toString());
            throw e;
        } catch (ConnectException | SocketTimeoutException e) {
            log.debug(elasticList.toString());
            log.debug(querys.toString());
            throw new Exception(e.getMessage());
        } catch (RuntimeException e) {
            throw new RuntimeException(e.getMessage());
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            log.debug(elasticList.toString());
            log.debug(querys.toString());
            throw new Exception(e.getMessage());
        }
    }

    /**
     * JSON 파일을 경로에서 가져와 String 으로 반환
     *
     * @param path ClassPath 하위의 json 파일 경로
     * @return JSON String
     */
    private String getJsonFileToString(String path) throws Exception {
        // ClassPath 에서 리소스를 InputStream 으로 가져옴
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(path)) {
            if (is != null) {
                return getResultFromInputStream(is);
            } else {
                throw new FileNotFoundException("JSON file [" + path + "] not found in the classpath.");
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw new Exception(e.getMessage());
        }
    }

    /**
     * JSON 파일에서 쿼리를 가져와 매개변수들을 매핑
     *
     * @param elastic {@link Elastic}
     * @return 만들어진 쿼리
     */
    private String makeQuery(Elastic elastic) throws Exception {
        // JSON 파일 가져오기
        String query = getJsonFileToString("elastic" + File.separator + elastic.getQueryFile());

        // 개행 제거
        query = query.replaceAll("\n", " ");

        // 동적 쿼리 파라미터 맵
        Map<String, Boolean> dynamicParams = elastic.getDynamicParams();
        // 쿼리 파라미터 맵
        Map<String, Object> queryParams = elastic.getQueryParams();

        // 동적 쿼리 변환
        if (dynamicParams != null) {
            // 동적 쿼리 변환
            query = convertToDynamicQuery(query, dynamicParams);
        }

        // 매개변수 치환
        if (queryParams != null) {
            query = applyParamToQuery(query, queryParams);
        }

        // _sql 쿼리일 경우 `""" """` 템플릿 형식을 `" "` 일반적인 String 형태로 변경
        query = query.replaceAll("\"\"\"", "\"");

        // TODO: injection 방지 코드 필요
        return query;
    }

    /**
     * 변수를 쿼리에 적용
     *
     * @param query       json 쿼리
     * @param queryParams 쿼리 파라미터 맵
     * @return 적용된 쿼리
     */
    private String applyParamToQuery(String query, Map<String, Object> queryParams) {
        String sep = DQ;
        if (queryParams.containsKey("_isSql") && (boolean) queryParams.get("_isSql")) {
            sep = SQ;
        }

        // KeySet
        Set<String> queryParamNameSet = queryParams.keySet();
        for (String key : queryParamNameSet) {
            // `#{PARAM}` 에 해당하는 값을 쿼리 파라미터에서 가져와 대치
            String value;
            Object param = queryParams.get(key);
            try {
                // _raw 로 시작하는 key 면 quote 없이 inject
                if (key.startsWith("_raw") || AFTER_KEY.equalsIgnoreCase(key)) {
                    value = String.valueOf(param);
                } else {
                    // double 로 parsing 이 되면 해당 값만 넣기
                    Double.parseDouble(String.valueOf(param));
                    value = sep + param + sep;
                }
            } catch (Exception ignore) {
                if (param == null || "".equals(param)) {
                    // 빈값이거나 null 이면 공백 넣기
                    value = sep + sep;
                } else {
                    // double 로 parsing 이 되지 않으면 `" "` 로 감싸기
                    value = sep + param + sep;
                }
            }
            query = query.replaceAll("#\\{" + key + "}", Matcher.quoteReplacement(value));
        }
        return query;
    }

    /**
     * 동적쿼리 치환
     *
     * @param query         json 쿼리
     * @param dynamicParams 동적 쿼리 맵
     * @return 적용된 쿼리
     */
    private String convertToDynamicQuery(String query, Map<String, Boolean> dynamicParams) throws Exception {
        // KeySet
        Set<String> dynamicParamNameSet = dynamicParams.keySet();
        try {
            for (String key : dynamicParamNameSet) {
                // #[KEY]
                String sKey = "#[" + key + "]";
                // #[/KEY]
                String eKey = "#[/" + key + "]";
                // #\\[KEY]
                String sKeyRgx = "#\\[" + key + "]";
                // #\\[/KEY]
                String eKeyRgx = "#\\[/" + key + "]";

                // 바꿀 내용이 없으면 다음 키 검색
                if (!query.contains(sKey) || !query.contains(eKey)) {
                    continue;
                }

                if (dynamicParams.get(key)) {
                    // dynamicParams 를 사용하는 경우
                    query = query.replaceAll(sKeyRgx, "").replaceAll(eKeyRgx, "");
                } else {
                    // dynamicParams 를 사용하지 않는 경우
                    while (query.contains(sKey) || query.contains(eKey)) {
                        String tmp = query.substring(0, query.indexOf(sKey));
                        tmp += query.substring(query.indexOf(eKey) + eKey.length());
                        query = tmp;
                    }
                }
            }
            //noinspection RegExpRedundantEscape,RegExpUnnecessaryNonCapturingGroup
            String removeKey = "\\#\\[(?:[\\s\\S]*?)\\](?:[\\s\\S]*?)\\#\\[\\/(?:[\\s\\S]*?)\\]";
            query = query.replaceAll(removeKey, "");

        } catch (Exception e) {
            log.error("Dynamic Parameter Grammar Error. check the JSON.");
            log.warn(query);
            throw new Exception(e);
        }
        if (query.contains("#[")) {
            log.warn("Query substitution was not done correctly.");
            log.warn(dynamicParams.toString());
            log.warn(query);
        }
        return query;
    }

    /**
     * JSON String 형식의 값을 Map 으로 변환하여 반환
     *
     * @param str JSON String
     * @return 결과 Map
     */
    private Map<String, Object> stringToMap(String str) {
        return stringToMap(str, false);
    }

    /**
     * JSON String 형식의 값을 Map 으로 변환하여 반환
     *
     * @param str JSON String
     * @return 결과 Map
     */
    private Map<String, Object> stringToMap(String str, boolean raw) {
        try {
            // JSON 형식 String 을 Map 으로 변환
            Map<String, Object> queryResult
                    = JsonUtil.readValue(str, new TypeReference<>() {
            });

            if (raw) {
                return queryResult;
            } else {
                // 필요한 값 추출하여 반환
                return parser(queryResult);
            }
        } catch (Exception ignore) {
            // JSON 파싱이 안되는 경우는 SQL 쿼리인 경우
            return Collections.singletonMap(RES, stringToList(str));
        }
    }

    /**
     * 파이프 문자(|)로 구분되는 sql 쿼리 결과물을 List<Map> 으로 반환
     *
     * @param str 쿼리 결과물
     * @return 리스트 맵
     */
    private List<?> stringToList(String str) {
        List<Map<String, Object>> result = new ArrayList<>();
        // | 간의 공백 제거
        str = str.replaceAll("(\\s*\\|\\s*)", "|");
        // 개행 전의 공백 제거
        str = str.replaceAll("(\\s*?\\n)", "\n");

        // 개행 단위로 split
        String[] array = str.split("\n");
        if (array.length < 3) {
            return null;
        }

        // 첫 번째 라인: key ( | 로 split)
        String[] keys = array[0].replaceAll("\\s", "").split("\\|");

        // 두 번째 라인: separator (사용하지 않음)

        // 세 번째 라인 ~ 끝까지: 데이터 ( | 로 split 하여 각각의 key 에 넣어 Map 으로 변환)
        for (int i = 2; i < array.length; i++) {
            Map<String, Object> tmpMap = new HashMap<>();

            String[] data = array[i].split("\\|");
            for (int j = 0; j < keys.length; j++) {
                tmpMap.put(keys[j], data[j]);
            }
            result.add(tmpMap);
        }
        return result;
    }

    /**
     * 필수 입력값 valid
     *
     * @param elastic Elastic
     */
    private void valid(Elastic elastic) throws Exception {
        if (elastic == null) {
            throw new Exception("Elastic is null");
        }
        if (isEmpty(elastic.getMethod())) {
            throw new Exception("Elastic method is null");
        }
        if (isEmpty(elastic.getEndpoint())) {
            if (isEmpty(elastic.getApi()) || isEmpty(elastic.getIndex())) {
                throw new Exception("Elastic endpoint is null");
            }
        }
        if (isEmpty(elastic.getQueryFile())) {
            throw new Exception("Elastic queryFile is null");
        }
    }

    /*
     * ES Aggregations 전용 Parser
     * source : aggregations map
     * aggsKeyAr : aggregations 명 -> 항목명과 동일하게 부여한 aggregations 명
     *                                group by 순서대로 부여
     * elementsAr : aggreations을 통해 구하고자하는 항목명
     * 예) select logTm,
     *            logTypeNm,
     *            sum(intervaltime) as intervaltime,
     *            sum(reqCount) as reqCount
     *      from XXXXXXXX
     *     group by logTm, logTypeNm
     * aggsKeyAr = {logTm, logTypeNm}
     * elementsAr = {intervaltime, reqCount}
     */
    public List<Map<String, Object>> aggsParser(Map<String, Object> source, String[] aggsKeyAr, String[] elementsAr) {
        return aggsParser(source, aggsKeyAr, new Object[aggsKeyAr.length - 1], elementsAr, aggsKeyAr.length - 1);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private List<Map<String, Object>> aggsParser(Map<String, Object> source, String[] aggsKeyAr, Object[] aggsValueAr, String[] elementsAr, int n) {

        /* 문자열 모음 */
        final String BUCKETS = "buckets";
        /* 문자열 모음 끝 */

        // 결과 미리 선언
        List<Map<String, Object>> result = new ArrayList<>();
        Map<String, Object> resMap;
        List<Map<String, Object>> resList;
        try {

            if (n != 0) {
                resList = (List<Map<String, Object>>) ((Map<String, Object>) source.get(aggsKeyAr[aggsKeyAr.length - n - 1])).get(BUCKETS);
                for (Map<String, Object> res : resList) {
                    aggsValueAr[aggsValueAr.length - n] = res.get("key");
                    result.addAll(aggsParser(res, aggsKeyAr, aggsValueAr, elementsAr, n - 1));
                }
            } else {
                for (Map<String, Object> res : (List<Map<String, Object>>) ((Map<String, Object>) source.get(aggsKeyAr[aggsKeyAr.length - 1])).get(BUCKETS)) {
                    resMap = new HashMap<>();
                    int arIndex = 0;
                    for (Object aggsValue : aggsValueAr) {
                        resMap.put(aggsKeyAr[arIndex], aggsValue);
                        arIndex++;
                    }

                    resMap.put(aggsKeyAr[aggsKeyAr.length - 1], res.get("key"));
                    for (String key : elementsAr) {
                        if (((Map) res.get(key)).get("values") != null) { // median aggs 일 때 추가
                            resMap.put(key, ((Map) ((Map) res.get(key)).get("values")).get("50.0"));
                        } else {
                            resMap.put(key, ((Map) res.get(key)).get("value"));
                        }
                    }
                    result.add(resMap);
                }
            }

        } catch (Exception e) {
            log.error(e.getMessage(), e);
            // TODO: 에러났을 경우 추가 처리 필요
            result = null;
        }

        return result;
    }

    public MainResponse info() throws Exception {
        // Closable RestClient 선언
        try {
            // Elasticsearch 서버 정보 조회
            return esClient.info(RequestOptions.DEFAULT);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw e;
        }
    }

    public SearchResponse get(SearchRequest searchRequest, boolean logging) {
        try {
            searchRequest.indicesOptions(IndicesOptions
                    .fromOptions(
                            /* ignoreUnavailable */ true,
                            /* allowNoIndices    */ true,
                            /* expandToOpen      */ true,
                            /* expandToClosed    */ false
                    ));
            SearchResponse response = esClient.search(searchRequest, RequestOptions.DEFAULT);

            if (logging) {
                log.debug(searchRequest.toString());
                log.debug(response.toString());
            }

            return response;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            log.warn(searchRequest.toString());
            return null;
        }
    }

    public SearchResponse get(SearchRequest searchRequest) {
        return get(searchRequest, false);
    }

    public MultiSearchResponse get(MultiSearchRequest searchRequest, boolean logging) {
        try {
            MultiSearchResponse response = esClient.msearch(searchRequest, RequestOptions.DEFAULT);

            if (logging) {
                log.debug(searchRequest.toString());
                log.debug(response.toString());
            }

            return response;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            log.warn(searchRequest.toString());
            return null;
        }
    }

    public MultiSearchResponse get(MultiSearchRequest searchRequest) {
        return get(searchRequest, false);
    }

    public void add(IndexRequest indexRequest) {
        try {
            esClient.index(indexRequest, RequestOptions.DEFAULT);
        } catch (IOException e) {
            log.error("add fail: {}: {}", indexRequest.toString(), e.getMessage(), e);
        }
    }

    public void delete(DeleteRequest deleteRequest) {
        try {
            esClient.delete(deleteRequest, RequestOptions.DEFAULT);
        } catch (IOException e) {
            log.error("delete fail: {}: {}", deleteRequest.toString(), e.getMessage(), e);
        }
    }

    public MultiGetResponse mget(MultiGetRequest multiGetRequest) {
        try {
            return esClient.mget(multiGetRequest, RequestOptions.DEFAULT);
        } catch (IOException e) {
            log.error(e.getMessage(), e);
            log.warn(multiGetRequest.toString());
            return null;
        }
    }
}

