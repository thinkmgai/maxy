package com.thinkm.maxy.model.front;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
@Schema(description = "읽음 상태 정보")
public class ReadStatus {
    @Schema(description = "읽음 여부")
    private boolean readFlag;
    private Long readAt;
    private Long regNo;
    private String hash;

    // 읽음 상태 반환
    public ReadStatus(Boolean readFlag, Long readAt, Long regNo, Long hash) {
        this.readFlag = readFlag;
        this.readAt = readAt;
        this.regNo = regNo;
        this.hash = hash + "";
    }

    // 읽지 않은 경우 반환 용도
    public ReadStatus(Long hash) {
        this.readFlag = false;
        this.readAt = null;
        this.hash = hash + "";
    }

    // 해시할 값이 null 이거나 빈 값인 경우 빈 생성자 반환한다
    public ReadStatus() {
        this.readFlag = false;
        this.readAt = null;
        this.hash = null;
    }
}