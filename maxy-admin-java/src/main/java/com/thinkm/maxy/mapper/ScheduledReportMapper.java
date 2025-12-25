package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.ScheduledMailVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/**
 * 예약 리포트 메일 관련 매퍼 인터페이스
 */
@Mapper
public interface ScheduledReportMapper {

    /**
     * 예약 리포트 수신자 목록 조회
     *
     * @return 예약 리포트 수신자 목록
     */
    List<ScheduledMailVO> selectScheduledEmail(Long userNo);

    /**
     * 활성화 예약 리포트 수신자 목록 조회
     *
     * @return 예약 리포트 수신자 목록
     */
    List<ScheduledMailVO> selectActiveScheduledEmail(ScheduledMailVO vo);

    /**
     * 예약 리포트 수신자 등록
     *
     * @param vo 등록할 수신자 정보
     */
    void insertScheduledEmail(ScheduledMailVO vo);

    /**
     * 예약 리포트 수신자 수정
     *
     * @param vo 수정할 수신자 정보
     */
    void updateScheduledEmail(ScheduledMailVO vo);

    /**
     * 예약 리포트 수신자 삭제
     *
     * @param vo 삭제할 수신자 정보
     */
    void deleteScheduledEmail(ScheduledMailVO vo);

}
