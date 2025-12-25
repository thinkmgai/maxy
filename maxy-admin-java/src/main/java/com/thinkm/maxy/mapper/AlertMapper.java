package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.AlertHistoryVO;
import com.thinkm.maxy.vo.AlertLimitConfigVO;
import com.thinkm.maxy.vo.AlertSendConfigVO;
import com.thinkm.maxy.vo.AlertSendTargetVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface AlertMapper {
    List<AlertLimitConfigVO> selectAlertConfig(AlertLimitConfigVO vo);
    void upsertAlertConfig(List<AlertLimitConfigVO> list);
    List<AlertHistoryVO> selectAlertHistoryList(AlertHistoryVO vo);
    AlertSendConfigVO selectAlertSendConfig(AlertSendConfigVO vo);
    List<AlertSendTargetVO> selectAlertSendTargets(AlertSendConfigVO vo);
    void upsertAlertSendConfig(AlertSendConfigVO vo);
    void deleteAlertSendConfig(AlertSendConfigVO vo);
    void deleteAlertSendTargets(AlertSendConfigVO vo);
    void insertAlertSendTargets(AlertSendConfigVO vo);
    void updateAlertSendConfigUseYn(AlertSendConfigVO vo);
}
