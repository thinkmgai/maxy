package com.thinkm.common.filter;

import com.thinkm.common.util.HTMLTagFilterRequestWrapper;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;

public class HTMLTagFilter implements Filter {
    private FilterConfig config;

    public HTMLTagFilter() {
    }

    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        chain.doFilter(new HTMLTagFilterRequestWrapper((HttpServletRequest) request), response);
    }

    public void init(FilterConfig config) throws ServletException {
        this.config = config;
    }

    public void destroy() {
    }
}
