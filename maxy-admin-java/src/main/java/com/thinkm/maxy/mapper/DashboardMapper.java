package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.DashboardComponentVO;
import com.thinkm.maxy.vo.DashboardVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface DashboardMapper {
    List<DashboardVO> selectDailyBiDayInfoList(DashboardVO vo);

    DashboardVO selectBiUseInfo(DashboardVO vo);

    void insertBiUseInfo(DashboardVO vo);

    void updateBiUseInfo(DashboardVO vo);

    List<DashboardVO> selectFavoritePages(DashboardVO vo);

    List<Map<String, Object>> selectChartComponentList();

    Map<String, Object> selectChartConfigByUserNo(DashboardComponentVO vo);

    void insertChartConfig(DashboardComponentVO vo);

    void updateChartConfig(DashboardComponentVO vo);

    void updateComponentConfig(DashboardComponentVO vo);

    List<DashboardVO> selectBiMonthlyInfoList(DashboardVO vo);

    /**
     * baseDate ~ 현재까지의 log count 집계
     */
    List<DashboardVO> selectLogCountFromBiDayInfo(DashboardVO vo);

    DashboardComponentVO selectWarningLimitValue(DashboardVO vo);

    DashboardComponentVO selectComponentConfig(DashboardComponentVO vo);

    List<Map<String, Object>> selectAllVersionData(DashboardVO vo);

    List<Map<String, Object>> selectVersionComparisonData(DashboardVO vo);

    Map<String, Object> selectTotalVersionData(DashboardVO vo);

    List<DashboardVO> selectLogCountFromReportBasicStatus(DashboardVO vo);

    List<Map<String, Object>> selectTopErrorLogListByReportError(DashboardVO vo);

    List<Map<String, Object>> selectTopCrashLogListByReportCrash(DashboardVO vo);

    List<Map<String, Object>> selectVersionComparisonRowInfo(DashboardVO vo);

    DashboardComponentVO selectMarketingInsightConfig(DashboardVO vo);

    void upsertPageMarketingInsight(DashboardVO vo);
}
