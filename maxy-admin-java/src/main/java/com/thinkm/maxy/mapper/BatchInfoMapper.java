package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.BatchHistoryVO;
import com.thinkm.maxy.vo.BatchInfoVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BatchInfoMapper {
    List<BatchHistoryVO> selectBatchHistory(BatchHistoryVO vo);

    List<BatchInfoVO> selectMaxyBatchInfo(BatchInfoVO vo);

    void insertMaxyBatchInfo(BatchInfoVO vo);

    void updateBatchJobs(BatchInfoVO vo);

    void updateMaxyBatchType(BatchInfoVO vo);

    void deleteMaxyBatchHistory(BatchHistoryVO vo);

    List<BatchHistoryVO> selectBatchHistoryListWithEndDtIsNull();

    void deleteBatchJob(BatchInfoVO vo);

    List<BatchInfoVO> selectMaxyBatchJobs(BatchInfoVO vo);

    BatchInfoVO selectBatchJobById(int id);
}
