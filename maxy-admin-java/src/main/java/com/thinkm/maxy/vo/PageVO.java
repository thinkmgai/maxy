package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
@ToString
@RequiredArgsConstructor
public class PageVO extends AppInfoVO {

    /**
     * 검색조건
     */
    private String searchCondition = "";

    /**
     * 검색Keyword
     */
    private String searchKeyword = "";

    /**
     * 현재페이지
     */
    private int pageIndex = 1;

    /**
     * 페이지갯수
     */
    private int pageUnit = 10;

    /**
     * 페이지사이즈
     */
    private int pageSize = 10;

    /**
     * firstIndex
     */
    private int firstIndex = 1;

    /**
     * lastIndex
     */
    private int lastIndex = 1;

    /**
     * recordCountPerPage
     */
    private int recordCountPerPage = 10;

    /*
     * 페이지 바 범위 갯수
     */
    private int pageBarSize = 5;
}
