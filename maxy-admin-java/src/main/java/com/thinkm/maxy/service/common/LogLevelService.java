package com.thinkm.maxy.service.common;

import com.thinkm.common.code.MaxyLogType;
import com.thinkm.maxy.mapper.LogLevelMapper;
import com.thinkm.maxy.vo.LogLevelVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LogLevelService {

    @Resource
    private final LogLevelMapper mapper;

    public long getLogLevelIdByAppInfo(LogLevelVO vo) {
        LogLevelVO info = mapper.selectLogLevelInfoByAppInfo(vo);
        if (info == null || info.getLogLevelId() == null) {
            return -1L;
        } else {
            return info.getLogLevelId();
        }
    }

    /**
     * 로그 타입 목록 조회
     *
     * @return logTypeList
     */
    public List<LogLevelVO> getLogLevelListByLogLevelId(LogLevelVO vo) {
        return mapper.selectLogLevelListByLogLevelId(vo);
    }

    /**
     * 로그 타입 등록
     *
     * @param vo {@link LogLevelVO}
     */
    public void addLogLevelMemList(LogLevelVO vo) {
        if (!"A".equals(vo.getInsertType())) {
            // logLevelId 조회
            LogLevelVO item = mapper.selectLogLevelInfoByAppInfo(vo);
            if (item == null || item.getLogLevelId() <= 0) {
                mapper.insertLogLevel(vo);
            }
            mapper.deleteLogLevelMemList(vo);

            // 저장할 매개변수 목록 생성
            List<LogLevelVO> logLevelList = new ArrayList<>();
            for (Integer logType : vo.getLogTypeList()) {
                logLevelList.add(LogLevelVO.builder()
                        .packageNm(vo.getPackageNm())
                        .serverType(vo.getServerType())
                        .regDt(vo.getRegDt())
                        .userNo(vo.getUserNo())
                        .logType(logType)
                        .build());
            }

            // 필수값 체크
            MaxyLogType.toList().stream()
                    .filter(f -> (boolean) f.get("essentialYn"))
                    .toList()
                    .forEach(tmpMap -> {
                        int logType = (int) tmpMap.get("decimal");
                        boolean contains = logLevelList.stream().anyMatch(v -> v.getLogType() == logType);
                        if (!contains) {
                            // 필수값 없으면 넣어준다
                            logLevelList.add(LogLevelVO.builder()
                                    .packageNm(vo.getPackageNm())
                                    .serverType(vo.getServerType())
                                    .regDt(vo.getRegDt())
                                    .userNo(vo.getUserNo())
                                    .logType(logType)
                                    .build());
                        }
                    });

            mapper.insertLogLevelMemList(logLevelList);
        } else {
            mapper.deleteLogLevelMemList(vo);
            mapper.deleteLogLevel(vo);
        }
    }

    public List<Map<String, Object>> getLogLevelList(LogLevelVO vo) {
        Set<Integer> logTypeSet = new HashSet<>();
        long logLevelId = getLogLevelIdByAppInfo(vo);
        if (logLevelId > 0) {
            vo.setLogLevelId(logLevelId);
            List<LogLevelVO> logLevelList = getLogLevelListByLogLevelId(vo);
            for (LogLevelVO info : logLevelList) {
                logTypeSet.add(info.getLogType());
            }
        }

        List<Map<String, Object>> list = MaxyLogType.toList();
        if (logTypeSet.isEmpty()) {
            list.forEach(info -> {
                info.put("use", true);
            });
        } else {
            list.forEach(info -> {
                var decimal = (int) info.get("decimal");
                var use = logTypeSet.contains(decimal);
                info.put("use", use);
            });
        }
        return list;
    }
}
