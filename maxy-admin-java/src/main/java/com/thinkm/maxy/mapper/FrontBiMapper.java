package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.FrontBiVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface FrontBiMapper {
    List<Map<String, Object>> selectFrontBiInfoList(FrontBiVO frontBiVO);
    List<Map<String, Object>> selectFrontBiMonthlyInfoList(FrontBiVO frontBiVO);
    List<Map<String, Object>> selectTopErrorLogListFromReport(FrontBiVO frontBiVO);
}
