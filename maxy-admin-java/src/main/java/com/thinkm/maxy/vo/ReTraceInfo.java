package com.thinkm.maxy.vo;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.util.Map;

@Builder
public class ReTraceInfo {
    private String packageNm;
    private String serverType;
    private String osType;
    private String appVer;
    private String appBuildNum;

    /**
     * Map 에서 ReTraceInfo 에 맞는 데이터를 뽑아와 ReTraceInfo 객체 반환
     *
     * @param map {@link Map}
     * @return ReTraceInfo | null
     */
    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static ReTraceInfo fromMap(Map<String, ?> map) {
        Object packageNm = map.get("packageNm");
        Object serverType = map.get("serverType");
        Object osType = map.get("osType");
        Object appVer = map.get("appVer");
        Object appBuildNum = map.get("appBuildNum");
        if (packageNm == null
                || serverType == null
                || osType == null
                || appVer == null
                || appBuildNum == null) {
            return null;
        }
        return ReTraceInfo.builder()
                .packageNm(String.valueOf(packageNm))
                .serverType(String.valueOf(serverType))
                .osType(String.valueOf(osType))
                .appVer(String.valueOf(appVer))
                .appBuildNum(String.valueOf(appBuildNum))
                .build();
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public String key() {
        return String.join(":"
                , this.packageNm
                , this.serverType
                , this.osType
                , this.appVer
                , this.appBuildNum
        );
    }
}
