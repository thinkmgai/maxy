package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.PackageVO;
import com.thinkm.maxy.vo.SessionReplayRuleVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface PackageMapper {

    List<PackageVO> selectAppInfoList();

    List<PackageVO> selectAllUseAppInfo();

    void insertAppInfo(PackageVO vo);

    void insertAppUser(PackageVO vo);

    int selectAppInfoUser(PackageVO vo);

    void updateAppUser(PackageVO vo);

    void insertAllAppVer(PackageVO vo);

    void deleteAppInfo(PackageVO vo);

    void deleteAppInfoUser(PackageVO vo);

    void deleteAppVer(PackageVO vo);

    List<PackageVO> selectSuperUsers(PackageVO vo);

    void insertSessionReplayRule(SessionReplayRuleVO vo);

    void deleteSessionReplayRule(SessionReplayRuleVO vo);

    List<SessionReplayRuleVO> selectSessionReplayRule(SessionReplayRuleVO vo);
}
