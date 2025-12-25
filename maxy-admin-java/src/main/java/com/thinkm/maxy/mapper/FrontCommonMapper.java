package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.FrontFeeldexVO;
import com.thinkm.maxy.vo.FrontUrl;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface FrontCommonMapper {
    List<FrontUrl> selectMarkedUrl(FrontUrl frontUrl);

    List<FrontUrl> selectAllUrl(FrontUrl frontUrl);

    void markUrl(FrontUrl frontUrl);

    void deleteUrls(List<FrontUrl> params);

    FrontFeeldexVO selectFeeldexConfig(FrontFeeldexVO feeldexVO);

    void insertFeeldexConfig(FrontFeeldexVO feeldexVO);
}
