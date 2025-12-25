package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.ConflictException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.PageService;
import com.thinkm.maxy.service.app.helper.PageServiceHelper;
import com.thinkm.maxy.vo.PagesVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "PageView Controller", description = "관리 > Alias Managements API 컨트롤러")
public class PageViewController {

    @Resource
    private final PageService pageService;

    /**
     * 페이지 정보 조회 화면 이동
     *
     * @return gm/GM0303
     */
    @Operation(summary = "Alias 설정 페이지 이동",
            description = "페이지별 Alias 설정 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Alias 설정 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Alias 설정")
    @GetMapping(value = "/gm/0303/goSetPageView.maxy")
    public ModelAndView goSetPageNew() {
        return new ModelAndView("gm/GM0303");
    }

    /**
     * 페이지 리스트 조회
     *
     * @param vo {@link PagesVO}
     * @return pageList
     */
    @Operation(summary = "페이지 리스트 조회",
            description = "조건에 따른 페이지 Alias 목록과 건수를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "페이지 목록과 건수를 반환합니다."))
    @PostMapping(value = "/gm/0303/getPageList.maxy")
    public ResponseEntity<?> getPageList(PagesVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());

        long s1 = System.currentTimeMillis();
        PagesVO count = pageService.getPageListCountByType(vo);
        long e1 = System.currentTimeMillis();
        log.debug("getPageListCountByType: {} ms", e1 - s1);

        List<PagesVO> result = pageService.getPageListByType(vo);
        log.debug("getPageListByType: {} ms", System.currentTimeMillis() - s1);

        resultMap.put("pageList", result);
        resultMap.put("pageCount", count.getPageCount());
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 페이지 리스트 조회
     *
     * @param vo {@link PagesVO}
     * @return pageList
     */
    @Operation(summary = "URL별 데이터 타입 조회",
            description = "요청 URL 목록에 대한 데이터 타입 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "URL별 데이터 타입 매핑을 반환합니다."))
    @PostMapping(value = "/gm/0303/getPageDataType.maxy")
    public ResponseEntity<?> getPageDataType(@RequestBody PagesVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        Map<String, String> dataTypeMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());

        // infoList에서 reqUrl 목록을 가져옴
        if (vo.getInfoList() != null && !vo.getInfoList().isEmpty()) {
            for (PagesVO pageInfo : vo.getInfoList()) {
                // 각 reqUrl에 대해 데이터 타입 조회
                PagesVO queryVo = PagesVO.builder()
                        .packageNm(vo.getPackageNm())
                        .serverType(vo.getServerType())
                        .limit(1)
                        .offset(0)
                        .reqUrl(pageInfo.getReqUrl())
                        .searchType("reqUrl")
                        .searchValue(pageInfo.getReqUrl())
                        .build();

                List<PagesVO> pageList = pageService.getPageListByType(queryVo);

                if (pageList != null && !pageList.isEmpty()) {
                    // 결과의 data_type을 맵에 저장
                    dataTypeMap.put(pageInfo.getReqUrl(), pageList.get(0).getDataType());
                } else {
                    dataTypeMap.put(pageInfo.getReqUrl(), null);
                }
            }
        }

        resultMap.put("dataTypes", dataTypeMap);
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 페이지 정보 수정
     *
     * @param vo {@link PagesVO}, request {@link HttpServletRequest}
     */
    @Operation(summary = "페이지 정보 수정",
            description = "페이지 Alias 정보 및 설명을 수정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정 결과를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "페이지 정보 수정")
    @PostMapping(value = "/gm/0303/updatePage.maxy")
    public ResponseEntity<?> updatePage(HttpServletRequest request, PagesVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getReqUrl());
        vo.setRegInfo(request);

        // & ' " < >
        // &amp; &apos; &quot; &lt; &gt;
        vo.setAppPageNm(CommonUtil.convertHTMLCode(vo.getAppPageNm()));
        vo.setAppPageDesc(CommonUtil.convertHTMLCode(vo.getAppPageDesc()));
        vo.setReqUrl(CommonUtil.convertHTMLCode(vo.getReqUrl()));

        // Update
        pageService.updatePage(vo);
        return ResponseEntity.ok().build();
    }

    /**
     * 페이지 정보 수정 (commonScript.jsp > alias.save())
     *
     * @param vo {@link PagesVO}, request {@link HttpServletRequest}
     */
    @Operation(summary = "페이지 정보 저장/수정",
            description = "페이지 Alias 정보를 upsert 합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "저장 결과를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "페이지 정보 수정")
    @PostMapping(value = "/gm/0303/upsertPage.maxy")
    public ResponseEntity<?> upsertPage(HttpServletRequest request, PagesVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getReqUrl());
        vo.setRegInfo(request);

        // & ' " < >
        // &amp; &apos; &quot; &lt; &gt;
        vo.setAppPageNm(CommonUtil.convertHTMLCode(vo.getAppPageNm()));
        vo.setReqUrl(CommonUtil.convertHTMLCode(vo.getReqUrl()));

        // Update
        pageService.upsertPage(vo);
        return ResponseEntity.ok().build();
    }

    /**
     * 페이지 정보 등록
     *
     * @param vo {@link PagesVO}, request {@link HttpServletRequest}
     */
    @Operation(summary = "페이지 정보 등록",
            description = "새로운 페이지 Alias 정보를 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 결과를 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "페이지 정보 등록")
    @PostMapping(value = "/gm/0303/insertPage.maxy")
    public ResponseEntity<?> insertPage(HttpServletRequest request, PagesVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getAppPageNm(), vo.getReqUrl());
        vo.setRegInfo(request);

        // & ' " < >
        // &amp; &apos; &quot; &lt; &gt;
        vo.setAppPageNm(CommonUtil.convertHTMLCode(vo.getAppPageNm()));
        vo.setAppPageDesc(CommonUtil.convertHTMLCode(vo.getAppPageDesc()));
        vo.setReqUrl(CommonUtil.convertHTMLCode(vo.getReqUrl()));

        // Insert
        pageService.insertPage(vo);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "페이지 정보 일괄 업로드",
            description = "CSV 파일을 업로드하여 페이지 Alias 정보를 일괄 업데이트합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "업로드 처리 결과를 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "페이지 정보 파일 업로드")
    @PostMapping(value = "/gm/0303/uploadFile.maxy")
    public ResponseEntity<?> uploadFile(HttpServletRequest request,
                                        @RequestParam("file") MultipartFile file,
                                        PagesVO vo) throws Exception {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());
        vo.setRegInfo(request);
        vo.setMultipartFile(file);

        // 임시 파일 저장 (경로/크기/확장자 검증 포함)
        vo.setFileInfo(pageService.storeTmpFile(vo));

        // CSV 파싱 + 검증 + DB 반영 + 임시파일 삭제
        pageService.updateBulkPageInfo(vo);

        return ResponseEntity.ok().build();
    }

