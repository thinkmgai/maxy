package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.AppInfoVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface DashboardIntegrationMapper {
    List<AppInfoVO> selectAppInfoList(AppInfoVO vo);
}
