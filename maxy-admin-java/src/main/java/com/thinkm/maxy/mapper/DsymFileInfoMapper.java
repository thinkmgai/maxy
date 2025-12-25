package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.DsymFileInfoVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/**
 * DSYM 파일 정보 매퍼
 */
@Mapper
public interface DsymFileInfoMapper {

    /**
     * DSYM 파일 정보 목록 조회
     * 
     * @param vo 조회 조건
     * @return DSYM 파일 정보 목록
     */
    List<DsymFileInfoVO> selectDsymFileInfoList(DsymFileInfoVO vo);

    /**
     * 기존 DSYM 파일 정보 조회 (upsert 전 기존 파일 삭제용)
     * 
     * @param vo 조회 조건
     * @return 기존 DSYM 파일 정보 (없으면 null)
     */
    DsymFileInfoVO selectExistingDsymFileInfo(DsymFileInfoVO vo);

    /**
     * DSYM 파일 정보 upsert
     * 
     * @param vo 저장할 DSYM 파일 정보
     */
    void upsertDsymFileInfo(DsymFileInfoVO vo);

    /**
     * DSYM 파일 정보 삭제
     * 
     * @param vo 삭제할 DSYM 파일 정보 (packageNm, serverType, osType, appVer, appBuildNum으로 식별)
     * @return 삭제된 행 수
     */
    int deleteDsymFileInfo(DsymFileInfoVO vo);
}
