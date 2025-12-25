package com.thinkm.common.util;

import com.google.common.base.CaseFormat;

import java.util.LinkedHashMap;

@SuppressWarnings({"rawtypes", "unused", "unchecked"})
public class CamelHashMap extends LinkedHashMap {
    private static String toLowerCamel(String key) {
        return CaseFormat.UPPER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, key);
    }

    @Override
    public Object put(Object key, Object value) {
        return super.put(toLowerCamel(String.valueOf(key)), value);
    }
}
