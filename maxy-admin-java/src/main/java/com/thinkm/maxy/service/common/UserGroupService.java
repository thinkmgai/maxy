package com.thinkm.maxy.service.common;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.ConflictException;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.SecurityUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.mapper.UserGroupMapper;
import com.thinkm.maxy.vo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserGroupService {

    @Resource
    private final UserGroupMapper mapper;

    @Resource
    private final MailService mailService;

    @Resource
    private final UserService userService;

    @Resource
    private final SecurityUtil securityUtil;

    @Value("${network.context-url}")
    private String contextUrl;
    @Value("${security.pass.expire-date:90}")
    private int passExpireDate;

    /**
     * 계정 관리 그룹 메뉴 목록 조회
     *
     * @return 상위 그룹명
     */
    public List<UserGroupVO> getUserGroupList() {
        return mapper.selectAllUserGroupList();
    }

    /**
     * 계정 관리 그룹 메뉴 목록 조회
     *
     * @return 상위 그룹명
     */
    public List<UserGroupVO> getUserGroupListByUserNo(UserGroupVO vo) {
        return mapper.selectAllUserGroupListByUserNo(vo);
    }

    /**
     * 그룹명 수정
     *
     * @param vo {@link UserGroupVO}
     */
    public void modifyUserGroupNm(UserGroupVO vo) {
        mapper.updateUserGroupNm(vo);

    }

    /**
     * 그룹 추가
     *
     * @param vo {@link UserGroupVO}
     */
    public void addUserGroup(UserGroupVO vo) {
        // max group id, order seq 갖고 오기
        UserGroupVO group = mapper.selectMaxGroupId();

        if (group == null) {
            group = new UserGroupVO();
        }

        // grpId 초기화
        String grpIdStr = group.getMaxGrpId();
        if (grpIdStr == null || grpIdStr.isEmpty()) {
            grpIdStr = "10000";
        }

        // grpId +1 하여 "0"을 5개 붙이기
        int grpId = Integer.parseInt(grpIdStr);
        vo.setGrpId((grpId + 1) + "00000");

        // orderSeq +1 하여 세팅
        int orderSeq = group.getOrderSeq() == null ? 1 : group.getOrderSeq() + 1;
        vo.setOrderSeq(orderSeq);

        // insert 수행
        mapper.insertUserGroup(vo);
    }

    /**
     * 상위 그룹 속 그룹 등록
     *
     * @param vo {@link UserGroupVO}
     */
    public void addUserSubGroup(UserGroupVO vo) {

        // max group id, order seq 갖고 오기
        UserGroupVO group = mapper.selectMaxSubGroupId(vo);

        int grpId = 0;
        int orderSeq = 1;
        if (group != null) {
            // grpId 초기화
            String grpIdStr = group.getMaxGrpId();
            if (grpIdStr == null) {
                grpIdStr = "0";
            }

            // grpId +1 하여 "0"을 5개 붙이기
            grpId = Integer.parseInt(grpIdStr);

            // orderSeq +1 하여 세팅
            orderSeq = group.getOrderSeq() == null ? 1 : group.getOrderSeq() + 1;
        }

        vo.setGrpId(vo.getUpGrpId().substring(0, 5) + String.format("%05d", (grpId + 1)));
        vo.setOrderSeq(orderSeq);

        // insert 수행
        mapper.insertUserSubGroup(vo);
    }

    /**
     * 그룹 삭제
     *
     * @param vo UserGroupVO
     */
    public void delUserGroup(UserGroupVO vo) {
        // update
        mapper.deleteUserGroup(vo);

        // 삭제되는 그룹안에 있던 유저
        List<Long> userNoList = mapper.selectUserNoListByGrpId(vo);
        // 유저가 있으면 그룹 없음으로 옮기기
        if (!userNoList.isEmpty()) {
            vo.setUserNoList(userNoList);

            vo.setGrpId(CommonCode.USER_GROUP_NONAME_CODE.getValue());

            mapper.updateGrpIdByUserNo(vo);
        }
    }

    /**
     * 사용자 목록 (시스템 관리자) 조회
     *
     * @param vo {@link MaxyUser}
     * @return userList, paginationInfo
     */
    public List<MaxyUser.SimpleMaxyUser> getUserList(UserVO vo) throws Exception {
        List<UserVO> users = mapper.selectUserList(vo);

        for (UserVO user : users) {
            user.setEmailAddr(securityUtil.AES128Decrypt(user.getEmailAddr()));
        }

        return new MaxyUser().toSimpleMaxyUserList(users);
    }

    /**
     * 사용자 목록 조회
     *
     * @param vo {@link MaxyUser}
     * @return userList, paginationInfo
     */
    public List<MaxyUser.SimpleMaxyUser> getUserListInGroup(UserVO vo) throws Exception {
        List<UserVO> users = mapper.selectUserListInGroup(vo);

        for (UserVO user : users) {
            user.setEmailAddr(securityUtil.AES128Decrypt(user.getEmailAddr()));
        }

        return new MaxyUser().toSimpleMaxyUserList(users);
    }

    /**
     * 상위 그룸 목록 조회
     *
     * @return 그룹 아이디, 그룹 이름
     */
    public List<UserGroupVO> getAllUpGroupNameList() {
        return mapper.selectAllUpGroupNameList();
    }

    /**
     * 상위 그룸 목록 조회
     *
     * @return 그룹 아이디, 그룹 이름
     */
    public List<UserGroupVO> getAllUpGroupNameList(UserVO vo) {
        return mapper.selectAllUpGroupNameListInGroup(vo);
    }

    /**
     * 사용자 상세 수정
     *
     * @param vo UserVO
     */
    public void modifyUserDetail(UserVO vo) throws Exception {
        // 이메일 암호화
        String emailAddr = vo.getEmailAddr();
        if (!ValidUtil.isValidEmail(emailAddr)) {
            throw new BadRequestException(ReturnCode.ERR_TYPE_EMAIL);
        }
        vo.setEmailAddr(securityUtil.AES128Encrypt(emailAddr));

        // update 수정
        mapper.updateUserDetail(vo);
    }

    /**
     * 사용자 잠금 해제
     *
     * @param vo UserVO
     */
    public void unlockUser(UserVO vo) {

        // set expiredDate (now + 00 days)
        LocalDate expiredDate = DateUtil.stringDateToLocalDate(DateUtil.format());
        expiredDate = expiredDate.plusDays(passExpireDate);
        vo.setExpiredDate(DateUtil.LocalDateToStringDate(expiredDate));

        // update 수정
        mapper.updateUserUnlock(vo);

        try {
            UserVO mailVO = mapper.selectUserNmAndEmailAddrByUserId(vo.getUserId());

            // 이메일 암호화
            String emailAddr = securityUtil.AES128Decrypt(mailVO.getEmailAddr());
            if (!ValidUtil.isValidEmail(emailAddr)) {
                throw new BadRequestException(ReturnCode.ERR_TYPE_EMAIL);
            }
            mailVO.setEmailAddr(emailAddr);
            mailVO.setUserNewPw(vo.getUserNewPw());
            userService.sendPwResetMail(mailVO);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("email send fail: " + e.getMessage());
        }
    }

    /**
     * 사용자 추가
     *
     * @param vo {@link MaxyUser}
     */
    public UserVO regUser(UserVO vo) {
        try {
            if (!ValidUtil.isValidId(vo.getUserId())) {
                throw new BadRequestException(ReturnCode.ERR_WRONG_ID);
            }

            String userPw = SecurityUtil.makeResetPw(vo.getUserId(), vo.getRegDt());
            vo.setUserPw(SecurityUtil.SHA256Encrypt(userPw));

            String emailAddr = vo.getEmailAddr();
            if (!ValidUtil.isValidEmail(emailAddr)) {
                throw new BadRequestException(ReturnCode.ERR_TYPE_EMAIL);
            }
            vo.setEmailAddr(securityUtil.AES128Encrypt(emailAddr));

            LocalDate expiredDate = DateUtil.stringDateToLocalDate(DateUtil.format());
            expiredDate = expiredDate.plusDays(passExpireDate);
            vo.setExpiredDate(DateUtil.LocalDateToStringDate(expiredDate));

            // 그룹 관리자로 체크되었으면 GrpAdminYn "Y" 처리
            if (CommonCode.ROLE_GROUP_CODE.equals(vo.getRoleGbn())) {
                vo.setGrpAdminYn("Y");
            } else {
                vo.setGrpAdminYn("N");
            }

            UserVO existUser = mapper.checkExistUser(vo);
            if (existUser != null && "N".equals(existUser.getDeleteYn())) {
                // Duplicate User Error
                throw new ConflictException(ReturnCode.ERR_DUPLICATE_PACKAGE_USER);
            }

            if (existUser != null && "Y".equals(existUser.getDeleteYn())) {
                vo.setUpdNo(existUser.getUserNo());
                vo.setUserNo(existUser.getUserNo());
                mapper.updateDeleteUser(vo);
            } else {
                mapper.insertRegUser(vo);
                long userNo = mapper.selectInsertedUserNoByUserId(vo);
                vo.setUserNo(userNo);
            }

            mapper.insertRegUserGroupMember(vo);
            vo.setEmailAddr(emailAddr);
            vo.setUserNewPw(userPw);
            return vo;
        } catch (BadRequestException | ConflictException e) {
            throw e;
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }
    }

    /**
     * 사용자 삭제
     *
     * @param vo {@link MaxyUser}
     */
    public void delUser(UserVO vo) {
        //update
        mapper.deleteUser(vo);
        mapper.deleteUserGroupMemberByUserNo(vo);
    }

    /**
     * 비밀번호 초기화 이메일 발송 서비스
     *
     * @param userInfo userId, userNm, email, userPw
     * @return 성공 여부
     */
    public boolean sendEmail(UserVO userInfo) {
        if (mailService.checkMailDisabled()) {
            return false;
        }
        List<String> toAddressList = new ArrayList<>();
        toAddressList.add(userInfo.getEmailAddr());

        final String subject = "[MAXY] 계정이 등록되었습니다.";
        final String userNm = userInfo.getUserNm();
        final String userId = userInfo.getUserId();
        final String userNewPw = userInfo.getUserNewPw();

        Map<String, String> mailParam = new HashMap<>();
        mailParam.put("contextUrl", contextUrl);
        mailParam.put("userNm", userNm);
        mailParam.put("userId", userId);
        mailParam.put("userNewPw", userNewPw);

        // mail 템플릿을 만들어 사용
        String content = mailService.getTemplate("reg-account.html", mailParam);
        if (StringUtils.isEmpty(content)) {
            return false;
        }

        MailVO mailVO = MailVO.builder()
                .toEmailList(toAddressList)
                .subject(subject)
                .content(content)
                .build();
        mailVO.setUser(userInfo);

        return mailService.sendMail(mailVO);
    }

    public List<PackageVO.SimplePackage> getAllAppListAdmin(UserVO vo) {
        // 앱 패키지별 사용지정 유저 조회
        List<PackageVO> result = mapper.selectAllAppUserCount(vo);
        return PackageVO.toSimplePackageList(result);
    }

    public List<PackageVO.SimplePackage> getAllAppList(UserVO vo) {
        // 앱 패키지별 사용지정 유저 조회
        List<PackageVO> result = mapper.selectAppUserCountByGroup(vo);
        return PackageVO.toSimplePackageList(result);
    }

    public List<MaxyUser.SimpleMaxyUser> getAllUserListByApp(UserVO vo) {
        List<UserVO> appTotalUserList = mapper.selectAllUserListByApp(vo);

        // 이메일 Decrypt
        List<MaxyUser.SimpleMaxyUser> result = new MaxyUser().toSimpleMaxyUserList(appTotalUserList);
        for (MaxyUser.SimpleMaxyUser maxyUser : result) {
            try {
                maxyUser.setEmailAddr(securityUtil.AES128Decrypt(maxyUser.getEmailAddr()));
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }

        return result;

    }

    public List<MaxyUser.SimpleMaxyUser> getUserListByApp(UserVO vo) {
        List<UserVO> appTotalUserList = mapper.selectUserListByApp(vo);

        // 이메일 Decrypt
        List<MaxyUser.SimpleMaxyUser> result = new MaxyUser().toSimpleMaxyUserList(appTotalUserList);
        for (MaxyUser.SimpleMaxyUser maxyUser : result) {
            try {
                maxyUser.setEmailAddr(securityUtil.AES128Decrypt(maxyUser.getEmailAddr()));
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }

        return result;

    }

    public UserVO getUserDetail(UserVO vo) {
        UserVO user = mapper.selectUserDetail(vo);

        try {
            user.setEmailAddr(securityUtil.AES128Decrypt(user.getEmailAddr()));
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return user;
    }

    public List<UserVO> getAppListByUserNo(UserVO vo, boolean isAdmin) {
        if (isAdmin) {
            return mapper.selectAllAppListByUserNo(vo);
        } else {
            List<UserVO> list = mapper.selectAppListByLoginUser(vo);
            List<UserVO> activeList = mapper.selectAppListByUser(vo);
            for (UserVO item : list) {
                for (UserVO innerItem : activeList) {
                    String packageNm = innerItem.getPackageNm();
                    String serverType = innerItem.getServerType();
                    if (item.getPackageNm().equals(packageNm) && item.getServerType().equals(serverType)) {
                        item.setPicked("Y");
                    }
                }
            }
            return list;
        }
    }

    public UserVO getUserIdByUserNo(UserVO vo) {
        return mapper.selectUserIdByUserNo(vo);
    }

    public void modifyUserGrantForAppInfo(UserVO vo) {
        mapper.deleteAppGrantByUserNo(vo);
        if (!vo.getAppInfoList().isEmpty()) {
            mapper.updateUserAppGrant(vo);
        }
    }

    public boolean checkAppGranted(UserVO vo) {

        // 일반 사용자 권한이면 그룹 관리자의 앱만 등록 가능
        if (CommonCode.ROLE_GENERAL_CODE.equals(vo.getRoleGbn())) {
            return mapper.existAppGrantByUserNo(vo) > 0;
        }

        // 관리자 권한이면
        if (CommonCode.ROLE_GROUP_CODE.equals(vo.getRoleGbn())) {
            // 상위 그룹인지, 하위 그룹인지 판단.
            // 상위 그룹이 없는 경우
            UserVO grpInfo = mapper.existUpGrpByUserNo(vo);

            // 1. 하위 그룹이라면 (상위 그룹이 있으면)
            if (grpInfo != null && grpInfo.getUpGrpId() != null) {
                // 1-1. 상위 그룹의 앱 목록 까지 가능
                vo.setUpGrpId(grpInfo.getUpGrpId());
                return mapper.existUpGroupAppInfoByUpGrpId(vo) > 0;
            } else {
                // 2. 상위 그룹이라면 (상위 그룹이 없으면)
                // 2-1. 모든 앱에 대한 등록 가능
                return true;
            }
        }

        // 권한 정보가 없는 경우
        return false;
    }
}
