package com.thinkm.maxy.model;

import com.thinkm.maxy.vo.AppInfoVO;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AppInfo {
    private String packageNm;
    private String serverType;

    public AppInfo from(AppInfoVO vo) {
        return new AppInfo(vo.getPackageNm(), vo.getServerType());
    }
}
