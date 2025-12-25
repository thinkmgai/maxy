package com.thinkm.maxy.service.app;

import com.thinkm.common.code.CommonCode;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.mapper.StoreAnalysisMapper;
import com.thinkm.maxy.vo.StoreVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class StoreAnalysisService {

    private final StoreAnalysisMapper mapper;

    public List<Object> getReviewList(StoreVO vo) {
        List<Object> result = new ArrayList<>();
        String osType = vo.getOsType();
        if (CommonCode.IOS.equals(osType)) {
            List<StoreVO> tmp = mapper.selectIosReviewList(vo);
            for (StoreVO v : tmp) {
                result.add(v.ofReview());
            }
        } else if (CommonCode.ANDROID.equals(osType)) {
            List<StoreVO> tmp = mapper.selectAosReviewList(vo);
            result.addAll(tmp);
        }
        return result;
    }

    public Map<String, Object> getAppInfoV2(StoreVO vo) {
        Map<String, Object> result = new HashMap<>();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
        LocalDate accessDate = LocalDate.parse(vo.getAccessDate(), formatter);
        DateTimeFormatter dashFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        vo.setAccessDate(accessDate.format(dashFormat));

        Object install = null, reInstall = null, upgrade = null, activerUser = null, unInstall = null;

        if ("ios".equals(vo.getOsType())) {
            List<Map<String, Object>> tmp = mapper.selectIosAppInfo(vo);

            if (tmp != null && !tmp.isEmpty()) {
                install = tmp.stream()
                        .filter(map -> "1F".equals(map.get("type"))) // 설치
                        .map(map -> map.get("units"))
                        .findFirst()
                        .orElse(null);

                reInstall = tmp.stream()
                        .filter(map -> "3F".equals(map.get("type"))) // 재설치
                        .map(map -> map.get("units"))
                        .findFirst()
                        .orElse(null);

                upgrade = tmp.stream()
                        .filter(map -> "7F".equals(map.get("type"))) // 업그레이드
                        .map(map -> map.get("units"))
                        .findFirst()
                        .orElse(null);
            }
        } else {
            Map<String, Object> tmp = mapper.selectAosAppInfo(vo);

            if (tmp != null && !tmp.isEmpty()) {
                install = tmp.get("user_install");
                unInstall = tmp.get("user_uninstall");
                reInstall = tmp.get("reinstall");
                upgrade = tmp.get("update_events");
                activerUser = tmp.get("active_device_installs");
            }
        }

        result.put("install", install);
        result.put("reInstall", reInstall);
        result.put("upgrade", upgrade);
        result.put("activerUser", activerUser);
        result.put("unInstall", unInstall);

        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getRate(StoreVO vo) {
        Map<String, Object> result = new HashMap<>();

        // review count

        // rate 별점 별 count

        String osType = vo.getOsType();
        vo.setFromDt(vo.getFromDt() + " 00:00:00");
        vo.setToDt(vo.getToDt() + " 23:59:59");
        if (CommonCode.IOS.equals(osType)) {
            List<StoreVO> iosRatingCnt = mapper.selectIosRatingCnt(vo);
            int iosRate = mapper.selectIosAvgRate(vo);
            result.put("countByRate", iosRatingCnt);
            result.put("rate", iosRate);
        } else if (CommonCode.ANDROID.equals(osType)) {
            List<StoreVO> aosRatingCnt = mapper.selectAosRatingCnt(vo);
            int aosRate = mapper.selectAosAvgRate(vo);
            result.put("countByRate", aosRatingCnt);
            result.put("rate", aosRate);
        }

        List<Map<String, Object>> list = (List<Map<String, Object>>) result.get("countByRate");
        long totalReviewCnt = 0L;
        for (Map<String, Object> l : list) {
            totalReviewCnt += ((Number) l.get("ratingCnt")).longValue(); // Number로 캐스팅 후 longValue() 호출
        }
        // rate
        result.put("count", totalReviewCnt);
        result.put("countByRate", result.get("countByRate"));
        result.put("rate", result.get("rate"));

        return result;
    }

    public List<Map<String, Object>> getTrendInfo(StoreVO vo) {
        return mapper.selectChartData(vo);
    }

    public int getReviewCount(StoreVO vo) {
        int result = 0;
        String osType = vo.getOsType();
        vo.setFromDt(vo.getFromDt() + " 00:00:00");
        vo.setToDt(vo.getToDt() + " 23:59:59");
        if (CommonCode.IOS.equals(osType)) {
            result = mapper.countIosReviewList(vo);
        } else if (CommonCode.ANDROID.equals(osType)) {
            result = mapper.countAosReviewList(vo);
        }
        return result;
    }

    @SuppressWarnings("rawtypes")
    public List getWordCloudInfo(StoreVO vo) {
        vo.setRegDate(DateUtil.format("yyyyMMdd"));
        String content = mapper.selectWordCloudInfo(vo);
        if (content != null) {
            return JsonUtil.fromJson(content, List.class);
        } else {
            return new ArrayList<>();
        }
    }
}

