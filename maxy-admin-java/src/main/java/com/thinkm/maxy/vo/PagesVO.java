package com.thinkm.maxy.vo;

import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class PagesVO extends AppInfoVO {

    private String packageNm;
    private String serverType;

    private String dataType;
    private String reqUrl;

    private String appPageNm;
    private String appPageDesc;
    private String startPageYn;

    private String useYn;

    private String uploadYn;

    private String monitoringYn;

    private String landingYn;

    private String webPerfCheckYn;
    private MultipartFile multipartFile;

    private List<PagesVO> infoList;

    private String updDt;
    private String fileInfo;
    private String parameter;
    private Long id;

    private int limit = 1000;
    private int offset = 0;
    private Integer type;

    private int pageCount;

    private String searchType;
    private String searchValue;
}
