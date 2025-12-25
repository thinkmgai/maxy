package com.thinkm.maxy.service.app;

import com.google.common.reflect.TypeToken;
import com.google.gson.JsonSyntaxException;
import com.google.gson.internal.LinkedTreeMap;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.FileStorageException;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.mapper.ObfuscationMapper;
import com.thinkm.maxy.repository.RetraceRepository;
import com.thinkm.maxy.vo.ObfuscationVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
public class ObfuscationService {
    private static final Type type = new TypeToken<Map<String, Object>>() {
    }.getType();
    @Resource
    private final ObfuscationMapper mapper;
    @Resource
    private final RetraceRepository retraceRepository;
    @Value("${dir.obfuscation}")
    private String OBF_DIR = "obf";

    /**
     * 파일 임시 저장
     *
     * @param vo 파일 정보
     * @return 파일명
     */
    public String storeFile(ObfuscationVO vo) throws IOException {
        MultipartFile file = vo.getMultipartFile();
        // 파일 업로드 되었는지 확인
        if (file == null || file.isEmpty()) {
            throw new FileNotFoundException();
        }

        // 파일 확장자 추출
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) {
            throw new IOException("err.no.file.name");
        }
        String tmpFileName = UUID.randomUUID() + ".obf";
        Path tmpFilePath = Paths.get(OBF_DIR + File.separator + tmpFileName);

        // store file to server
        try {
            Files.createDirectories(tmpFilePath.getParent());
            Files.copy(file.getInputStream(), tmpFilePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error(e.getMessage(), e);
            throw new FileStorageException("Can't store file: " + tmpFilePath);
        }

        return tmpFileName;
    }

