package com.thinkm.maxy.vo;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.io.Serializable;

/**
 * DSYM 파일 정보 VO
 */
@Getter
@Setter
@SuperBuilder
@RequiredArgsConstructor
public class DsymFileInfoVO extends AppInfoVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String appBuildNum;  // 앱 빌드 번호
    private String appName;      // 앱 이름
    private String fileName;     // 파일 이름
    private String filePath;     // 파일 경로
}