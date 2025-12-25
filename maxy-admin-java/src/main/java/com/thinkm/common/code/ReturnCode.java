package com.thinkm.common.code;

import lombok.Getter;

@Getter
public enum ReturnCode {

    INTERNAL_SERVER_ERROR(10, "alert.error.check.serverlog"),
    ERR_INVALID_LOG_TYPE(10, "alert.invalid.logtype"),
    ERR_NO_TARGETDEVICE(10, "alert.no.targetdevice"),
    ERR_DUPL_TARGETDEVICE(10, "alert.dupl.targetdevice"),
    ERR_AUTH_MODIFY_MENU(10, "alert.auth.modify.menu"),
    ERR_NO_DATA(10, "info.nodata.msg"),
    ERR_EXPIRE_SESSION(10, "alert.expire.session"),
    ERR_DUPLICATE_CD_VAL(10, "alert.dupl.cdval"),
    ERR_DUPLICATE_CD_GRP_VAL(10, "alert.dupl.cdgrpval"),
    ERR_DUPLICATE_TIME(10, "alert.dupl.time"),
    ERR_DUPLICATE_URL(10, "alert.dupl.url"),
    ERR_DUPLICATE_PAGEPARAMETER(10, "alert.dupl.pageParameter"),
    ERR_VALID_REGEX(10, "alert.invalid.regex"),
    ERR_NO_USER(10, "alert.no.user"),
    ERR_USER_NOT_EXIST(10, "alert.invalid.login"),
    ERR_PASSCNT_OVER(12, "alert.passcntover"),
    ERR_UPT_PW_OVER(13, "alert.invalid.overuptdt"),
    ERR_INVALID_PW(14, "alert.invalid.pw"),
    ERR_BLANK_PW(14, "alert.blank.pw"),
    ERR_SAMEWORD_PW(14, "alert.sameword.pw"),
    ERR_CONTIWORD_PW(14, "alert.contiword.pw"),
    ERR_TYPE_PW(14, "alert.type.pw"),
    ERR_CONTAINID_PW(14, "alert.containid.pw"),
    ERR_TYPE_EMAIL(19, "alert.type.email"),
    ERR_EMPTY_ID_PW(15, "alert.empty.id_pw"),
    ERR_EMPTY_ID(15, "alert.empty.id"),
    ERR_WRONG_ID(15, "alert.wrong.id"),
    ERR_EMPTY_PW(15, "alert.empty.pw"),
    ERR_EMPTY_PARAMS(19, "alert.empty.params"),
    ERR_TOO_LONG_PARAMS(19, "alert.too.long.params"),
    ERR_NO_APPINFO(19, "alert.no.appinfo"),
    ERR_EMPTY_FILE(19, "alert.empty.file"),
    ERR_READ_FILE(19, "alert.read.file"),
    ERR_WRONG_PARAMS(19, "alert.wrong.params"),
    ERR_WRONG_JSON(19, "alert.wrong.json"),
    ERR_SAME_CURRENT_PW(19, "alert.invalid.currentpw"),
    ERR_NO_ACCESS_AUTHORITY(16, "alert.access.noown"),
    ERR_NO_ACCESS_AUTHORITY_GU(17, "alert.access.generaluser"),
    ERR_DELETED_GROUP(17, "alert.deleted.group"),
    ERR_EMPTY_NO(18, "alert.empty.userno"),
    ERR_USER_DELETED(99, "alert.delete.user"),
    ERR_NO_SET_MARKETING_INSIGHT(99, "dashboard.msg.noSetMarketingInsight"),

    ERR_DUPLICATE_PACKAGE_NM(10, "alert.dupl.packageNm"),
    ERR_EMPTY_PACKAGE_VALUE(19, "alert.empty.packageValue"),

    ERR_DUPLICATE_PROJECT(19, "alert.dupl.project"),

    ERR_DUPLICATE_PACKAGE_USER(10, "alert.dupl.packageUser"),
    ERR_DUPL_VALUE(10, "alert.dupl.value"),
    ERR_INVALID_DOC_ID(10, "alert.invalid.doc.id"),
    ERR_NOT_FOUND_DOC(10, "alert.not.found.doc"),
    ERR_NO_INFO_EMAIL(10, "alert.no.info.email"),
    ERR_WRONG_FILE_FORMAT(10, "wrong.file.format"),
    ERR_TOO_MANY_BUCKETS(10, "too.many.buckets"),
    ERR_NO_GRANTS(10, "alert.no.grant"),
    ERR_OVER_COUNT(10, "alert.over.count"),
    ERR_DATA_LOAD(10, "alert.error.data.load"),

    OTP_NEED_INFO(10, "alert.otp.need.info"),
    OTP_NEED_REG(10, "alert.otp.need.reg"),
    ERR_OTP_INVALID(0, "alert.otp.invalid"),
    ERR_OTP_EXPIRED_ISSUED_TIME(0, "alert.otp.expired.issued.time"),
    ERR_OTP_EXCEEDED_MAX_ATTEMPTS(0, "alert.otp.exceeded.max.attempts"),

    SUCCESS(0, "success.common");

    // Error Code
    private final int value;

    // Error Message
    private final String msg;

    ReturnCode(int value, String msg) {
        this.value = value;
        this.msg = msg;
    }

    /**
     * Compare to Message String
     *
     * @param target String
     * @return boolean
     */
    public boolean equals(String target) {
        return this.msg.equalsIgnoreCase(target);
    }

    /**
     * Compare to Value integer
     *
     * @param target int
     * @return boolean
     */
    public boolean equals(int target) {
        return this.value == target;
    }

    /**
     * Is Success ?
     *
     * @return boolean
     */
    public boolean isSuccess() {
        return this.value == 0;
    }
}
