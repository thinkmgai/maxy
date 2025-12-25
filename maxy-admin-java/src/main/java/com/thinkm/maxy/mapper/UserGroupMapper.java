package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.PackageVO;
import com.thinkm.maxy.vo.UserGroupVO;
import com.thinkm.maxy.vo.UserVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface UserGroupMapper {

    List<UserGroupVO> selectAllUserGroupList();

    List<UserGroupVO> selectAllUserGroupListByUserNo(UserGroupVO vo);

    void updateUserGroupNm(UserGroupVO vo);

    void insertUserGroup(UserGroupVO vo);

    void insertUserSubGroup(UserGroupVO vo);

    void deleteUserGroup(UserGroupVO vo);

    void updateGrpIdByUserNo(UserGroupVO vo);

    List<Long> selectUserNoListByGrpId(UserGroupVO vo);

    List<UserVO> selectUserList(UserVO vo);

    List<UserVO> selectUserListInGroup(UserVO vo);

    List<UserGroupVO> selectAllUpGroupNameList();

    List<UserGroupVO> selectAllUpGroupNameListInGroup(UserVO vo);

    void updateUserDetail(UserVO vo);

    void updateUserUnlock(UserVO vo);

    void insertRegUser(UserVO vo);

    UserVO checkExistUser(UserVO vo);

    void updateDeleteUser(UserVO vo);

    Long selectInsertedUserNoByUserId(UserVO vo);

    void insertRegUserGroupMember(UserVO vo);

    void deleteUser(UserVO vo);

    void deleteUserGroupMemberByUserNo(UserVO vo);

    List<PackageVO> selectAllAppUserCount(UserVO vo);

    List<PackageVO> selectAppUserCountByGroup(UserVO vo);

    List<UserVO> selectAllUserListByApp(UserVO vo);

    List<UserVO> selectUserListByApp(UserVO vo);

    UserVO selectUserNmAndEmailAddrByUserId(String userId);

    UserVO selectUserDetail(UserVO vo);

    List<UserVO> selectAllAppListByUserNo(UserVO vo);

    UserVO selectUserIdByUserNo(UserVO vo);

    void deleteAppGrantByUserNo(UserVO vo);

    void updateUserAppGrant(UserVO vo);

    int existAppGrantByUserNo(UserVO vo);

    List<UserVO> selectAppListByLoginUser(UserVO vo);

    List<UserVO> selectAppListByUser(UserVO vo);

    UserVO existUpGrpByUserNo(UserVO vo);

    int existUpGroupAppInfoByUpGrpId(UserVO vo);

    UserGroupVO selectMaxGroupId();

    UserGroupVO selectMaxSubGroupId(UserGroupVO vo);
}
