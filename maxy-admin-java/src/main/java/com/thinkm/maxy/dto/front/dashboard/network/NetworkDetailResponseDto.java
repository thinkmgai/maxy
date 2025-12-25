package com.thinkm.maxy.dto.front.dashboard.network;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.JsonUtil;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "네트워크 상세 응답 DTO")
public class NetworkDetailResponseDto {

    @Schema(description = "네트워크 상세 데이터")
    private DetailData detail;

    @Schema(description = "Jennifer APM 연동 정보")
    private JenniferInfo jenniferInfo;

    @Schema(description = "차트 데이터")
    private ChartData chartData;

    @Schema(description = "해당 로그가 포함된 페이지 존재 여부")
    private boolean hasPage;

    @Getter
    @Setter
    @Schema(description = "차트 데이터")
    public static class ChartData {
        @Schema(description = "평균 응답시간 (ms)", example = "250.5")
        private Double avg = 0D;

        @Schema(description = "총 개수", example = "100")
        private Long count = 0L;

        @Schema(description = "시계열 차트 데이터")
        private List<Object[]> chart = new ArrayList<>();
    }

    @Schema(description = "Jennifer APM 연동 정보")
    public static class JenniferInfo extends HashMap<String, Object> {
        public static JenniferInfo from(Map<String, Object> map) {
            if (map == null) return null;
            JenniferInfo info = new JenniferInfo();
            info.putAll(map);
            return info;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "네트워크 상세 정보")
    public static class DetailData {
        @Schema(description = "디바이스 ID", example = "device123")
        private String deviceId;

        @Schema(description = "웹뷰 버전", example = "94.0.4606.61")
        private String webviewVer;

        @Schema(description = "플랫폼", example = "Android")
        private String platform;

        @Schema(description = "OS 타입", example = "Android")
        private String osType;

        @Schema(description = "OS 버전", example = "11.0")
        private String osVer;

        @Schema(description = "디바이스 모델명", example = "Samsung Galaxy S21")
        private String deviceModel;

        @Schema(description = "타임존", example = "Asia/Seoul")
        private String timezone;

        @Schema(description = "사용자 ID", example = "user123")
        private String userId;

        @Schema(description = "IP 주소", example = "192.168.1.1")
        private String ip;

        @Schema(description = "요청 URL", example = "https://api.example.com/data?abc=123")
        private String reqUrl;

        @Schema(description = "요청 URL의 parameter를 제거한 버전", example = "https://api.example.com/data")
        private String aliasValue;

        @Schema(description = "로그 시간 (Unix timestamp)", example = "1672531200000")
        private Long logTm;

        @Schema(description = "응답시간 (ms)", example = "250")
        private Integer intervaltime;

        @Schema(description = "응답 메시지", example = "Success")
        private String resMsg;

        @Schema(description = "응답 크기 (bytes)", example = "1024")
        private Integer responseSize;

        @Schema(description = "요청 크기 (bytes)", example = "512")
        private Integer requestSize;

        @Schema(description = "HTTP 상태 코드", example = "200")
        private String statusCode;

        @Schema(description = "상태 코드 그룹", example = "2xx")
        private String statusCodeGroup;

        @Schema(description = "페이지 URL", example = "https://example.com/page")
        private String pageUrl;

        @Schema(description = "로그 타입", example = "1")
        private Integer logType;

        @Schema(description = "페이지 ID", example = "page123")
        private String mxPageId;

        @Schema(description = "대기 시간 (ms)", example = "50.5")
        private Double waitTime;

        @Schema(description = "다운로드 시간 (ms)", example = "200.5")
        private Double downloadTime;

        @Schema(description = "Jennifer 트랜잭션 ID")
        private String jtxid;

        @Schema(description = "Jennifer 도메인")
        private String jdomain;

        @Schema(description = "Jennifer 인스턴스")
        private String jinstance;

        @Schema(description = "Jennifer 시간")
        private String jtime;

        public static DetailData from(Map<String, Object> source, boolean userIdMasking) {
            if (source == null || source.isEmpty()) {
                return new DetailData();
            }
            try {
                DetailData result = JsonUtil.convertValue(source, DetailData.class);
                result.setUserId(CommonUtil.maskUserId(result.getUserId(), userIdMasking, 2));
                return result;
            } catch (Exception e) {
                return new DetailData();
            }
        }
    }
}