package com.thinkm.maxy.dto.front.management.page;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PageListResponseDto {

    private List<PageDetail> list;

    @Getter
    @RequiredArgsConstructor
    public static class PageDetail {
        private String packageNm;
        private String serverType;
        private Long userNo;
        private String reqUrl;
        private Boolean mark;
        private String updDt;
        private Long updNo;
    }
}
