package com.thinkm.maxy.dto.front.common;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

/**
 * 페이지 존재 여부 조회용 DTO
 * <p>
 * packageNm/serverType 은 필수이며,
 * mxPageId 또는 logTm 중 하나는 반드시 유효해야 한다.
 */
@Slf4j
@Schema(description = "페이지 존재 여부를 확인하기 위한 조건 DTO")
@Getter
@Setter
public class ExistsPageInfoRequestDto extends DefaultRequestDto {

    @Schema(description = "조회 대상 MAXY 페이지 ID", example = "987654321")
    private Long mxPageId;

    @Schema(description = "대체 조회 키로 사용하는 디바이스 ID", example = "device-1234")
    private String deviceId;

    /**
     * Long mxPageId 버전 생성자
     */
    public ExistsPageInfoRequestDto(String packageNm, String serverType, Long mxPageId, String deviceId, Long logTm) {
        validateAndInitialize(packageNm, serverType, mxPageId, deviceId, logTm);
    }

    /**
     * String mxPageId 버전 생성자 (자동 Long 변환)
     */
    public ExistsPageInfoRequestDto(String packageNm, String serverType, String mxPageId, String deviceId, Long logTm) {
        Long parsedPageId = CommonUtil.toLong(mxPageId);
        validateAndInitialize(packageNm, serverType, parsedPageId, deviceId, logTm);
    }

    /**
     * 공통 검증 및 초기화 로직
     */
    private void validateAndInitialize(String packageNm, String serverType, Long mxPageId, String deviceId, Long logTm) {
        if (packageNm == null || serverType == null || logTm == null) {
            log.error("Invalid param: packageNm={}, serverType={}", packageNm, serverType);
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        this.setPackageNm(packageNm);
        this.setServerType(serverType);
        this.setFrom(logTm);
        this.setTo(logTm);

        if (mxPageId != null) {
            this.mxPageId = mxPageId;
        } else {
            this.deviceId = deviceId;
        }
    }
}
