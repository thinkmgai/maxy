package com.thinkm.common.config;

import org.apache.catalina.Context;
import org.apache.catalina.webresources.ExtractingRoot;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.support.WebBindingInitializer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.Collections;

@EnableAsync
@Configuration
@EnableScheduling
public class AppConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> servletContainerCustomizer() {
        return (TomcatServletWebServerFactory container) -> container.addContextCustomizers((Context context) -> {
            // This configuration is used to improve initialization performance.

            context.setResources(new ExtractingRoot());
            context.setReloadable(false);
        });
    }

    @Bean
    public RestTemplate restTemplate() {
        CloseableHttpClient httpClient = HttpClients.custom()
                .setConnectionTimeToLive(3000, java.util.concurrent.TimeUnit.MILLISECONDS)
                .build();

        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);

        // 연결 타임아웃 설정
        factory.setConnectTimeout(3000);

        // 읽기 타임아웃 설정
        factory.setReadTimeout(3000);

        return new RestTemplate(factory);
    }

    @Bean
    public WebClient fileDbWebClient(@Value("${network.filedb.url:}") String fileDbBaseUrl) {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();

        WebClient.Builder builder = WebClient.builder()
                .exchangeStrategies(strategies);

        if (StringUtils.hasText(fileDbBaseUrl)) {
            builder.baseUrl(fileDbBaseUrl);
        }

        return builder
                .clientConnector(new ReactorClientHttpConnector(
                        HttpClient.create()
                                .responseTimeout(Duration.ofSeconds(5))
                ))
                .build();
    }

    @Bean
    public RequestMappingHandlerAdapter requestMappingHandlerAdapter(WebBindingInitializer bindingInitializer) {
        RequestMappingHandlerAdapter adapter = new RequestMappingHandlerAdapter();
        System.out.println("requestMappingHandlerAdapter");
        // WebBindingInitializer 설정
        adapter.setWebBindingInitializer(bindingInitializer);

        // MessageConverter 설정
        adapter.setMessageConverters(Collections.singletonList(new MappingJackson2HttpMessageConverter()));

        return adapter;
    }

    @Bean
    public WebBindingInitializer bindingInitializer() {
        // BindingInitializer를 설정 (com.thinkm.common.config.BindingInitializer 사용)
        return new com.thinkm.common.config.BindingInitializer();
    }
}