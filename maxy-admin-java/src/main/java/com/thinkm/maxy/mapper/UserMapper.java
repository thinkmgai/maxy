package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.UserAppVO;
import com.thinkm.maxy.vo.UserVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface UserMapper {

    UserVO selectUserInfoByUserId(UserVO vo);

    void updateUserPwCntPlus(UserVO vo);

    void updateUserPwCntZero(UserVO vo);

    UserVO selectUserInfoByUserNo(UserVO user);

    void updateUserInfoByUserNo(UserVO user);

    UserVO selectUserInfoByUserIdAndEmail(UserVO vo);

    List<UserAppVO> selectAppInfoListByUserNo(UserVO vo);

    void initAdminPassCnt();

    void initAdminPass();

    void initOtpInfo(UserVO vo);

    void increaseOtpAttempts(UserVO vo);

    int selectOtpAttempts(UserVO vo);

    void resetOtpAttempts(UserVO vo);

    void disableOtpInfo(UserVO vo);

    UserVO selectOtpInfoByUserNo(UserVO vo);
}
