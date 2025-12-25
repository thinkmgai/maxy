package com.thinkm.maxy.repository;

import com.thinkm.maxy.vo.PackageVO;
import lombok.Getter;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Component
public class AppInfoRepository {
    private final Map<String, String> appInfo = new HashMap<>();

    public void update(List<PackageVO> list) {
        appInfo.clear();
        for (PackageVO info : list) {
            appInfo.put(info.getPackageNm() + ":"+ info.getServerType(), info.getDisplayNm());
        }
    }

    public String get(String packageNm, String serverType) {
        return appInfo.get(packageNm + ":" + serverType);
    }
}