    @Operation(summary = "페이지 정보 다운로드",
            description = "페이지 Alias 정보를 파일로 다운로드합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "파일 다운로드를 시작합니다."))
    @Auditable(action = AuditType.ACCESS, method = "페이지 정보 파일 다운로드")
    @GetMapping(value = "/gm/0303/downloadPageList.maxy")
    public void downloadPageList(
            PagesVO vo,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        try {
            List<PagesVO> pageList = pageService.getPageList(vo);
            pageService.downloadPageList(pageList, request, response);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 페이지 Parameter 리스트 조회
     *
     * @param vo {@link PagesVO}
     * @return pageParameterList
     */
    @Operation(summary = "페이지 파라미터 목록 조회",
            description = "페이지 파라미터 설정 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "페이지 파라미터 목록을 반환합니다."))
    @PostMapping(value = "/gm/0303/getPageParameterList.maxy")
    public ResponseEntity<?> getPageParameterList(PagesVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());
        List<PagesVO> result = pageService.getPageParameterList(vo);
        return ResponseEntity.ok(result);
    }


    /**
     * 페이지 Parameter 등록
     *
     * @param vo {@link PagesVO}, request {@link HttpServletRequest}
     */
    @Operation(summary = "페이지 파라미터 등록",
            description = "페이지 파라미터를 등록하고 최신 목록을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 파라미터 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "페이지 Parameter 등록")
    @PostMapping(value = "/gm/0303/insertPageParameter.maxy")
    public ResponseEntity<?> insertPageParameter(HttpServletRequest request, PagesVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType());
        if (PageServiceHelper.checkValidString(vo.getParameter())) {
            throw new BadRequestException(ReturnCode.ERR_VALID_REGEX);
        }

        vo.setRegInfo(request);
        try {
            // Insert
            pageService.insertPageParameter(vo);
        } catch (DuplicateKeyException e) {
            throw new ConflictException(ReturnCode.ERR_DUPLICATE_PAGEPARAMETER);
        } catch (BadSqlGrammarException e) {
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        List<PagesVO> parameter = pageService.getPageParameterList(vo);

        return ResponseEntity.ok(parameter);
    }

    /**
     * 페이지 Parameter 삭제
     *
     * @param vo {@link PagesVO}, request {@link HttpServletRequest}
     */
    @Operation(summary = "페이지 파라미터 삭제",
            description = "선택한 페이지 파라미터를 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 파라미터 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "페이지 Parameter 삭제")
    @PostMapping("/gm/0303/delPageParameter.maxy")
    public ResponseEntity<?> delPageParameter(PagesVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getParameter(), vo.getPackageNm(), vo.getServerType());

        pageService.delPageParameter(vo);

        List<PagesVO> parameter = pageService.getPageParameterList(vo);

        return ResponseEntity.ok(parameter);
    }

    /**
     * 사용량이 많지만 alias 가 없는 url 목록 조회
     *
     * @param vo
     * @return
     */
    @Operation(summary = "Alias 미등록 URL 조회",
            description = "사용량이 많지만 Alias가 등록되지 않은 URL 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "Alias 미등록 URL 목록을 반환합니다."))
    @PostMapping("/gm/0303/getNoAliasUrlList.maxy")
    public ResponseEntity<?> getNoAliasUrlList(PagesVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getPackageNm(), vo.getServerType(), vo.getType());

        List<Map<String, Object>> parameter = pageService.getNoAliasUrlList(vo);

        return ResponseEntity.ok(parameter);
    }
}
