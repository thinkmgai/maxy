package com.thinkm.maxy.controller.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.app.DeviceService;
import com.thinkm.maxy.vo.DevicePageVO;
import com.thinkm.maxy.vo.DeviceVO;
import com.thinkm.maxy.vo.ModelVO;
import com.thinkm.maxy.vo.PagesVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Device Controller", description = "관리 > 장치 관리 API 컨트롤러")
public class DeviceController {

    @Resource
    private final DeviceService deviceService;

    /**
     * paging 정보가 하나라도 빠져있으면 default 값으로 변경
     *
     * @param vo {@link DeviceVO}
     */
    private static void setDefaultPagingInfo(DeviceVO vo) {
        if (vo.getOffset() == null || vo.getLimit() == null
            || vo.getOffset() < 0 || vo.getLimit() < 0) {
            vo.setOffset(0);
            vo.setLimit(100);
        }
    }

    /**
     * 장치 현황 페이지 이동
     *
     * @return dm/dm0100
     */
    @Operation(summary = "장치 현황 페이지 이동",
            description = "장치 현황 대시보드 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "장치 현황 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "장치 현황")
    @GetMapping(value = "/gm/0501/goDeviceView.maxy")
    public ModelAndView goDeviceView() {
        return new ModelAndView("dm/DM0100");
    }

