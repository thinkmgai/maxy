package com.thinkm.maxy.controller.app;


import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.ForbiddenException;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.BotService;
import com.thinkm.maxy.vo.BotVO;
import com.thinkm.maxy.vo.MaxyUser;
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
import java.util.List;

/**
 * AI Bot 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Bot Controller", description = "관리 > AI Bot API 컨트롤러")
public class BotController {

    private final BotService botService;

    /**
     * AIBot 관리 페이지 이동
     *
     * @return sm/sm0400
     */
    @Operation(summary = "AIBot 관리 페이지 이동",
            description = "AIBot 관리 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "AIBot 관리 페이지 뷰를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "AIBot 관리")
    @GetMapping(value = "/gm/0901/goAIBotView.maxy")
    public ModelAndView goAIBotView() {
        return new ModelAndView("gm/GM0901");
    }

    /**
     * AI Bot 데이터 목록 조회
     */
    @Operation(summary = "AI Bot 데이터 목록 조회",
            description = "선택한 조건의 AI Bot 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "조건에 해당하는 AI Bot 데이터를 반환합니다."))
    @PostMapping(value = "/gm/0901/getBotList.maxy")
    public ResponseEntity<?> getBotList(HttpServletRequest request, BotVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new ForbiddenException();
        }
        vo.setUserNo(user.getUserNo());

        Object result;
        if (vo.getOccurDate() != null && !vo.getOccurDate().isEmpty()) {
            result = botService.getBotList(vo);
        } else {
            result = botService.getLatestBotList(vo);
        }
        return ResponseEntity.ok().body(result);
    }

    /**
     * AI Bot 일간 데이터 목록 조회
     */
    @Operation(summary = "AI Bot 일간 데이터 목록 조회",
            description = "일자별로 그룹화된 AI Bot 데이터를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "AI Bot 일별 통계를 반환합니다."))
    @PostMapping(value = "/gm/0901/getBotGroupList.maxy")
    public ResponseEntity<?> getBotHistoryGroupList(HttpServletRequest request, BotVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new ForbiddenException();
        }
        vo.setUserNo(user.getUserNo());

        List<BotVO> botGroupList = botService.getBotHistoryGroupList(vo);
        return ResponseEntity.ok().body(botGroupList);
    }

    /**
     * AI Bot 설정 조회
     */
    @Operation(summary = "AI Bot 설정 조회",
            description = "등록된 AI Bot 설정을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "AI Bot 설정 정보를 반환합니다."))
    @PostMapping(value = "/gm/0901/getBotConfig.maxy")
    public ResponseEntity<?> getBotConfig(HttpServletRequest request, BotVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());
        vo.setRegInfo(request);

        BotVO botConfig = botService.getBotConfig(vo);
        return ResponseEntity.ok().body(botConfig);
    }

    /**
     * AI Bot 설정 저장
     */
    @Operation(summary = "AI Bot 설정 저장",
            description = "AI Bot 알림/진단 설정을 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "설정 저장 성공 여부를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "AI Bot 설정 저장")
    @PostMapping(value = "/gm/0901/saveBotConfig.maxy")
    public ResponseEntity<?> saveBotConfig(HttpServletRequest request, BotVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());
        vo.setRegInfo(request);

        botService.saveBotConfig(vo);
        return ResponseEntity.ok().build();
    }
}
