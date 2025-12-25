package com.thinkm.common.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.servlet.*;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 외부에서 접근가능하도록 CORS 허용
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CORSFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {

        HttpServletResponse httpServletResponse = (HttpServletResponse) response;
        httpServletResponse
                .setHeader("Access-Control-Allow-Origin", "*");
        httpServletResponse
                .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        httpServletResponse
                .setHeader("Access-Control-Max-Age", "3600");
        httpServletResponse
                .setHeader("Access-Control-Allow-Headers", "*");
        httpServletResponse
                .setHeader("Access-Control-Allow-Credentials", "true");

        chain.doFilter(request, response);
    }
}
