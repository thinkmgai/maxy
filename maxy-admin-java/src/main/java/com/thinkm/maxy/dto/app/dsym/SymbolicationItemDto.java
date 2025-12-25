package com.thinkm.maxy.dto.app.dsym;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.ToString;

/**
 * 심볼리케이션 결과 아이템 DTO
 */
@Data
@ToString
@AllArgsConstructor
public class SymbolicationItemDto {
    private final String appName;          // 앱 이름
    private final String stackFrameNumber; // 스택 프레임 번호
    private final String crashMemory;      // 크래시 메모리 주소
    private final String exceptionName;    // 예외 함수명
    private final String exceptionPath;    // 예외 파일 경로
    private final String exceptionLine;    // 예외 라인 번호
}