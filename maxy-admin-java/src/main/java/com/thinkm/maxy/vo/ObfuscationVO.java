package com.thinkm.maxy.vo;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.SuperBuilder;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
@ToString
@SuperBuilder
@RequiredArgsConstructor
public class ObfuscationVO extends AppInfoVO {
    private String fileName;
    private MultipartFile multipartFile;

    private String osTypeVal;
    private String appVer;
    private String appBuildNum;
    private Type type;
    private ObfuscatedType obfType;
    private String originalString;
    private String obfuscationString;
    private String obfFullText;
    private String regId;
    private String updId;
    private String updDt;

    private List<ObfuscationVO> insertList;
    private List<ObfuscationVO> deleteList;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public String key() {
        return String.join(":"
                , this.getPackageNm()
                , this.getServerType()
                , this.getOsType()
                , this.appVer
                , this.appBuildNum
        );
    }

    /**
     * 난독화 라이브러리 타입
     * 구현에 따라 추가해야함
     */
    public enum ObfuscatedType {
        PROGUARD, ARXAN
    }

    public enum Type {
        FILE, FULLTEXT, INLININGMAP, CLASSES, FIELDS, METHODS
    }
}
