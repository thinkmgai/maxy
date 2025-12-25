package com.thinkm.common.code.system;

import lombok.Data;

@Data
public class ContainerStatus {
    private String name;
    private String message;
    private Status status;
}