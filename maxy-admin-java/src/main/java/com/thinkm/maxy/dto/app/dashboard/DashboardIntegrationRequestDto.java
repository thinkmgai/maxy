package com.thinkm.maxy.dto.app.dashboard;

import com.thinkm.maxy.model.AppInfo;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DashboardIntegrationRequestDto {
    private List<AppInfo> apps;
}
