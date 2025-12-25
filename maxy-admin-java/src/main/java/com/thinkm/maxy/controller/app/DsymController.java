package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.ForbiddenException;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.dto.app.dsym.AppInfoResponseDto;
import com.thinkm.maxy.service.app.DsymService;
import com.thinkm.maxy.vo.DsymFileInfoVO;
import com.thinkm.maxy.vo.MaxyUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * DSYM 컨트롤러
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "DSYM Controller", description = "시스템관리 > DSYM 업로드/관리 API 컨트롤러")
public class DsymController {

    private final DsymService dsymService;

    /**
     * 패키지별 동시성 제어를 위한 락 맵
     * 동일한 패키지/서버타입에 대한 동시 업로드를 방지
     */
    private final ConcurrentHashMap<String, ReentrantLock> packageLocks = new ConcurrentHashMap<>();

    /**
     * 파일 업로드 최대 크기
     */
    @Value("${server.file.max-size:20M}")
    private String MAX_FILE_SIZE;

    /**
     * DSYM 관리 페이지 이동
     *
     * @return sm/sm0400
     */
    @Operation(summary = "DSYM 관리 페이지 이동",
            description = "DSYM 업로드 및 관리 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "DSYM 관리 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "DSYM 관리")
    @GetMapping(value = "/gm/0702/goDsymMgmt.maxy")
    public ModelAndView goDSYMMgmtView() {
        ModelAndView modelAndView = new ModelAndView("gm/GM0702");
        modelAndView.addObject("maxFileSize", dsymService.parseToBytes(MAX_FILE_SIZE));
        return modelAndView;
    }

    /**
     * DSYM 파일 정보 목록 조회
     * 전체 조회 및 조건별 검색 지원 (osType, appVer, appBuildNum, regDt)
     *
     * @param request HTTP 요청
     * @param vo      DsymFileInfoVO
     * @return DSYM 파일 정보 목록
     */
    @Operation(summary = "DSYM 파일 목록 조회",
            description = "패키지 및 서버 타입 조건으로 업로드된 DSYM 파일 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "DSYM 파일 목록과 상태 정보를 반환합니다."))
    @PostMapping(value = "/gm/0702/getDsymFileList.maxy")
    public ResponseEntity<?> getDsymFileList(HttpServletRequest request, DsymFileInfoVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getPackageNm(), vo.getServerType());

        try {
            // 사용자 인증 확인
            MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
            if (user == null) {
                throw new ForbiddenException();
            }

            // DSYM 파일 정보 목록 조회
            List<DsymFileInfoVO> dsymFileList = dsymService.getDsymFileInfoList(vo);

            // 응답 데이터 구성
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("status", 200);
            resultMap.put("data", dsymFileList);

            return ResponseEntity.ok().body(resultMap);
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error occurred while retrieving DSYM file list: {}", e.getMessage(), e);
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("status", 500);
            errorMap.put("message", "Error occurred while retrieving DSYM file list: " + e.getMessage());
            return ResponseEntity.status(500).body(errorMap);
        }
    }

