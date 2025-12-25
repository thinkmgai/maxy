package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.PageSummaryVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface PageAnalyticsMapper {

    List<PageSummaryVO> selectLandingPageList(PageSummaryVO vo);

    List<PageSummaryVO> selectPageFlowSummaryList(PageSummaryVO vo);
}
