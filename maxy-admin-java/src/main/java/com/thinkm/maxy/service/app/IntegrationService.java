package com.thinkm.maxy.service.app;

import com.thinkm.common.util.DateUtil;
import com.thinkm.maxy.mapper.IntegrationMapper;
import com.thinkm.maxy.vo.IntegrationVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationService {

    @Resource
    private final IntegrationMapper integrationMapper;

    public boolean existsIntegrationConfig(IntegrationVO vo) {
        return null != integrationMapper.selectIntegrationConfig(vo);
    }

    public void modifyIntegrationConfig(IntegrationVO vo) {
        vo.setRegDt(DateUtil.format());
        integrationMapper.updateIntegrationConfig(vo);
    }

    public void addIntegrationConfig(IntegrationVO vo) {
        vo.setRegDt(DateUtil.format());
        integrationMapper.insertIntegrationConfig(vo);
    }

    public IntegrationVO getIntegrationConfig(IntegrationVO vo) {
        return integrationMapper.selectIntegrationConfig(vo);
    }

    public void addLandingPageConfig(IntegrationVO vo) throws DuplicateKeyException {
        vo.setRegDt(DateUtil.format());
        integrationMapper.insertLandingPageConfig(vo);
    }

    public List<IntegrationVO> getLandingPageConfig(IntegrationVO vo) {
        return integrationMapper.selectLandingPageConfig(vo);
    }

    public List<IntegrationVO> selectBeforeSettingPageList(IntegrationVO vo) {
        return integrationMapper.selectBeforeSettingPageList(vo);
    }

    public void delLandingPageConfig(IntegrationVO vo) {
        integrationMapper.deleteLandingPageConfig(vo);
    }

    public boolean confirmLandingPageUrl(IntegrationVO vo) {
        IntegrationVO result = integrationMapper.selectUrlFromAppPage(vo);
        return result != null;
    }
}
