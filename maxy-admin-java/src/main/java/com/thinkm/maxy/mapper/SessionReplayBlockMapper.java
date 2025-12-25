package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.SessionReplayBlockTargetVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SessionReplayBlockMapper {
    List<SessionReplayBlockTargetVO> selectBlockTargets(SessionReplayBlockTargetVO param);
    
    void insertBlockTarget(SessionReplayBlockTargetVO target);
    
    void updateBlockTarget(SessionReplayBlockTargetVO target);
    
    void deleteBlockTargets(List<SessionReplayBlockTargetVO> targets);
}
