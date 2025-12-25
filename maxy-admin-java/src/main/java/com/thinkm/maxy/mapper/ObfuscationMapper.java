package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.ObfuscationVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface ObfuscationMapper {
    void insertObfuscationRuleInfo(ObfuscationVO vo);

    void insertObfuscationRuleInfoWithFullText(ObfuscationVO vo);

    void deleteObfuscationRuleInfo(ObfuscationVO vo);

    List<ObfuscationVO> selectObfuscationRuleList(ObfuscationVO vo);

    List<ObfuscationVO> selectAllObfuscationRuleInfoList();

    List<ObfuscationVO> selectAllObfuscationRuleList();

    int countObfuscationRuleInfoList(ObfuscationVO vo);
}
