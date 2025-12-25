package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.code.MaxyLogType;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.FileParseException;
import com.thinkm.common.exception.FileStorageException;
import com.thinkm.common.exception.TooManyBucketException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.Elastic;
import com.thinkm.common.util.ElasticClient;
import com.thinkm.maxy.mapper.PageMapper;
import com.thinkm.maxy.repository.PageRepository;
import com.thinkm.maxy.service.app.helper.PageServiceHelper;
import com.thinkm.maxy.vo.DashboardVO;
import com.thinkm.maxy.vo.LogRequestVO;
import com.thinkm.maxy.vo.PagesVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.lang3.StringUtils;
import org.opensearch.action.search.SearchRequest;
import org.opensearch.action.search.SearchResponse;
import org.opensearch.index.query.BoolQueryBuilder;
import org.opensearch.index.query.QueryBuilders;
import org.opensearch.search.aggregations.AggregationBuilders;
import org.opensearch.search.aggregations.bucket.terms.ParsedTerms;
import org.opensearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import org.opensearch.search.builder.SearchSourceBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.charset.MalformedInputException;
import java.nio.charset.UnmappableCharacterException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class PageService {
    private final PageMapper mapper;
    private final PageRepository pageRepository;
    private final ElasticClient elasticClient;

    @Value("${dir.tmp}")
    private String tmpDir;

    /**
     * 페이지 리스트 조회 (최대 1만건)
     *
     * @param vo {@link PagesVO}
     * @return pageList
     */
    public List<PagesVO> getPageList(PagesVO vo) {
        return mapper.selectAllPageList(vo);
    }

    public List<PagesVO> getPageListByType(PagesVO vo) {
        return mapper.selectAllPageListByType(vo);
    }

    /**
     * 페이지 정보 수정
     *
     * @param vo {@link PagesVO}, request {@link HttpServletRequest}
     */
    public void updatePage(PagesVO vo) {
        mapper.updatePage(vo);
        refreshPageAliasMapper();
    }

    /**
     * 페이지 정보 수정
     *
     * @param vo {@link PagesVO}, request {@link HttpServletRequest}
     */
    public void updatePageMarketingInsight(PagesVO vo) {
        mapper.updatePageMarketingInsight(vo);
        refreshPageAliasMapper();
    }

    public void insertPage(PagesVO vo) {
        mapper.insertPage(vo);
        refreshPageAliasMapper();
    }

    /**
     * Page URL Alias 목록 조회하여 메모리에 적재
     */
    @Async
    public void refreshPageAliasMapper() {
        try {
            long s0 = System.currentTimeMillis();
            log.debug("start select page list.");
            List<PagesVO> pageList = mapper.selectPageAliasList();

            // 결과 맵
            Map<String, Map<String, Map<String, String>>> resultMap = new HashMap<>();
            for (PagesVO page : pageList) {
                String packageNm = page.getPackageNm();
                String serverType = page.getServerType();

                Set<String> keySet = resultMap.keySet();

                Map<String, Map<String, String>> serverTypeMap;
                if (keySet.isEmpty()) {
                    // 빈 Map 생성
                    serverTypeMap = new HashMap<>();
                } else {
                    // 패키지 명을 가지고 와서 넣음
                    serverTypeMap = resultMap.getOrDefault(packageNm, new HashMap<>());
                }

                // {reqURL: appPageNm}
                Map<String, String> pageMap;
                Set<String> sKeySet = serverTypeMap.keySet();
                if (sKeySet.isEmpty()) {
                    pageMap = new HashMap<>();
                } else {
                    pageMap = serverTypeMap.getOrDefault(serverType, new HashMap<>());
                }

                // replace quote
                String reqUrl = page.getReqUrl();
                if (reqUrl.contains("'")) {
                    reqUrl = reqUrl.replaceAll("'", "&apos;");
                }
                if (reqUrl.contains("\"")) {
                    reqUrl = reqUrl.replaceAll("\"", "&quot;");
                }
                pageMap.put(reqUrl, page.getAppPageNm());

                serverTypeMap.put(serverType, pageMap);
                resultMap.put(packageNm, serverTypeMap);
            }

            // 화면에서 사용할 수 있도록 JSON String 으로 변경
            pageRepository.setPageAlias(resultMap);

            log.info("refresh page list. {}ms", System.currentTimeMillis() - s0);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    public String getAliasNm(String key) {
        return pageRepository.getALIAS_MAP().get(key);
    }

    public void downloadPageList(List<PagesVO> pageList,
                                 HttpServletRequest request,
                                 HttpServletResponse response) {
        PageServiceHelper.writeToResponse(pageList, request, response);
    }

    @Transactional
    public void updateBulkPageInfo(PagesVO vo) throws Exception {
        String tmpFileName = Objects.requireNonNull(vo.getFileInfo(), "fileInfo required");
        Path baseDir = Path.of(tmpDir).toAbsolutePath().normalize();
        Path tmpFilePath = baseDir.resolve(tmpFileName).normalize();
        if (!tmpFilePath.startsWith(baseDir)) {
            throw new BadRequestException("path.traversal.detected");
        }
        if (!Files.exists(tmpFilePath) || !Files.isRegularFile(tmpFilePath)) {
            throw new BadRequestException("file.not.found");
        }

        Charset charset;
        try (InputStream in = Files.newInputStream(tmpFilePath)) {
            charset = PageServiceHelper.detectCharset(in); // BOM → UTF-8 → MS949
        }

        List<PagesVO> rows = new ArrayList<>(4096);
        int recordNum = 0;

        CSVFormat format = CSVFormat.DEFAULT
                .builder()
                .setHeader(PageServiceHelper.HEADERS)               // 첫 줄 헤더 사용
                .setSkipHeaderRecord(true) // 레코드 iteration에서는 헤더 스킵
                .setIgnoreEmptyLines(true)
                .setTrim(true)
                .get();

        try (BufferedReader reader = Files.newBufferedReader(tmpFilePath, charset);
             CSVParser parser = format.parse(reader)) {

            for (CSVRecord rec : parser) {
                recordNum = (int) rec.getRecordNumber();

                // 헤더 기준 값 추출
                String type = PageServiceHelper.get(rec, "Type");
                String reqUrl = PageServiceHelper.get(rec, "URL");
                String aliasNm = PageServiceHelper.get(rec, "Alias Name");
                String description = PageServiceHelper.get(rec, "Description");
                String favorites = PageServiceHelper.get(rec, "Favorites");

                // 필수값 검증
                if (StringUtils.isBlank(type) || StringUtils.isBlank(reqUrl)) {
                    throw new FileParseException("required.blank", recordNum);
                }

                // Type 정규화: "Page"/"Native" 또는 "1"/"2" 모두 허용
                String dataType = PageServiceHelper.normalizeType(type); // "1" or "2"
                String monitoringYn = PageServiceHelper.normalizeYN(favorites); // "Y" or "N"

                PagesVO row = PagesVO.builder()
                        .packageNm(vo.getPackageNm())
                        .serverType(vo.getServerType())
                        .dataType(dataType)
                        .reqUrl(reqUrl)
                        .appPageNm(CommonUtil.nvl(aliasNm))
                        .appPageDesc(CommonUtil.nvl(description))
                        .monitoringYn(monitoringYn)
                        .landingYn("N")
                        .useYn("Y")
                        .build();

                rows.add(row);

                if (rows.size() > 100_000) { // 행 수 상한
                    throw new BadRequestException("too.many.rows");
                }
            }

            if (rows.isEmpty()) {
                throw new BadRequestException("no.data");
            }

            // DB 반영
            mapper.replacePageInfoByCsvFile(PagesVO.builder()
                    .infoList(rows)
                    .updNo(vo.getUserNo())
                    .updDt(vo.getRegDt())
                    .build());

            refreshPageAliasMapper();

        } catch (MalformedInputException | UnmappableCharacterException encEx) {
            log.warn("Encoding error at record {}: {}", recordNum, encEx.toString());
            throw new BadRequestException("encoding.mismatch");
        } catch (FileParseException e) {
            log.error("Parse error at record {}: {}", recordNum, e.getMessage());
            throw new FileParseException(e.getMessage(), recordNum);
        } catch (BadRequestException be) {
            throw be;
        } catch (Exception e) {
            log.error("CSV parse/update failed at record {}: {}", recordNum, e.getMessage(), e);
            throw new FileParseException("parse.error", recordNum);
        } finally {
            // 임시파일 삭제
            try {
                Files.deleteIfExists(tmpFilePath);
            } catch (IOException delEx) {
                log.warn("Temp file delete failed: {}", tmpFilePath, delEx);
            }
        }
    }

    public String storeTmpFile(PagesVO vo) throws IOException {
        MultipartFile file = vo.getMultipartFile();
        // 파일 업로드 되었는지 확인
        if (file == null || file.isEmpty()) {
            throw new FileNotFoundException();
        }

        // 파일 확장자 추출
        String originalFileName = file.getOriginalFilename();
        assert originalFileName != null;
        String extension = PageServiceHelper.extractFileExtension(originalFileName);
        if (!"csv".equals(extension)) {
            throw new BadRequestException("wrong.file.format." + extension);
        }

        // 안전한 파일 명 생성
        String tmpFileName = UUID.randomUUID() + "." + extension;

        // create a tmp directory
        Path baseDir = Path.of(tmpDir).toAbsolutePath().normalize();
        if (!Files.exists(baseDir)) {
            Files.createDirectories(baseDir);
        }

        Path dest = baseDir.resolve(tmpFileName).normalize();
        if (!dest.startsWith(baseDir)) {
            throw new BadRequestException("path.traversal.detected");
        }

        // store a file to server
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Can't store file: {}", e.getMessage(), e);
            throw new FileStorageException("Can't store file: " + dest);
        }

        return tmpFileName;
    }

    /**
     * 페이지 Parameter 리스트 조회
     *
     * @param vo {@link PagesVO}
     * @return pageParameterList
     */
    public List<PagesVO> getPageParameterList(PagesVO vo) {
        return mapper.selectPageParameterList(vo);
    }

    /**
     * 페이지 Parameter 등록
     *
     * @param vo {@link PagesVO}
     */
    public void insertPageParameter(PagesVO vo) {
        mapper.insertPageParameter(vo);
    }

    /**
     * 페이지 Parameter 삭제
     *
     * @param vo {@link PagesVO}
     */
    public void delPageParameter(PagesVO vo) {
        mapper.deletePageParameter(vo);
    }

    public PagesVO getPageListCountByType(PagesVO vo) {
        return mapper.countAllPageListByType(vo);
    }

    public void upsertPage(PagesVO vo) {
        mapper.upsertPage(vo);
        refreshPageAliasMapper();
    }

    public List<Map<String, Object>> getNoAliasUrlList(PagesVO vo) {
        String packageNm = vo.getPackageNm();
        String serverType = vo.getServerType();

        // alias 있는 데이터 set
        Set<String> aliased = new HashSet<>();
        try {
            Map<String, String> map = pageRepository.getPageAlias().get(packageNm).get(serverType);
            Assert.notNull(map, "map is null");
            for (Map.Entry<String, String> entry : map.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                    aliased.add(entry.getKey());
                }
            }
        } catch (Exception e) {
            log.debug(e.getMessage());
        }

        // opensearch 에서 terms 를 1000개 이상 넣으면 성능 저하 발생한다.
        if (aliased.size() > 1000) {
            throw new TooManyBucketException();
        }

        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        // 오늘 00시 ~ 현재시간
        long[] today = DateUtil.todayToTimestamp();
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte(today[0])
                .lte(today[1])
                .timeZone("Z"));

        // type 이 page인 경우 WebNav Start 데이터만 조회
        int logType;
        if (1 == vo.getType()) {
            logType = MaxyLogType.T_WebNav_Start.getDecimal();
        }
        // type 이 native 인 경우 native page start 만 조회
        else {
            logType = MaxyLogType.T_Native_App_PageStart.getDecimal();
        }
        boolQuery.filter(QueryBuilders.termQuery(Elastic.logType, logType));

        // alias 있는 데이터 제외
        boolQuery.should(QueryBuilders.boolQuery().mustNot(QueryBuilders.termsQuery(Elastic.reqUrl_raw, aliased)));
        boolQuery.minimumShouldMatch(1);

        TermsAggregationBuilder termsAggregationBuilder = AggregationBuilders.terms(Elastic.RES)
                .field(Elastic.reqUrl_raw)
                .size(20);
        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .aggregation(termsAggregationBuilder)
                .query(boolQuery)
                .size(0);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

        log.debug(searchRequest.toString());

        List<Map<String, Object>> list = new ArrayList<>();
        try {
            SearchResponse response = elasticClient.get(searchRequest);
            Assert.notNull(response, "response is null");
            ParsedTerms aggs = response.getAggregations().get(Elastic.RES);
            aggs.getBuckets().forEach(bucket ->
                    list.add(Map.of("reqUrl", bucket.getKeyAsString(), "count", bucket.getDocCount())));
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return list;
    }

    public List<String> getRelatedUrlList(DashboardVO vo) {
        List<String> list = new ArrayList<>();
        BoolQueryBuilder boolQuery = Elastic.makeBoolQueryByAppInfo(LogRequestVO.of(vo));

        // -N일 00시 ~ 현재시간
        long[] times = DateUtil.getLastNDaysRange(-7);
        boolQuery.filter(QueryBuilders.rangeQuery(Elastic.pageStartTm)
                .gte(times[0])
                .lte(times[1])
                .timeZone("Z"));

        // preUrl 이 있으면 시작 url 에 엮인 도달 url 모음 반환
        String source;
        String sourceUrlField;
        String targetUrlField;
        if (vo.getPreUrl() == null || vo.getPreUrl().isEmpty()) {
            sourceUrlField = Elastic.reqUrl_raw;
            targetUrlField = Elastic.preUrl_raw;
            source = vo.getReqUrl();
        } else {
            sourceUrlField = Elastic.preUrl_raw;
            targetUrlField = Elastic.reqUrl_raw;
            source = vo.getPreUrl();
        }
        boolQuery.filter(QueryBuilders.termQuery(sourceUrlField, source));

        TermsAggregationBuilder termsAggregationBuilder = new TermsAggregationBuilder(Elastic.RES)
                .field(targetUrlField)
                .size(100);

        SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder()
                .size(0)
                .query(boolQuery)
                .aggregation(termsAggregationBuilder);

        SearchRequest searchRequest = new SearchRequest(ElasticIndex.PAGE_LOG.getIndex() + "*")
                .source(searchSourceBuilder);

        log.debug(searchRequest.toString());

        try {
            SearchResponse response = elasticClient.get(searchRequest);
            if (response == null) {
                return Collections.emptyList();
            }

            ParsedTerms parsedTerms = response.getAggregations().get(Elastic.RES);
            parsedTerms.getBuckets().forEach(bucket -> list.add(bucket.getKeyAsString()));
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return list;
    }
}

