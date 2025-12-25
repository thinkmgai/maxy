package com.thinkm.maxy.controller.app;

import com.fasterxml.jackson.core.type.TypeReference;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.*;
import com.thinkm.maxy.dto.app.dsym.SymbolicationResponseDto;
import com.thinkm.maxy.service.common.CommonService;
import com.thinkm.maxy.service.app.DsymService;
import com.thinkm.maxy.service.app.LogAnalysisService;
import com.thinkm.maxy.service.app.PageService;
import com.thinkm.maxy.vo.AppInfoVO;
import com.thinkm.maxy.vo.DsymFileInfoVO;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.LogVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * 로그 분석 Controller
 */
@Slf4j
@RestController
@RequestMapping("/ta")
@RequiredArgsConstructor
@Tag(name = "Log Analysis Controller", description = "로그분석 API 컨트롤러")
public class LogAnalysisController {

    @Resource
    private final LogAnalysisService logAnalysisService;

    @Resource
    private final CommonService commonService;

    @Resource
    private final PageService pageService;

    @Resource
    private final DsymService dsymService;

    // UserID 마스킹 여부
    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    // 운영 환경 여부
    @Value("${maxy.production:true}")
    private boolean production;

    /**
     * 로그분석 화면 이동
     *
     * @return ta/TA0100
     */
    @Operation(summary = "로그 분석 페이지 이동",
            description = "로그 분석 메인 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그 분석 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "로그 분석")
    @GetMapping(value = "/0000/goTotalAnalysisView.maxy")
    public ModelAndView goLogAnalysisView() {
        return new ModelAndView("ta/TA0000");
    }

    /**
     * 실시간 로그조회 화면 이동
     *
     * @return ta/TA0001
     */
    @Operation(summary = "실시간 로그 조회 페이지 이동",
            description = "실시간 로그 조회 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "실시간 로그 조회 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "실시간 로그 조회")
    @GetMapping(value = "/0000/goTotalLogView.maxy")
    public ModelAndView goTotalLogView() {
        ModelAndView mv = new ModelAndView("ta/TA0001");
        mv.addObject("prod", production);
        return mv;
    }

    /**
     * 로그 갯수 조회
     *
     * @param vo {@link LogVO}
     * @return Count
     */
    @Operation(summary = "로그 건수 조회",
            description = "조건에 맞는 로그 건수를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그 건수 정보를 반환합니다."))
    @PostMapping(value = "/0000/getLogCount.maxy")
    public ResponseEntity<?> getLogCount(LogVO vo, HttpServletResponse response) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());

        Map<String, ?> result = logAnalysisService.getLogCountV2(vo);

        response.setHeader("uuid", vo.getUuid());
        return ResponseEntity.ok().body(result);
    }

    /**
     * 로그 분석 차트 정보 가져오기
     *
     * @param vo {@link LogVO}
     * @return chartDataMap
     */
    @Operation(summary = "로그 차트 데이터 조회",
            description = "로그 분석 차트 구성을 위한 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "차트 데이터를 반환합니다."))
    @PostMapping(value = "/0000/getChartData.maxy")
    public ResponseEntity<?> getChartData(LogVO vo, HttpServletResponse response) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        List<long[]> chartDataMap = logAnalysisService.getChartDataV2(vo);

        response.setHeader("uuid", vo.getUuid());

        return ResponseEntity.ok().body(chartDataMap);

    }

    /**
     * 실시간 로그 조회 -> 우상단 최근 로그 error / crash / page 버튼 클릭 시 목록.
     * 최근 시간으로부터 하루동안의 500건의 데이터 반환
     *
     * @param vo packageNm, serverType, logType
     * @return logList
     */
    @Operation(summary = "최근 로그 목록 조회",
            description = "최근 1일 내 Error/Crash/Page 로그 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "최근 로그 목록을 반환합니다."))
    @PostMapping(value = "/0000/getLatestLogList.maxy")
    public ResponseEntity<?> getLatestLogList(LogVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getLogType());
        List<Map<String, Object>> result = logAnalysisService.getLatestLogListV2(vo);

        CommonUtil.maskUserId(result, userIdMasking, 2);
        resultMap.put("logList", result);

        return ResponseEntity.ok().body(resultMap);
    }

    @Operation(summary = "로그 목록 조회",
            description = "선택한 로그 유형에 따라 로그 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그 목록과 마지막 포인터 정보를 반환합니다."))
    @PostMapping(value = "/0000/getLogList.maxy")
    public ResponseEntity<?> getLogList(LogVO vo, HttpServletResponse response) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getType());

        String logType = vo.getType();
        List<Map<String, Object>> result = switch (logType) {
            case "error", "crash" -> logAnalysisService.getTroubleLogList(vo);
//            case "error" -> logAnalysisService.getErrorLogList(vo);
//            case "crash" -> logAnalysisService.getCrashLogList(vo);
            case "page" -> logAnalysisService.getPageViewList(vo);
            default -> throw new BadRequestException("alert.invalid.logtype");
        };

        if (!"page".equalsIgnoreCase(logType) && result != null && !result.isEmpty()) {
            // 마지막 데이터
            Map<String, Object> tmp = result.get(result.size() - 1);
            resultMap.put("lastLogTm", tmp.get("logTm"));
            resultMap.put("lastDeviceId", tmp.get("deviceId"));
            resultMap.put("lastId", tmp.get(Elastic._ID));
            resultMap.put("lastLogType", tmp.get("logType"));
        }

        resultMap.put("logList", result);
        response.setHeader("uuid", vo.getUuid());

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 특정 로그 정보로 근접한 로그 목록 조회
     *
     * @param vo appInfo, logTm, deviceId
     * @return logStackInfo{before, target, after}
     */
    @Operation(summary = "로그 인접 스택 조회",
            description = "선택한 로그 기준으로 이전/다음 로그 스택을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그 스택 정보를 반환합니다."))
    @PostMapping(value = "/0000/getLogStackInfo.maxy")
    public ResponseEntity<?> getLogStackInfo(LogVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        vo.setFrom(vo.getLogTm());
        // elastic 에서 device page flow 편성되어 있는지 확인
        boolean isRun = commonService.existsPageLog(LogRequestVO.of(vo));
        resultMap.put("hasPageLog", isRun);

        Map<String, Object> info = new HashMap<>();
        if (vo.getDummy() && "maxy".equals(vo.getPackageNm()) && "0".equals(vo.getServerType())) {
            info.put("before", DummyUtil.makeLogStackDummy());
        } else {
            info = logAnalysisService.getLogStackList(vo);
        }

        resultMap.put("logStackInfo", info);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 실시간 로그 목록 조회
     *
     * @param vo {@link LogVO}
     * @return logList, groupList
     */
    @Operation(summary = "실시간 로그 목록 조회",
            description = "스트리밍되는 실시간 로그 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "실시간 로그 목록과 포인터 정보를 반환합니다."))
    @PostMapping(value = "/0000/getRealTimeLogList.maxy")
    public ResponseEntity<?> getRealTimeLogList(@RequestBody LogVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        List<Map<String, Object>> result = logAnalysisService.getRealTimeLogList(vo);

        long lastLogTm;
        if (result != null && !result.isEmpty()) {

            /* last item info set */
            lastLogTm = Long.parseLong(
                    String.valueOf(result.get(result.size() - 1).get("logTm")));
            resultMap.put("lastLogTm", lastLogTm);
            resultMap.put("lastDeviceId",
                    String.valueOf(result.get(result.size() - 1).get("deviceId")));
            resultMap.put("lastLogType",
                    String.valueOf(result.get(result.size() - 1).get("logType")));

            CommonUtil.maskUserId(result, userIdMasking, 2);
        }

        resultMap.put("logList", result);


        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 실시간 로그 조회 > 로그 목록 다운로드
     */
    @Operation(summary = "실시간 로그 다운로드",
            description = "실시간 로그 조회 결과를 CSV 형태로 다운로드합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "파일 다운로드를 시작합니다."))
    @Auditable(action = AuditType.ACCESS, method = "실시간 로그 조회 다운로드")
    @GetMapping(value = "/0000/downloadRealtimeLog.maxy")
    public void downloadRealtimeLog(
            LogVO vo,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        List<Map<String, Object>> logMap = new ArrayList<>();
        try {
            String logTypes = vo.getSearchLogType().get(0);
            List<String> logTypeList = new ArrayList<>(Arrays.asList(logTypes.split(",")));
            if (!logTypeList.isEmpty()) {
                vo.setSearchLogType(logTypeList);
            }

            if (vo.getOsVerListStr() != null) {
                // osVerList 변환
                List<AppInfoVO> osVerList = JsonUtil.readValue(vo.getOsVerListStr(), new TypeReference<>() {
                });
                vo.setOsVerList(osVerList);
            }

            if (!logTypeList.isEmpty()) {
                logMap = logAnalysisService.getRealTimeLogList(vo);
                // csv 목록 reqUrl alias 변환
                if (logMap != null && !logMap.isEmpty()) {
                    logMap.stream().parallel().forEach(this::switchReqUrltoAlias);
                }
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        try {
            logAnalysisService.downloadRealTimeLogList(logMap, request, response, vo);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }


    private void switchReqUrltoAlias(Map<String, Object> log) {
        long logType;
        if (log != null) {
            logType = Long.parseLong(String.valueOf(log.get("logType")));
            // Web Navigation
            if (logType >= 131072 && logType <= 131109) {
                String aliasNm = getReqUrlAliasWebNav(log);
                if (aliasNm != null) {
                    log.put("reqUrl", aliasNm);
                }
            }
            // Native Action
            else if (logType >= 1048576 && logType <= 1048583) {
                String aliasNm = getReqUrlAliasNative(log);
                if (aliasNm != null) {
                    log.put("reqUrl", aliasNm);
                }
            }
        }
    }

    private String getReqUrlAliasNative(Map<String, Object> log) {
        String key = log.get("packageNm") + "_" + log.get("serverType") + "_2_" + log.get("reqUrl");
        return pageService.getAliasNm(key);
    }

    private String getReqUrlAliasWebNav(Map<String, Object> log) {
        String shortUrl = String.valueOf(log.get("aliasValue"));
        if (shortUrl != null && !shortUrl.isEmpty()) {
            String key = log.get("packageNm") +
                         "_" +
                         log.get("serverType") +
                         "_" +
                         "1" +
                         "_" +
                         shortUrl;
            return pageService.getAliasNm(key);
        } else {
            return null;
        }
    }

    @Operation(summary = "로그 타입 목록 조회",
            description = "지원되는 전체 로그 타입 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로그 타입 목록을 반환합니다."))
    @PostMapping(value = "/0000/getAllLogTypes.maxy")
    public Map<String, List<Map<String, Object>>> getAllLogTypes() {

        return logAnalysisService.getAllLogTypes();
    }

    /**
     * Stack Trace 데이터 조회
     *
     * @param vo packageNm, serverType, osType, appVer, deviceId, logTm
     * @return installInfo
     */
    @Operation(summary = "Stack Trace 상세 조회",
            description = "문제가 발생한 로그의 Stack Trace와 심볼리케이션 결과를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Stack Trace와 DSYM 기반 심볼 정보를 반환합니다."))
    @PostMapping(value = "/0000/getStackTrace.maxy")
    public ResponseEntity<?> getStackTrace(LogVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getDocId());
        Map<String, Object> result = new HashMap<>();

        Map<String, Object> stackTraceData = logAnalysisService.getStackTrace(vo);

        if (vo.getDummy() && "co.kr.mpas.test".equals(vo.getPackageNm()) && "0".equals(vo.getServerType())) {
            stackTraceData = DummyUtil.makeStackTraceDummy();
        }

        result.put("stackTraceData", stackTraceData);

        // stackTraceData 유효성 검증
        if (stackTraceData != null && !stackTraceData.isEmpty()) {
            // stackTraceData에서 필요한 정보 추출
            String packageNm = (String) stackTraceData.get(Elastic.packageNm);
            String serverType = (String) stackTraceData.get(Elastic.serverType);
            String osType = (String) stackTraceData.get(Elastic.osType);
            String appVer = (String) stackTraceData.get(Elastic.appVer);
            String appBuildNum = (String) stackTraceData.get(Elastic.appBuildNum);

            // 필수 정보가 모두 있는 경우에만 DB 조회
            if (packageNm != null && serverType != null && osType != null && appVer != null && appBuildNum != null) {
                try {
                    // DsymFileInfoVO 생성 및 조회 조건 설정
                    DsymFileInfoVO queryVO = DsymFileInfoVO.builder()
                            .packageNm(packageNm)
                            .serverType(serverType)
                            .osType(osType)
                            .appVer(appVer)
                            .appBuildNum(appBuildNum)
                            .build();

                    // DB에서 DSYM 파일 정보 조회
                    DsymFileInfoVO dsymFileInfo = dsymService.getExistingDsymFileInfo(queryVO);

                    if (dsymFileInfo != null) {
                        SymbolicationUtil util = new SymbolicationUtil();
                        Path dsymPath = Paths.get(dsymFileInfo.getFilePath()).resolve(dsymFileInfo.getFileName());
                        String dsymPathString = dsymPath.toString();

                        SymbolicationResponseDto symbolData = util.getSymbolication(dsymPathString, (String) stackTraceData.get(Elastic.content), dsymFileInfo.getAppName());

                        result.put("symbolData", symbolData);
                    } else {
                        log.debug("DSYM 파일 정보를 찾을 수 없음 - Package: {}, ServerType: {}, AppVer: {}, AppBuildNum: {}", 
                                packageNm, serverType, appVer, appBuildNum);
                    }
                } catch (Exception e) {
                    log.error("DSYM 파일 정보 조회 중 오류 발생: {}", e.getMessage(), e);
                }
            } else {
                log.debug("DSYM 파일 정보 조회에 필요한 필수 정보가 부족함 - Package: {}, ServerType: {}, OSType: {}, AppVer: {}, AppBuildNum: {}", 
                        packageNm, serverType, osType, appVer, appBuildNum);
            }
        }

        return ResponseEntity.ok().body(result);
    }
}
