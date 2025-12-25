package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.BotVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BotMapper {
    List<BotVO> selectBotHistory(BotVO vo);

    List<BotVO> selectBotHistoryGroup(BotVO vo);

    BotVO selectBotConfig(BotVO vo);

    void insertBotConfig(BotVO vo);

    void updateBotConfig(BotVO vo);

    List<BotVO> selectLatestBotHistory(BotVO vo);
}
