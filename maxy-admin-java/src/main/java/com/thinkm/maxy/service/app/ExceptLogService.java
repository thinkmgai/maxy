package com.thinkm.maxy.service.app;

import com.thinkm.maxy.mapper.ExceptLogMapper;
import com.thinkm.maxy.vo.ExceptLogVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExceptLogService {

    @Resource
    private final ExceptLogMapper mapper;

    /**
     * 예외 처리 로그 목록 조회
     *
     * @param vo {@link ExceptLogVO}
     * @return exceptLogList
     */
    public List<ExceptLogVO> getExceptLogList(ExceptLogVO vo) {
        return mapper.selectExceptLogList(vo);
    }

    /**
     * 예외 처리 로그 등록
     *
     * @param vo {@link ExceptLogVO}
     */
    public void addExceptLog(ExceptLogVO vo) {
        mapper.insertExceptLog(vo);
    }

    /**
     * 예외 처리 로그 수정
     *
     * @param vo {@link ExceptLogVO}
     */
    public void modifyExceptLog(ExceptLogVO vo) {
        mapper.updateExceptLog(vo);
    }

    /**
     * 예외 처리 로그 중복 체크
     *
     * @param vo {@link ExceptLogVO}
     * @return 중복 여부
     */
    public boolean existsExceptLog(ExceptLogVO vo) {
        int val = mapper.existsExceptLog(vo);
        log.info("val: {}", val);
        return val > 0;
    }

    /**
     * 예외 처리 로그 삭제
     *
     * @param vo {@link ExceptLogVO}
     */
    public void deleteExceptLog(ExceptLogVO vo) {
        mapper.deleteExceptLog(vo);
    }

    /**
     * 해당 앱 정보에 맞는 예외 로그 수 조회
     *
     * @param vo appInfo
     * @return count
     */
    public int countExceptLog(ExceptLogVO vo) {
        return mapper.countExceptLog(vo);
    }
}