    /**
     * 업로드 된 룰 정보 DB에 적재
     *
     * @param vo 룰 정보
     */
    public void saveRuleInfo(ObfuscationVO vo) {
        String fileName = vo.getFileName();
        Path filePath = Paths.get(OBF_DIR + File.separator + fileName);
        try {
            switch (vo.getObfType()) {
                case PROGUARD -> saveFileInfo(vo, filePath);
                case ARXAN -> saveJsonInfo(vo, filePath);
                default -> saveSplitTextByLine(vo, filePath);
            }
            refreshRuleList();
        } catch (IOException e) {
            log.error(e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private void saveJsonInfo(ObfuscationVO vo, Path filePath) {
        final String basicKey = String.join(":",
                vo.getPackageNm(), vo.getServerType(), vo.getOsTypeVal(), vo.getAppVer(), vo.getAppBuildNum());
        AtomicReference<String> debugKey = new AtomicReference<>("");
        try {
            String text = Files.readString(filePath, StandardCharsets.UTF_8);
            if (!text.isEmpty()) {
                // json parsing error 처리: JsonSyntaxException
                Map<String, Object> json = JsonUtil.fromJson(text, type);
                if (json.isEmpty()) {
                    return;
                }

                Map<String, ObfuscationVO> tmpSet = new ConcurrentHashMap<>();
                json.keySet().stream().parallel().forEach(key -> {
                    try {
                        Object o = json.get(key);
                        if (o instanceof LinkedTreeMap<?, ?>) {
                            // 빈 값
                            return;
                        } else if (!(o instanceof List<?>)) {
                            throw new Exception("not expect type: " + o.getClass().getName());
                        }
                        List<Object> tmpList = (List<Object>) json.get(key);

                        // 비어있으면 continue
                        if (tmpList.isEmpty()) {
                            return;
                        }

                        // string 으로 들어온 키 값을 enum 에 등록된 type 과 매핑
                        ObfuscationVO.Type type = switch (key.toUpperCase()) {
                            case "CLASSES" -> ObfuscationVO.Type.CLASSES;
                            case "FIELDS" -> ObfuscationVO.Type.FIELDS;
                            case "METHODS" -> ObfuscationVO.Type.METHODS;
                            case "INLININGMAP" -> ObfuscationVO.Type.INLININGMAP;
                            default -> null;
                        };

                        // enum 에 등록되지 않는 type 은 continue
                        if (type == null) {
                            log.warn("Unexpected value: {}", key);
                            return;
                        }

                        for (Object tmp : tmpList) {
                            LinkedTreeMap<String, String> tmpMap = (LinkedTreeMap<String, String>) tmp;
                            // 어차피 한 줄에 1개씩 있으므로 for 문은 의미가 없긴 함
                            for (String k : tmpMap.keySet()) {
                                ObfuscationVO t = ObfuscationVO.builder()
                                        .type(type)
                                        .originalString(tmpMap.get(k))
                                        .obfuscationString(k)
                                        .build();
                                if ("".equalsIgnoreCase(t.getOriginalString())) {
                                    continue;
                                }

                                // basicKey:  packageNm:serverType:osType:appVer:appBuildNum
                                String pKey = String.join(":", basicKey, t.getType().name(), t.getOriginalString(), t.getObfuscationString());

                                // 에러 시 디버깅용
                                if ("".equalsIgnoreCase(debugKey.get())) {
                                    debugKey.set(pKey);
                                }
                                tmpSet.put(pKey, t);
                            }
                        }
                    } catch (Exception e) {
                        Object o = json.get(key);
                        log.error(o.toString());
                        log.error(e.getMessage(), e);
                    }
                });

                if (!tmpSet.isEmpty()) {
                    List<ObfuscationVO> list = Collections.synchronizedList(new ArrayList<>());
                    tmpSet.keySet().stream().parallel().forEach(t -> list.add(tmpSet.get(t)));
                    vo.setInsertList(list);
                    mapper.insertObfuscationRuleInfo(vo);
                }
            }
        } catch (ClassCastException | JsonSyntaxException e) {
            log.error(e.getMessage(), e);
            log.warn("basicKey: {}", basicKey);
            log.warn("errorKey: {}", basicKey);
            throw new BadRequestException(ReturnCode.ERR_WRONG_JSON);
        } catch (DuplicateKeyException e) {
            log.error(e.getMessage(), e);
            log.warn("basicKey: {}", basicKey);
            throw new BadRequestException(ReturnCode.ERR_DUPL_VALUE);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            log.warn("basicKey: {}", basicKey);
        }

    }

    /**
     * 파일 저장 정보를 DB에 적재
     *
     * @param vo       {@link ObfuscationVO}
     * @param filePath 파일 경로
     */
    private void saveFileInfo(ObfuscationVO vo, Path filePath) {
        String path = filePath.toAbsolutePath().toString();
        vo.setObfFullText(path);
        vo.setType(ObfuscationVO.Type.FILE);
        mapper.insertObfuscationRuleInfoWithFullText(vo);
    }

    /**
     * rule 파일 전문 저장
     *
     * @param vo       ObfuscationVO
     * @param filePath filePath
     */
    @SuppressWarnings("unused")
    private void saveFullText(ObfuscationVO vo, Path filePath) throws IOException {
        String text = Files.readString(filePath, StandardCharsets.UTF_8);
        if (!text.isEmpty()) {
            vo.setObfFullText(text);
            vo.setType(ObfuscationVO.Type.FULLTEXT);
            mapper.insertObfuscationRuleInfoWithFullText(vo);
        }
    }

    private void saveSplitTextByLine(ObfuscationVO vo, Path filePath) throws IOException {
        Pattern pattern = Pattern.compile(":\\s");
        List<ObfuscationVO> list = new ArrayList<>();
        List<String> lines = Files.readAllLines(filePath, StandardCharsets.UTF_8);
        for (String line : lines) {
            if (line.startsWith("#") || line.trim().isEmpty()) {
                continue; // Skip comments and empty lines
            }
            String[] parts = line.split(" -> ");
            if (parts.length == 2) {
                ObfuscationVO.Type type;
                Matcher matcher = pattern.matcher(parts[0]);
                if (matcher.find()) {
                    if (parts[0].indexOf("(") > 0) {
                        type = ObfuscationVO.Type.METHODS;
                    } else {
                        type = ObfuscationVO.Type.FIELDS;
                    }
                } else {
                    type = ObfuscationVO.Type.CLASSES;
                }
                ObfuscationVO tmp = ObfuscationVO.builder()
                        .type(type)
                        .originalString(parts[0])
                        .obfuscationString(parts[1])
                        .build();
                list.add(tmp);
            }

        }

        if (!list.isEmpty()) {
            vo.setInsertList(list);
            mapper.insertObfuscationRuleInfo(vo);
        }
    }

    public void deleteTmpFile(ObfuscationVO vo) {
        String fileName = vo.getFileName();
        Path filePath = Paths.get(OBF_DIR + File.separator + fileName);

        try {
            log.debug("[DELETE FILE]: {}", filePath);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 난독화 Rule 목록 조회하여 메모리에 적재
     */
    @Async
    public void refreshRuleList() {
        long s0 = System.currentTimeMillis();
        log.debug("start rule list.");
        // RULE_INFO_MAP: full text 컬럼이 있는 경우에만 넣는다.
        List<ObfuscationVO> ruleInfoList = mapper.selectAllObfuscationRuleInfoList();
        for (ObfuscationVO item : ruleInfoList) {
            String key = item.key();
            if (item.getObfFullText() != null && !item.getObfFullText().isEmpty()) {
                retraceRepository.getRULE_INFO_MAP().put(key, item.getObfFullText());
            }
            retraceRepository.getOBF_TYPE_MAP().put(key, item.getObfType());
        }

        // RULE_MAP
        List<ObfuscationVO> ruleList = mapper.selectAllObfuscationRuleList();
        for (ObfuscationVO item : ruleList) {
            String key = item.key();
            @SuppressWarnings("MismatchedQueryAndUpdateOfCollection")
            List<Map<String, String>> tmp = retraceRepository.getRULE_MAP().getOrDefault(key, new ArrayList<>());
            tmp.add(Map.of(item.getObfuscationString(), item.getOriginalString()));
            retraceRepository.getRULE_MAP().put(key, tmp);
        }
        for (String key : retraceRepository.getRULE_MAP().keySet()) {
            List<Map<String, String>> list = retraceRepository.getRULE_MAP().get(key);
            list.sort(Comparator.comparing((Map<String, String> cp) -> {
                int l = 0;
                for (String str : cp.keySet()) {
                    l = str.length();
                }
                return l;
            }).reversed());
        }
        log.info("refresh rule list. {}ms", System.currentTimeMillis() - s0);
    }

    public List<ObfuscationVO> getRuleList(ObfuscationVO vo) {
        return mapper.selectObfuscationRuleList(vo);
    }

    public void deleteRuleList(ObfuscationVO vo) {
        for (ObfuscationVO item : vo.getDeleteList()) {
            mapper.deleteObfuscationRuleInfo(item);
            if (item.getType().equals(ObfuscationVO.Type.FILE)
                && item.getObfFullText() != null
                && item.getObfFullText().endsWith(".obf")) {
                try {
                    Files.deleteIfExists(Path.of(item.getObfFullText()));
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
        }

        refreshRuleList();
    }

    /**
     * 룰 정보 중복체크
     *
     * @param vo 룰 정보
     * @return 중복: true, 없음: false
     */
    public boolean isRuleInfo(ObfuscationVO vo) {
        int cnt = mapper.countObfuscationRuleInfoList(vo);
        if (cnt > 0) {
            log.info("count: {}", cnt);
        }
        return cnt > 0;
    }
}
