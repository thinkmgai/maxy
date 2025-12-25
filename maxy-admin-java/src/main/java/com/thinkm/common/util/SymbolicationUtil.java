package com.thinkm.common.util;

import com.thinkm.maxy.dto.app.dsym.AppInfoResponseDto;
import com.thinkm.maxy.dto.app.dsym.SymbolicationItemDto;
import com.thinkm.maxy.dto.app.dsym.SymbolicationResponseDto;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class SymbolicationUtil {

    // CLI 도구 캐싱을 위한 정적 변수들
    /**
     * CLI 도구 캐시 맵 - 리소스 경로를 키로, 추출된 파일 경로를 값으로 저장
     * 스레드 안전성을 위해 ConcurrentHashMap 사용
     */
    private static final Map<String, String> CLI_CACHE = new ConcurrentHashMap<>();

    // CLI 경로 상수 - 클래스패스 리소스 경로
    private static final String CLI_PATH_LINUX_X86_64 = "cli/dsym/maxy_symbolication-x86_64-unknown-linux-gnu";
    private static final String CLI_PATH_LINUX_AARCH64 = "cli/dsym/maxy_symbolication-aarch64-unknown-linux-gnu";
    private static final String CLI_PATH_MAC_APPLE = "cli/dsym/maxy_symbolication-aarch64-apple-darwin";
    private static final String CLI_PATH_MAC_INTEL = "cli/dsym/maxy_symbolication-x86_64-apple-darwin";
    private static final String CLI_PATH_WINDOWS = "cli/dsym/maxy_symbolication-x86_64-pc-windows-gnu.exe";

    /**
     * OS와 아키텍처에 따라 적절한 CLI 리소스 경로를 결정
     *
     * @return CLI 리소스 경로
     */
    public static String determineCliResourcePath() {
        String osName = System.getProperty("os.name").toLowerCase();
        String osArch = System.getProperty("os.arch").toLowerCase();
        String resourcePath;

        if (osName.contains("mac")) {
            // Mac의 경우 아키텍처에 따라 구분
            if (osArch.contains("aarch64") || osArch.contains("arm64")) {
                // Apple Silicon (M1, M2 등)
                resourcePath = CLI_PATH_MAC_APPLE;
            } else {
                // Intel Mac
                resourcePath = CLI_PATH_MAC_INTEL;
            }
        } else if (osName.contains("win")) {
            resourcePath = CLI_PATH_WINDOWS;
        } else {
            // Linux의 경우 아키텍처에 따라 구분
            if (osArch.contains("aarch64") || osArch.contains("arm64")) {
                // ARM64 Linux
                resourcePath = CLI_PATH_LINUX_AARCH64;
            } else {
                // x86_64 Linux (기본값)
                resourcePath = CLI_PATH_LINUX_X86_64;
            }
        }

        return resourcePath;
    }

    /**
     * ios App 기본 정보[appName, UUID, appVersion, appBuildVersion] 추출
     *
     * @param dsymPath DSYM 파일
     * @returns AppInfoResponse
     */
    public AppInfoResponseDto getAppInfo(String dsymPath) {
        Process process = null;
        BufferedReader outputReader = null;
        BufferedReader errorReader = null;

        try {
            // CLI 경로 결정 및 추출
            String resourcePath = determineCliResourcePath();
            String cliPath = extractCliToolToTempFile(resourcePath);

            ProcessBuilder pb = new ProcessBuilder(cliPath, "-d", dsymPath, "-i");
            pb.redirectErrorStream(false); // 에러 스트림을 별도로 처리
            process = pb.start();

            // 출력 스트림 읽기
            outputReader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;

            while ((line = outputReader.readLine()) != null) {
                output.append(line).append("\n");
            }

            // 에러 스트림 읽기
            errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));
            StringBuilder errorOutput = new StringBuilder();
            while ((line = errorReader.readLine()) != null) {
                errorOutput.append(line).append("\n");
            }

            // 프로세스 완료 대기 (30초 타임아웃)
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);

            if (!finished) {
                // 타임아웃 발생 시 프로세스 강제 종료
                process.destroyForcibly();
                return new AppInfoResponseDto(500, "CLI 프로세스 타임아웃 (30초)");
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                String errorMessage = errorOutput.length() > 0 ? errorOutput.toString().trim() : "CLI 프로세스 실행 실패";
                return new AppInfoResponseDto(500, "CLI 프로세스 실행 실패 (exit code: " + exitCode + "): " + errorMessage);
            }

            // JSON 응답 파싱
            String jsonResponse = output.toString().trim();
            if (jsonResponse.isEmpty()) {
                return new AppInfoResponseDto(500, "CLI 프로세스에서 응답을 받지 못했습니다");
            }

            return parseAppInfoResponse(jsonResponse);

        } catch (Exception e) {
            return new AppInfoResponseDto(500, "CLI 실행 중 오류 발생: " + e.getMessage());
        } finally {
            // 리소스 정리
            try {
                if (outputReader != null) outputReader.close();
                if (errorReader != null) errorReader.close();
                if (process != null && process.isAlive()) {
                    process.destroyForcibly();
                }
            } catch (Exception e) {
                // 정리 중 오류는 무시
            }
        }
    }

    /**
     * DSYM 심볼리케이션
     * @param dsymPath DSYM 파일
     * @param crashLog Crash log
     * @param appName DSYM app Name
     * @returns SymbolicationResponse
     */
    public SymbolicationResponseDto getSymbolication(String dsymPath, String crashLog, String appName) {
        try {
            // CLI 경로 결정 및 추출
            String resourcePath = determineCliResourcePath();
            String cliPath = extractCliToolToTempFile(resourcePath);

            List<String> crashLines = Arrays.asList(crashLog.split("\n"));
            List<String[]> allThreadTraces = extractAllThreadTraces(crashLines, appName);
            String reasonAddress = extractReasonAddress(crashLines);
            Map<String, String> binaryImages = extractBinaryImages(crashLines);

            Map<String, List<String[]>> groupedTraces = new LinkedHashMap<>();

            if (!"NotFound".equals(reasonAddress)) {
                groupedTraces.computeIfAbsent(appName, k -> new ArrayList<>())
                        .add(new String[]{reasonAddress, "-"});
            }

            for (String[] trace : allThreadTraces) {
                String binaryName = trace[2];
                groupedTraces.computeIfAbsent(binaryName, k -> new ArrayList<>())
                        .add(new String[]{trace[0], trace[1]});
            }

            String jsonInput = createArgsByJson(groupedTraces, binaryImages);

            // 이스케이프 처리 @@ Windows에서만 실행 @@
            if (System.getProperty("os.name").toLowerCase().contains("windows")) {
                jsonInput = escapeJson(jsonInput);
            }

            ProcessBuilder pb = new ProcessBuilder(
                    cliPath,
                    "-d", dsymPath,
                    "-j", jsonInput
            );
            pb.redirectErrorStream(false); // 에러 스트림을 별도로 처리
            Process process = pb.start();

            BufferedReader outputReader = null;
            BufferedReader errorReader = null;

            try {
                // 출력 스트림 읽기
                outputReader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                StringBuilder output = new StringBuilder();
                String line;

                while ((line = outputReader.readLine()) != null) {
                    output.append(line).append("\n");
                }

                // 에러 스트림 읽기
                errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));
                StringBuilder errorOutput = new StringBuilder();
                while ((line = errorReader.readLine()) != null) {
                    errorOutput.append(line).append("\n");
                }

                // 프로세스 완료 대기 (30초 타임아웃)
                boolean finished = process.waitFor(30, TimeUnit.SECONDS);

                if (!finished) {
                    // 타임아웃 발생 시 프로세스 강제 종료
                    process.destroyForcibly();
                    return new SymbolicationResponseDto(500, "CLI 프로세스 타임아웃 (30초)");
                }

                int exitCode = process.exitValue();
                if (exitCode != 0) {
                    String errorMessage = errorOutput.length() > 0 ? errorOutput.toString().trim() : "CLI 프로세스 실행 실패";
                    return new SymbolicationResponseDto(500, "CLI 프로세스 실행 실패 (exit code: " + exitCode + "): " + errorMessage);
                }

                String jsonResponse = output.toString().trim();

                if (jsonResponse.isEmpty()) {
                    return new SymbolicationResponseDto(500, "CLI 프로세스에서 응답을 받지 못했습니다");
                }

                return parseSymbolicationResponse(jsonResponse);

            } finally {
                // 리소스 정리
                try {
                    if (outputReader != null) outputReader.close();
                    if (errorReader != null) errorReader.close();
                    if (process != null && process.isAlive()) {
                        process.destroyForcibly();
                    }
                } catch (Exception cleanupException) {
                    // 정리 중 오류는 무시
                }
            }

        } catch (Exception e) {
            return new SymbolicationResponseDto(500, "CLI 실행 중 오류 발생: " + e.getMessage());
        }
    }


    /**
     * DSYM 파일 App 정보 응답 추출
     * @param jsonResponse json 형식의 String
     * @return AppInfoResponse app 정보
     */
    private AppInfoResponseDto parseAppInfoResponse(String jsonResponse) {
        try {
            if (jsonResponse.contains("\"status\": 200")) {
                String appName = extractJsonValue(jsonResponse, "appName");
                String uuid = extractJsonValue(jsonResponse, "uuid");
                String appBuildVersion = extractJsonValue(jsonResponse, "appBuildVersion");
                String appVersion = extractJsonValue(jsonResponse, "appVersion");

                return new AppInfoResponseDto(200, appName, uuid, appBuildVersion, appVersion);
            } else {
                String errorMessage = extractJsonValue(jsonResponse, "result");
                return new AppInfoResponseDto(500, errorMessage != null ? errorMessage : "Empty");
            }
        } catch (Exception e) {
            return new AppInfoResponseDto(500, "JSON parsing error: " + e.getMessage());
        }
    }

    /**
     * 충돌 주소 추출
     * @param lines Crash log
     * @param appName Main App name
     * @return List<String[]> 충돌 주소 리스트
     */
    private List<String[]> extractAllThreadTraces(List<String> lines, String appName) {
        List<String[]> traces = new ArrayList<>();
        boolean inAllThreadTrace = false;

        Pattern appTracePattern = Pattern.compile("(\\d+)\\s+" + Pattern.quote(appName) + "\\s+0x([0-9a-fA-F]+)\\s+");
        Pattern allTracePattern = Pattern.compile("(\\d+)\\s+(\\S+)\\s+0x([0-9a-fA-F]+)\\s+");

        for (String line : lines) {
            if (line.contains("==========AllThreadTrace")) {
                inAllThreadTrace = true;
                continue;
            }

            if (line.contains("==========BinaryImages")) {
                inAllThreadTrace = false;
                break;
            }

            if (inAllThreadTrace) {
                Matcher appMatcher = appTracePattern.matcher(line);
                if (appMatcher.find()) {
                    String stackNumber = appMatcher.group(1);
                    String address = "0x" + appMatcher.group(2);
                    traces.add(new String[]{address, stackNumber, appName, "primary"});
                } else {
                    Matcher allMatcher = allTracePattern.matcher(line);
                    if (allMatcher.find()) {
                        String stackNumber = allMatcher.group(1);
                        String binaryName = allMatcher.group(2);
                        String address = "0x" + allMatcher.group(3);
                        traces.add(new String[]{address, stackNumber, binaryName, "secondary"});
                    }
                }
            }
        }

        return traces;
    }

    /**
     * 첫라인 충돌 주소 추출
     * @param lines Crash log
     * @return String 형식의 충돌 주소
     */
    private String extractReasonAddress(List<String> lines) {
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.startsWith("Reason:")) {
                if (i > 0) {
                    String prevLine = lines.get(i - 1);
                    Pattern addressPattern = Pattern.compile("0x([0-9a-fA-F]+)");
                    Matcher matcher = addressPattern.matcher(prevLine);
                    if (matcher.find()) {
                        return "0x" + matcher.group(1);
                    }
                }
            }
        }

        return "NotFound";
    }

    /**
     * 로드 주소 추출
     * @param lines Crash log
     * @return Map<String, String> 형식의 로드 주소
     */
    private Map<String, String> extractBinaryImages(List<String> lines) {
        Map<String, String> binaryImages = new LinkedHashMap<>();
        boolean inBinaryImages = false;

        Pattern binaryImagePattern = Pattern.compile("(0x[0-9a-fA-F]+)\\s+-\\s+(.+)");

        for (String line : lines) {
            if (line.contains("==========BinaryImages")) {
                inBinaryImages = true;
                continue;
            }

            if (inBinaryImages) {
                if (line.trim().isEmpty()) {
                    break;
                }

                Matcher matcher = binaryImagePattern.matcher(line);
                if (matcher.find()) {
                    String loadAddress = matcher.group(1);
                    String libraryPath = matcher.group(2);
                    String libraryName = new File(libraryPath).getName();
                    binaryImages.put(libraryName, loadAddress);
                }
            }
        }

        return binaryImages;
    }

    /**
     * 안전하게 JSON을 전달하기 위한 이스케이프 처리
     * @param json 원본 JSON 문자열
     * @return 이스케이프 처리된 JSON 문자열
     */
    private String escapeJson(String json) {
        if (json == null || json.isEmpty()) {
            return json;
        }

        // 1. 백슬래시를 먼저 이스케이프 (다른 이스케이프 처리 전에 수행)
        String escaped = json.replace("\\", "\\\\");
        // 2. 따옴표 이스케이프
        escaped = escaped.replace("\"", "\\\"");
        // 3. 전체 문자열을 따옴표로 감싸기
        escaped = "\"" + escaped + "\"";

        return escaped;
    }

    /**
     * Cli 애플리케이션에 넘기는 json 인자 생성
     * @param groupedTraces 충돌 주소
     * @param binaryImages 로드 주소
     * @return String 형식의 json 파라미터
     */
    private String createArgsByJson(Map<String, List<String[]>> groupedTraces, Map<String, String> binaryImages) {
        StringBuilder jsonBuilder = new StringBuilder();
        jsonBuilder.append("[");

        boolean firstBinary = true;
        for (Map.Entry<String, List<String[]>> entry : groupedTraces.entrySet()) {
            if (!firstBinary) {
                jsonBuilder.append(",");
            }
            firstBinary = false;

            String binaryName = entry.getKey();
            List<String[]> traces = entry.getValue();

            jsonBuilder.append("{");
            jsonBuilder.append("\"appName\": \"").append(binaryName).append("\",");

            String loadMemory = binaryImages.get(binaryName);
            if (loadMemory == null) {
                loadMemory = "0x0";
            }
            jsonBuilder.append("\"loadMemory\": \"").append(loadMemory).append("\",");

            jsonBuilder.append("\"crashMemory\": [");

            for (int i = 0; i < traces.size(); i++) {
                String[] trace = traces.get(i);
                jsonBuilder.append("{\"stackFrameNumber\": \"").append(trace[1]).append("\", ");
                jsonBuilder.append("\"address\": \"").append(trace[0]).append("\"}");
                if (i < traces.size() - 1) {
                    jsonBuilder.append(",");
                }
            }

            jsonBuilder.append("]}");
        }

        jsonBuilder.append("]");

        return jsonBuilder.toString();
    }

    /**
     * 심볼리케이션 응답 가공 처리
     * @param jsonResponse 심볼리케이션 응답 - json형식의 String
     * @return SymbolicationResponse
     */
    private SymbolicationResponseDto parseSymbolicationResponse(String jsonResponse) {
        try {
            List<SymbolicationItemDto> items = new ArrayList<>();

            if (jsonResponse.contains("\"status\": 200")) {
                String itemsSection = extractJsonArray(jsonResponse, "items");
                String[] itemStrings = splitJsonObjects(itemsSection);

                for (String itemStr : itemStrings) {
                    if (itemStr.trim().isEmpty()) {
                        continue;
                    }

                    String appName = extractJsonValue(itemStr, "app_name");
                    String stackFrameNumber = extractJsonValue(itemStr, "stack_frame_number");
                    String crashMemory = extractJsonValue(itemStr, "crash_memory");
                    String exceptionName = extractJsonValue(itemStr, "exception_name");
                    String exceptionPath = extractJsonValue(itemStr, "exception_path");
                    String exceptionLine = extractJsonValue(itemStr, "exception_line");
                    items.add(new SymbolicationItemDto(appName, stackFrameNumber, crashMemory,
                            exceptionName, exceptionPath, exceptionLine));
                }

                return new SymbolicationResponseDto(200, items);
            } else {
                return new SymbolicationResponseDto(500, "No Data");
            }
        } catch (Exception e) {
            return new SymbolicationResponseDto(500, e.getMessage());
        }
    }

    /**
     * 심볼화 응답 "items" json Array 추출
     * @param json
     * @param key 추출할 키값
     * @return array String 형태로 추출
     */
    private String extractJsonArray(String json, String key) {
        String startPattern = "\"" + key + "\"\\s*:\\s*\\[";
        Pattern startRegex = Pattern.compile(startPattern);
        Matcher startMatcher = startRegex.matcher(json);

        if (startMatcher.find()) {
            int startIndex = startMatcher.end();

            int bracketCount = 1;
            int endIndex = startIndex;
            boolean inString = false;
            boolean escapeNext = false;

            for (int i = startIndex; i < json.length() && bracketCount > 0; i++) {
                char c = json.charAt(i);

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (c == '\\') {
                    escapeNext = true;
                    continue;
                }

                if (c == '"') {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (c == '[') {
                        bracketCount++;
                    } else if (c == ']') {
                        bracketCount--;
                        if (bracketCount == 0) {
                            endIndex = i;
                            break;
                        }
                    }
                }
            }

            if (bracketCount == 0) {
                String result = json.substring(startIndex, endIndex);
                return result;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    /**
     * 심볼화 응답 "items" json Array 추출
     * @param jsonArray
     * @return item 객체 추출
     */
    private String[] splitJsonObjects(String jsonArray) {
        List<String> objects = new ArrayList<>();
        int braceCount = 0;
        StringBuilder currentObject = new StringBuilder();
        boolean inString = false;
        boolean escapeNext = false;

        for (int i = 0; i < jsonArray.length(); i++) {
            char c = jsonArray.charAt(i);

            if (escapeNext) {
                currentObject.append(c);
                escapeNext = false;
                continue;
            }

            if (c == '\\') {
                escapeNext = true;
                currentObject.append(c);
                continue;
            }

            if (c == '"') {
                inString = !inString;
            }

            if (!inString) {
                if (c == '{') {
                    braceCount++;
                } else if (c == '}') {
                    braceCount--;
                }
            }

            currentObject.append(c);

            if (!inString && braceCount == 0 && c == '}') {
                String objStr = currentObject.toString().trim();
                objects.add(objStr);
                currentObject = new StringBuilder();
            }
        }

        if (currentObject.length() > 0) {
            String remaining = currentObject.toString().trim();
            if (!remaining.isEmpty()) {
                objects.add(remaining);
            }
        }

        return objects.toArray(new String[0]);
    }

    /**
     * 심볼화 응답 "item" 필드들 추출
     * @param json String 형태의 json
     * @param key 추출할 키값
     * @return 추출된 Value
     */
    private String extractJsonValue(String json, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]*?)\"";
        Pattern regex = Pattern.compile(pattern);
        Matcher matcher = regex.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    /**
     * 리소스에서 CLI 도구를 캐시된 임시 파일로 추출
     * 
     * @param resourcePath 리소스 경로
     * @return 추출된 CLI 도구의 파일 경로
     * @throws IOException 파일 추출 중 오류 발생 시
     */
    public static synchronized String extractCliToolToTempFile(String resourcePath) throws IOException {
        // 캐시에서 확인
        String cachedPath = CLI_CACHE.get(resourcePath);
        if (cachedPath != null && new File(cachedPath).exists()) {
            log.debug("CLI 도구 캐시 사용: {}", cachedPath);
            return cachedPath;
        }

        // 새로 추출
        String newCliPath = extractCliToolToPersistentFile(resourcePath);
        CLI_CACHE.put(resourcePath, newCliPath);
        log.info("CLI 도구 새로 추출 및 캐시 저장: {} -> {}", resourcePath, newCliPath);
        return newCliPath;
    }

    /**
     * 리소스에서 CLI 도구를 영구적인 임시 파일로 추출
     * 애플리케이션 종료 시까지 유지되는 임시 파일 생성
     * 
     * @param resourcePath 리소스 경로
     * @return 추출된 CLI 도구의 파일 경로
     * @throws IOException 파일 추출 중 오류 발생 시
     */
    private static String extractCliToolToPersistentFile(String resourcePath) throws IOException {
        // 클래스로더를 통해 리소스 가져오기
        InputStream inputStream = SymbolicationUtil.class.getClassLoader().getResourceAsStream(resourcePath);
        if (inputStream == null) {
            throw new IOException("리소스를 찾을 수 없습니다: " + resourcePath);
        }

        try {
            // 시스템 임시 디렉토리에 애플리케이션별 하위 디렉토리 생성
            Path tempDir = Paths.get(System.getProperty("java.io.tmpdir"), "maxy-cli");
            Files.createDirectories(tempDir);

            String fileName = new File(resourcePath).getName();
            Path tempFile = tempDir.resolve(fileName);

            // 파일이 이미 존재하면 재사용
            if (Files.exists(tempFile)) {
                File file = tempFile.toFile();
                file.setExecutable(true);
                log.debug("기존 CLI 도구 파일 재사용: {}", tempFile);
                return tempFile.toString();
            }

            // 리소스를 파일로 복사
            Files.copy(inputStream, tempFile, StandardCopyOption.REPLACE_EXISTING);

            // 실행 권한 부여 (Windows에서는 효과 없음)
            File file = tempFile.toFile();
            file.setExecutable(true);

            // JVM 종료 시 정리되도록 설정
            file.deleteOnExit();

            log.debug("새로운 CLI 도구 파일 생성: {}", tempFile);
            return tempFile.toString();
        } finally {
            inputStream.close();
        }
    }

    /**
     * CLI 도구 캐시 정리
     * 필요시 수동으로 호출하여 캐시를 정리할 수 있음
     */
    public static void cleanupCliCache() {
        log.info("CLI 도구 캐시 정리 시작...");

        // 캐시된 모든 CLI 파일 삭제 시도
        CLI_CACHE.values().forEach(cliPath -> {
            try {
                Path path = Paths.get(cliPath);
                if (Files.exists(path)) {
                    Files.deleteIfExists(path);
                    log.debug("CLI 도구 파일 삭제 완료: {}", cliPath);
                }
            } catch (Exception e) {
                log.warn("CLI 도구 파일 삭제 실패: {} - {}", cliPath, e.getMessage());
            }
        });

        // 캐시 맵 정리
        int cacheSize = CLI_CACHE.size();
        CLI_CACHE.clear();

        // 임시 디렉토리 정리 시도
        try {
            Path tempDir = Paths.get(System.getProperty("java.io.tmpdir"), "maxy-cli");
            if (Files.exists(tempDir)) {
                Files.walk(tempDir)
                        .sorted((a, b) -> b.compareTo(a)) // 파일을 먼저, 디렉토리를 나중에 삭제하기 위해 역순 정렬
                        .forEach(path -> {
                            try {
                                Files.deleteIfExists(path);
                            } catch (Exception e) {
                                log.debug("임시 파일 삭제 실패: {} - {}", path, e.getMessage());
                            }
                        });
                log.debug("CLI 임시 디렉토리 정리 완료: {}", tempDir);
            }
        } catch (Exception e) {
            log.warn("CLI 임시 디렉토리 정리 중 오류 발생: {}", e.getMessage());
        }

        log.info("CLI 도구 캐시 정리 완료 - 정리된 캐시 항목 수: {}", cacheSize);
    }
}
