package com.thinkm.maxy.vo;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import com.thinkm.common.code.ElasticIndex;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@SuperBuilder
@RequiredArgsConstructor
@AllArgsConstructor
@ToString
public class StoreVO extends PageVO {

    private String id;
    private String packageId;
    private String packageNm;   // 다른 table 에서 packageNm 으로 씀
    private String name;
    private String language;
    private String updatedDate;
    private String updatedDateTs;
    private String rating;
    private String version;
    private String versionCode;
    private String title;
    private String content;
    private String replyContent;
    private String replyUpdatedDate;
    private String replyUpdatedDateTs;
    private String regDt;
    private String country;
    private String type;
    private String units;
    private String date;
    private String device;
    private String platforms;

    private Long deviceInstalls;
    private Long deviceUninstalls;
    private Long deviceUpgrades;
    private Long totalUserInstall;
    private Long userInstall;
    private Long userUninstall;
    private Long activeDeviceInstalls;
    private Long installEvents;
    private Long updateEvents;
    private Long uninstallEvents;

    private String osType;
    private String storeAppNm;
    private String sellerNm;
    private String trackContentRating;
    private String userRating;
    private String userRatingCount;
    private String currentVersion;
    private String currentVersionReleaseDate;
    private String currentVersionUserRating;
    private String currentVersionUserRatingCount;
    private String releaseNote;
    private String description;
    private String regDate;

    private String searchFromDt;
    private String searchToDt;
    private String searchFromDay;
    private String searchToDay;

    private String fromDt;
    private String toDt;

    private InfoType infoType;
    private int ratingCnt;
    private String accessDate;
    private boolean paging;

    @Schema(hidden = true)
    @Parameter(hidden = true)
    public Map<String, Object> ofReview() {
        Map<String, Object> result = new HashMap<>();
        result.put("id", this.id);
        result.put("name", this.name);
        result.put("title", this.title);
        result.put("content", this.content);
        result.put("language", this.language);
        result.put("packageNm", this.packageId);
        result.put("rating", this.rating);
        result.put("updatedDate", this.updatedDate);
        result.put("version", this.version);

        // todo: paging

        return result;
    }

    @Getter
    @RequiredArgsConstructor
    public enum AppInfo {
        USE("use", "use-by-os", ElasticIndex.ACCESS_HISTORY.getIndex() + "*/_count"),
        INSTALL("install", "install-count", ElasticIndex.DEVICE_INFO.getIndex() + "*/_count"),
        SLEEP("sleep", "sleep-count", ElasticIndex.DEVICE_INFO.getIndex() + "*/_count"),
        PV("pv", "pageview-count", ElasticIndex.PAGE_LOG.getIndex() + "*/_count"),
        DAU("dau", "dailyactiveuser-count", ElasticIndex.ACCESS_HISTORY.getIndex() + "*/_search"),
        TOTAL("total", "total-count", ElasticIndex.ACCESS_HISTORY.getIndex() + "*/_count");

        private final String name;
        private final String fileName;
        private final String endpoint;
    }

    @Getter
    public enum InfoType {
        APP, RATE, REVIEW, TREND, WORDCLOUD
    }
}
