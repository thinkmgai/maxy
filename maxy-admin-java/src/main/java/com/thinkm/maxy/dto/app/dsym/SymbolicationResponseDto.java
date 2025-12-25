package com.thinkm.maxy.dto.app.dsym;

import lombok.Data;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

/**
 * 심볼리케이션 응답 DTO
 */
@Data
@ToString
public class SymbolicationResponseDto {
    private final int status;                           // 응답 상태 코드
    private final List<SymbolicationItemDto> items;        // 심볼리케이션 결과 목록
    private final String error;                         // 에러 메시지

    /**
     * 성공 응답 생성자
     */
    public SymbolicationResponseDto(int status, List<SymbolicationItemDto> items) {
        this.status = status;
        this.items = items != null ? items : new ArrayList<>();
        this.error = null;
    }

    /**
     * 에러 응답 생성자
     */
    public SymbolicationResponseDto(int status, String error) {
        this.status = status;
        this.error = error;
        this.items = new ArrayList<>();
    }
}