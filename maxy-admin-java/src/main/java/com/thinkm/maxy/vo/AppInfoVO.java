package com.thinkm.maxy.vo;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.io.Serial;
import java.io.Serializable;

@Getter
@Setter
@SuperBuilder
@RequiredArgsConstructor
public class AppInfoVO extends BasicInfoVO implements Serializable {

    @Serial
    @Schema(hidden = true)
    @Parameter(hidden = true)
    private static final long serialVersionUID = 1L;

    private String packageNm;
    private String serverType;
    private String osType;
    private String appVer;
    private String appType;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public boolean checkOsType() {
        return this.osType != null && !"A".equalsIgnoreCase(this.osType) && !this.osType.isBlank();
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public boolean checkAppVer() {
        return this.appVer != null && !"A".equalsIgnoreCase(this.appVer) && !this.appVer.isBlank();
    }
}
