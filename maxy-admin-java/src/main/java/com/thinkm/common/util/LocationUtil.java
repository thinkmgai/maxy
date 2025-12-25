package com.thinkm.common.util;

import java.util.Map;

/**
 * 지역 코드 관련 유틸리티 클래스
 */
public class LocationUtil {

    /**
     * 지원하는 언어 코드
     */
    public enum Language {
        KO, EN, JA
    }

    /**
     * 한국어 지역 코드와 지역명 매핑
     */
    private static final Map<String, String> KOREA_LOCATION_CODE_MAP_KO;

    /**
     * 영어 지역 코드와 지역명 매핑
     */
    private static final Map<String, String> KOREA_LOCATION_CODE_MAP_EN;

    /**
     * 일본어 지역 코드와 지역명 매핑
     */
    private static final Map<String, String> KOREA_LOCATION_CODE_MAP_JA;

    static {
        // 한국어 매핑
        KOREA_LOCATION_CODE_MAP_KO = Map.ofEntries(
                Map.entry("kr-4194", "-"),
                Map.entry("kr-kg", "경기도"),
                Map.entry("kr-cb", "전라북도"),
                Map.entry("kr-kn", "경상남도"),
                Map.entry("kr-2685", "전라남도"),
                Map.entry("kr-pu", "부산광역시"),
                Map.entry("kr-2688", "경상북도"),
                Map.entry("kr-sj", "세종특별자치시"),
                Map.entry("kr-tj", "대전광역시"),
                Map.entry("kr-ul", "울산광역시"),
                Map.entry("kr-in", "인천광역시"),
                Map.entry("kr-kw", "강원특별자치도"),
                Map.entry("kr-gn", "충청남도"),
                Map.entry("kr-cj", "제주특별자치도"),
                Map.entry("kr-gb", "충청북도"),
                Map.entry("kr-so", "서울특별시"),
                Map.entry("kr-tg", "대구광역시"),
                Map.entry("kr-kj", "광주광역시")
        );

        // 영어 매핑
        KOREA_LOCATION_CODE_MAP_EN = Map.ofEntries(
                Map.entry("kr-4194", "-"),
                Map.entry("kr-kg", "Gyeonggi-do"),
                Map.entry("kr-cb", "North Jeolla"),
                Map.entry("kr-kn", "South Gyeongsang"),
                Map.entry("kr-2685", "South Jeolla"),
                Map.entry("kr-pu", "Busan Metropolitan City"),
                Map.entry("kr-2688", "North Gyeongsang"),
                Map.entry("kr-sj", "Sejong Special Self-Governing City"),
                Map.entry("kr-tj", "Daejeon Metropolitan City"),
                Map.entry("kr-ul", "Ulsan Metropolitan City"),
                Map.entry("kr-in", "Incheon Metropolitan City"),
                Map.entry("kr-kw", "Gangwon Special Self-Governing Province"),
                Map.entry("kr-gn", "South Chungcheong"),
                Map.entry("kr-cj", "Jeju Special Self-Governing Province"),
                Map.entry("kr-gb", "North Chungcheong"),
                Map.entry("kr-so", "Seoul Special City"),
                Map.entry("kr-tg", "Daegu Metropolitan City"),
                Map.entry("kr-kj", "Gwangju Metropolitan City")
        );

        // 일본어 매핑
        KOREA_LOCATION_CODE_MAP_JA = Map.ofEntries(
                Map.entry("kr-4194", "-"),
                Map.entry("kr-kg", "キョンギド"),
                Map.entry("kr-cb", "チョルラブクド"),
                Map.entry("kr-kn", "キョンサンナムド"),
                Map.entry("kr-2685", "チョルラナムド"),
                Map.entry("kr-pu", "プサン広域市"),
                Map.entry("kr-2688", "キョンサンプクト"),
                Map.entry("kr-sj", "セジョン特別自治市"),
                Map.entry("kr-tj", "テジョン広域市"),
                Map.entry("kr-ul", "ウルサン広域市"),
                Map.entry("kr-in", "インチョン広域市"),
                Map.entry("kr-kw", "カンウォン特別自治道"),
                Map.entry("kr-gn", "チュンチョンナムド"),
                Map.entry("kr-cj", "チェジュ特別自治道"),
                Map.entry("kr-gb", "チュンチョンプクト"),
                Map.entry("kr-so", "ソウル特別市"),
                Map.entry("kr-tg", "テグ広域市"),
                Map.entry("kr-kj", "クァンジュ広域市")
        );
    }

    /**
     * 지역 코드를 지역명으로 변환 (기본: 한국어)
     *
     * @param locationCode 지역 코드 (예: "kr-so", "kr-pu")
     * @return 지역명 (예: "서울특별시", "부산광역시"). 매핑되지 않은 코드는 원본 코드 반환
     */
    public static String getLocationName(String locationCode) {
        return getLocationName(locationCode, Language.KO);
    }

    /**
     * 지역 코드를 지역명으로 변환 (언어 지정)
     *
     * @param locationCode 지역 코드 (예: "kr-so", "kr-pu")
     * @param language     언어 (KO, EN, JA)
     * @return 지역명. 매핑되지 않은 코드는 원본 코드 반환
     */
    public static String getLocationName(String locationCode, Language language) {
        if (locationCode == null || locationCode.trim().isEmpty()) {
            return locationCode;
        }

        Map<String, String> locationMap = switch (language) {
            case EN -> KOREA_LOCATION_CODE_MAP_EN;
            case JA -> KOREA_LOCATION_CODE_MAP_JA;
            default -> KOREA_LOCATION_CODE_MAP_KO;
        };

        return locationMap.getOrDefault(locationCode.trim(), locationCode);
    }

    /**
     * 지역 코드가 유효한 한국 지역 코드인지 확인
     *
     * @param locationCode 확인할 지역 코드
     * @return 유효한 지역 코드면 true, 아니면 false
     */
    public static boolean isValidKoreaLocationCode(String locationCode) {
        if (locationCode == null || locationCode.trim().isEmpty()) {
            return false;
        }
        return KOREA_LOCATION_CODE_MAP_KO.containsKey(locationCode.trim());
    }

    /**
     * 지역명을 지역 코드로 변환 (역변환, 기본: 한국어)
     *
     * @param locationName 지역명 (예: "서울특별시", "부산광역시")
     * @return 지역 코드 (예: "kr-so", "kr-pu"). 매핑되지 않은 이름은 원본 이름 반환
     */
    public static String getLocationCode(String locationName) {
        return getLocationCode(locationName, Language.KO);
    }

    /**
     * 지역명을 지역 코드로 변환 (역변환, 언어 지정)
     *
     * @param locationName 지역명
     * @param language     언어 (KO, EN, JA)
     * @return 지역 코드. 매핑되지 않은 이름은 원본 이름 반환
     */
    public static String getLocationCode(String locationName, Language language) {
        if (locationName == null || locationName.trim().isEmpty()) {
            return locationName;
        }

        Map<String, String> locationMap = switch (language) {
            case EN -> KOREA_LOCATION_CODE_MAP_EN;
            case JA -> KOREA_LOCATION_CODE_MAP_JA;
            default -> KOREA_LOCATION_CODE_MAP_KO;
        };

        return locationMap.entrySet().stream()
                .filter(entry -> entry.getValue().equals(locationName.trim()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(locationName);
    }
}