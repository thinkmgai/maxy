package com.thinkm;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MaxyVersion {
    // TODO: 버전 올릴때 마다 여기 반드시 수정하기 !!!!!!!
    VERSION("1.7.0");

    private final String version;
}
