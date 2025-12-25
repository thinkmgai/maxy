package com.thinkm.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisSentinelConfiguration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.GenericToStringSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Value("${spring.redis.host}")
    private String host;
    @Value("${spring.redis.port}")
    private int port;
    @Value("${spring.redis.password}")
    private String password;

    @Value("${spring.redis.sentinel.use:false}")
    private boolean useSentinel;

    @Value("${spring.redis.sentinel.master}")
    private String sentinelMaster;

    @Value("${spring.redis.sentinel.nodes}")
    private String sentinelNodes;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        LettuceConnectionFactory factory;
        if (useSentinel) {
            RedisSentinelConfiguration sentinelConfig = new RedisSentinelConfiguration().master(sentinelMaster);
            sentinelConfig.setSentinelPassword(RedisPassword.of(password));
            for (String node : sentinelNodes.split(",")) {
                String[] parts = node.split(":");
                sentinelConfig.sentinel(parts[0].trim(), Integer.parseInt(parts[1].trim()));
            }
            sentinelConfig.setPassword(RedisPassword.of(password));
            factory = new LettuceConnectionFactory(sentinelConfig);
        } else {
            RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(host, port);
            config.setPassword(RedisPassword.of(password));
            factory = new LettuceConnectionFactory(config);
        }
        factory.setShareNativeConnection(false);
        return factory;
    }

    @Bean
    public RedisTemplate<String, Object> redisJsonTemplate() {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setEnableTransactionSupport(false);
        return template;
    }

    @Bean
    public RedisTemplate<String, Long> redisLongTemplate() {
        RedisTemplate<String, Long> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericToStringSerializer<>(Long.class));
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericToStringSerializer<>(Long.class));
        template.setEnableTransactionSupport(false);
        return template;
    }

    @Bean
    public RedisTemplate<String, String> redisStringTemplate() {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        template.setEnableTransactionSupport(false);
        return template;
    }
}
