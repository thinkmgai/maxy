package com.thinkm.maxy.controller.common;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.common.BatchService;
import com.thinkm.maxy.vo.BatchHistoryVO;
import com.thinkm.maxy.vo.BatchInfoVO;
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

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Batch Controller
 */

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Batch Controller", description = "시스템 관리 > 배치 관리 API 컨트롤러")
public class BatchController {
    private final BatchService batchService;

    /**
     * 배치 목록 조회 화면 이동
     *
     * @return sm/sm0300
     */
    @Operation(summary = "배치 관리 페이지 이동",
            description = "배치 작업 목록 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "배치 관리 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "배치 관리")
    @GetMapping(value = "/sm/0400/goBatchView.maxy")
    public ModelAndView goBatchView() {
        return new ModelAndView("sm/SM0300");
    }

    /**
     * 배치 이력 목록 조회 화면 이동
     *
     * @return sm/sm0302
     */
    @Operation(summary = "배치 이력 페이지 이동",
            description = "배치 실행 이력 조회 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "배치 이력 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "배치 이력 목록")
    @GetMapping(value = "/sm/0400/goBatchHistory.maxy")
    public ModelAndView goBatchHistory() {
        return new ModelAndView("sm/SM0302");
    }

    /**
     * 배치 목록 조회
     *
     * @param vo {@link BatchInfoVO}
     * @return batchList
     */
    @Operation(summary = "배치 목록 조회",
            description = "등록된 배치 작업 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "배치 작업 목록을 반환합니다."))
    @Auditable(action = AuditType.READ, method = "배치 목록 조회")
    @PostMapping(value = "/sm/0400/getBatchJobList.maxy")
    public ResponseEntity<?> getBatchJobList(BatchInfoVO vo) {
        List<BatchInfoVO> result = batchService.getBatchJobList(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * 배치 수정
     *
     * @param vo {@link BatchInfoVO}
     */
    @Operation(summary = "배치 정보 수정",
            description = "배치 작업의 스케줄 및 설정을 수정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정 결과를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "배치 수정")
    @PostMapping(value = "/sm/0400/updateBatchJobs.maxy")
    public ResponseEntity<?> updateBatchJobs(BatchInfoVO vo, HttpServletRequest request) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getId(), vo.getJobNameDesc(), vo.getCronExpression(), vo.getUseYn());

        vo.setRegInfo(request);

        batchService.updateBatchJobs(vo);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "배치 수동 실행",
            description = "선택한 배치 작업을 즉시 실행합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "실행 성공 여부를 반환합니다."))
    @Auditable(action = AuditType.EXECUTE, method = "배치 실행")
    @PostMapping(value = "/sm/0400/runBatch.maxy")
    public ResponseEntity<?> runBatch(BatchInfoVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getId());
        batchService.runBatch(vo.getId());
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "배치 중단",
            description = "실행 중인 배치 작업을 중단합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "중단 결과를 반환합니다."))
    @Auditable(action = AuditType.EXECUTE, method = "배치 중단")
    @PostMapping(value = "/sm/0400/stopBatch.maxy")
    public ResponseEntity<?> stopBatch(BatchInfoVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getId());
        batchService.stopBatch(vo.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * 배치 삭제
     *
     * @param vo {@link BatchInfoVO}
     */
    @Operation(summary = "배치 삭제",
            description = "선택한 배치 작업을 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 성공 여부를 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "배치 삭제")
    @PostMapping(value = "/sm/0400/deleteBatchJob.maxy")
    public ResponseEntity<?> deleteBatchJob(BatchInfoVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getId());

        batchService.deleteBatchJob(vo);
        return ResponseEntity.ok().build();
    }

    /**
     * 배치 History 정보 가져오기
     *
     * @param vo {@link BatchHistoryVO}
     * @return batchHistoryList
     */
    @Operation(summary = "배치 이력 조회",
            description = "기간 조건에 맞는 배치 실행 이력을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "배치 이력 목록을 반환합니다."))
    @Auditable(action = AuditType.READ, method = "배치 이력 조회")
    @PostMapping(value = "/sm/0400/getBatchHistory.maxy")
    public ResponseEntity<?> getBatchHistory(BatchHistoryVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getFrom(), vo.getTo());
        List<BatchHistoryVO> result = batchService.getBatchHistory(vo);

        return ResponseEntity.ok().body(result);
    }

    /**
     * 배치 이력 삭제
     *
     * @param vo {@link BatchHistoryVO}
     */
    @Operation(summary = "배치 이력 삭제",
            description = "선택한 배치 실행 이력을 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 성공 여부를 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "배치 이력 삭제")
    @PostMapping(value = "/sm/0400/deleteMaxyBatchHistory.maxy")
    public ResponseEntity<?> deleteMaxyBatchHistory(BatchHistoryVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getBatchRunIds());
        batchService.deleteMaxyBatchHistory(vo);
        return ResponseEntity.ok().build();
    }

    /**
     * 미종료 배치 조회
     *
     * @return endlessHistoryList
     */
    @Operation(summary = "미종료 배치 조회",
            description = "정상 종료되지 않은 배치 실행 기록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "미종료 배치 이력 목록을 반환합니다."))
    @Auditable(action = AuditType.READ, method = "미종료 배치 조회")
    @PostMapping(value = "/sm/0400/findEndlessBatchHistory.maxy")
    public ResponseEntity<?> findEndlessBatchHistory() {
        Map<String, Object> resultMap = new HashMap<>();
        List<BatchHistoryVO> result = batchService.findEndlessBatchHistory();
        resultMap.put("endlessHistoryList", result);
        return ResponseEntity.ok().body(resultMap);
    }
}
