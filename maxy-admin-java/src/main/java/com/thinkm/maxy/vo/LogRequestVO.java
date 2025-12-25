package com.thinkm.maxy.vo;

import com.thinkm.common.code.RequestType;
import com.thinkm.common.util.DateUtil;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@ToString
@SuperBuilder
@RequiredArgsConstructor
public class LogRequestVO extends AppInfoVO {

    private Long seq;
    private Long logType;

    private Long logTm;
    private Long from;
    private Long to;
    private Long pageStartTm;
    private Long pageEndTm;
    private Long durationFrom;
    private Long durationTo;
    private Long intervaltime;

    private String docId;
    private String reqUrl;
    private String pageUrl;
    private String aliasValue;
    private String deviceId;
    private String userId;
    private String deviceModel;
    private Integer flowOrder;

    private String mxPageId;

    private String locationCode;
    private Integer next;
    private Integer size;
    private Integer range;
    private Integer offsetIndex;

    private List<String> deviceList;

    private Map<String, Long> avgMap;

    private String searchType;
    private String searchValue;

    private String type;
    private RequestType requestType;
    private String statusCode;

    private boolean checkAll;

    private String lastLogTm;
    private String lastDeviceId;
    private String clientNm;
    private String clientNo;
    private String userNm;
    private String birthDay;
    private String interval;

    @Builder(builderClassName = "AppInfo", builderMethodName = "AppInfo")
    public LogRequestVO(String packageNm, String serverType, String osType) {
        this.setPackageNm(packageNm);
        this.setServerType(serverType);
        if (osType != null && !osType.isBlank() && !"A".equalsIgnoreCase(osType)) {
            this.setOsType(osType);
        }
    }

    public static LogRequestVO of(LogVO vo) {
        return LogRequestVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .osType(vo.getOsType())
                .appVer(vo.getAppVer())
                .deviceId(vo.getDeviceId())
                .logTm((vo.getLogTm() != null && vo.getLogTm() > 0) ? vo.getLogTm() : vo.getFrom())
                .intervaltime(vo.getIntervaltime())
                .from(vo.getFrom())
                .to(vo.getTo())
                .durationFrom(vo.getDurationFrom())
                .durationTo(vo.getDurationTo())
                .requestType(vo.getRequestType())
                .docId(vo.getDocId())
                .flowOrder(vo.getFlowOrder())
                .pageUrl(vo.getPageUrl())
                .reqUrl(vo.getReqUrl())
                .statusCode(vo.getStatusCode())
                .interval(vo.getInterval())
                .mxPageId(vo.getMxPageId())
                .build();
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static LogRequestVO of(PageLogVO vo) {
        return LogRequestVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .osType(vo.getOsType())
                .appVer(vo.getAppVer())
                .deviceId(vo.getDeviceId())
                .logTm((vo.getLogTm() != null && vo.getLogTm() > 0) ? vo.getLogTm() : vo.getFrom())
                .from(vo.getFrom())
                .to(vo.getTo())
                .requestType(vo.getRequestType())
                .docId(vo.getDocId())
                .flowOrder(vo.getFlowOrder())
                .build();
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static LogRequestVO of(DashboardVO vo) {
        return LogRequestVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .osType(vo.getOsType())
                .appVer(vo.getAppVer())
                .deviceId(vo.getDeviceId())
                .deviceModel(vo.getDeviceModel())
                .logTm((vo.getLogTm() != null && vo.getLogTm() > 0) ? vo.getLogTm() : vo.getFrom())
                .intervaltime(vo.getIntervaltime())
                .from(vo.getFrom())
                .to(vo.getTo())
                .pageStartTm(vo.getPageStartTm())
                .pageEndTm(vo.getPageEndTm())
                .requestType(vo.getRequestType())
                .docId(vo.getDocId())
                .flowOrder(vo.getFlowOrder())
                .mxPageId(vo.getMxPageId())
                .build();
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public static LogRequestVO of(ReportVO vo) {
        return LogRequestVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .osType(vo.getOsType())
                .appVer(vo.getAppVer())
                .deviceModel(vo.getDeviceModel())
                .from(DateUtil.dateToTimestamp(vo.getFromDt(), true))
                .to(DateUtil.dateToTimestamp(vo.getToDt(), false))
                .build();
    }

    public static LogRequestVO of(PagesVO vo) {
        return LogRequestVO.builder()
                .packageNm(vo.getPackageNm())
                .serverType(vo.getServerType())
                .build();
    }
}
