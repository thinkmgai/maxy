package com.thinkm.maxy.repository;

import com.thinkm.maxy.vo.ObfuscationVO;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Component
public class RetraceRepository {
    // 난독화 타입(Arxan / ProGuard) map
    private final Map<String, ObfuscationVO.ObfuscatedType> OBF_TYPE_MAP = new HashMap<>();

    // 파일 정보나 full text 가 있는 map
    private final Map<String, String> RULE_INFO_MAP = new HashMap<>();

    // 룰 정보 전체가 있는 map
    private final Map<String, List<Map<String, String>>> RULE_MAP = new HashMap<>();
}
