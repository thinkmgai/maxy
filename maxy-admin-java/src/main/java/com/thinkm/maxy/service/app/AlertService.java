package com.thinkm.maxy.service.app;

import com.thinkm.common.util.DateUtil;
import com.thinkm.maxy.mapper.AlertMapper;
import com.thinkm.maxy.vo.AlertHistoryVO;
import com.thinkm.maxy.vo.AlertSendTargetVO;
import com.thinkm.maxy.vo.AlertLimitConfigVO;
import com.thinkm.maxy.vo.AlertSendConfigVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {
    private final AlertMapper alertMapper;

    public List<AlertLimitConfigVO> getAlertConfig(AlertLimitConfigVO vo) {
        return alertMapper.selectAlertConfig(vo);
    }

    public void upsertAlertConfig(List<AlertLimitConfigVO> list) {
        list.forEach(vo -> {
            vo.setRegDt(DateUtil.format());
            vo.setUpdDt(DateUtil.format());
        });

        alertMapper.upsertAlertConfig(list);
    }

    public List<AlertHistoryVO> getAlertHistoryList(AlertHistoryVO vo) {
        return alertMapper.selectAlertHistoryList(vo);
    }

    public AlertSendConfigVO getAlertSendConfig(AlertSendConfigVO vo) {
        return alertMapper.selectAlertSendConfig(vo);
    }

    public List<AlertSendTargetVO> selectAlertSendTargets(AlertSendConfigVO vo) {
        return alertMapper.selectAlertSendTargets(vo);
    }

    public void deleteAlertSendConfig(AlertSendConfigVO vo) {
        alertMapper.deleteAlertSendConfig(vo);
        alertMapper.deleteAlertSendTargets(vo);
    }

    public void saveAlertSendConfig(AlertSendConfigVO vo) {
        vo.setRegDt(DateUtil.format());
        vo.setUpdDt(DateUtil.format());

        // 1. config upsert
        alertMapper.upsertAlertSendConfig(vo);
        // 2. target 전체 삭제
        alertMapper.deleteAlertSendTargets(vo);

        // 3. target 전체 insert
        if (!vo.getTargets().isEmpty()) {
            List<AlertSendTargetVO> list = vo.getTargets();
            list.forEach(target -> {
                target.setRegDt(DateUtil.format());
                target.setUpdDt(DateUtil.format());
            });
            alertMapper.insertAlertSendTargets(vo);
        }
    }

    public void updateAlertSendConfigUseYn(AlertSendConfigVO vo) {
        alertMapper.updateAlertSendConfigUseYn(vo);
    }
}
