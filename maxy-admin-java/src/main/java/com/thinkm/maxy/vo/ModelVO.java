package com.thinkm.maxy.vo;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class ModelVO extends PageVO {

    // pk
    private int seq;
    // model 코드
    private String deviceModel;
    // model 명
    private String nameKo;
    private String nameEn;
    // 설명
    private String description;

    private Long regNo;

    private String updDt;
    private Long updNo;

    private List<ModelVO> deleteList;
}