    /**
     * 로깅 페이지 설정 페이지 이동
     *
     * @return dm/dm0300
     */
    @Operation(summary = "로깅 페이지 설정 화면 이동",
            description = "로깅 페이지 타깃 장치 설정 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로깅 페이지 설정 뷰를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "로깅 페이지 설정")
    @GetMapping(value = "/gm/0503/goSetTargetDevicePageView.maxy")
    public ModelAndView goSetTargetDevicePageView() {
        return new ModelAndView("dm/DM0300");
    }


    /**
     * 디바이스 모델 페이지 이동
     *
     * @return dm/dm0400
     */
    @Operation(summary = "디바이스 모델 관리 화면 이동",
            description = "디바이스 모델 관리 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "디바이스 모델 관리 뷰를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "Device Model 설정")
    @GetMapping(value = "/gm/0504/goModelManagementView.maxy")
    public ModelAndView goModelManagementView() {
        return new ModelAndView("dm/DM0400");
    }

    /**
     * 디바이스 모델 목록 조회
     *
     * @return 장치 모델 목록
     */
    @Operation(summary = "디바이스 모델 목록 조회",
            description = "관리 중인 디바이스 모델 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "디바이스 모델 목록을 반환합니다."))
    @PostMapping(value = "/gm/0504/getModelList.maxy")
    public ResponseEntity<?> getModelList() {
        List<ModelVO> result = deviceService.getModelList();

        return ResponseEntity.ok(result);
    }


    /**
     * 디바이스 모델 목록 수정
     *
     * @param vo ModelVO
     * @return 디바이스 모델 목록
     */
    @Operation(summary = "디바이스 모델 정보 수정",
            description = "선택한 디바이스 모델 정보를 수정하고 최신 목록을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정된 디바이스 모델 목록을 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "디바이스 모델 수정")
    @PostMapping(value = "/gm/0504/modifyModelInfo.maxy")
    public ResponseEntity<?> modifyModelInfo(HttpServletRequest request, ModelVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getSeq(), vo.getDeviceModel(), vo.getNameKo());
        vo.setRegInfo(request);
        if (vo.getNameEn() == null || vo.getNameEn().isEmpty()) {
            vo.setNameEn(vo.getNameKo());
        }
        deviceService.modifyModelInfo(vo);
        deviceService.refreshModelList();

        List<ModelVO> result = deviceService.getModelList();

        return ResponseEntity.ok(result);
    }

    /**
     * 디바이스 모델 목록 추가
     *
     * @param vo ModelVO
     * @return 디바이스 모델 목록
     */
    @Operation(summary = "디바이스 모델 추가",
            description = "새로운 디바이스 모델을 등록하고 최신 목록을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "갱신된 디바이스 모델 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "디바이스 모델 추가")
    @PostMapping(value = "/gm/0504/addModelInfo.maxy")
    public ResponseEntity<?> addModelInfo(HttpServletRequest request, ModelVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getDeviceModel(), vo.getNameKo());
        vo.setRegInfo(request);
        if (vo.getNameEn() == null || vo.getNameEn().isEmpty()) {
            vo.setNameEn(vo.getNameKo());
        }
        deviceService.addModelInfo(vo);
        deviceService.refreshModelList();

        List<ModelVO> result = deviceService.getModelList();

        return ResponseEntity.ok(result);
    }

    /**
     * 디바이스 모델 목록 삭제
     *
     * @param vo ModelVO
     * @return 디바이스 모델 목록
     */
    @Operation(summary = "디바이스 모델 삭제",
            description = "선택한 디바이스 모델을 삭제하고 최신 목록을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 디바이스 모델 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "디바이스 모델 삭제")
    @PostMapping(value = "/gm/0504/delModelInfo.maxy")
    public ResponseEntity<?> delModelInfo(@RequestBody ModelVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS, vo.getDeleteList());
        deviceService.delModelInfo(vo);
        deviceService.refreshModelList();

        List<ModelVO> result = deviceService.getModelList();

        return ResponseEntity.ok(result);
    }


    /**
     * 로깅 대상 장치 리스트 조회
     *
     * @param vo {@link DeviceVO}
     * @return targetDeviceList
     */
    @Operation(summary = "로깅 대상 장치 목록 조회",
            description = "패키지/서버 기준으로 로깅 대상 장치 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로깅 대상 장치 정보를 반환합니다."))
    @PostMapping(value = "/gm/0502/getTargetDeviceList.maxy")
    public ResponseEntity<?> getTargetDeviceList(DeviceVO vo) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());
        //리스트 가져오기
        Map<String, Object> result = deviceService.getTargetDeviceList(vo);
        // 결과값
        resultMap.put("targetDeviceList", result.get("targetDeviceList"));
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 로깅 페이지 장치 리스트 조회
     *
     * @param vo {@link DeviceVO}
     * @return targetDeviceList
     */
    @Operation(summary = "로깅 페이지용 장치 목록 조회",
            description = "로깅 페이지 설정 화면에서 사용하는 장치 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "로깅 페이지 장치 목록을 반환합니다."))
    @PostMapping(value = "/gm/0503/getTargetDeviceList.maxy")
    public ResponseEntity<?> getTargetDeviceListForPageMap(DeviceVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());
        //리스트 가져오기
        List<DeviceVO> rsList = deviceService.getTargetDeviceListForPageMap(vo);
        // 결과값
        resultMap.put("targetDeviceList", rsList);
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 로깅 페이지 페이지 리스트 조회
     *
     * @param vo {@link DeviceVO}
     * @return targetDevicePageList
     */
    @Operation(summary = "로깅 페이지 목록 조회",
            description = "특정 장치에 매핑된 로깅 페이지 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "장치별 로깅 페이지 목록을 반환합니다."))
    @PostMapping(value = "/gm/0503/getTargetDevicePageList.maxy")
    public ResponseEntity<?> getTargetDevicePageList(DeviceVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getDeviceId());
        //리스트 가져오기
        List<DevicePageVO> rsList = deviceService.getTargetDevicePageList(vo);
        // 결과값
        resultMap.put("targetDevicePageList", rsList);
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 로깅 페이지 등록
     *
     * @param request {@link HttpServletRequest}, vo {@link DevicePageVO}
     */
    @Operation(summary = "로깅 페이지 등록",
            description = "선택한 장치에 대해 로깅 대상 페이지를 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 로깅 페이지 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "로깅 페이지 등록")
    @PostMapping(value = "/gm/0503/regTargetDevicePage.maxy")
    public ResponseEntity<?> insertTargetDevicePage(HttpServletRequest request, DevicePageVO vo) {
        Map<String, Object> resultMap = new HashMap<>();

        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        if (vo.getAppPageUrls() == null) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }

        vo.setRegInfo(request);
        String[] urlArray = vo.getAppPageUrls().split(",");
        List<String> reqUrlList = new ArrayList<>(Arrays.asList(urlArray));
        vo.setReqUrlList(reqUrlList);
        deviceService.insertTargetDevicePage(vo);

        // 반영된 결과 목록 가져오기
        DeviceVO param = new DeviceVO();
        param.setPackageNm(vo.getPackageNm());
        param.setServerType(vo.getServerType());
        param.setDeviceId(vo.getDeviceId());
        List<DevicePageVO> rsList = deviceService.getTargetDevicePageList(param);

        //결과값
        resultMap.put("targetDevicePageList", rsList);
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 로깅 페이지 앱 페이지 리스트 조회
     *
     * @param vo {@link DevicePageVO}
     * @return appPageList
     */
    @Operation(summary = "앱 페이지 목록 조회",
            description = "앱 페이지 정보를 조회하여 로깅 페이지 매핑에 활용합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "앱 페이지 목록을 반환합니다."))
    @PostMapping(value = "/gm/0503/getAppPageList.maxy")
    public ResponseEntity<?> getAppPageList(DevicePageVO vo) {
        Map<String, Object> resultMap = new HashMap<>();
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());
        //리스트 가져오기
        List<PagesVO> rsList = deviceService.getAppPageList(vo);
        // 결과값
        resultMap.put("appPageList", rsList);
        return ResponseEntity.ok(resultMap);
    }

    /**
     * 로깅 대상 정보 수정
     *
     * @param request {@link HttpServletRequest}, vo {@link DeviceVO}
     */
    @Operation(summary = "로깅 대상 장치 정보 수정",
            description = "로깅 대상 장치 기본 정보를 수정하고 최신 목록을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "수정 후 로깅 대상 장치 목록을 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "로깅 대상 정보 수정")
    @PostMapping(value = "/gm/0501/modifyDevice.maxy")
    public ResponseEntity<?> modifyTargetDeviceDetail(HttpServletRequest request, DeviceVO vo) throws Exception {
        if (vo.getTargetId() == null) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getTargetId());
        vo.setRegInfo(request);// maxy_device 테이블 등록 여부 확인
        DeviceVO device = deviceService.getDevice(vo);

        // 1. device 테이블에 등록된 경우 사용자 정보 update
        if (device != null && StringUtils.isNotEmpty(device.getDeviceId())) {
            deviceService.updateDevice(vo);
        } else {
            log.warn("maxy_device에 등록되지 않은 기기입니다.");
        }

        // targetApp 테이블에 update
        deviceService.modifyTargetDeviceDetail(vo);
        // redis에 targetApp 정보 등록/수정
        deviceService.setTargetDeviceToRedis(vo);

        setDefaultPagingInfo(vo);

        return ResponseEntity.ok(deviceService.getDeviceList(vo));
    }

    /**
     * 로깅 대상 직접 등록
     *
     * @param request {@link HttpServletRequest}, vo {@link DeviceVO}
     */
    @Operation(summary = "로깅 대상 직접 등록",
            description = "새로운 로깅 대상 장치를 직접 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 로깅 대상 장치 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "로깅 대상 직접 등록")
    @PostMapping(value = "/gm/0501/regDevice.maxy")
    public ResponseEntity<?> regTargetDevice(HttpServletRequest request, DeviceVO vo) throws Exception {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getDeviceId(), vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getVipYn());
        vo.setRegInfo(request);

        // 중복 등록 확인
        DeviceVO targetDevice = deviceService.getTargetDeviceByDeviceId(vo);
        if (targetDevice != null && StringUtils.isNotEmpty(targetDevice.getDeviceId())) {
            throw new DuplicateKeyException("alert.dupl.targetdevice");
        }
        // maxy_device 테이블 등록 여부 확인
        DeviceVO device = deviceService.getDevice(vo);

        // 1. device 테이블에 등록된 경우 사용자 정보 update
        if (device != null && StringUtils.isNotEmpty(device.getDeviceId())) {
            deviceService.updateDevice(vo);
        } else {
            // 2. 등록되어 있지 않은 경우 device 등록
            String currentDate = DateUtil.getTodayTime() + ".000";
            vo.setCreatedDate(currentDate);
            vo.setUpdatedDate(currentDate);
            vo.setPushedDate(currentDate);
            deviceService.insertDevice(vo);
        }

        // Insert
        deviceService.regTargetDevice(vo);
        // redis에 target App 정보 등록
        deviceService.setTargetDeviceToRedis(vo);

        setDefaultPagingInfo(vo);

        return ResponseEntity.ok(deviceService.getDeviceList(vo));
    }

    /**
     * 로깅 대상 삭제
     *
     * @param vo {@link DeviceVO}
     */
    @Operation(summary = "로깅 대상 삭제",
            description = "선택한 로깅 대상 장치를 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 로깅 대상 장치 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "로깅 대상 삭제")
    @PostMapping(value = "/gm/0501/delMonitoringTarget.maxy")
    public ResponseEntity<?> delTargetDevice(DeviceVO vo) {
        // targetId 값 없으면 에러
        if (vo.getTargetIdList().isEmpty()) {
            throw new BadRequestException(ReturnCode.ERR_EMPTY_PARAMS);
        }
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        // 로깅 대상 삭제 Device 조회 후 redis에서 삭제
        deviceService.selectAndDelTargetDeviceByTargetId(vo);

        // 로깅 대상 삭제 서비스 실행
        deviceService.deleteTargetDevice(vo);

        setDefaultPagingInfo(vo);

        return ResponseEntity.ok(deviceService.getDeviceList(vo));
    }

    /**
     * 장치 리스트 조회
     *
     * @param vo {@link DeviceVO}
     * @return deviceList
     */
    @Operation(summary = "장치 목록 조회",
            description = "MAXY에 등록된 장치 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "장치 목록을 반환합니다."))
    @PostMapping(value = "/gm/0501/getDeviceList.maxy")
    public ResponseEntity<?> getDeviceList(DeviceVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType());

        setDefaultPagingInfo(vo);

        return ResponseEntity.ok(deviceService.getDeviceList(vo));
    }

    /**
     * 로깅 대상 등록
     *
     * @param request {@link HttpServletRequest}, vo {@link DeviceVO}
     */
    @Operation(summary = "로깅 대상 일괄 등록",
            description = "선택한 장치 목록을 로깅 대상에 일괄 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 로깅 대상 장치 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "로깅 대상 등록")
    @PostMapping(value = "/gm/0501/regMonitoringTarget.maxy")
    public ResponseEntity<?> regMonitoringTarget(HttpServletRequest request, DeviceVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                vo.getPackageNm(), vo.getServerType(), vo.getDeviceListStr());
        vo.setRegInfo(request);
        deviceService.regMonitoringTarget(vo);

        setDefaultPagingInfo(vo);

        return ResponseEntity.ok(deviceService.getDeviceList(vo));
    }

}
