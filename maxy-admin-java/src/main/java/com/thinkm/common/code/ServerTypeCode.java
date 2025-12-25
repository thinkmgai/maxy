package com.thinkm.common.code;

import com.thinkm.common.util.JsonUtil;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

@Getter
@RequiredArgsConstructor
public enum ServerTypeCode {
    DEV("0", "servertype.dev"),
    QA("1", "servertype.qa"),
    PROD("2", "servertype.prod");

    final String code;
    final String desc;

    public static List<Map<String, String>> getAllToList() {
        return List.of(
                Map.of("code", DEV.code, "desc", DEV.desc),
                Map.of("code", QA.code, "desc", QA.desc),
                Map.of("code", PROD.code, "desc", PROD.desc)
        );
    }

    public static Map<String, String> getAll() {
        return Map.of(
                DEV.code, DEV.desc,
                QA.code, QA.desc,
                PROD.code, PROD.desc
        );
    }

    public static String getAllToString() {
        return JsonUtil.toJson(getAllToList());
    }
}
