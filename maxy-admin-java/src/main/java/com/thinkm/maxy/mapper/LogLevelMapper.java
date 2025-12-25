package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.LogLevelVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface LogLevelMapper {

    void insertLogLevel(LogLevelVO vo);

    void deleteLogLevel(LogLevelVO vo);

    List<LogLevelVO> selectLogLevelListByLogLevelId(LogLevelVO vo);

    void insertLogLevelMemList(List<LogLevelVO> vo);

    void deleteLogLevelMemList(LogLevelVO vo);

    LogLevelVO selectLogLevelInfoByAppInfo(LogLevelVO vo);
}
