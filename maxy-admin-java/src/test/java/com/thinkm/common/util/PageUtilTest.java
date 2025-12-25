package com.thinkm.common.util;

import com.thinkm.maxy.vo.PageVO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PageUtilTest {

    @Test
    void 페이지파라미터설정검증() {
        PageVO pageVO = PageVO.builder()
                .pageIndex(2)
                .pageUnit(20)
                .pageSize(5)
                .build();

        PageUtil<PageVO> pageUtil = new PageUtil<>();
        PageUtil.PaginationInfo paginationInfo = pageUtil.setParameters(pageVO);

        assertEquals(2, paginationInfo.getCurrentPageNo());
        assertEquals(20, paginationInfo.getRecordCountPerPage());
        assertEquals(5, paginationInfo.getPageSize());
        assertEquals(20, pageVO.getFirstIndex());
        assertEquals(40, pageVO.getLastIndex());
        assertEquals(20, pageVO.getRecordCountPerPage());

        paginationInfo.setTotalRecordCount(95);

        assertEquals(5, paginationInfo.getTotalPageCount());
        assertEquals(1, paginationInfo.getFirstPageNo());
        assertEquals(5, paginationInfo.getLastPageNo());
        assertEquals(1, paginationInfo.getFirstPageNoOnPageList());
        assertEquals(5, paginationInfo.getLastPageNoOnPageList());
        assertEquals(20, paginationInfo.getFirstRecordIndex());
        assertEquals(40, paginationInfo.getLastRecordIndex());
    }
}
