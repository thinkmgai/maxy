package com.thinkm.common.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum CommonCode {
    IOS("ios"),
    ANDROID("android"),
    USER_GROUP_NONAME_CODE("0000000000"),
    ROLE_ADMIN_CODE("0011"),
    ROLE_GROUP_CODE("0012"),
    ROLE_GENERAL_CODE("0013"),
    PAGE_NM("paginationInfo"),
    COOKIE_NAME("_mlu_"),   // _lu_ 는 miaps admin center 에서 사용
    LOGIN_ATTR_KEY("loginUser"),   // request getSession setAttribute key
    COMPONENT_CONFIG_VERSION_COMPARISON("component_config_vc"),   // component_config_version_comparison
    VERSION_COMPARISON("version_comparison"),   // component_config_version_comparison
    TOTAL_VERSION_COMPARISON("total_version_comparison"),   // component_config_version_comparison
    TOTAL_DAY_VERSION_COMPARISON("total_day_version_comparison"),   // component_config_version_comparison
    TOTAL_WEEK_VERSION_COMPARISON("total_week_version_comparison"),   // component_config_version_comparison
    TOTAL_MONTH_VERSION_COMPARISON("total_month_version_comparison"),   // component_config_version_comparison
    YN_YES("Y"),
    YN_NO("N"),
	PACKAGE_NAME("packageName"),
    MAXY_APP_TYPE("0"),
    FRONT_APP_TYPE("1");

    private final String value;

    public boolean equals(String target) {
        return this.value.equalsIgnoreCase(target);
    }

    public static String loginUserKey() {
        return LOGIN_ATTR_KEY.value;
    }
    
    public static String packageNameKey() {
    	return PACKAGE_NAME.value;
    }
}
