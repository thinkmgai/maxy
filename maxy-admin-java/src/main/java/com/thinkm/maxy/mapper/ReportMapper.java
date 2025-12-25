package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.ReportVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface ReportMapper {
    List<Map<String, Object>> getStatusInfoDB(ReportVO vo);

    List<Map<String, Object>> getLoadingTop(ReportVO vo);

    List<Map<String, Object>> getResponseTop(ReportVO vo);

    List<Map<String, Object>> getPageViewInfoDB(ReportVO vo);

    List<Map<String, Object>> getErrorInfo(ReportVO vo);

    List<Map<String, Object>> getCrashInfo(ReportVO vo);

    List<Map<String, Object>> getDeviceErrorInfo(ReportVO vo);

    List<Map<String, Object>> getDeviceCrashInfo(ReportVO vo);

    List<Map<String, Object>> selectPackageList();

    List<Map<String, Object>> getLoadingSummary(ReportVO vo);

    List<Map<String, Object>> getResponseSummary(ReportVO vo);

    List<Map<String, Object>> getPerformancePageViewCnt(ReportVO vo);

    Map<String, Object> getStatusInfo(ReportVO vo);

    Map<String, Object> getAvgStatusInfo(ReportVO vo);

    List<Map<String, Object>> getAppVerSummary(ReportVO vo);

    List<Map<String, Object>> selectDeviceModelList();

    List<Map<String, Object>> selectPageList(ReportVO vo);

    List<Map<String, Object>> selectCallList(ReportVO vo);

    // 네트워크 관련 리포트 메서드 추가
    List<Map<String, Object>> getNetworkErrorInfo(ReportVO vo);

    List<Map<String, Object>> getNetworkCrashInfo(ReportVO vo);

    List<Map<String, Object>> selectFrontReportBasicInfo(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageInfoByBrowser(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageInfoByPageError(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageInfoByErrorMsg(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageInfoByLocation(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageInfoByNetworkErrorMsg(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageInfoByPageUrl(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageLoadTop10(ReportVO vo);

    List<Map<String, Object>> selectFrontReportPageLoadWorst10(ReportVO vo);

    List<Map<String, Object>> selectFrontReportLcpWorst10(ReportVO vo);

    List<Map<String, Object>> selectFrontReportClsWorst10(ReportVO vo);

    List<Map<String, Object>> selectFrontReportInpWorst10(ReportVO vo);
}
