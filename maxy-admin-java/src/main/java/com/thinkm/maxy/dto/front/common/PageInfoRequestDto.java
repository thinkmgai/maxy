package com.thinkm.maxy.dto.front.common;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Schema(description = "단일 페이지 식별자를 사용해 상세 정보를 요청하는 DTO")
@Getter
@Setter
public class PageInfoRequestDto extends DefaultRequestDto {
    @Schema(description = "MAXY 페이지 ID", example = "123456789")
    private String mxPageId;

    public PageInfoRequestDto(String packageNm, String serverType, String mxPageId, Long logTm) {
        if (packageNm == null || serverType == null || mxPageId == null || logTm == null) {
            log.error("Invalid param: {}:{}", packageNm, serverType);
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }
        this.setPackageNm(packageNm);
        this.setServerType(serverType);
        this.mxPageId = mxPageId;
        this.setFrom(logTm);
        this.setTo(logTm);
    }
}
