package com.thinkm.maxy.vo;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.AuthException;
import com.thinkm.common.util.DateUtil;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.extern.slf4j.Slf4j;

import javax.servlet.http.HttpServletRequest;
import java.io.Serial;
import java.io.Serializable;

@Slf4j
@Getter
@Setter
@SuperBuilder
@RequiredArgsConstructor
public class BasicInfoVO implements Serializable {

    @Serial
    @Schema(hidden = true)
    @Parameter(hidden = true)
    private static final long serialVersionUID = 1L;

    private String regDt;
    private Long userNo;
    private Long updNo;
    private String uuid;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public void setRegInfo(HttpServletRequest request) {
        try {
            MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
            if (user == null) {
                throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
            }
            this.userNo = user.getUserNo();
            this.regDt = DateUtil.format();
        } catch (Exception e) {
            // 세션값 없음 (만료)
            log.warn("Login Session Expired.");
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
    }

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public void setUpdInfo(HttpServletRequest request) {
        try {
            MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
            if (user == null) {
                throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
            }
            this.updNo = user.getUserNo();
            this.regDt = DateUtil.format();
        } catch (Exception e) {
            // 세션값 없음 (만료)
            log.warn("Login Session Expired.");
            throw new AuthException(ReturnCode.ERR_EXPIRE_SESSION);
        }
    }
}
