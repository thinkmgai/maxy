package com.thinkm.maxy.service.common;

import com.thinkm.common.util.DateUtil;
import com.thinkm.maxy.mapper.PackageMapper;
import com.thinkm.maxy.repository.AppInfoRepository;
import com.thinkm.maxy.vo.PackageVO;
import com.thinkm.maxy.vo.SessionReplayRuleVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;


@Service
@Slf4j
@RequiredArgsConstructor
public class AppSettingsService {
    private final PackageMapper mapper;
    private final AppInfoRepository appInfoRepository;

    /**
     * 패키지 목록 조회
     *
     * @return packageList
     */
    public List<PackageVO> getAppInfoList() {
        update();
        return mapper.selectAppInfoList();
    }

    /**
     * useYn = 'Y' 인 app 정보만 update
     */
    public void update() {
        long s0 = System.currentTimeMillis();
        log.debug("start select app list.");
        List<PackageVO> list = mapper.selectAllUseAppInfo();
        appInfoRepository.update(list);
        log.info("refresh app list. {}ms", System.currentTimeMillis() - s0);
    }

    /**
     * 패키지 등록 / 수정
     *
     * @param vo {@link PackageVO}
     */
    public void saveAppInfo(PackageVO vo) {
        mapper.insertAppInfo(vo);

        // 등록일 경우
        if ("reg".equalsIgnoreCase(vo.getType())) {
            // super user 들에게 모두 insert 해준다.
            List<PackageVO> superUsers = mapper.selectSuperUsers(vo);
            for (PackageVO user : superUsers) {
                log.info("insert app user. packageNm: {}, serverType: {}, userNo: {}",
                        vo.getPackageNm(), vo.getServerType(), user.getUserNo());
                vo.setUserNo(user.getUserNo());
                mapper.insertAppUser(vo);
            }

            // 등록한 유저를 insert 해준다.
            int count = mapper.selectAppInfoUser(vo);
            if (count < 1) {
                log.info("insert app user. packageNm: {}, serverType: {}, userNo: {}, useYn: {}",
                        vo.getPackageNm(), vo.getServerType(), vo.getUserNo(), vo.getUseYn());
                mapper.insertAppUser(vo);
            }

            // package 신규 등록 시 appVer 'A' 자동 추가
            mapper.insertAllAppVer(vo);
        }
        // 수정일 경우
        else {
            mapper.updateAppUser(vo);
        }

        update();
    }

    /**
     * 패키지 삭제
     *
     * @param vo {@link PackageVO}
     */
    public void deleteAppInfo(PackageVO vo) {
        log.info("delete app info. userNo: {}, packageNm: {}, serverType: {}",
                vo.getUserNo(), vo.getPackageNm(), vo.getServerType());
        mapper.deleteAppInfo(vo);
        mapper.deleteAppInfoUser(vo);
        mapper.deleteAppVer(vo);
        update();
    }

    public List<SessionReplayRuleVO> getSessionReplayRule(SessionReplayRuleVO vo) {
        return mapper.selectSessionReplayRule(vo);
    }

    public void addSessionReplayRule(SessionReplayRuleVO vo) {
        vo.setRegDt(DateUtil.format());
        mapper.insertSessionReplayRule(vo);
    }

    public void deleteSessionReplayRule(SessionReplayRuleVO vo) {
        mapper.deleteSessionReplayRule(vo);
    }
}
