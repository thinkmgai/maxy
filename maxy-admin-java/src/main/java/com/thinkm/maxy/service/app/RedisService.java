package com.thinkm.maxy.service.app;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisService {

    private final RedisTemplate<String, Object> redisJsonTemplate;
    private final RedisTemplate<String, Long> redisLongTemplate;
    private final RedisTemplate<String, String> redisStringTemplate;

    public Set<String> keys(String pattern) {
        try {
            log.debug("search keys: {}", pattern);
            return redisJsonTemplate.keys(pattern);
        } catch (Exception e) {
            log.error("Redis keys error: pattern={}, message={}", pattern, e.getMessage(), e);
            return Collections.emptySet();
        }
    }

    public Object get(String key) {
        try {
            log.debug("get data: {}", key);
            return redisJsonTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.error("Redis get (Object) error: key={}, message={}", key, e.getMessage(), e);
            return null;
        }
    }

    public List<Object> get(Collection<String> keys) {
        log.debug("get data key size: {}", keys.size());
        if (keys.size() > 500) {
            return bulkGet(keys);
        } else {
            return multiGet(keys);
        }
    }

    public String getString(String key) {
        try {
            log.debug("get data: {}", key);
            return redisStringTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.error("Redis getString error: key={}, message={}", key, e.getMessage(), e);
            return null;
        }
    }

    public List<Long> getLong(List<String> keys) {
        try {
            log.debug("get data keys size: {}", keys.size());
            List<Long> result = redisLongTemplate.opsForValue().multiGet(keys);
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("Redis getLong error: keys={}, message={}", keys.size(), e.getMessage(), e);
            log.debug(keys.toString());
            return Collections.emptyList();
        }
    }

    public void set(String key, Object value) {
        try {
            log.debug("set key: {}, value: {}", key, value);
            redisJsonTemplate.opsForValue().set(key, value);
        } catch (Exception e) {
            log.error("Redis set (Object) error: key={}, value={}, message={}", key, value, e.getMessage(), e);
        }
    }

    public void setString(String key, String value) {
        try {
            log.debug("set key: {}, value: {}", key, value);
            redisStringTemplate.opsForValue().set(key, value);
        } catch (Exception e) {
            log.error("Redis setString error: key={}, value={}, message={}", key, value, e.getMessage(), e);
        }
    }

    public List<Object> bulkGet(Collection<String> keys) {
        try {
            log.debug("bulkGet keys size: {}", keys.size());
            return redisJsonTemplate.executePipelined((RedisCallback<?>) connection -> {
                for (String key : keys) {
                    connection.get(key.getBytes(StandardCharsets.UTF_8));  // This will be pipelined
                }
                return null;
            });
        } catch (Exception e) {
            log.error("Redis bulkGet error: keys={}, message={}", keys.size(), e.getMessage(), e);
            log.debug(keys.toString());
            return Collections.emptyList();
        }
    }

    public List<Object> multiGet(Collection<String> keys) {
        try {
            log.debug("multiGet keys size: {}", keys.size());
            List<Object> result = redisJsonTemplate.opsForValue().multiGet(keys);
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("Redis multiGet (Object) error: keys={}, message={}", keys.size(), e.getMessage(), e);
            log.debug(keys.toString());
            return Collections.emptyList();
        }
    }

    public void delete(String key) {
        try {
            log.debug("delete key: {}", key);
            redisStringTemplate.delete(key);
        } catch (Exception e) {
            log.error("Redis delete error: key={}, message={}", key, e.getMessage(), e);
        }
    }

    public void setHash(String key, Map<String, Object> map) {
        try {
            log.debug("setHash key: {}, map: {}", key, map);
            redisStringTemplate.opsForHash().putAll(key, map);
        } catch (Exception e) {
            log.error("Redis setHash error: key={}, message={}", key, e.getMessage(), e);
        }
    }
}