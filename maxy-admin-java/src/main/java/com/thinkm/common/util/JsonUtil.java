package com.thinkm.common.util;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import lombok.experimental.UtilityClass;

import java.io.InputStream;
import java.lang.reflect.Type;
import java.util.Map;

@UtilityClass
public class JsonUtil {
    private static final ObjectMapper MAPPER = createMapper();

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    /* ---------- Gson (thread-safe) ---------- */
    private static final Gson GSON = createGson();

    public static ObjectMapper createMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // 1) java.time 계열을 ISO-8601로 직렬화/역직렬화
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        // 필요 시, 타임존 자동 보정 비활성화(서버/클라이언트 TZ 섞일 때 예기치 않은 변환 방지)
        mapper.disable(DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE);

        // 2) 알 수 없는 필드가 들어와도 실패하지 않음(역직렬화 내성)
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // 3) 직렬화 시 null 필드는 제외하여 페이로드 절감
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);

        // 선택: 빈 객체 직렬화 실패를 피하고 싶다면 주석 해제
        // mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);

        return mapper;
    }

    public static <T> T readValue(String json, Class<T> type) {
        try {
            return MAPPER.readValue(json, type);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static <T> T convertValue(Object content, Class<T> clazz) {
        try {
            return MAPPER.convertValue(content, clazz);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static <T> T convertValue(Object content, TypeReference<T> valueTypeRef) {
        try {
            return MAPPER.convertValue(content, valueTypeRef);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static JsonNode readTree(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static <T> T readValue(String content, TypeReference<T> valueTypeRef) {
        try {
            return MAPPER.readValue(content, valueTypeRef);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static <T> T readValue(InputStream content, TypeReference<T> valueTypeRef) {
        try {
            return MAPPER.readValue(content, valueTypeRef);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static Map<String, Object> readMap(String content) {
        try {
            return MAPPER.readValue(content, MAP_TYPE);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static Map<String, Object> convertMap(Object content) {
        try {
            return MAPPER.convertValue(content, MAP_TYPE);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static ArrayNode createArrayNode() {
        return MAPPER.createArrayNode();
    }

    public static <T extends JsonNode> T valueToTree(String value) {
        return MAPPER.valueToTree(value);
    }

    private static Gson createGson() {
        // GSON 세팅
        return new GsonBuilder()
                // json value값이 null일경우 null을 세팅하도록한다.(이 설정이 없으면 value가 null인 key는 목록에서 제외된다)
                .serializeNulls()
                // 특수문자를 유니코드로 변환하지 않도록 disableHtmlEscaping()를 실행한다.
                .disableHtmlEscaping()
                .create();
    }

    /* ---------- Common JSON methods ---------- */

    public static String toJson(Object obj) {
        try {
            return GSON.toJson(obj);
        } catch (Exception e) {
            throw new RuntimeException("JSON serialization error", e);
        }
    }

    public static <T> T fromJson(String json, Class<T> type) {
        try {
            return GSON.fromJson(json, type);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    public static <T> T fromJson(String json, Type typeToken) {
        try {
            return GSON.fromJson(json, typeToken);
        } catch (Exception e) {
            throw new RuntimeException("JSON deserialization error", e);
        }
    }
}
