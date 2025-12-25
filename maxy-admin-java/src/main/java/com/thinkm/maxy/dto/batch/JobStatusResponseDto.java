package com.thinkm.maxy.dto.batch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobStatusResponseDto {

    private String jobName;

    private String jobGroup;

    private String triggerName;

    private String triggerGroup;

    private String cron;

    private Date nextFireTime;

    private Date previousFireTime;

    private String state;
}