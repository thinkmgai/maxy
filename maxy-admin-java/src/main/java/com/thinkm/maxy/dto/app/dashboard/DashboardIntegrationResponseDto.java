package com.thinkm.maxy.dto.app.dashboard;

import com.thinkm.maxy.model.AppInfo;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class DashboardIntegrationResponseDto {
    private Map<String, Map<String, Object>> result;
    private List<AppInfo> apps;
}
