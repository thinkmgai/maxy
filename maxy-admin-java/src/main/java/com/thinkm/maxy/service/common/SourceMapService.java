package com.thinkm.maxy.service.common;

import com.thinkm.common.util.sourcemap.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class SourceMapService {

    /**
     * 캐시 TTL (10분)
     */
    private static final long CACHE_TTL_MILLIS = Duration.ofMinutes(10).toMillis();

    /**
     * 파일명 -> 파싱된 sourcemap + 캐시 시각
     * ConcurrentHashMap 사용으로 스레드 세이프
     */
    private final Map<String, CacheEntry> cacheMap = new ConcurrentHashMap<>();

    private final ResourcePatternResolver resolver;
    private final Path sourceMapBaseDir;

    public SourceMapService(
            ResourcePatternResolver resolver,
            @Value("${maxy.sourcemap.base-dir}") String baseDir
    ) {
        this.resolver = resolver;
        this.sourceMapBaseDir = Paths.get(baseDir).toAbsolutePath().normalize();
    }

    // todo: Spring cache + caffeine 구성으로 동일 요청 동일 반환 기조로 개발 필요
    public List<StackMappingResult> mapErrorStack(String errorStack) throws IOException {
        // 1) 트레이스 line 전부 파싱
        List<StackFrameRef> frames = new ArrayList<>(SourceMapParser.parseConsoleStackFrames(errorStack));
        List<StackFrameRef> inlineFrames = SourceMapParser.parseConsoleForPositions(errorStack);

        // Selects stack frames; merges inline frames, avoiding duplicates
        if (frames.isEmpty()) {
            frames = inlineFrames;
        } else if (!inlineFrames.isEmpty()) {
            Set<String> seenRaw = new LinkedHashSet<>();
            for (StackFrameRef frame : frames) {
                seenRaw.add(frame.raw());
            }
            for (StackFrameRef frame : inlineFrames) {
                if (seenRaw.add(frame.raw())) {
                    frames.add(frame);
                }
            }
        }
        if (frames.isEmpty()) {
            log.warn("No stack frames found in error stack: {}", errorStack);
            return Collections.emptyList();
        }

        List<StackMappingResult> results = new ArrayList<>();

        // Maps stack frames to original positions using sourcemaps
        for (StackFrameRef frame : frames) {
            String jsFile = frame.file();

            // 2) 파일별로 sourcemap 1번만 로드해서 재사용
            SourceMapParser.ParsedSourceMap parsed = resolveSourceMapForBundle(jsFile);
            if (parsed == null) {
                // sourcemap 없으면 이 프레임 raw만 반환하고 스킵
                log.warn("sourcemap not found for file: {}", jsFile);
                results.add(StackMappingResult.single(frame.raw()));
                continue;
            }

            log.debug("sourcemap loaded for file: {}", jsFile);

            // 3) 프레임별 generated line/column → originalPositionFor
            OriginalPosition pos = SourceMapParser.originalPositionFor(
                    parsed,
                    frame.line(),
                    frame.column()
            );
            if (pos == null) {
                // pos 없는 경우 raw 값 반환.
                results.add(StackMappingResult.single(frame.raw()));
                continue;
            }

            // 4) 프레임 하나당 value 문자열 생성
            StringBuilder value = new StringBuilder();
            // Appends source and line information to value
            value.append("source: ").append(pos.source()).append('\n')
                    .append("line: ").append(pos.line()).append('\n')
                    .append("column: ").append(pos.column()).append('\n');
            if (pos.name() != null) {
                value.append("name: ").append(pos.name()).append('\n');
            }
            if (pos.snippet() != null) {
                value.append("\nsnippet:\n").append(pos.snippet());
            }

            // 5) key = 원본 스택 라인, value = 매핑 결과
            results.add(new StackMappingResult(frame.raw(), value.toString()));
        }

        return results;
    }

    private SourceMapParser.ParsedSourceMap resolveSourceMapForBundle(
            String bundleFileName
    ) throws IOException {

        BundlePathInfo pathInfo = parseBundlePath(bundleFileName);
        String baseName = pathInfo.fileName();
        if (baseName == null || baseName.isBlank()) {
            return null;
        }

        String mapFileName = baseName + ".map";
        String normalizedPath = pathInfo.normalizedPath();
        String cacheKey = normalizedPath.isEmpty() ? mapFileName : normalizedPath + ".map";

        CacheEntry cachedEntry = cacheMap.get(cacheKey);
        if (cachedEntry != null) {
            if (!cachedEntry.isExpired(CACHE_TTL_MILLIS)) {
                return cachedEntry.sourceMap();
            }
            cacheMap.remove(cacheKey, cachedEntry);
        }

        /*
         * Windows-safe file pattern 생성
         * 1) Path → URI → file:///c:/tmp/map 형태
         * 2) 이후에는 반드시 forward slash(/) 로만 조합
         */
        URI baseUri = sourceMapBaseDir.toUri();
        String baseUriStr = baseUri.toString();
        if (!baseUriStr.endsWith("/")) {
            baseUriStr += "/";
        }

        Resource[] resources = findMatchingResources(mapFileName, pathInfo.directories(), baseUriStr);
        if (resources.length == 0) {
            return null;
        }
        if (resources.length > 1) {
            log.warn("Multiple sourcemap resources for {}; falling back to first match", mapFileName);
        }

        String json = StreamUtils.copyToString(resources[0].getInputStream(), StandardCharsets.UTF_8);
        SourceMapParser.ParsedSourceMap parsed = SourceMapParser.parse(json);

        cacheMap.put(cacheKey, new CacheEntry(parsed, System.currentTimeMillis()));
        return parsed;
    }

    /**
     * 캐시에 저장된 sourcemap 중,
     * 현재 시각 기준 10분 이상 지난 항목을 모두 제거한다.
     * 외부 스케줄러에서 주기적으로 호출할 메서드.
     */
    public void evictExpiredCache() {
        cacheMap.entrySet().removeIf(entry -> {
            CacheEntry value = entry.getValue();
            return value == null || value.isExpired(CACHE_TTL_MILLIS);
        });
    }

    private Resource[] findMatchingResources(
            String mapFileName,
            List<String> directories,
            String baseUriStr
    ) throws IOException {
        String pattern = baseUriStr + "**/" + mapFileName;
        Resource[] resources = resolver.getResources(pattern);
        if (resources.length <= 1 || directories == null || directories.isEmpty()) {
            return resources;
        }

        Resource[] bestMatch = resources;
        // Iterates directory depths; returns single or the best‑match resources
        for (int depth = 1; depth <= directories.size(); depth++) {
            int startIdx = directories.size() - depth;
            StringBuilder suffix = new StringBuilder();
            for (int i = startIdx; i < directories.size(); i++) {
                suffix.append(directories.get(i)).append('/');
            }
            suffix.append(mapFileName);
            String scopedPattern = baseUriStr + "**/" + suffix;
            Resource[] scopedResources = resolver.getResources(scopedPattern);
            if (scopedResources.length == 1) {
                return scopedResources;
            }
            if (scopedResources.length > 1) {
                bestMatch = scopedResources;
            }
        }
        return bestMatch;
    }

    private BundlePathInfo parseBundlePath(String bundleFileName) {
        if (bundleFileName == null) {
            return new BundlePathInfo("", Collections.emptyList());
        }
        String normalized = bundleFileName.trim().replace('\\', '/');
        if (normalized.isEmpty()) {
            return new BundlePathInfo("", Collections.emptyList());
        }

        normalized = stripQueryAndFragment(normalized);
        normalized = stripStackLocation(normalized);
        normalized = dropSchemeAndAuthority(normalized);
        normalized = trimLeadingSlashes(normalized);

        if (normalized.isEmpty()) {
            return new BundlePathInfo("", Collections.emptyList());
        }

        String[] parts = normalized.split("/");
        List<String> cleaned = new ArrayList<>();
        for (String part : parts) {
            if (!part.isEmpty()) {
                cleaned.add(part);
            }
        }
        if (cleaned.isEmpty()) {
            return new BundlePathInfo("", Collections.emptyList());
        }

        String fileName = cleaned.get(cleaned.size() - 1);
        List<String> directories = cleaned.size() > 1
                ? List.copyOf(cleaned.subList(0, cleaned.size() - 1))
                : Collections.emptyList();

        return new BundlePathInfo(fileName, directories);
    }

    private String stripQueryAndFragment(String value) {
        int cutIdx = -1;
        int queryIdx = value.indexOf('?');
        int fragmentIdx = value.indexOf('#');
        if (queryIdx >= 0) {
            cutIdx = queryIdx;
        }
        if (fragmentIdx >= 0 && (cutIdx < 0 || fragmentIdx < cutIdx)) {
            cutIdx = fragmentIdx;
        }
        if (cutIdx >= 0) {
            return value.substring(0, cutIdx);
        }
        return value;
    }

    private String dropSchemeAndAuthority(String value) {
        int schemeIdx = value.indexOf("://");
        if (schemeIdx >= 0) {
            int pathStart = value.indexOf('/', schemeIdx + 3);
            if (pathStart >= 0 && pathStart + 1 < value.length()) {
                return value.substring(pathStart + 1);
            }
            return "";
        }
        if (value.startsWith("//")) {
            return trimLeadingSlashes(value.substring(2));
        }
        return value;
    }

    private String trimLeadingSlashes(String value) {
        int idx = 0;
        int len = value.length();
        while (idx < len && value.charAt(idx) == '/') {
            idx++;
        }
        return value.substring(idx);
    }

    private String stripStackLocation(String value) {
        int lastSlash = value.lastIndexOf('/');
        int lastColon = value.lastIndexOf(':');
        if (lastColon <= lastSlash) {
            return value;
        }

        String columnCandidate = value.substring(lastColon + 1);
        if (!isDigits(columnCandidate)) {
            return value;
        }

        String withoutColumn = value.substring(0, lastColon);
        int lineColon = withoutColumn.lastIndexOf(':');
        if (lineColon > lastSlash) {
            String lineCandidate = withoutColumn.substring(lineColon + 1);
            if (isDigits(lineCandidate)) {
                return withoutColumn.substring(0, lineColon);
            }
        }
        return withoutColumn;
    }

    private boolean isDigits(String candidate) {
        if (candidate.isEmpty()) {
            return false;
        }
        for (int i = 0; i < candidate.length(); i++) {
            if (!Character.isDigit(candidate.charAt(i))) {
                return false;
            }
        }
        return true;
    }

    private record BundlePathInfo(String fileName, List<String> directories) {
        String normalizedPath() {
            if (fileName == null || fileName.isBlank()) {
                return "";
            }
            if (directories == null || directories.isEmpty()) {
                return fileName;
            }
            return String.join("/", directories) + "/" + fileName;
        }
    }
}
