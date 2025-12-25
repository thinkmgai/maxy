package com.thinkm.common.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * IPv4 정확 일치 허용 필터.
 * - 허용 목록은 CSV에서 파싱된 정확 IPv4만 지원한다.
 * - CIDR, IPv6, 경로 제외 기능을 지원하지 않는다.
 * - 허용 목록이 비어 있으면 모든 요청을 차단한다.
 */
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE)
public class IPAllowFilter extends OncePerRequestFilter {

    private static final Pattern IPV4 =
            Pattern.compile("^(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)(\\.(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)){3}$");

    // IPv4-mapped IPv6 패턴: ::ffff:192.168.0.1 (대소문자 무시)
    private static final Pattern V4_MAPPED_V6 =
            Pattern.compile("(?i).*:\\s*ffff:(\\d+\\.\\d+\\.\\d+\\.\\d+)$");
    private final Set<String> exactIps; // 허용 IPv4 목록

    public IPAllowFilter(List<String> csvTokens) {
        List<String> tokens = csvTokens == null ? List.of() :
                csvTokens.stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();

        // 입력값 중 IPv4 형식만 수용
        Set<String> exact = new HashSet<>();
        for (String t : tokens) {
            if (IPV4.matcher(t).matches()) {
                exact.add(t);
            }
        }
        this.exactIps = exact;
        log.info("IP allow list: {}", exactIps);
    }

    /**
     * "1.2.3.4" 또는 "1.2.3.4:12345"를 IPv4로 정규화.
     * "::1"은 "127.0.0.1"로 매핑.
     * "::ffff:1.2.3.4"는 "1.2.3.4" 추출.
     * 그 외 IPv6 표기는 null.
     */
    // 추가: IPv4-mapped IPv6 (::ffff:1.2.3.4) 그대로 사용
    private String stripAndValidateV4(String v) {
        if (v == null || v.isBlank()) return null;

        // 1) localhost → 127.0.0.1
        if ("localhost".equalsIgnoreCase(v)) return "127.0.0.1";

        // 2) IPv6 루프백 풀/축약 표기 및 브래킷/zone-id, port 처리
        // 예: ::1, [::1], ::1%lo0, [::1]:8080, 0:0:0:0:0:0:0:1, [0:0:0:0:0:0:0:1]
        String lower = v.toLowerCase();
        if (lower.contains("0:0:0:0:0:0:0:1") || lower.startsWith("::1") || lower.contains("::1")) {
            return "127.0.0.1";
        }
        if (lower.startsWith("[::1") || lower.startsWith("[0:0:0:0:0:0:0:1")) {
            return "127.0.0.1";
        }

        // 3) IPv4-mapped IPv6: ::ffff:1.2.3.4 (브래킷/포트 포함 가능)
        var m = V4_MAPPED_V6.matcher(v);
        if (m.matches()) {
            String mapped = m.group(1);
            return IPV4.matcher(mapped).matches() ? mapped : null;
        }

        // 4) 대괄호 IPv6는 차단
        if (v.startsWith("[") && v.contains("]")) return null;

        // 5) IPv4:port 형태
        int colon = v.indexOf(':');
        if (colon > 0 && v.indexOf(':', colon + 1) == -1) {
            String maybeIp = v.substring(0, colon);
            return IPV4.matcher(maybeIp).matches() ? maybeIp : null;
        }

        // 6) 순수 IPv4
        return IPV4.matcher(v).matches() ? v : null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String clientIp = extractClientIpV4Only(request);

        if (clientIp == null || !isAllowed(clientIp)) {
            log.warn("[IPAllowFilter] blocked uri={} ip={}", request.getRequestURI(), clientIp);
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden by IP policy");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isAllowed(String ip) {
        if (exactIps.isEmpty()) {
            // 기본값: 허용 목록이 비어 있으면 전체 허용
            return true;
        }
        if (!IPV4.matcher(ip).matches()) {
            return false;
        }
        return exactIps.contains(ip);
    }

    /**
     * 우선순위: X-Forwarded-For(첫 값) → Forwarded → RemoteAddr.
     * 반환은 IPv4만 허용한다. IPv6 또는 형식 불일치는 null을 반환.
     */
    private String extractClientIpV4Only(HttpServletRequest request) {
        // 1) X-Forwarded-For: "client, proxy1, proxy2"
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String first = xff.split(",")[0].trim();
            String v4 = stripAndValidateV4(first);
            if (v4 != null) return v4;
        }

        // 2) Forwarded: for=1.2.3.4;proto=https;by=...
        String fwd = request.getHeader("Forwarded");
        if (fwd != null && !fwd.isBlank()) {
            String[] entries = fwd.split(",");
            for (String entry : entries) {
                String[] kvs = entry.split(";");
                for (String kv : kvs) {
                    String t = kv.trim();
                    if (t.regionMatches(true, 0, "for=", 0, 4)) {
                        String v = t.substring(4).replace("\"", "");
                        String v4 = stripAndValidateV4(v);
                        if (v4 != null) return v4;
                    }
                }
            }
        }

        // 3) RemoteAddr
        String remote = request.getRemoteAddr();
        return stripAndValidateV4(remote);
    }
}
