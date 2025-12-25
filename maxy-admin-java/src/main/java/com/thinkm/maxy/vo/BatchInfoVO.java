package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;

@Getter
@Setter
@ToString
@SuperBuilder
@RequiredArgsConstructor
public class BatchInfoVO extends BasicInfoVO {

    /*
    pid 대체
     */
    private Long id;

    /*
     *  배치id
     */
    private Long batchId;
    /*
     *  배치 명
     */
    private String batchNm;
    private String batchName;
    /*
     *  배치 수행 여부
     */
    private String batchYn;
    /*
     *  배치 설명
     */
    private String batchDesc;
    /*
     *  배치 수행 주기
     */
    private String batchInterval;
    /*
     *  배치 수행 Option 1
     */
    private String batchOption1;
    private String batchOption1Desc;
    /*
     *  배치 수행 Option 2
     */
    private String batchOption2;
    private String batchOption2Desc;
    /*
     *  배치 수행 Option 3
     */
    private String batchOption3;
    private String batchOption3Desc;
    /*
     *  배치 수행 Option 4
     */
    private String batchOption4;
    private String batchOption4Desc;
    /*
     * 배치 종료 파일 경로
     */
    private String batchKillFile;
    /*
     *  수정 배치 명
     */
    private String updBatchNm;
    /*
     *  수정 배치 설명
     */
    private String updBatchDesc;
    /*
     * 수정 배치 주기
     */
    private String updBatchInterval;
    /*
     * 수정 배치 수행 option1
     */
    private String updBatchOption1;
    /*
     * 수정 배치 수행 option1
     */
    private String updBatchOption2;
    /*
     * 수정 배치 수행 option1
     */
    private String updBatchOption3;
    /*
     * 수정 배치 수행 option1
     */
    private String updBatchOption4;
    /*
     * 프로그램 타입. 1: 배치, 2: 컨슈머
     */
    private String batchType;
    /*
     * 수정 배치종료파일 경로
     */
    private String updBatchKillFile;

    private String batchJarFile;
    private String batchMainClass;
    private String batchLogFile;

    private ArrayList<BatchInfoVO> batchInfoList;

    private String servername;
    private String servernum;

    private String updBatchJarFile;
    private String updBatchMainClass;
    private String updBatchLogFile;

    // batch_jobs
    private String cronExpression;
    private String jobName;
    private String jobNameDesc;
    private String description;
    private String parameters;
    private String useYn;
    private String updDt;
    private String lastRun;
}
