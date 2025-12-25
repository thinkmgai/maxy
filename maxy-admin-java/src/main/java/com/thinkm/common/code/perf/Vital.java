package com.thinkm.common.code.perf;

public enum Vital {
    LCP,
    INP,
    TTFB,
    FCP,
    CLS;

    public static Vital[] uses() {
        return new Vital[]{LCP, INP, CLS, FCP};
    }
    public static String[] usesToString() {
        return new String[]{LCP.name(), INP.name(), CLS.name(), FCP.name()};
    }
}
