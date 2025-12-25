package com.thinkm.common.util.sourcemap;

/**
 * sourcemap 캐시 엔트리
 */
public record CacheEntry(SourceMapParser.ParsedSourceMap sourceMap, long cachedAtMillis) {

    /**
     * 캐시 엔트리가 만료되었는지 여부를 반환한다.
     */
    public boolean isExpired(long ttl) {
        long now = System.currentTimeMillis();
        return now - cachedAtMillis > ttl;
    }
}
