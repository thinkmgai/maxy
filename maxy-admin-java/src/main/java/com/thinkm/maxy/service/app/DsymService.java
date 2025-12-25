package com.thinkm.maxy.service.app;

import com.thinkm.common.util.DateUtil;
import com.thinkm.common.util.SymbolicationUtil;
import com.thinkm.maxy.dto.app.dsym.AppInfoResponseDto;
import com.thinkm.maxy.mapper.DsymFileInfoMapper;
import com.thinkm.maxy.vo.DsymFileInfoVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.GZIPInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class DsymService {

    @Resource
    private final DsymFileInfoMapper dsymFileInfoMapper;

    @Value("${dir.obfuscation}")
    private String OBF_DIR = "obf";

    /**
     * 파일 업로드 최대 크기
     */
    @Value("${server.file.max-size:20M}")
    private String MAX_FILE_SIZE;

    /**
     * 업로드 파일 검증
     * 파일 크기, MIME 타입, 파일 시그니처를 검증
     *
     * @param file 업로드된 파일
     * @throws IllegalArgumentException 검증 실패 시
     * @throws IOException 파일 읽기 오류 시
     */
    private void validateUploadFile(MultipartFile file) throws IOException {
        // 파일 크기 제한 검증
        if (file.getSize() > parseToBytes(MAX_FILE_SIZE)) {
            throw new IllegalArgumentException("File size is too large. Maximum " + MAX_FILE_SIZE + "B upload allowed.");
        }

        // MIME 타입 검증 (ZIP 및 GZ 형식 지원)
        String contentType = file.getContentType();
        if (!"application/zip".equals(contentType) && 
            !"application/x-zip-compressed".equals(contentType) &&
            !"application/gzip".equals(contentType) &&
            !"application/x-gzip".equals(contentType) &&
            !"application/octet-stream".equals(contentType)) {
            throw new IllegalArgumentException("Unsupported file format. Only ZIP or GZ files can be uploaded.");
        }

        // 파일 확장자 확인을 통한 압축 형식 판단
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) {
            throw new IllegalArgumentException("File name is missing.");
        }

        String lowerFileName = originalFileName.toLowerCase();
        boolean isZipFile = lowerFileName.endsWith(".zip");
        boolean isGzFile = lowerFileName.endsWith(".gz") || lowerFileName.endsWith(".gzip");

        if (!isZipFile && !isGzFile) {
            throw new IllegalArgumentException("Unsupported file extension. Only .zip, .gz, .gzip files can be uploaded.");
        }

        // 파일 시그니처 검증 (ZIP 및 GZ 파일 매직 넘버)
        try (InputStream inputStream = file.getInputStream()) {
            byte[] header = new byte[4];
            int bytesRead = inputStream.read(header);

            if (bytesRead < 2) {
                throw new IllegalArgumentException("File is too small or corrupted.");
            }

            if (isZipFile) {
                // ZIP 파일 시그니처: 50 4B 03 04 (PK..) 또는 50 4B 05 06 (빈 ZIP) 또는 50 4B 07 08 (spanned ZIP)
                if (bytesRead < 4 || !((header[0] & 0xFF) == 0x50 && (header[1] & 0xFF) == 0x4B && 
                      ((header[2] & 0xFF) == 0x03 || (header[2] & 0xFF) == 0x05 || (header[2] & 0xFF) == 0x07))) {
                    throw new IllegalArgumentException("Invalid ZIP file.");
                }
            } else if (isGzFile) {
                // GZ 파일 시그니처: 1F 8B (GZIP 매직 넘버)
                if (!((header[0] & 0xFF) == 0x1F && (header[1] & 0xFF) == 0x8B)) {
                    throw new IllegalArgumentException("Invalid GZ file.");
                }
            }
        }
    }

    /**
     * 압축 파일 업로드 및 처리
     * 
     * @param file 업로드된 압축 파일
     * @param packageNm 패키지 이름
     * @param serverType 서버 타입
     * @return 앱 정보 응답 객체와 파일 정보가 포함된 Map
     * @throws IOException 파일 처리 중 오류 발생 시
     */
    public Map<String, Object> uploadAndProcessArchive(MultipartFile file, String packageNm, String serverType) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new FileNotFoundException("No uploaded file found.");
        }

        // 파일 검증
        validateUploadFile(file);

        // 파일 확장자 확인
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) {
            throw new IOException("File name is missing.");
        }

        // 고유 디렉토리 이름 생성 (UUID 사용)
        String uniqueDirName = UUID.randomUUID().toString();

        // DSYM 저장 경로 생성 (패키지명/서버타입/UUID 구조로 저장)
        Path dsymDir = Paths.get(OBF_DIR + File.separator + "dsym" + File.separator + packageNm + serverType + File.separator + uniqueDirName);
        Files.createDirectories(dsymDir);

        try {
            // 압축 파일을 직접 DSYM 디렉토리에 해제
            extractArchiveFromInputStream(file.getInputStream(), dsymDir, originalFileName);

            // SymbolicationUtil을 사용하여 앱 정보 추출
            SymbolicationUtil util = new SymbolicationUtil();
            // 압축 파일명을 포함한 경로 생성 (확장자 제거)
            String fileNameWithoutExtension = removeArchiveExtensions(originalFileName);
            String dsymPath = dsymDir.toString() + File.separator + fileNameWithoutExtension;
            log.debug("Processing archive with path: {}", dsymPath);
            AppInfoResponseDto appInfo = util.getAppInfo(dsymPath);

            if(appInfo.getStatus() != 200) {
                throw new IOException(appInfo.getError());
            }

            // 성공적으로 처리된 경로 로깅
            log.info("DSYM file has been successfully saved: {}", dsymDir);

            // 결과 Map 생성
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("appInfo", appInfo);
            resultMap.put("fileNameWithoutExtension", fileNameWithoutExtension);
            resultMap.put("dsymDir", dsymDir.toString());

            return resultMap;
        } catch (Exception e) {
            log.error("Error occurred while processing archive file: {}", e.getMessage(), e);

            // 오류 발생 시 DSYM 디렉토리 정리
            deleteDirectory(dsymDir.toFile());

            throw new IOException("Error occurred while processing archive file: " + e.getMessage(), e);
        }
    }

    /**
     * 압축 파일 확장자를 제거하는 메서드
     * .zip, .gz, .gzip, .tar, .tar.gz, .tar.gzip 등의 확장자 제거
     * 
     * @param fileName 원본 파일명
     * @return 확장자가 제거된 파일명
     */
    private String removeArchiveExtensions(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            return fileName;
        }

        String lowerFileName = fileName.toLowerCase();
        String result = fileName;

        // 복합 확장자 처리 (.tar.gz, .tar.gzip)
        if (lowerFileName.endsWith(".tar.gz")) {
            result = fileName.substring(0, fileName.length() - 7); // .tar.gz 제거
        } else if (lowerFileName.endsWith(".tar.gzip")) {
            result = fileName.substring(0, fileName.length() - 9); // .tar.gzip 제거
        }
        // 단일 확장자 처리 (.zip, .gz, .gzip, .tar)
        else if (lowerFileName.endsWith(".zip")) {
            result = fileName.substring(0, fileName.length() - 4); // .zip 제거
        } else if (lowerFileName.endsWith(".gzip")) {
            result = fileName.substring(0, fileName.length() - 5); // .gzip 제거
        } else if (lowerFileName.endsWith(".gz")) {
            result = fileName.substring(0, fileName.length() - 3); // .gz 제거
        } else if (lowerFileName.endsWith(".tar")) {
            result = fileName.substring(0, fileName.length() - 4); // .tar 제거
        }

        return result;
    }

    /**
     * InputStream에서 압축 파일 해제
     * 
     * @param inputStream 압축 파일 InputStream
     * @param destDir 압축 해제 대상 디렉토리
     * @param fileName 원본 파일명 (압축 형식 판단용)
     * @throws IOException 압축 해제 중 오류 발생 시
     */
    private void extractArchiveFromInputStream(InputStream inputStream, Path destDir, String fileName) throws IOException {
        String lowerFileName = fileName.toLowerCase();

        if (lowerFileName.endsWith(".zip")) {
            extractZipFromInputStream(inputStream, destDir);
        } else if (lowerFileName.endsWith(".gz") || lowerFileName.endsWith(".gzip")) {
            extractGzFromInputStream(inputStream, destDir, fileName);
        } else {
            throw new IOException("Unsupported archive format: " + fileName);
        }
    }

    /**
     * ZIP/TAR 엔트리 이름 검증
     *
     * @param destDir 압축 해제 대상 디렉토리
     * @param entryName 엔트리 이름
     * @throws IOException 압축 해제 중 오류 발생 시
     */
    private void validateEntryPath(Path destDir, String entryName) throws IOException {
        // 1. null 체크
        if (entryName == null || entryName.trim().isEmpty()) {
            throw new IOException("Invalid entry name: empty or null");
        }

        // 2. 위험한 패턴 차단
        if (entryName.contains("..") ||
                entryName.startsWith("/") ||
                entryName.contains("\\") ||
                entryName.contains(":")) {
            throw new IOException("Invalid entry name: path traversal detected - " + entryName);
        }

        // 3. 정규화된 경로 검증
        Path resolvedPath = destDir.resolve(entryName).normalize();
        if (!resolvedPath.startsWith(destDir.normalize())) {
            throw new IOException("Invalid entry name: path traversal detected - " + entryName);
        }
    }

    /**
     * InputStream에서 ZIP 파일 해제
     * 
     * @param inputStream ZIP 파일 InputStream
     * @param destDir 압축 해제 대상 디렉토리
     * @throws IOException 압축 해제 중 오류 발생 시
     */
    private void extractZipFromInputStream(InputStream inputStream, Path destDir) throws IOException {
        try (ZipInputStream zipIn = new ZipInputStream(inputStream)) {
            ZipEntry entry = zipIn.getNextEntry();

            // 각 항목에 대해 반복
            while (entry != null) {
                // ZIP/TAR 엔트리 이름 검증
                validateEntryPath(destDir, entry.getName());

                Path filePath = destDir.resolve(entry.getName());

                // 디렉토리인 경우 생성
                if (entry.isDirectory()) {
                    Files.createDirectories(filePath);
                } else {
                    // 상위 디렉토리가 없는 경우 생성
                    Files.createDirectories(filePath.getParent());

                    // 파일 추출
                    try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(filePath.toFile()))) {
                        byte[] buffer = new byte[4096];
                        int read;
                        while ((read = zipIn.read(buffer)) != -1) {
                            bos.write(buffer, 0, read);
                        }
                    }
                }
                zipIn.closeEntry();
                entry = zipIn.getNextEntry();
            }
        }
    }

    /**
     * InputStream에서 GZ 파일 해제 (TAR.GZ 형식도 지원)
     * 
     * @param inputStream GZ 파일 InputStream
     * @param destDir 압축 해제 대상 디렉토리
     * @param fileName 원본 파일명 (압축 해제된 파일명 생성용)
     * @throws IOException 압축 해제 중 오류 발생 시
     */
    private void extractGzFromInputStream(InputStream inputStream, Path destDir, String fileName) throws IOException {
        // GZ 파일명에서 확장자 제거하여 압축 해제된 파일명 생성
        String extractedFileName = fileName;
        if (fileName.toLowerCase().endsWith(".gz")) {
            extractedFileName = fileName.substring(0, fileName.length() - 3);
        } else if (fileName.toLowerCase().endsWith(".gzip")) {
            extractedFileName = fileName.substring(0, fileName.length() - 5);
        }

        // 압축 해제된 파일 경로 생성
        Path extractedFilePath = destDir.resolve(extractedFileName);

        // 상위 디렉토리가 없는 경우 생성
        Files.createDirectories(extractedFilePath.getParent());

        // GZ 파일 압축 해제
        try (GZIPInputStream gzipIn = new GZIPInputStream(inputStream);
             BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(extractedFilePath.toFile()))) {

            byte[] buffer = new byte[4096];
            int read;
            while ((read = gzipIn.read(buffer)) != -1) {
                bos.write(buffer, 0, read);
            }
        }

        log.debug("GZ file extraction completed: {} -> {}", fileName, extractedFileName);

        // GZ 해제 후 생성된 파일이 TAR 형식인지 확인하고 추가 해제
        if (extractedFileName.toLowerCase().endsWith(".tar")) {
            log.debug("TAR format file detected, starting TAR archive extraction: {}", extractedFileName);

            // TAR 파일을 읽어서 아카이브 해제
            try (FileInputStream tarFileInputStream = new FileInputStream(extractedFilePath.toFile())) {
                extractTarFromInputStream(tarFileInputStream, destDir);
            }

            // TAR 아카이브 해제 완료 후 원본 TAR 파일 삭제
            Files.deleteIfExists(extractedFilePath);
            log.debug("Original TAR file deleted after TAR archive extraction completed: {}", extractedFileName);
        }
    }

    /**
     * InputStream에서 TAR 아카이브 해제
     * 
     * @param inputStream TAR 파일 InputStream
     * @param destDir 압축 해제 대상 디렉토리
     * @throws IOException 압축 해제 중 오류 발생 시
     */
    private void extractTarFromInputStream(InputStream inputStream, Path destDir) throws IOException {
        try (TarArchiveInputStream tarIn = new TarArchiveInputStream(inputStream)) {
            TarArchiveEntry entry = tarIn.getNextTarEntry();

            // 각 항목에 대해 반복
            while (entry != null) {
                Path filePath = destDir.resolve(entry.getName());

                // 디렉토리인 경우 생성
                if (entry.isDirectory()) {
                    Files.createDirectories(filePath);
                } else {
                    // 상위 디렉토리가 없는 경우 생성
                    Files.createDirectories(filePath.getParent());

                    // 파일 추출
                    try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(filePath.toFile()))) {
                        byte[] buffer = new byte[4096];
                        int read;
                        while ((read = tarIn.read(buffer)) != -1) {
                            bos.write(buffer, 0, read);
                        }
                    }
                }
                entry = tarIn.getNextTarEntry();
            }
        }

        log.debug("TAR archive extraction completed");
    }


    /**
     * 디렉토리 및 하위 파일 삭제
     * 
     * @param directory 삭제할 디렉토리
     * @return 삭제 성공 여부
     */
    private boolean deleteDirectory(File directory) {
        if (directory == null || !directory.exists()) {
            return false;
        }

        // 디렉토리 내 모든 파일 및 하위 디렉토리 삭제
        File[] files = directory.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isDirectory()) {
                    deleteDirectory(file);
                } else {
                    file.delete();
                }
            }
        }

        // 빈 디렉토리 삭제
        return directory.delete();
    }


    /**
     * DSYM 파일 정보 저장
     * 
     * @param vo DSYM 파일 정보
     */
    public void upsertDsymFileInfo(DsymFileInfoVO vo) {
        vo.setRegDt(DateUtil.format());
        dsymFileInfoMapper.upsertDsymFileInfo(vo);
    }

    /**
     * 기존 DSYM 파일 정보 조회 (upsert 전 기존 파일 삭제용)
     * 
     * @param vo 조회 조건
     * @return 기존 DSYM 파일 정보 (없으면 null)
     */
    public DsymFileInfoVO getExistingDsymFileInfo(DsymFileInfoVO vo) {
        return dsymFileInfoMapper.selectExistingDsymFileInfo(vo);
    }

    /**
     * 기존 DSYM 디렉토리 삭제
     * 
     * @param directory 삭제할 디렉토리
     * @return 삭제 성공 여부
     */
    public boolean deleteExistingDsymDirectory(File directory) {
        return deleteDirectory(directory);
    }

    /**
     * DSYM 파일 정보 목록 조회
     * 
     * @param vo 조회 조건
     * @return DSYM 파일 정보 목록
     */
    public List<DsymFileInfoVO> getDsymFileInfoList(DsymFileInfoVO vo) {
        return dsymFileInfoMapper.selectDsymFileInfoList(vo);
    }

    /**
     * DSYM 파일 정보 삭제 (로컬 파일 및 DB 레코드 삭제)
     * 
     * @param vo 삭제할 DSYM 파일 정보
     * @return 삭제 결과 맵 (success: 성공 여부, message: 결과 메시지, deletedCount: 삭제된 DB 레코드 수)
     */
    public Map<String, Object> deleteDsymFileInfo(DsymFileInfoVO vo) {
        Map<String, Object> result = new HashMap<>();

        try {
            // 먼저 삭제할 파일 정보를 조회하여 파일 경로를 확인
            DsymFileInfoVO existingFileInfo = dsymFileInfoMapper.selectExistingDsymFileInfo(vo);

            if (existingFileInfo == null) {
                result.put("success", false);
                result.put("message", "DSYM file information to delete not found.");
                result.put("deletedCount", 0);
                return result;
            }

            // 로컬 파일 삭제 시도
            boolean fileDeleted = false;
            String fileDeletionMessage = "";

            if (existingFileInfo.getFilePath() != null && !existingFileInfo.getFilePath().trim().isEmpty()) {
                File dsymDirectory = new File(existingFileInfo.getFilePath());

                try {
                    // filePath 디렉토리가 존재하는 경우 전체 디렉토리 삭제
                    if (dsymDirectory.exists() && dsymDirectory.isDirectory()) {
                        fileDeleted = deleteExistingDsymDirectory(dsymDirectory);
                        if (fileDeleted) {
                            log.info("DSYM directory has been deleted: {}", dsymDirectory.getAbsolutePath());
                            fileDeletionMessage = "Directory deletion successful";
                        } else {
                            log.warn("Failed to delete DSYM directory: {}", dsymDirectory.getAbsolutePath());
                            fileDeletionMessage = "Directory deletion failed";
                        }
                    } else {
                        log.info("DSYM directory to delete does not exist: {}", existingFileInfo.getFilePath());
                        fileDeletionMessage = "Directory already does not exist";
                        fileDeleted = true; // Consider as deleted if directory doesn't exist
                    }
                } catch (Exception e) {
                    log.error("Error occurred while deleting DSYM directory: {}", e.getMessage(), e);
                    fileDeletionMessage = "Error occurred while deleting directory: " + e.getMessage();
                }
            } else {
                log.warn("DSYM file path is empty.");
                fileDeletionMessage = "File path is empty";
                fileDeleted = true; // 경로가 없으면 삭제할 파일이 없는 것으로 간주
            }

            // DB에서 레코드 삭제
            int deletedCount = dsymFileInfoMapper.deleteDsymFileInfo(vo);

            if (deletedCount > 0) {
                result.put("success", true);
                result.put("message", String.format("DSYM file information has been successfully deleted. (DB: %d records deleted, File: %s)", 
                    deletedCount, fileDeletionMessage));
                result.put("deletedCount", deletedCount);
                result.put("fileDeleted", fileDeleted);
                log.info("DSYM file information deletion completed - Package: {}, ServerType: {}, OSType: {}, AppVer: {}, AppBuildNum: {}", 
                    vo.getPackageNm(), vo.getServerType(), vo.getOsType(), vo.getAppVer(), vo.getAppBuildNum());
            } else {
                result.put("success", false);
                result.put("message", "DSYM file information to delete not found in DB.");
                result.put("deletedCount", 0);
                result.put("fileDeleted", fileDeleted);
            }

        } catch (Exception e) {
            log.error("Error occurred while deleting DSYM file information: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("message", "Error occurred while deleting DSYM file information: " + e.getMessage());
            result.put("deletedCount", 0);
        }

        return result;
    }

    /**
     * Nginx 스타일 사이즈 문자열을 Byte 단위 Long 값으로 변환
     * 지원 단위: k, m, g (대소문자 무관)
     *
     * @param sizeStr "10m", "512k", "2g", "0" 형태 문자열
     * @return Byte 단위 Long 값
     * @throws IllegalArgumentException 잘못된 포맷일 경우
     */
    public long parseToBytes(String sizeStr) {
        if (sizeStr == null || sizeStr.isBlank()) {
            throw new IllegalArgumentException("Size string is null or empty");
        }

        String trimmed = sizeStr.trim().toLowerCase();

        // 숫자만 들어온 경우 (단위 없음)
        if (trimmed.matches("\\d+")) {
            return Long.parseLong(trimmed);
        }

        // 숫자 + 단위
        long multiplier;
        char unit = trimmed.charAt(trimmed.length() - 1);
        String numberPart = trimmed.substring(0, trimmed.length() - 1);

        switch (unit) {
            case 'k': multiplier = 1024L; break;
            case 'm': multiplier = 1024L * 1024L; break;
            case 'g': multiplier = 1024L * 1024L * 1024L; break;
            default:
                throw new IllegalArgumentException("Unsupported size unit: " + unit);
        }

        long value;
        try {
            value = Long.parseLong(numberPart.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid number in size string: " + numberPart, e);
        }

        return value * multiplier;
    }

}
