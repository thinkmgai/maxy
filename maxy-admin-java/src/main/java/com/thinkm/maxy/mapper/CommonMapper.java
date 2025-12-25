package com.thinkm.maxy.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface CommonMapper {
    List<Map<String, Object>> checkDbStatus();
}
