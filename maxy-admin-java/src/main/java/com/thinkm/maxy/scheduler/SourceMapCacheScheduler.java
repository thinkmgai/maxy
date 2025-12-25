package com.thinkm.maxy.scheduler;

import com.thinkm.maxy.service.common.SourceMapService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SourceMapCacheScheduler {

    private final SourceMapService sourceMapService;

    @Scheduled(fixedDelay = 60_000L)
    public void manageCache() {
        sourceMapService.evictExpiredCache();
    }
}
