package com.thinkm.maxy.repository;

import com.thinkm.maxy.vo.PagesVO;
import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Getter
@Component
public class PageRepository {

    // key: packageNm_serverType_pageType_reqUrl, value : Alias 명
    private final HashMap<String, String> ALIAS_MAP = new HashMap<>();

    // key: packageNm:serverType:reqUrl, value: PagesVO
    private final Map<String, PagesVO> PAGE_MAP = new HashMap<>();

    @Setter
    private Map<String, Map<String, Map<String, String>>> pageAlias;
}
