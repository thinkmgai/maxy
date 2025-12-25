package com.thinkm.maxy.service.common;

import com.thinkm.common.code.MaxyLogType;
import com.thinkm.maxy.mapper.LogLevelMapper;
import com.thinkm.maxy.vo.LogLevelVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LogLevelServiceTest {

    @Mock
    private LogLevelMapper mapper;

    @InjectMocks
    private LogLevelService service;

    private int essentialLogType;
    private int optionalLogType;

    @BeforeEach
    void setUpLogTypeSamples() {
        List<Map<String, Object>> logTypes = MaxyLogType.toList();
        essentialLogType = logTypes.stream()
                .filter(m -> Boolean.TRUE.equals(m.get("essentialYn")))
                .map(m -> (Integer) m.get("decimal"))
                .findFirst()
                .orElseThrow();

        optionalLogType = logTypes.stream()
                .map(m -> (Integer) m.get("decimal"))
                .filter(val -> val != essentialLogType)
                .findFirst()
                .orElseThrow();
    }

    @Test
    void 로그레벨ID없으면_음수반환() {
        LogLevelVO request = LogLevelVO.builder().build();
        when(mapper.selectLogLevelInfoByAppInfo(request)).thenReturn(null);
        assertEquals(-1L, service.getLogLevelIdByAppInfo(request));

        LogLevelVO nullId = LogLevelVO.builder().logLevelId(null).build();
        when(mapper.selectLogLevelInfoByAppInfo(nullId)).thenReturn(nullId);
        assertEquals(-1L, service.getLogLevelIdByAppInfo(nullId));
    }

    @Test
    void insertTypeA면_삭제만수행() {
        LogLevelVO request = LogLevelVO.builder()
                .insertType("A")
                .build();

        service.addLogLevelMemList(request);

        verify(mapper).deleteLogLevelMemList(request);
        verify(mapper).deleteLogLevel(request);
        verify(mapper, never()).insertLogLevel(any());
        verify(mapper, never()).insertLogLevelMemList(any());
    }

    @Test
    void 필수로그타입자동포함() {
        LogLevelVO request = LogLevelVO.builder()
                .packageNm("pkg")
                .serverType("prod")
                .regDt("20240101")
                .userNo(99L)
                .insertType("M")
                .logTypeList(new ArrayList<>(List.of(optionalLogType)))
                .build();

        when(mapper.selectLogLevelInfoByAppInfo(request)).thenReturn(null);

        service.addLogLevelMemList(request);

        verify(mapper).insertLogLevel(request);
        verify(mapper).deleteLogLevelMemList(request);

        verify(mapper).insertLogLevelMemList(argThat(list -> {
            boolean hasOptional = list.stream().anyMatch(vo -> vo.getLogType() == optionalLogType);
            boolean hasEssential = list.stream().anyMatch(vo -> vo.getLogType() == essentialLogType);
            return hasOptional && hasEssential;
        }));
    }

    @Test
    void 저장된설정없으면_모두사용처리() {
        when(mapper.selectLogLevelInfoByAppInfo(any())).thenReturn(null);

        List<Map<String, Object>> result = service.getLogLevelList(LogLevelVO.builder().build());

        assertThat(result).isNotEmpty();
        assertThat(result)
                .allMatch(map -> Boolean.TRUE.equals(map.get("use")));
    }

    @Test
    void 저장된설정있으면_해당타입만사용() {
        when(mapper.selectLogLevelInfoByAppInfo(any()))
                .thenReturn(LogLevelVO.builder().logLevelId(10L).build());
        when(mapper.selectLogLevelListByLogLevelId(any()))
                .thenReturn(List.of(LogLevelVO.builder().logType(optionalLogType).build()));

        List<Map<String, Object>> result = service.getLogLevelList(LogLevelVO.builder().build());

        Map<String, Object> enabled = findLogType(result, optionalLogType);
        Map<String, Object> disabled = findLogType(result, essentialLogType);

        assertThat(enabled.get("use")).isEqualTo(true);
        assertThat(disabled.get("use")).isEqualTo(false);
    }

    private Map<String, Object> findLogType(List<Map<String, Object>> list, int decimal) {
        return list.stream()
                .filter(map -> Objects.equals(map.get("decimal"), decimal))
                .findFirst()
                .orElseThrow();
    }
}
