package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.IntegrationVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface IntegrationMapper {

    IntegrationVO selectIntegrationConfig(IntegrationVO vo);

    void insertIntegrationConfig(IntegrationVO vo);

    void updateIntegrationConfig(IntegrationVO vo);

    List<IntegrationVO> selectLandingPageConfig(IntegrationVO vo);

    List<IntegrationVO> selectBeforeSettingPageList(IntegrationVO vo);

    void insertLandingPageConfig(IntegrationVO vo);

    void deleteLandingPageConfig(IntegrationVO vo);

    IntegrationVO selectUrlFromAppPage(IntegrationVO vo);
}
