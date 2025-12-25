package com.thinkm.maxy.model.front;

import lombok.Getter;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
public class MarkedItem {
    private boolean mark;
    private String reqUrl;
}
