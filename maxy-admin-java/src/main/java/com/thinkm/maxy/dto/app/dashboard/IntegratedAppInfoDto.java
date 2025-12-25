package com.thinkm.maxy.dto.app.dashboard;

import com.thinkm.maxy.model.AppInfo;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class IntegratedAppInfoDto {
    private List<AppInfo> apps;
}
