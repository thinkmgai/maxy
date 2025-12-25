package com.thinkm.maxy.mapper;


import com.thinkm.maxy.vo.SystemLogVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface SystemLogMapper {

    List<SystemLogVO> selectSystemLogList(SystemLogVO vo);
}
