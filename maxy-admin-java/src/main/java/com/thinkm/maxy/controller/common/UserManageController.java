package com.thinkm.maxy.controller.common;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.code.ServerTypeCode;
import com.thinkm.common.config.audit.AuditLog;
import com.thinkm.common.config.audit.AuditLogService;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.exception.NotFoundException;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.SecurityUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.service.common.UserGroupService;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.PackageVO;
import com.thinkm.maxy.vo.UserGroupVO;
import com.thinkm.maxy.vo.UserVO;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "User Manage Controller", description = "관리 > 사용자 관리 API 컨트롤러")
public class UserManageController {
    private final UserGroupService userGroupService;

    private final AuditLogService auditLogService;

    /**
     * 계정 관리 페이지 이동
     *
     * @return um/UM0200
     */
    @Operation(summary = "사용자 관리 페이지 이동",
            description = "사용자/그룹 관리 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "UM0200 JSP를 반환합니다."))
    @Auditable(action = AuditType.NAVIGATION, method = "사용자 관리")
    @GetMapping(value = "/gm/0101/goUserManageView.maxy")
    public ModelAndView goUserManageView() {

        ModelAndView mv = new ModelAndView("um/UM0200");

        String serverType = ServerTypeCode.getAllToString();

        mv.addObject("serverType", serverType);

        return mv;
    }

    /**
     * 사용자 > 그룹 목록 조회
     *
     * @return userGroupMenuList
     */
    @Operation(summary = "사용자 그룹 메뉴 목록 조회",
            description = "로그인 사용자의 권한에 따라 사용자 그룹 메뉴 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 그룹 메뉴 목록을 반환합니다."))
    @PostMapping(value = "/gm/0101/getUserGroupMenuList.maxy")
    public ResponseEntity<?> getUserGroupMenuList(HttpServletRequest request) {
        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<UserGroupVO> list;
        if (!user.isSuperAdmin()) {
            UserGroupVO vo = new UserGroupVO();
            vo.setUserNo(user.getUserNo());
            list = userGroupService.getUserGroupListByUserNo(vo);
        } else {
            list = userGroupService.getUserGroupList();
        }

        return ResponseEntity.ok().body(list);
    }

    /**
     * 사용자 그룹 명 수정
     *
     * @param request {@link HttpServletRequest}
     * @param vo      grpNm, grpId
     * @return userGroupMenuList 변경된 값이 반영된 목록
     */
    @Operation(summary = "사용자 그룹 명 수정",
            description = "사용자 그룹 이름을 수정하고 최신 목록을 반환합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "갱신된 사용자 그룹 목록을 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "사용자 그룹 명 수정")
    @PostMapping(value = "/gm/0101/modifyUserGroupNm.maxy")
    public ResponseEntity<?> modifyUserGroupNm(HttpServletRequest request, UserGroupVO vo) {
        vo.setRegInfo(request);
        userGroupService.modifyUserGroupNm(vo);
        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<UserGroupVO> list;
        if (!user.isSuperAdmin()) {
            list = userGroupService.getUserGroupListByUserNo(vo);
        } else {
            list = userGroupService.getUserGroupList();
        }

        return ResponseEntity.ok().body(list);
    }

