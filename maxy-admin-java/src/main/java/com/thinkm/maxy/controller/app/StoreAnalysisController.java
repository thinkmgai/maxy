package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.StoreAnalysisService;
import com.thinkm.maxy.vo.StoreVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Store 분석 Controller
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Store Analysis Controller", description = "관리 > 스토어 분석 API 컨트롤러")
public class StoreAnalysisController {

    @Resource
    private final StoreAnalysisService storeAnalysisService;

    @Operation(summary = "Store 분석 페이지 이동",
            description = "스토어 분석 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "스토어 분석 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Store 분석")
    @GetMapping(value = "/gm/0800/goStoreAnalysisView.maxy")
    public ModelAndView goStoreAnalysisView() {
        return new ModelAndView("sa/SA0000");
    }

    /**
     * 앱스토어 데이터 조회
     *
     * @param vo packageNm, osType, fromDt, toDt
     * @return installInfo
     */
    @Operation(summary = "스토어 정보 조회",
            description = "스토어 평점, 리뷰, 트렌드 등 선택한 정보 타입을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "스토어 분석 데이터를 반환합니다."))
    @PostMapping(value = "/gm/0800/getAppInfo.maxy")
    public ResponseEntity<?> getAppInfo(StoreVO vo) {
        Map<String, Object> resultMap = new ConcurrentHashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getFromDt(), vo.getToDt(), vo.getOsType());

        StoreVO.InfoType infoType = vo.getInfoType();
        if (vo.isPaging()) { // 페이징시엔 reviewList만 조회
            resultMap.put("review", getInfoDataByType(vo, StoreVO.InfoType.REVIEW));
        } else {
            if (infoType != null) {
                if (Arrays.asList(new String[]{"RATE", "REVIEW"}).contains(infoType.name())) {
                    resultMap.put("reviewCount", storeAnalysisService.getReviewCount(vo));
                }

                Object info = getInfoDataByType(vo, infoType);
                resultMap.put(infoType.name().toLowerCase(), info);
            } else {
                // total review count 중복 요청 방지
                AtomicBoolean cnt = new AtomicBoolean(false);
                Arrays.stream(StoreVO.InfoType.values()).forEach(type -> {
                    if (Arrays.asList(new String[]{"RATE", "REVIEW"}).contains(type.name())) {
                        if (!cnt.get()) {
                            cnt.set(true);
                            resultMap.put("reviewCount", storeAnalysisService.getReviewCount(vo));
                        }
                    }
                    Object info = getInfoDataByType(vo, type);
                    resultMap.put(type.name().toLowerCase(), info);
                });
            }
        }


        return ResponseEntity.ok().body(resultMap);
    }

    private Object getInfoDataByType(StoreVO vo, StoreVO.InfoType type) {
        return switch (type) {
            case APP ->
                // 상단 앱 정보 (설치, 재설치, 업그레이드, 활성 사용자, 삭제)
                    storeAnalysisService.getAppInfoV2(vo);
            case RATE ->
                /* review 정보 (review count, rate 별점 별 count, rate) */
                    storeAnalysisService.getRate(vo);
            case REVIEW ->
                // review 목록
                    storeAnalysisService.getReviewList(vo);
            case TREND ->
                /* 최근 1년 */
                    storeAnalysisService.getTrendInfo(vo);
            case WORDCLOUD ->
                // word cloud 정보
                    storeAnalysisService.getWordCloudInfo(vo);
        };
    }
}