    /**
     * DSYM 압축 파일 업로드 및 처리
     *
     * @param file      업로드된 압축 파일
     * @param packageNm 패키지 이름
     * @param serverType 서버 타입
     * @param request   HTTP 요청
     * @return 처리 결과
     */
    @Operation(summary = "DSYM 압축 파일 업로드",
            description = "압축된 DSYM 파일을 업로드하여 메타 정보를 저장합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "업로드 처리 결과를 반환합니다."),
            @ApiResponse(responseCode = "400", description = "검증 오류"),
            @ApiResponse(responseCode = "500", description = "파일 처리 오류")
    })
    @Auditable(action = AuditType.INSERT, method = "DSYM 압축 파일 업로드")
    @PostMapping(value = "/gm/0702/uploadDsym.maxy")
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<?> uploadDsymFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("packageNm") String packageNm,
            @RequestParam("serverType") String serverType,
            HttpServletRequest request) {

        long startTime = System.currentTimeMillis();
        String lockKey = packageNm + "_" + serverType;
        ReentrantLock lock = packageLocks.computeIfAbsent(lockKey, k -> new ReentrantLock());
        String userId = "unknown";
        String dsymDir = null;

        lock.lock();
        try {
            // 1. 사용자 인증 및 초기 검증
            MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
            if (user == null) {
                throw new ForbiddenException();
            }
            userId = user.getUserId();

            // 파라미터 유효성 검사
            ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, packageNm, serverType);

            // 업로드 시작 로그
            log.info("DSYM 업로드 시작: userId={}, packageNm={}, serverType={}, fileSize={}", 
                    userId, packageNm, serverType, file.getSize());

            // 2. 파일 처리 및 앱 정보 추출
            Map<String, Object> processResult = dsymService.uploadAndProcessArchive(file, packageNm, serverType);
            AppInfoResponseDto appInfo = (AppInfoResponseDto) processResult.get("appInfo");
            String fileNameWithoutExtension = (String) processResult.get("fileNameWithoutExtension");
            dsymDir = (String) processResult.get("dsymDir");

            // 3. 성공적인 처리 시 DB 저장
            if (appInfo.getStatus() == 200) {
                // DSYM 파일 정보 VO 생성
                DsymFileInfoVO dsymFileInfoVO = DsymFileInfoVO.builder()
                        .packageNm(packageNm)
                        .serverType(serverType)
                        .osType("iOS")
                        .appVer(appInfo.getAppVersion())
                        .appBuildNum(appInfo.getAppBuildVersion())
                        .appName(appInfo.getAppName())
                        .uuid(appInfo.getUuid())
                        .fileName(fileNameWithoutExtension)
                        .filePath(dsymDir)
                        .build();

                // 사용자 정보 설정
                dsymFileInfoVO.setRegInfo(request);

                // 기존 파일 정리 및 DB 저장
                cleanupExistingFiles(dsymFileInfoVO, dsymDir);
                dsymService.upsertDsymFileInfo(dsymFileInfoVO);
            }

            // 4. 성공 응답 반환
            long duration = System.currentTimeMillis() - startTime;
            log.info("DSYM upload completed: userId={}, packageNm={}, duration={}ms", 
                    userId, packageNm, duration);

            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("status", appInfo.getStatus());
            return ResponseEntity.ok().body(resultMap);

        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;

            // 실패 시 파일 정리
            if (dsymDir != null) {
                dsymService.deleteExistingDsymDirectory(new File(dsymDir));
            }

            if (e instanceof IllegalArgumentException) {
                log.warn("DSYM upload validation failed: userId={}, duration={}ms, error={}", 
                        userId, duration, e.getMessage());
                return createErrorResponse(400, e.getMessage());
            } else if (e instanceof IOException) {
                log.error("DSYM upload file processing failed: userId={}, duration={}ms", 
                        userId, duration, e);
                return createErrorResponse(500, e.getMessage());
            } else {
                log.error("DSYM upload unexpected error: userId={}, duration={}ms", 
                        userId, duration, e);
                return createErrorResponse(500, e.getMessage());
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     * DSYM 파일 정보 삭제
     * 선택된 DSYM 파일들의 로컬 파일과 DB 레코드를 삭제합니다.
     *
     * @param request HTTP 요청 객체
     * @param vo      삭제할 DSYM 파일 정보가 담긴 VO 객체
     * @return 삭제 결과를 담은 ResponseEntity
     */
    @Operation(summary = "DSYM 파일 정보 삭제",
            description = "선택한 DSYM 파일의 메타 정보와 실제 파일을 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "삭제 결과를 반환합니다."),
            @ApiResponse(responseCode = "400", description = "요청 파라미터 오류"),
            @ApiResponse(responseCode = "500", description = "삭제 처리 오류")
    })
    @Auditable(action = AuditType.DELETE, method = "DSYM 압축 파일 정보 삭제")
    @PostMapping(value = "/gm/0702/deleteDsymFile.maxy")
    public ResponseEntity<?> deleteDsymFile(HttpServletRequest request, DsymFileInfoVO vo) {
        // 필수 파라미터 검증
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getOsType(),
                vo.getAppVer(), vo.getAppBuildNum());

        try {
            // 사용자 인증 확인
            MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
            if (user == null) {
                throw new ForbiddenException();
            }

            // DSYM 파일 삭제 실행
            Map<String, Object> deleteResult = dsymService.deleteDsymFileInfo(vo);

            // 삭제 결과에 따른 응답 생성 및 로깅
            return createDeleteResponse(deleteResult, vo);

        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return handleDeleteError(e);
        }
    }


    /**
     * 기존 DSYM 파일 정리
     *
     * @param dsymFileInfoVO DSYM 파일 정보
     * @param newDsymDir 새로운 DSYM 디렉토리 경로
     */
    private void cleanupExistingFiles(DsymFileInfoVO dsymFileInfoVO, String newDsymDir) {
        DsymFileInfoVO existingFileInfo = dsymService.getExistingDsymFileInfo(dsymFileInfoVO);

        if (existingFileInfo != null && existingFileInfo.getFilePath() != null) {
            // 기존 파일 경로가 새로운 파일 경로와 다른 경우에만 삭제
            if (!existingFileInfo.getFilePath().equals(newDsymDir)) {
                try {
                    File existingDir = new File(existingFileInfo.getFilePath());
                    if (existingDir.exists() && existingDir.isDirectory()) {
                        boolean deleted = dsymService.deleteExistingDsymDirectory(existingDir);
                        if (deleted) {
                            log.info("Existing DSYM file directory has been deleted: {}", existingFileInfo.getFilePath());
                        } else {
                            log.warn("Failed to delete existing DSYM file directory: {}", existingFileInfo.getFilePath());
                        }
                    }
                } catch (Exception e) {
                    log.error("Error occurred while deleting existing DSYM file: {}", e.getMessage(), e);
                }
            }
        }
    }


    /**
     * 에러 응답 생성
     *
     * @param status HTTP 상태 코드
     * @param message 에러 메시지
     * @return 에러 응답
     */
    private ResponseEntity<?> createErrorResponse(int status, String message) {
        Map<String, Object> errorMap = new HashMap<>();
        errorMap.put("status", status);
        errorMap.put("message", message);

        if (status == 400) {
            return ResponseEntity.badRequest().body(errorMap);
        } else {
            return ResponseEntity.status(status).body(errorMap);
        }
    }

    /**
     * 삭제 결과에 따른 응답 생성
     * 삭제 성공/실패에 따라 적절한 응답을 생성하고 로깅을 수행합니다.
     *
     * @param deleteResult 서비스에서 반환된 삭제 결과
     * @param vo 삭제 요청 정보
     * @return 삭제 결과 응답
     */
    private ResponseEntity<?> createDeleteResponse(Map<String, Object> deleteResult, DsymFileInfoVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        boolean isSuccess = (Boolean) deleteResult.get("success");

        if (isSuccess) {
            // 삭제 성공 응답 구성
            resultMap.put("status", 200);
            resultMap.put("message", deleteResult.get("message"));
            resultMap.put("deletedCount", deleteResult.get("deletedCount"));
            resultMap.put("fileDeleted", deleteResult.get("fileDeleted"));

            // 성공 로그 기록
            log.info("DSYM file deletion successful - Package: {}, ServerType: {}, OSType: {}, AppVer: {}, AppBuildNum: {}",
                    vo.getPackageNm(), vo.getServerType(), vo.getOsType(), 
                    vo.getAppVer(), vo.getAppBuildNum());
        } else {
            // 삭제 실패 응답 구성
            resultMap.put("status", 400);
            resultMap.put("message", deleteResult.get("message"));
            resultMap.put("deletedCount", deleteResult.get("deletedCount"));

            // 실패 로그 기록
            log.warn("DSYM file deletion failed - {}", deleteResult.get("message"));
        }

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 삭제 에러 처리
     * 예상치 못한 오류 발생 시 에러 응답을 생성합니다.
     *
     * @param e 발생한 예외
     * @return 에러 응답
     */
    private ResponseEntity<?> handleDeleteError(Exception e) {
        log.error("Error occurred while deleting DSYM file: {}", e.getMessage(), e);

        String errorMessage = "Error occurred while deleting DSYM file: " + e.getMessage();
        return createErrorResponse(500, errorMessage);
    }

}