    /**
     * 사용자 그룹 메뉴 등록
     *
     * @param request {@link HttpServletRequest}
     * @param vo      grpNm
     * @return userGroupMenuList 변경된 값이 반영된 목록
     */
    @Operation(summary = "사용자 그룹 등록",
            description = "최상위 사용자 그룹을 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 사용자 그룹 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "사용자 그룹 메뉴 등록")
    @PostMapping(value = "/gm/0101/addUserGroup.maxy")
    public ResponseEntity<?> addUserGroup(HttpServletRequest request, UserGroupVO vo) {
        vo.setRegInfo(request);
        // Insert
        userGroupService.addUserGroup(vo);

        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<UserGroupVO> list;
        if (!user.isSuperAdmin()) {
            list = userGroupService.getUserGroupListByUserNo(vo);
        } else {
            list = userGroupService.getUserGroupList();
        }

        return ResponseEntity.ok().body(list);
    }

    /**
     * 사용자 그룹 자식 메뉴 등록
     *
     * @param request {@link HttpServletRequest}
     * @param vo      grpId, grpNm
     * @return userGroupMenuList 변경된 값이 반영된 목록
     */
    @Operation(summary = "사용자 그룹 하위 등록",
            description = "하위 사용자 그룹을 등록합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 사용자 그룹 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "사용자 그룹 자식 메뉴 등록")
    @PostMapping(value = "/gm/0101/addUserSubGroup.maxy")
    public ResponseEntity<?> addUserSubGroup(HttpServletRequest request, UserGroupVO vo) {
        vo.setRegInfo(request);
        // Insert
        userGroupService.addUserSubGroup(vo);

        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<UserGroupVO> list;
        if (!user.isSuperAdmin()) {
            list = userGroupService.getUserGroupListByUserNo(vo);
        } else {
            list = userGroupService.getUserGroupList();
        }

        return ResponseEntity.ok().body(list);
    }

    /**
     * 사용자 그룹 메뉴 삭제
     *
     * @param request {@link HttpServletRequest}
     * @param vo      grpNm, grpId
     * @return userGroupMenuList 변경된 값이 반영된 목록
     */
    @Operation(summary = "사용자 그룹 삭제",
            description = "사용자 그룹 및 하위 메뉴를 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 사용자 그룹 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "사용자 그룹 메뉴 삭제")
    @PostMapping(value = "/gm/0101/delUserGroupMenu.maxy")
    public ResponseEntity<?> delUserGroupMenu(HttpServletRequest request, UserGroupVO vo) {
        vo.setRegInfo(request);
        // 그룹 삭제 서비스 실행
        userGroupService.delUserGroup(vo);

        vo.setUpGrpId("");
        vo.setGrpId("");

        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<UserGroupVO> list;
        if (!user.isSuperAdmin()) {
            list = userGroupService.getUserGroupListByUserNo(vo);
        } else {
            list = userGroupService.getUserGroupList();
        }

        return ResponseEntity.ok().body(list);
    }

    /**
     * 사용자 목록 조회
     *
     * @param vo searchTextType, searchValue
     * @return userList
     */
    @Operation(summary = "사용자 목록 조회",
            description = "검색 조건과 권한에 따라 사용자 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 목록을 반환합니다."))
    @PostMapping(value = "/gm/0101/getUserList.maxy")
    public ResponseEntity<?> getUserList(HttpServletRequest request, UserVO vo) throws Exception {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getAppType());
        List<MaxyUser.SimpleMaxyUser> result = getUserListByRole(request, vo);
        return ResponseEntity.ok().body(result);
    }

    /**
     * 모든 상위 그룹 명 목록 조회
     *
     * @return upGroupNameList
     */
    @Operation(summary = "상위 그룹 명 목록 조회",
            description = "사용자 권한에 따른 상위 그룹 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "상위 그룹 목록을 반환합니다."))
    @PostMapping(value = "/gm/0101/getAllUpGroupNameList.maxy")
    public ResponseEntity<?> getAllUpGroupNameList(HttpServletRequest request) {
        Map<String, Object> resultMap = new HashMap<>();
        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<UserGroupVO> upGroupNameList;
        if (!user.isSuperAdmin()) {
            UserVO vo = new UserVO();
            vo.setGrpId(user.getGrpId());
            upGroupNameList = userGroupService.getAllUpGroupNameList(vo);
        } else {
            upGroupNameList = userGroupService.getAllUpGroupNameList();
        }

        resultMap.put("upGroupNameList", upGroupNameList);

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 유저 상세 수정
     *
     * @param request {@link HttpServletRequest}
     * @param vo      userNo, userNm, userId, grpId, roleGbn, emailAddr, appInfoList
     * @return userList
     */
    @Operation(summary = "사용자 상세 수정",
            description = "사용자 기본정보/권한/앱 권한을 수정합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "갱신된 사용자 목록을 반환합니다."))
    @Auditable(action = AuditType.UPDATE, method = "사용자 상세 수정")
    @PostMapping(value = "/gm/0101/modifyUserDetail.maxy")
    public ResponseEntity<?> modifyUserDetail(HttpServletRequest request, @RequestBody UserVO vo) throws Exception {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS,
                vo.getUserNo(), vo.getUserNm(), vo.getGrpId(), vo.getRoleGbn(), vo.getEmailAddr(), vo.getAppType());
        vo.setUpdInfo(request);

        log.debug("updNo: {}, userNo: {}", vo.getUpdNo(), vo.getUserNo());

        // update
        userGroupService.modifyUserDetail(vo);

        AuditLog auditLog = auditLogService.makeAuditLogByRequest(request);
        auditLog.setMethod("사용자 권한 변경");
        auditLog.setAction(AuditType.MODIFY_USER);
        auditLog.setMessage(String.join(",", "NO:" + vo.getUserNo(), "NAME:" + vo.getUserNm(), "GRP:" + vo.getGrpId(), "ROLE:" + vo.getRoleGbn()));

        auditLogService.saveAuditLog(auditLog);

        if (vo.getAppInfoList() != null) {
            log.debug("appInfoList: {}", vo.getAppInfoList());
            userGroupService.modifyUserGrantForAppInfo(vo);
        }

        List<MaxyUser.SimpleMaxyUser> result = getUserListByRole(request, vo);
        return ResponseEntity.ok().body(result);
    }

    /**
     * 유저 잠금해제 및 비밀번호 초기화
     *
     * @param request {@link HttpServletRequest}
     * @param vo      userId
     * @return userList
     */
    @Operation(summary = "사용자 잠금 해제 및 비밀번호 초기화",
            description = "잠금된 계정을 해제하고 임시 비밀번호를 발급합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "갱신된 사용자 목록을 반환합니다."))
    @Auditable(action = AuditType.RESET_PW, method = "유저 잠금해제 및 비밀번호 초기화")
    @PostMapping(value = "/gm/0101/unlockUser.maxy")
    public ResponseEntity<?> unlockUser(HttpServletRequest request, UserVO vo) throws Exception {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getUserNo(), vo.getAppType());

        UserVO u = userGroupService.getUserIdByUserNo(vo);
        if (u == null) {
            throw new NotFoundException("alert.no.user");
        }

        String userPw = SecurityUtil.makeResetPw(u.getUserId(), DateUtil.format(DateUtil.DATE_PATTERN));
        vo.setUserId(u.getUserId());
        vo.setUserNewPw(userPw);
        vo.setUserPw(SecurityUtil.SHA256Encrypt(userPw));

        vo.setUpdInfo(request);
        // update
        userGroupService.unlockUser(vo);

        List<MaxyUser.SimpleMaxyUser> result = getUserListByRole(request, vo);
        return ResponseEntity.ok().body(result);
    }

    /**
     * userNo와 권한으로 선택한 앱을 사용할 수 있는지 확인
     *
     * @param vo userNo, packageNm, serverType, roleGbn
     * @return granted
     */
    @Operation(summary = "앱 접근 권한 확인",
            description = "해당 사용자가 특정 앱/서버에 접근 가능한지 확인합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "권한 여부를 반환합니다."))
    @PostMapping(value = "/gm/0101/checkAppGranted.maxy")
    public ResponseEntity<?> checkAppGranted(UserVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getUserNo(), vo.getPackageNm(), vo.getServerType(), vo.getRoleGbn());

        boolean granted = userGroupService.checkAppGranted(vo);

        return ResponseEntity.ok().body(Map.of("granted", granted));
    }

    /**
     * userNo 로 사용자 상세 조회
     *
     * @param vo userNo
     * @return detail
     */
    @Operation(summary = "사용자 상세 조회",
            description = "선택한 사용자의 상세 정보, 앱 권한, 그룹 정보를 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "사용자 상세 정보를 반환합니다."))
    @PostMapping(value = "/gm/0101/getUserDetail.maxy")
    public ResponseEntity<?> getUserDetail(HttpServletRequest request, UserVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getUserNo(), vo.getAppType());
        Map<String, Object> resultMap = new HashMap<>();

        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        // 사용자 상세정보 가져오기
        UserVO detail = userGroupService.getUserDetail(vo);

        vo.setUpdNo(user.getUserNo());
        List<UserVO> appList = userGroupService.getAppListByUserNo(vo, user.isSuperAdmin());

        List<UserGroupVO> groupList;
        // 로그인 사용자의 Group 하위만 받아올 수 있다.
        if (!user.isSuperAdmin()) {
            groupList = userGroupService.getAllUpGroupNameList(UserVO.builder()
                    .grpId(user.getGrpId())
                    .build());
        } else {
            groupList = userGroupService.getAllUpGroupNameList();
        }

        // 결과값
        resultMap.put("detail", UserVO.toSimpleUser(detail));
        resultMap.put("appList", UserVO.toSimpleAppInfo(appList));
        resultMap.put("groupList", UserVO.toSimpleGroupInfo(groupList));

        return ResponseEntity.ok().body(resultMap);
    }

    /**
     * 사용자 등록
     *
     * @param request {@link HttpServletRequest}
     * @param vo      userNm, userId, grpId, roleGbn, emailAddr
     * @return userList
     */
    @Operation(summary = "사용자 등록",
            description = "새로운 사용자를 등록하고 초기 비밀번호를 전송합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "등록 후 사용자 목록을 반환합니다."))
    @Auditable(action = AuditType.INSERT, method = "사용자 등록")
    @PostMapping(value = "/gm/0101/regUser.maxy")
    public ResponseEntity<?> regUser(HttpServletRequest request, UserVO vo) throws Exception {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getAppType());
        MaxyUser session = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (session == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        vo.setRegNo(session.getUserNo());
        vo.setRegDt(DateUtil.format());

        //Insert
        UserVO user = userGroupService.regUser(vo);
        try {
            boolean mailResult = userGroupService.sendEmail(user);
            if (mailResult) {
                log.info("Success Send Mail");
            } else {
                log.warn("Fail Send Mail");
            }
        } catch (Exception ignored) {
        }

        List<MaxyUser.SimpleMaxyUser> result = getUserListByRole(request, vo);
        return ResponseEntity.ok().body(result);
    }

    /**
     * 단일 사용자 삭제
     *
     * @param request {@link HttpServletRequest}
     * @param vo      userNo
     * @return userList
     */
    @Operation(summary = "사용자 삭제",
            description = "선택한 사용자를 삭제합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "삭제 후 사용자 목록을 반환합니다."))
    @Auditable(action = AuditType.DELETE, method = "사용자 삭제")
    @PostMapping(value = "/gm/0101/delUser.maxy")
    public ResponseEntity<?> delUser(HttpServletRequest request, UserVO vo) throws Exception {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getAppType());
        vo.setUpdInfo(request);
        // update
        userGroupService.delUser(vo);

        List<MaxyUser.SimpleMaxyUser> result = getUserListByRole(request, vo);
        return ResponseEntity.ok().body(result);
    }

    /**
     * 조회 가능 앱 목록 조회
     *
     * @param request 로그인 사용자
     * @return 그룹 관리자가 포함된 앱 목록
     */
    @Operation(summary = "조회 가능 앱 목록 조회",
            description = "로그인 사용자가 접근 가능한 앱 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "앱 목록을 반환합니다."))
    @PostMapping(value = "/gm/0101/getAllAppList.maxy")
    public ResponseEntity<?> getAllAppList(HttpServletRequest request, UserVO vo) {
        ValidUtil.isValidParams(ReturnCode.ERR_WRONG_PARAMS, vo.getAppType());
        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        List<PackageVO.SimplePackage> result;
        if (!user.isSuperAdmin()) {
            vo.setUserNo(user.getUserNo());
            vo.setGrpId(user.getGrpId());
            result = userGroupService.getAllAppList(vo);
        } else {
            result = userGroupService.getAllAppListAdmin(vo);
        }

        return ResponseEntity.ok().body(result);
    }

    /**
     * 앱 별 사용자 목록 조회
     *
     * @param request 로그인 사용자
     * @param vo      packageNm, serverType
     * @return 그룹 / 앱 별 사용자 목록
     */
    @Operation(summary = "앱별 사용자 목록 조회",
            description = "선택한 앱/서버 기준의 사용자 목록을 조회합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "앱별 사용자 목록을 반환합니다."))
    @PostMapping(value = "/gm/0101/getUserListByApp.maxy")
    public ResponseEntity<?> getUserListByApp(HttpServletRequest request, UserVO vo) {
        // Session 가져오기
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }

        vo.setUserNo(user.getUserNo());
        List<MaxyUser.SimpleMaxyUser> result;
        if (!user.isSuperAdmin()) {
            vo.setGrpId(user.getGrpId());
            result = userGroupService.getUserListByApp(vo);
        } else {
            //리스트 가져오기
            result = userGroupService.getAllUserListByApp(vo);
        }
        return ResponseEntity.ok().body(result);
    }


    /**
     * 시스템 관리자면 모든 유저 목록을 불러오고, 그 외는 각 그룹에 맞는 유저 목록을 조회
     *
     * @param request 로그인 사용자
     * @param vo      검색 조건
     * @return 유저 목록
     */
    private List<MaxyUser.SimpleMaxyUser> getUserListByRole(HttpServletRequest request, UserVO vo) throws Exception {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);

        if (user == null) {
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
        if (!user.isSuperAdmin()) {
            // 시스템 관리자가 아닌 경우 해당 계정의 그룹과 동일한 그룹 사용자만 조회
            vo.setGrpId(user.getGrpId());
            return userGroupService.getUserListInGroup(vo);
        } else {
            // 전체 사용자 리스트 가져오기
            return userGroupService.getUserList(vo);
        }
    }
}
