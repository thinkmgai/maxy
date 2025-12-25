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
public class BatchHistoryVO extends BasicInfoVO{

    /*
     *  배치 id
     */
    private Long id;
    /*
     *  배치 수행 id
     */
    private Long batchRunId;
    /*
     *  배치 명
     */
    private String batchNm;
    /*
     *  배치 시작 시간
     */
    private String startDt;
    /*
     *  배치 종료 시간
     */
    private String endDt;
    /*
     *  수행 시간
     */
    private String intervaltime;
    /*
     *  결과 메세지
     */
    private String returnMsg;
    /*
     *  조회시작 일시
     */
    private String fromDt;
    /*
     *  조회종료 일시
     */
    private String toDt;

    private String parameterStartDt;
    private String parameterEndDt;

    private ArrayList<Long> batchRunIdList;

    private String batchRunIds;

    private Long from;
    private Long to;
}
