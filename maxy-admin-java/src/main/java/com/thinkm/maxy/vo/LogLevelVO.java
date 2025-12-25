package com.thinkm.maxy.vo;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;

@Getter
@Setter
@ToString
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class LogLevelVO extends AppInfoVO {

    //logLevel
    private Long logLevelId;
    private String logLevelNm;
    private String description;
    private String useYn;
    private String deleteLevelId;
    private String deleteLogTypes;

    //logLevelMem
    private Integer logType;
    private String logTypeNm;
    private String logTypeDnm;

    //search\
    private String searchText;

    private Long logTypes;
    private String logTypeNms;
    private String logTypeDnms;
    private String insertType;

    private ArrayList<Integer> logTypeList;
    private ArrayList<String> logTypeNmList;
    private ArrayList<String> logTypeDnmList;
}
