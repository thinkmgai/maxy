package com.thinkm.maxy.controller.front;

import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.maxy.dto.front.common.AppInfoRequestDto;
import com.thinkm.maxy.dto.front.management.sessionreplay.BlockTargetRequestDto;
import com.thinkm.maxy.dto.front.management.sessionreplay.BlockTargetResponseDto;
import com.thinkm.maxy.service.front.FrontSessionReplayBlockService;
import com.thinkm.maxy.vo.MaxyUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/fm/0401")
@RequiredArgsConstructor
@Tag(name = "Front Session Replay Block Management", description = "세션리플레이 block-class 관리 API")
public class FrontSessionReplayBlockController {

    private final FrontSessionReplayBlockService service;

    @Operation(summary = "세션리플레이 block-class 관리 화면", description = "front/management/sessionReplayBlock 뷰 페이지로 이동")
    @Auditable(action = AuditType.NAVIGATION, method = "세션리플레이 차단 관리")
    @GetMapping(value = "/view.maxy")
    public ModelAndView goGroupManagementView() {
        return new ModelAndView("front/management/sessionReplayBlock");
    }

    @Operation(summary = "세션리플레이 차단 대상 목록 조회", description = "packageNm과 serverType으로 차단 대상 목록 조회")
    @PostMapping(value = "/list.maxy")
    public ResponseEntity<BlockTargetResponseDto> getBlockTargets(AppInfoRequestDto dto) {
        BlockTargetResponseDto result = service.getBlockTargets(dto);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "세션리플레이 차단 대상 추가", description = "새로운 차단 대상 추가")
    @Auditable(action = AuditType.INSERT, method = "세션리플레이 차단 대상 추가")
    @PostMapping(value = "/add.maxy")
    public ResponseEntity<?> addBlockTarget(
            @Parameter(hidden = true) HttpServletRequest request,
            @Valid @RequestBody BlockTargetRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }

        Long regNo = user.getUserNo();
        service.addBlockTarget(dto, regNo);

        return ResponseEntity.ok().build();
    }

    @Operation(summary = "세션리플레이 차단 대상 수정", description = "차단 대상 정보 수정")
    @Auditable(action = AuditType.UPDATE, method = "세션리플레이 차단 대상 수정")
    @PostMapping(value = "/update.maxy")
    public ResponseEntity<?> updateBlockTarget(
            @Parameter(hidden = true) HttpServletRequest request,
            @Valid @RequestBody BlockTargetRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }

        Long regNo = user.getUserNo();
        service.updateBlockTarget(dto, regNo);

        return ResponseEntity.ok().build();
    }

    @Operation(summary = "세션리플레이 차단 대상 삭제", description = "선택한 차단 대상 삭제")
    @Auditable(action = AuditType.DELETE, method = "세션리플레이 차단 대상 삭제")
    @PostMapping(value = "/delete.maxy")
    public ResponseEntity<?> deleteBlockTargets(@RequestBody List<Long> seqs) {
        service.deleteBlockTargets(seqs);
        return ResponseEntity.ok().build();
    }
}