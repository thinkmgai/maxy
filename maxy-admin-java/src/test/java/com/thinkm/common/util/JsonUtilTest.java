package com.thinkm.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.*;

class JsonUtilTest {

    @Test
    void 문자열을객체로역직렬화() {
        String json = """
                {"name":"maxy","age":3,"active":true}
                """;
        Sample sample = JsonUtil.readValue(json, Sample.class);

        assertEquals("maxy", sample.getName());
        assertEquals(3, sample.getAge());
        assertTrue(sample.isActive());
    }

    @Test
    void 타입레퍼런스로역직렬화() {
        String json = """
                {"region":"KR","count":7}
                """;
        Map<String, Object> map = JsonUtil.readValue(json, new TypeReference<>() {
        });

        assertEquals("KR", map.get("region"));
        assertEquals(7, map.get("count"));
    }

    @Test
    void 값변환으로객체와맵생성() {
        Map<String, Object> source = Map.of("name", "beta", "age", 9, "active", false);
        Sample sample = JsonUtil.convertValue(source, Sample.class);
        assertEquals("beta", sample.getName());
        assertEquals(9, sample.getAge());
        assertFalse(sample.isActive());

        Map<String, Object> backToMap = JsonUtil.convertValue(sample, new TypeReference<Map<String, Object>>() {
        });
        assertEquals("beta", backToMap.get("name"));
    }

    @Test
    void 트리읽기와배열노드생성() {
        JsonNode node = JsonUtil.readTree("{\"items\":[1,2,3]}");
        ArrayNode arrayNode = JsonUtil.createArrayNode();
        arrayNode.addAll((ArrayNode) node.get("items"));

        assertEquals(3, arrayNode.size());
        assertEquals(2, arrayNode.get(1).asInt());
    }

    @Test
    void 맵읽기와변환() {
        String json = """
                {"a":1,"b":2}
                """;
        Map<String, Object> map = JsonUtil.readMap(json);
        assertEquals(2, map.get("b"));

        Map<String, Object> converted = JsonUtil.convertMap(new Sample("dto", 5, true));
        assertEquals("dto", converted.get("name"));
        assertEquals(5, converted.get("age"));
        assertEquals(true, converted.get("active"));
    }

    @Test
    void 입력스트림역직렬화() {
        byte[] bytes = "{\"key\":\"value\"}".getBytes(StandardCharsets.UTF_8);
        ByteArrayInputStream inputStream = new ByteArrayInputStream(bytes);
        Map<String, Object> map = JsonUtil.readValue(inputStream, new TypeReference<>() {
        });
        assertEquals("value", map.get("key"));
    }

    @Test
    void GSON직렬화역직렬화() {
        Sample sample = new Sample("zeta", 11, true);
        String json = JsonUtil.toJson(sample);
        assertTrue(json.contains("\"name\":\"zeta\""));

        Sample restored = JsonUtil.fromJson(json, Sample.class);
        assertEquals(sample, restored);

        Type listType = new com.google.gson.reflect.TypeToken<List<Integer>>() {
        }.getType();
        List<Integer> numbers = JsonUtil.fromJson("[1,2,3]", listType);
        assertEquals(List.of(1, 2, 3), numbers);
    }

    @Test
    void 값트리변환() {
        JsonNode node = JsonUtil.valueToTree("{\"alpha\":1}");
        assertEquals("{\"alpha\":1}", node.textValue());
    }

    @Test
    void 잘못된JSON은예외발생() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> JsonUtil.readValue("not-json", Sample.class));
        assertTrue(ex.getMessage().contains("JSON"));
    }

    private static class Sample {
        private String name;
        private int age;
        private boolean active;

        public Sample() {
        }

        public Sample(String name, int age, boolean active) {
            this.name = name;
            this.age = age;
            this.active = active;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public int getAge() {
            return age;
        }

        public void setAge(int age) {
            this.age = age;
        }

        public boolean isActive() {
            return active;
        }

        public void setActive(boolean active) {
            this.active = active;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            Sample sample = (Sample) o;
            return age == sample.age &&
                    active == sample.active &&
                    Objects.equals(name, sample.name);
        }

        @Override
        public int hashCode() {
            return Objects.hash(name, age, active);
        }
    }
}
