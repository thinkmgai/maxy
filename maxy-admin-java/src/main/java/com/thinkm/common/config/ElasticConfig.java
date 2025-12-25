package com.thinkm.common.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.ssl.SSLContexts;
import org.opensearch.client.RestClient;
import org.opensearch.client.RestClientBuilder;
import org.opensearch.client.RestHighLevelClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.core.annotation.Order;

import javax.net.ssl.SSLContext;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
public class ElasticConfig {

    private static final int timeout = 60 * 1000;
    private static CredentialsProvider credentialsProvider;
    private static SSLContext sslContext;
    private static HttpHost[] httpHosts;

    @Value("${spring.elasticsearch.rest.uris}")
    private String hostStr;
    @Value("${spring.elasticsearch.rest.protocol}")
    private String protocol;
    @Value("${spring.elasticsearch.rest.username}")
    private String username;
    @Value("${spring.elasticsearch.rest.password}")
    private String password;
    @Value("${spring.elasticsearch.rest.auth}")
    private boolean auth;

    public static RestClientBuilder initRestClientBuilder() {
        return RestClient.builder(httpHosts)
                .setRequestConfigCallback(b -> b
                        .setConnectTimeout(timeout)
                        .setSocketTimeout(timeout))
                .setHttpClientConfigCallback(b -> b
                        .setDefaultCredentialsProvider(credentialsProvider)
                        .setSSLContext(sslContext)
                        .setSSLHostnameVerifier(NoopHostnameVerifier.INSTANCE));
    }

    public static RestClient initRestClient() {
        return initRestClientBuilder().build();
    }

    public static String getHosts() {
        return Arrays.toString(httpHosts);
    }

    @Bean
    @DependsOn("elasticSearchTemplate")
    public RestHighLevelClient esClient() {
        return new RestHighLevelClient(initRestClientBuilder());
    }

    @Bean
    public void elasticSearchTemplate() {
        String[] hostsPorts = hostStr.split("\\s*,\\s*");
        String[] hosts = new String[hostsPorts.length];
        int[] ports = new int[hostsPorts.length];
        // 각 항목을 호스트와 포트로 분리하여 배열에 저장
        for (int i = 0; i < hostsPorts.length; i++) {
            String[] parts = hostsPorts[i].split(":");
            hosts[i] = parts[0];
            ports[i] = Integer.parseInt(parts[1]);
        }

        List<HttpHost> httpHostList = new ArrayList<>();
        for (int i = 0; i < hosts.length; i++) {
            httpHostList.add(new HttpHost(
                    hosts[i],
                    ports[i], protocol));
        }

        HttpHost[] tmpArray = new HttpHost[httpHostList.size()];
        tmpArray = httpHostList.toArray(tmpArray);

        httpHosts = tmpArray;
        // SSL 우회
        credentialsProvider = new BasicCredentialsProvider();
        try {
            if (auth) {
                credentialsProvider.setCredentials(AuthScope.ANY,
                        new UsernamePasswordCredentials(username, password));
                SSLContextBuilder sslBuilder = SSLContexts.custom()
                        .loadTrustMaterial(null, (x509Certificates, s) -> true);
                sslContext = sslBuilder.build();
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }
}

