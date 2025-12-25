package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.ConflictException;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.ObfuscationService;
import com.thinkm.maxy.vo.ObfuscationVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Obfuscation Controller", description = "관리 > 난독화 관리 API 컨트롤러")
public class ObfuscationController {

    @Resource
    private final ObfuscationService service;

    @Operation(summary = "난독화 관리 페이지 이동",
            description = "난독화 룰 및 파일을 관리하는 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "난독화 관리 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "난독화 관리")
    @GetMapping(value = "/gm/0701/goObfRuleMgmt.maxy")
    public ModelAndView goObfRuleMgmt() {
        return new ModelAndView("gm/GM0701");
    }

    @Operation(summary = "난독화 파일 업로드",
            description = "난독화 룰 업로드 용 파일을 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "업로드된 파일명을 반환합니다."))
    @PostMapping(value = "/gm/0701/upload.maxy")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, HttpServletRequest request) throws IOException {
        ObfuscationVO vo = ObfuscationVO.builder()
                .multipartFile(file)
                .build();
        vo.setRegInfo(request);

        String fileName = service.storeFile(vo);
        Map<String, String> resultMap = new HashMap<>();
        resultMap.put("fileName", fileName);
        return ResponseEntity.ok().body(resultMap);
    }

    @Operation(summary = "난독화 룰 등록",
            description = "업로드된 정보를 기반으로 난독화 룰을 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 난독화 룰 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "난독화 룰 등록")
    @PostMapping(value = "/gm/0701/saveRuleInfo.maxy")
    public ResponseEntity<?> saveRuleInfo(ObfuscationVO vo, HttpServletRequest request) {
        vo.setRegInfo(request);
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(),
                vo.getServerType(),
                vo.getOsTypeVal(),
                vo.getOsType(),
                vo.getAppVer(),
                vo.getObfType(),
                vo.getAppBuildNum()
        );
        try {
            // 동일한 app info 일 경우에는 insert 하지 않는다.
            if (service.isRuleInfo(vo)) {
                log.warn(vo.toString());
                throw new ConflictException(ReturnCode.ERR_DUPL_VALUE);
            }
            service.saveRuleInfo(vo);
        } finally {
            if (!ObfuscationVO.Type.FILE.equals(vo.getType())) {
                service.deleteTmpFile(vo);
            }
        }

        List<ObfuscationVO> result = service.getRuleList(vo);
        return ResponseEntity.ok().body(result);
    }


    @Operation(summary = "난독화 룰 목록 조회",
            description = "패키지/서버/OS 기준의 난독화 룰 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "난독화 룰 목록을 반환합니다."))
    @PostMapping(value = "/gm/0701/getRuleList.maxy")
    public ResponseEntity<?> getRuleList(ObfuscationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(),
                vo.getServerType(),
                vo.getOsType()
        );
        List<ObfuscationVO> result = service.getRuleList(vo);
        return ResponseEntity.ok().body(result);
    }

    @Operation(summary = "난독화 룰 삭제",
            description = "선택한 난독화 룰을 삭제하고 최신 리스트를 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 난독화 룰 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "난독화 룰 삭제")
    @PostMapping(value = "/gm/0701/delRuleList.maxy")
    public ResponseEntity<?> delRuleList(@RequestBody ObfuscationVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(),
                vo.getServerType(),
                vo.getOsType(),
                vo.getDeleteList()
        );

        service.deleteRuleList(vo);

        List<ObfuscationVO> result = service.getRuleList(vo);
        return ResponseEntity.ok().body(result);
    }

}
