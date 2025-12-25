package com.thinkm.maxy.dto.front.common;

import com.thinkm.common.util.CommonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

@Schema(description = "읽음 상태를 변경하기 위한 요청 DTO")
@Getter
@Setter
public class ReadStatusRequestDto extends AppInfoRequestDto {
    @Schema(description = "읽음 구분 타입", example = "ERROR")
    private String type;

    @Schema(description = "데이터 구분을 위한 해시 값", example = "1234567890")
    private String hash;

    @Schema(description = "읽음 처리 시각 (epoch milli)", example = "1719900000000")
    private Long regDt;

    @Schema(description = "처리자 사번/식별자", example = "1001")
    private Long regNo;

    @Schema(description = "true 이면 읽음, false 이면 해제", example = "true")
    private boolean read;

    public ReadStatusRequestDto(String packageNm, String serverType, String type, Long hash) {
        this.setPackageNm(packageNm);
        this.setServerType(serverType);
        this.type = type;
        this.hash = hash + "";
    }

    public static Map<String, Object> toMap(ReadStatusRequestDto dto) {
        Map<String, Object> result = new HashMap<>();

        result.put("packageNm", dto.getPackageNm());
        result.put("serverType", dto.getServerType());
        result.put("type", dto.getType());
        result.put("hash", CommonUtil.toLong(dto.getHash()));
        result.put("regDt", dto.getRegDt());
        result.put("regNo", dto.getRegNo());

        return result;
    }

    public String id() {
        return String.join("_", this.getPackageNm(), this.getServerType(), type, hash);
    }
}
