package com.thinkm.common.filter;

import com.thinkm.maxy.vo.MaxyUser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.cors.CorsUtils;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.function.Predicate;

@Slf4j
public class SessionFilter implements Filter {

    // filter 통과할 패턴
    private static final String[] whiteList = {"/ln/", "/cmm/", "/djemalschrlghk.maxy", "/djemalsqlqjsqusrud.maxy", "/health.maxy"};
    // filter 무시할 서블릿 명
    private static final String[] ignoreList = {"/main.maxy", "/um/modifyUserInfo.maxy"};
    // 로그아웃 시킬 서블릿
    private static final String LOGOUT_URL = "/ln/doLogout.maxy";

    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain
    ) throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        if (CorsUtils.isPreFlightRequest(req)) {
            chain.doFilter(request, response);
            return;
        }

        String requestURI = req.getRequestURI();
        final String IP = req.getRemoteAddr();

        // set whiteList
        for (String s : whiteList) {
            if (requestURI.contains(s)) {
                // pass
                chain.doFilter(request, response);
                return;
            }
        }

        // 로그인 유저 검증
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(req);
        if (user != null) {
            if (!requestURI.contains("getSessionInfo.maxy")) {
                log.debug("[USER]: {}, [IP]: {}, [URI]:{}", user.getUserNo(), IP, requestURI);
            }

            // `//` -> `/`
            requestURI = requestURI.replaceAll("//", "/");

            // `/` 로 split
            String[] uriArray = requestURI.split("/");

            // 정상적인 URL 요청
            if (uriArray.length > 3) {
                // make menuId (ex. DB0100)
                String menuId = (uriArray[1] + uriArray[2]).toUpperCase();
                boolean isPass = false;

                // 유저가 가지고 있는 메뉴 권한 목록
                List<String> menus = user.getMenuIdList();
                // loginUser 가 가지고 있는 메뉴 권한 목록 순회
                for (String menu : menus) {
                    // 메뉴 권한 비교
                    if (menuId.equals(menu)) {
                        isPass = true;
                        break;
                    }
                }
                // 권한이 없는 경우
                if (!isPass) {
                    log.warn("[DENIED]: {}", requestURI);
                    StringBuilder b = new StringBuilder();
                    menus.forEach(p -> {
                        b.append(p);
                        b.append(", ");
                    });
                    log.warn("[MENUID]: {}", b);

                    // 로그인 페이지로 이동
                    res.sendRedirect(LOGOUT_URL + "?denied=menu.denied");
                    return;
                }
            } else if (Arrays.stream(ignoreList).noneMatch(Predicate.isEqual(requestURI))) {
                // main 제외
                // 정상적이지 않은 URL
                log.error("Invalid URL Type.");
                // 로그인 페이지로 이동
                res.sendRedirect(LOGOUT_URL + "?denied=invalid.url");
                return;
            }
        } else {
            // 세션값 없음 (만료)
            log.warn("[Session Expired]: {}", requestURI);

            // header 가 accept: "application/json" 포함하면 401로 반환
            String accept = req.getHeader("accept");
            String contentType = req.getHeader("Content-Type");
            if ((accept != null && accept.contains("application/json"))
                || (contentType != null && contentType.contains("multipart/form-data"))) {
                res.setStatus(HttpServletResponse.SC_FORBIDDEN);
            } else {
                // 그 외에는 logout redirect
                res.sendRedirect(LOGOUT_URL + "?denied=session.expired");
            }
            return;
        }

        chain.doFilter(request, response);
    }
}
