package com.thinkm.maxy.service.front;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.front.sessionreplay.SessionReplayRequestDto;
import com.thinkm.maxy.dto.front.sessionreplay.SessionReplayResponseDto;
import com.thinkm.maxy.service.front.factory.FrontSessionReplayFactory;
import com.thinkm.maxy.service.front.helper.FrontSessionReplayServiceHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.action.get.MultiGetItemResponse;
import org.opensearch.action.get.MultiGetRequest;
import org.opensearch.action.get.MultiGetResponse;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.search.sort.SortOrder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 세션 리플레이 FileDB 조회 서비스
 * 외부 FileDB 서버와 HTTP 통신을 통해 세션 리플레이 데이터를 조회하는 기능을 제공합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontSessionReplayService {

    private final RestTemplate restTemplate;
    private final ElasticClient client;
    private final WebClient fileDbWebClient;

    /**
     * FileDB 서버 기본 URL
     */
    @Value("${network.filedb.url:}")
    private String fileDbBaseUrl;

    /**
     * 세션ID로 세션의 appStartTm 데이터를 조회합니다.
     *
     * @param dto 조회 조건 DTO
     * @return appStartTm 정보
     */
    public Long getSessionStartData(SessionReplayRequestDto dto) {
        SearchRequest searchRequest = FrontSessionReplayFactory.createGetSessionStartTmQuery(dto);
        try {
            SearchResponse response = client.get(searchRequest);
            
            // hit 건수가 0인 경우 두 번째 쿼리 실행
            if (response.getHits().getTotalHits().value == 0) {
                SearchRequest searchRequest2 = FrontSessionReplayFactory.createGetSessionTmQueryFromSessionLog(dto, SortOrder.ASC);
                response = client.get(searchRequest2);

                return FrontSessionReplayServiceHelper.parseLogTm(response);
            } else {
                return FrontSessionReplayServiceHelper.parsePageStartTm(response);
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }

    /**
     * 세션ID로 세션의 appStartTm 데이터를 조회합니다.
     *
     * @param dto 조회 조건 DTO
     * @return appStartTm 정보
     */
    public Long getSessionEndData(SessionReplayRequestDto dto) {
        SearchRequest searchRequest = FrontSessionReplayFactory.createGetSessionTmQueryFromSessionLog(dto, SortOrder.DESC);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontSessionReplayServiceHelper.parseLogTm(response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return null;
        }
    }

    /**
     * 세션 리플레이 스트리밍 데이터를 조회합니다.
     * FileDB의 getstreams 엔드포인트를 호출하여 특정 세션의 상세 리플레이 데이터를 가져옵니다.
     *
     * @param requestDto 세션 리플레이 조회 요청 데이터 (인덱스, startKey)
     * @return 세션 리플레이 상세 데이터를 포함한 응답 객체
     * @throws IllegalArgumentException startKey 형식이 잘못된 경우
     */
    public SessionReplayResponseDto getSessionReplayStream(SessionReplayRequestDto requestDto) {
        if (fileDbBaseUrl == null || fileDbBaseUrl.isEmpty()) {
            log.error("FileDB URL is not configured.");
            return null;
        }
        String startKey = requestDto.getSessionId() + "#" + requestDto.getSessionStartTm();
        String endKey = null;
        /*if (requestDto.getIntervaltime() != null && !requestDto.getIntervaltime().isEmpty()) {
            long endTime = Long.parseLong(requestDto.getSessionStartTm()) + Long.parseLong(requestDto.getIntervaltime());
            endKey = requestDto.getSessionId() + "#" + endTime;
        }*/

        try {
            // 입력 파라미터 검증
            validateSessionReplayRequest(requestDto);

            // FileDB 요청 URL 구성
            String url = fileDbBaseUrl + "/getstreams";

            // JSON 요청 본문 구성
            Map<String, Object> requestBody = buildSessionReplayRequestBody(requestDto, startKey, endKey);

            // HTTP 헤더 설정
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // HTTP 요청 엔티티 생성
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

            // FileDB에 HTTP POST 요청 전송
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, requestEntity, String.class);

            // FileDB 응답을 SessionReplayResponseDto로 변환
            return parseSessionReplayResponse(response.getBody(), startKey);

        } catch (IllegalArgumentException e) {
            log.error("Failed to validate startKey format: startKey={}, error={}", startKey, e.getMessage());
            throw e; // 호출자에게 검증 실패를 알림
        } catch (ResourceAccessException e) {
            logHttpError("/getstreams", "CONNECTION_TIMEOUT", e.getMessage());
            log.error("FileDB server connection failed (timeout or network error): URL={}, startKey={}, error={}",
                    fileDbBaseUrl + "/getstreams", startKey, e.getMessage(), e);
            return createEmptySessionReplayResponse();
        } catch (HttpClientErrorException e) {
            logHttpError("/getstreams", "CLIENT_ERROR_" + e.getStatusCode(), e.getMessage());
            log.error("FileDB client error response: HTTP Status={}, startKey={}, Response Body={}",
                    e.getStatusCode(), startKey, e.getResponseBodyAsString(), e);
            return createEmptySessionReplayResponse();
        } catch (HttpServerErrorException e) {
            logHttpError("/getstreams", "SERVER_ERROR_" + e.getStatusCode(), e.getMessage());
            log.error("FileDB server error response: HTTP Status={}, startKey={}, Response Body={}",
                    e.getStatusCode(), startKey, e.getResponseBodyAsString(), e);
            return createEmptySessionReplayResponse();
        } catch (RestClientException e) {
            log.error("FileDB session replay lookup HTTP communication failure: startKey={}, error={}", startKey, e.getMessage(), e);
            return createEmptySessionReplayResponse();
        } catch (Exception e) {
            log.error("Unexpected exception processing session replay query: startKey={}, error={}", startKey, e.getMessage(), e);
            return createEmptySessionReplayResponse();
        }
    }

    /**
     * 세션 리플레이 액션 리스트를 조회한다.
     *
     * @param dto 조회 조건 DTO
     * @return 액션 목록 및 페이징 정보
     */
    public SessionReplayResponseDto getActionList(SessionReplayRequestDto dto) {
        SearchRequest searchRequest = FrontSessionReplayFactory.createActionListQuery(dto);
        try {
            SearchResponse response = client.get(searchRequest);
            return FrontSessionReplayServiceHelper.parseActionListData(response, dto);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return new SessionReplayResponseDto();
        }
    }

    /**
     * 액션 리스트 조회와 로딩 시간 보강을 함께 수행한다.
     *
     * @param dto 조회 조건 DTO
     * @return 로딩 시간이 포함된 액션 리스트
     */
    public List<SessionReplayResponseDto.ActionListData> getActionListWithLoadingTime(SessionReplayRequestDto dto) {
        SessionReplayResponseDto actionListResponse = getActionList(dto);
        List<SessionReplayResponseDto.ActionListData> actionList =
                actionListResponse.getActionList() != null ? actionListResponse.getActionList() : new ArrayList<>();

        return enrichActionListWithLoadingTime(actionList);
    }

    /**
     * ActionList에 로딩 시간 정보를 추가합니다.
     * 성능 최적화를 위해 필요한 데이터만 조회하고 직접 매칭하여 적용합니다.
     */
    public List<SessionReplayResponseDto.ActionListData> enrichActionListWithLoadingTime(List<SessionReplayResponseDto.ActionListData> actionList) {
        if (actionList == null || actionList.isEmpty()) {
            return actionList;
        }

        // 로딩 시간이 필요한 액션들만 필터링
        List<SessionReplayResponseDto.ActionListData> targetActions = actionList.stream()
                .filter(action -> action.getLogType() != null && isTargetLogType(action.getLogType()))
                .collect(Collectors.toList());

        if (targetActions.isEmpty()) {
            return actionList;
        }

        // MultiGetRequest 구성
        MultiGetRequest request = new MultiGetRequest();
        for (SessionReplayResponseDto.ActionListData action : targetActions) {
            String[] indexes = ElasticIndex.getIndicesForDateRange(ElasticIndex.PAGE_LOG, action.getLogTm());

            for (String index : indexes) {
                String docId = action.getLogTm() + action.getDeviceId();
                request.add(new MultiGetRequest.Item(index, docId)
                        .fetchSourceContext(new org.opensearch.search.fetch.subphase.FetchSourceContext(
                                true,
                                new String[]{Elastic.pageStartTm, Elastic.loadingTime},
                                new String[]{}
                        )));
            }
        }

        // Elasticsearch에서 로딩 시간 데이터 조회 및 ActionList에 직접 적용
        try {
            MultiGetResponse response = client.mget(request);

            for (MultiGetItemResponse itemResponse : response.getResponses()) {
                if (itemResponse.getResponse() == null || !itemResponse.getResponse().isExists()) {
                    continue;
                }

                Map<String, Object> source = itemResponse.getResponse().getSourceAsMap();
                Long pageStartTm = extractLongValue(source.get(Elastic.pageStartTm));
                Long loadingTime = extractLongValue(source.get(Elastic.loadingTime));

                if (pageStartTm != null && loadingTime != null) {
                    // ActionList에서 logTm이 pageStartTm과 일치하는 항목 찾아서 loadingTime 설정
                    for (SessionReplayResponseDto.ActionListData action : actionList) {
                        if (action.getLogTm() != null && action.getLogTm().equals(pageStartTm)) {
                            action.setLoadingTime(loadingTime);
                            break; // 일치하는 첫 번째 항목만 처리
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to look up loading time data", e);
        }

        return actionList;
    }

    /**
     * 로딩 시간을 조회해야 하는 로그 타입인지 확인합니다.
     *
     * @param logType 로그 타입 코드
     * @return 대상 여부
     */
    private boolean isTargetLogType(Integer logType) {
        return logType.equals(MaxyLogType.T_WebNav_Start.getDecimal()) ||
               logType.equals(MaxyLogType.T_WebNav_Show_DoccontentLoad.getDecimal());
    }

    /**
     * Object를 Long으로 안전하게 변환합니다.
     */
    private Long extractLongValue(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return null;
    }

    /**
     * 세션 리플레이 조회를 위한 FileDB 요청 본문을 구성합니다.
     *
     * @param requestDto 세션 리플레이 조회 요청 DTO
     * @return FileDB 요청용 Map 객체
     */
    private Map<String, Object> buildSessionReplayRequestBody(SessionReplayRequestDto requestDto, String startKey, String endKey) {
        Map<String, Object> requestBody = new HashMap<>();

        // 인덱스 설정 (기본값: sess_replay)
        String index = requestDto.getIndex() != null ? requestDto.getIndex() : "sess_replay";
        requestBody.put("index", index);

        // 검색 파라미터 설정
        Map<String, Object> searchParam = new HashMap<>();
        searchParam.put("startKey", startKey);
        if (endKey != null) {
            searchParam.put("endKey", endKey);
        }
        requestBody.put("search", searchParam);

        return requestBody;
    }

    /**
     * FileDB 응답을 SessionReplayResponseDto로 변환합니다.
     * FileDB는 여러 개의 JSON 객체가 연속으로 나열된 형태로 응답합니다:
     * {"key1":"data1"},{"key2":"data2"},...
     *
     * @param responseBody FileDB 응답 JSON 문자열
     * @param startKey     요청한 startKey
     * @return 변환된 SessionReplayResponseDto 객체
     */
    private SessionReplayResponseDto parseSessionReplayResponse(String responseBody, String startKey) {
        SessionReplayResponseDto responseDto = new SessionReplayResponseDto();

        try {
            // FileDB 응답은 여러 JSON 객체가 연속으로 나열된 형태: {"key1":"data1"},{"key2":"data2"},...
            // 이를 배열 형태로 변환
            ArrayNode replayDataArray = JsonUtil.createArrayNode();

            // 응답 문자열을 개별 JSON 객체로 분리
            String[] jsonObjects = splitJsonObjects(responseBody);

            for (String jsonObjectStr : jsonObjects) {
                if (jsonObjectStr.trim().isEmpty()) {
                    continue;
                }

                try {
                    JsonNode jsonObject = JsonUtil.readTree(jsonObjectStr);

                    // 각 JSON 객체의 필드를 순회
                    jsonObject.fields().forEachRemaining(entry -> {
                        String key = entry.getKey();
                        JsonNode value = entry.getValue();

                        // key가 sessionId#timestamp 형식인지 확인
                        if (key.contains("#")) {
                            // value가 문자열인 경우 JSON으로 파싱 시도
                            if (value.isTextual()) {
                                try {
                                    JsonNode parsedData = JsonUtil.readTree(value.asText());
                                    // parsedData 자체를 배열에 추가
                                    replayDataArray.add(parsedData);
                                } catch (Exception e) {
                                    // JSON 파싱 실패 시 원본 문자열을 텍스트 노드로 저장
                                    replayDataArray.add(JsonUtil.valueToTree(value.asText()));
                                }
                            } else {
                                // value가 이미 JSON 객체인 경우 그대로 추가
                                replayDataArray.add(value);
                            }
                        }
                    });
                } catch (Exception e) {
                    log.warn("Individual JSON object parsing failed: {}, error = {}", jsonObjectStr, e.getMessage());
                }
            }

            // 배열을 타임스탬프 순으로 정렬
            List<JsonNode> sortedList = new ArrayList<>();
            replayDataArray.forEach(sortedList::add);
            sortedList.sort((a, b) -> {
                long timestampA = a.has("timestamp") ? a.get("timestamp").asLong() : 0;
                long timestampB = b.has("timestamp") ? b.get("timestamp").asLong() : 0;
                return Long.compare(timestampA, timestampB);
            });

            // 정렬된 배열로 재구성
            ArrayNode sortedArray = JsonUtil.createArrayNode();
            sortedList.forEach(sortedArray::add);

            // sortedArray의 첫번째와 마지막 데이터 사용
            if (sortedArray.size() > 0) {
                responseDto.setFrom(sortedArray.get(0).get("timestamp").asLong());
                responseDto.setTo(sortedArray.get(sortedArray.size() - 1).get("timestamp").asLong());
            }

            responseDto.setReplayData(sortedArray);
            responseDto.setStatus("success");
        } catch (NumberFormatException e) {
            log.error("Timestamp parsing failed: startKey={}, error={}", startKey, e.getMessage(), e);
            return createEmptySessionReplayResponse();
        } catch (Exception e) {
            log.error("FileDB session replay response processing with unexpected exception: startKey={}, response body={}, error={}",
                    startKey, responseBody, e.getMessage(), e);
            return createEmptySessionReplayResponse();
        }

        return responseDto;
    }

    /**
     * 빈 세션 리플레이 응답 객체를 생성합니다.
     * 에러 상황에서 기본값으로 반환됩니다.
     *
     * @return 빈 SessionReplayResponseDto 객체
     */
    private SessionReplayResponseDto createEmptySessionReplayResponse() {
        SessionReplayResponseDto responseDto = new SessionReplayResponseDto();
        responseDto.setSessionId("");
        responseDto.setReplayData(null);
        responseDto.setStatus("error");
        return responseDto;
    }

    /**
     * 세션 리플레이 조회 요청 파라미터를 검증합니다.
     *
     * @param requestDto 검증할 요청 DTO
     * @throws IllegalArgumentException 필수 파라미터가 누락되거나 잘못된 경우
     */
    private void validateSessionReplayRequest(SessionReplayRequestDto requestDto) {
        if (requestDto == null) {
            throw new IllegalArgumentException("Request data is null.");
        }

        if (requestDto.getSessionId() == null || requestDto.getSessionStartTm() == null
            || requestDto.getSessionId().trim().isEmpty() || requestDto.getSessionStartTm().trim().isEmpty()) {
            throw new IllegalArgumentException("The search parameter is missing.");
        }

        // 인덱스 검증 (선택적, 기본값 사용 가능)
        if (requestDto.getIndex() != null && requestDto.getIndex().trim().isEmpty()) {
            throw new IllegalArgumentException("The index value is empty.");
        }
    }

    /**
     * 여러 JSON 객체가 연속으로 나열된 문자열을 개별 JSON 객체로 분리합니다.
     * 예: {"key1":"data1"},{"key2":"data2"} -> ["{"key1":"data1"}",
     * "{"key2":"data2"}"]
     *
     * @param responseBody 연속된 JSON 객체 문자열
     * @return 개별 JSON 객체 문자열 배열
     */
    private String[] splitJsonObjects(String responseBody) {
        if (responseBody == null || responseBody.trim().isEmpty()) {
            return new String[0];
        }

        List<String> jsonObjects = new ArrayList<>();
        StringBuilder currentObject = new StringBuilder();
        int braceCount = 0;
        boolean inString = false;
        boolean escaped = false;

        for (int i = 0; i < responseBody.length(); i++) {
            char c = responseBody.charAt(i);

            if (escaped) {
                escaped = false;
                currentObject.append(c);
                continue;
            }

            if (c == '\\') {
                escaped = true;
                currentObject.append(c);
                continue;
            }

            if (c == '"') {
                inString = !inString;
                currentObject.append(c);
                continue;
            }

            if (!inString) {
                if (c == '{') {
                    braceCount++;
                    currentObject.append(c);
                } else if (c == '}') {
                    braceCount--;
                    currentObject.append(c);

                    // 완전한 JSON 객체가 완성되면 리스트에 추가
                    if (braceCount == 0) {
                        String jsonObject = currentObject.toString().trim();
                        if (!jsonObject.isEmpty()) {
                            jsonObjects.add(jsonObject);
                        }
                        currentObject = new StringBuilder();
                    }
                } else if (c == ',' && braceCount == 0) {
                    // 객체 간 구분자는 무시
                    continue;
                } else {
                    currentObject.append(c);
                }
            } else {
                currentObject.append(c);
            }
        }

        // 마지막 객체가 남아있다면 추가
        String remaining = currentObject.toString().trim();
        if (!remaining.isEmpty() && braceCount == 0) {
            jsonObjects.add(remaining);
        }

        return jsonObjects.toArray(new String[0]);
    }

    /**
     * HTTP 통신 에러 상황을 로그에 기록하고 모니터링을 위한 메트릭을 수집합니다.
     *
     * @param endpoint     호출한 엔드포인트
     * @param errorType    에러 유형
     * @param errorMessage 에러 메시지
     */
    private void logHttpError(String endpoint, String errorType, String errorMessage) {
        log.warn("FileDB HTTP Communication Error Occurred: endpoint={}, errorType={}, message={}",
                endpoint, errorType, errorMessage);

        // 향후 메트릭 수집이나 알림 시스템 연동 시 이 메서드를 확장할 수 있습니다.
        // 예: Micrometer 메트릭 카운터 증가, 알림 발송 등
    }

    /**
     * 세션 리플레이 데이터를 스트림 방식으로 FileDB에서 가져와 OutputStream에 씁니다.
     * WebClient를 사용하여 FileDB의 청크를 그대로 클라이언트에 전달합니다.
     *
     * @param requestDto 세션 리플레이 조회 요청 데이터
     * @param outputStream 클라이언트로 전송할 OutputStream
     * @throws Exception 스트림 처리 중 발생하는 예외
     */
    public void streamSessionReplayData(SessionReplayRequestDto requestDto, java.io.OutputStream outputStream) throws Exception {
        if (fileDbBaseUrl == null || fileDbBaseUrl.isEmpty()) {
            log.error("FileDB URL is not configured.");
            throw new IllegalStateException("FileDB URL is not configured.");
        }

        String startKey = requestDto.getSessionId() + "#" + requestDto.getSessionStartTm();
        String endKey = null;

        // 입력 파라미터 검증
        validateSessionReplayRequest(requestDto);

        String url = fileDbBaseUrl + "/getstreams";

        // JSON 요청 본문 구성
        Map<String, Object> requestBody = buildSessionReplayRequestBody(requestDto, startKey, endKey);

        try {
            // WebClient를 사용하여 FileDB의 청크를 그대로 전달
            int[] chunkCount = {0};
            long[] totalBytesRead = {0};

            fileDbWebClient.post()
                    .uri("/getstreams")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToFlux(org.springframework.core.io.buffer.DataBuffer.class)
                    .doOnNext(dataBuffer -> {
                        try {
                            chunkCount[0]++;
                            int chunkSize = dataBuffer.readableByteCount();
                            totalBytesRead[0] += chunkSize;

                            // FileDB로부터 받은 청크를 그대로 클라이언트에 전송
                            byte[] bytes = new byte[chunkSize];
                            dataBuffer.read(bytes);
                            outputStream.write(bytes);
                            outputStream.flush();

                            // DataBuffer 해제 (메모리 누수 방지)
                            org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
                        } catch (Exception e) {
                            log.error("[SESSION-REPLAY-STREAM-ERROR] Failed to forward chunk: {}", e.getMessage());
                            throw new RuntimeException(e);
                        }
                    })
                    .doOnError(error -> {
                        log.error("[SESSION-REPLAY-STREAM-ERROR] Stream error occurred: {}", error.getMessage(), error);
                    })
                    .blockLast(); // 스트림이 완료될 때까지 대기

        } catch (Exception e) {
            log.error("Failed to stream session replay data: {}", e.getMessage(), e);
            throw e;
        }
    }
}
