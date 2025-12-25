package com.thinkm.maxy.mapper;


import com.thinkm.maxy.vo.ExceptLogVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface ExceptLogMapper {

    List<ExceptLogVO> selectExceptLogList(ExceptLogVO vo);

    int existsExceptLog(ExceptLogVO vo);

    void insertExceptLog(ExceptLogVO vo);

    void deleteExceptLog(ExceptLogVO vo);

    void updateExceptLog(ExceptLogVO vo);

    int countExceptLog(ExceptLogVO vo);
}
