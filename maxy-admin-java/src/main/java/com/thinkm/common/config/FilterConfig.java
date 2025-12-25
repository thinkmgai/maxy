package com.thinkm.common.config;

import com.thinkm.common.filter.IPAllowFilter;
import com.thinkm.common.filter.SessionFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 필터 설정
 */
@Slf4j
@Configuration
public class FilterConfig {

    @Value("${security.ip-allowlist:}")
    private String ipAllowCsv;

    private static List<String> csvToList(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    /**
     * *.maxy 로 들어오는 모든 요청을 SessionFilter 로 거치도록 설정
     *
     * @return FilterRegistrationBean
     */
    @Bean
    public FilterRegistrationBean<SessionFilter> setFilterRegistration() {
        FilterRegistrationBean<SessionFilter> bean = new FilterRegistrationBean<>(new SessionFilter());
        bean.setUrlPatterns(Collections.singletonList("*.maxy"));
        return bean;
    }

    /**
     * 허용된 IP만 접속되도록 하는 필터
     */
    @Bean
    public FilterRegistrationBean<IPAllowFilter> ipAllowFilter() {
        List<String> tokens = csvToList(ipAllowCsv);
        FilterRegistrationBean<IPAllowFilter> bean = new FilterRegistrationBean<>(new IPAllowFilter(tokens));
        bean.setOrder(1);
        return bean;
    }
}
