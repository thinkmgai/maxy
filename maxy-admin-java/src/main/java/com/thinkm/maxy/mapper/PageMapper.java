package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.PagesVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface PageMapper {

    List<PagesVO> selectPageAliasList();

    List<PagesVO> selectAllPageList(PagesVO vo);

    void replacePageInfoByCsvFile(PagesVO vo);

    void updatePage(PagesVO vo);

    void updatePageMarketingInsight(PagesVO vo);

    void insertPage(PagesVO vo);

    List<PagesVO> selectPageParameterList(PagesVO vo);

    void insertPageParameter(PagesVO vo);

    int existPageParameter(PagesVO vo);

    void deletePageParameter(PagesVO vo);

    PagesVO countAllPageListByType(PagesVO vo);

    List<PagesVO> selectAllPageListByType(PagesVO vo);

    void upsertPage(PagesVO vo);
}
