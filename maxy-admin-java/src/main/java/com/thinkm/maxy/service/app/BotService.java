package com.thinkm.maxy.service.app;

import com.thinkm.maxy.mapper.BotMapper;
import com.thinkm.maxy.vo.BotVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BotService {
    private final BotMapper botMapper;

    public Map<String, List<BotVO>> getBotList(BotVO vo) {
        List<BotVO> list = botMapper.selectBotHistory(vo);

        // Stream 을 사용해 Map 으로 그룹핑
        return list.stream().collect(Collectors.groupingBy(BotVO::getRoundTime));
    }

    public List<BotVO> getBotHistoryGroupList(BotVO vo) {
        return botMapper.selectBotHistoryGroup(vo);
    }

    public BotVO getBotConfig(BotVO vo) {
        return botMapper.selectBotConfig(vo);
    }

    public void saveBotConfig(BotVO vo) {
        if (vo.getId() != null) {
            // id 가 넘어오면 update
            botMapper.updateBotConfig(vo);
        } else {
            // id 가 없으면 insert
            botMapper.insertBotConfig(vo);
        }
    }

    public List<BotVO> getLatestBotList(BotVO vo) {
        return botMapper.selectLatestBotHistory(vo);
    }
}
