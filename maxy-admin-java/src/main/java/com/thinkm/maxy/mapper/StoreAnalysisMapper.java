package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.StoreVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface StoreAnalysisMapper {

    List<StoreVO> selectAosReviewList(StoreVO vo);

    List<StoreVO> selectIosReviewList(StoreVO vo);

    int countIosReviewList(StoreVO vo);

    int countAosReviewList(StoreVO vo);


    List<StoreVO> selectIosRatingCnt(StoreVO vo);

    List<StoreVO> selectAosRatingCnt(StoreVO vo);

    int selectIosAvgRate(StoreVO vo);

    int selectAosAvgRate(StoreVO vo);

    List<StoreVO> selectIosMonthRate(StoreVO vo);

    List<StoreVO> selectIosMonthUser(StoreVO vo);

    List<StoreVO> selectAosMonthRate(StoreVO vo);

    List<StoreVO> selectAosMonthUser(StoreVO vo);

    String selectWordCloudInfo(StoreVO vo);

    List<Map<String, Object>> selectChartData(StoreVO vo);

    List<Map<String, Object>> selectIosAppInfo(StoreVO vo);

    Map<String, Object> selectAosAppInfo(StoreVO vo);
}
