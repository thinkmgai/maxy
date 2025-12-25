package com.thinkm.maxy.service.app.helper;

import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.maxy.vo.PagesVO;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVRecord;
import org.jetbrains.annotations.NotNull;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
public class PageServiceHelper {
    public static final String CRLF = "\r\n";
    public static final String[] HEADERS = {
            "Seq",
            "Type",
            "URL",
            "Alias Name",
            "Description",
            "Favorites"
    };
    private static final Charset CP949 = Charset.isSupported("MS949")
            ? Charset.forName("MS949")
            : Charset.forName("x-windows-949");

    private static final List<Charset> CANDIDATE_CHARSETS = List.of(
            StandardCharsets.UTF_8,
            CP949,
            Charset.forName("EUC-KR") // EUC-KR 대신 MS949 권장
    );

    // CSV 필드 이스케이프(RFC 4180): ',', '"', '\r', '\n' 포함 시 전체를 "..."로 감싸고 내부 "는 ""로
    public static String escapeCsv(String s) {
        if (s == null) return "";
        boolean needQuote = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == ',' || c == '"' || c == '\r' || c == '\n') {
                needQuote = true;
                break;
            }
        }
        if (!needQuote) return s;
        StringBuilder out = new StringBuilder(s.length() + 8);
        out.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"') out.append("\"\"");
            else out.append(c);
        }
        out.append('"');
        return out.toString();
    }

    public static String joinEscaped(String[] fields) {
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < fields.length; i++) {
            if (i > 0) line.append(',');
            line.append(escapeCsv(fields[i]));
        }
        return line.toString();
    }

    public static String safe(Object v) {
        return v == null ? "" : v.toString();
    }

    @NotNull
    public static String convertPageType(String dataType) {
        if ("1".equalsIgnoreCase(dataType)) return "Page";
        if ("2".equalsIgnoreCase(dataType)) return "Native";
        return "";
    }

    public static String[] makeContent(PagesVO item, int seq) {
        String pageType = convertPageType(item.getDataType());
        return new String[]{
                String.valueOf(seq),
                pageType,
                safe(item.getReqUrl()),
                safe(item.getAppPageNm()),
                safe(item.getAppPageDesc()),
                safe(item.getMonitoringYn())
        };
    }

    public static String extractFileExtension(String originalFileName) {
        return Optional.of(Paths.get(originalFileName).getFileName().toString())
                .filter(name -> name.contains("."))
                .map(name -> name.substring(name.lastIndexOf('.') + 1))
                .orElseThrow(() -> new BadRequestException("wrong.file.format"));
    }

    public static boolean checkValidString(String inputString) {
        String regex = "[!@#$%^&*(),.?\":{}|<>]";

        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(inputString);

        return matcher.find();
    }

    public static void writeToResponse(List<PagesVO> pageList,
                                       HttpServletRequest request,
                                       HttpServletResponse response) {

        String ts = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyMMddHHmmss"));
        String fileName = "PageList_" + ts + ".csv";
        String encoded = java.net.URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");

        String ua = Optional.ofNullable(request.getHeader("User-Agent")).orElse("");
        boolean isSafari = ua.contains("Safari") && !ua.contains("Chrome");

        String contentDisposition = isSafari
                ? "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encoded
                : "attachment; filename=\"PageList.csv\"; filename*=UTF-8''" + encoded;

        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader("Content-Disposition", contentDisposition);
        response.setHeader("X-Content-Type-Options", "nosniff");

        try (OutputStream os = new BufferedOutputStream(response.getOutputStream(), 64 * 1024);
             Writer writer = new OutputStreamWriter(os, StandardCharsets.UTF_8)) {
            // BOM
            os.write(0xEF);
            os.write(0xBB);
            os.write(0xBF);

            // Header
            writer.write(String.join(",", PageServiceHelper.HEADERS));
            writer.write(CRLF);

            // Rows
            int seq = 1;
            for (PagesVO item : pageList) {
                String[] fields = PageServiceHelper.makeContent(item, seq);
                writer.write(PageServiceHelper.joinEscaped(fields));
                writer.write(CRLF);
                seq++;
            }
            writer.flush();
            os.flush();
        } catch (Exception e) {
            log.error("CSV stream write failed: {}", e.getMessage(), e);
        }
    }

    public static Charset detectCharset(InputStream in) throws IOException {
        try (BufferedInputStream bis = new BufferedInputStream(in)) {
            bis.mark(4);
            byte[] bom = bis.readNBytes(4);
            bis.reset();

            // UTF-8 BOM
            if (bom.length >= 3 && (bom[0] & 0xFF) == 0xEF && (bom[1] & 0xFF) == 0xBB && (bom[2] & 0xFF) == 0xBF) {
                return StandardCharsets.UTF_8;
            }
            // UTF-16 BOM 등은 미지원 처리(명확 에러)
            if (bom.length >= 2) {
                int b0 = bom[0] & 0xFF, b1 = bom[1] & 0xFF;
                if (b0 == 0xFE && b1 == 0xFF) throw new BadRequestException("utf16be.not.supported");
                if (b0 == 0xFF && b1 == 0xFE) throw new BadRequestException("utf16le.not.supported");
            }

            // 샘플 디코드 시도
            for (Charset cs : CANDIDATE_CHARSETS) {
                if (canDecodeSample(bis, cs)) return cs;
            }
        }
        throw new BadRequestException("encoding.mismatch");
    }

    private static boolean canDecodeSample(BufferedInputStream bis, Charset cs) throws IOException {
        bis.mark(8192);
        byte[] buf = bis.readNBytes(8192);
        bis.reset();
        var decoder = cs.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try {
            decoder.decode(ByteBuffer.wrap(buf));
            return true;
        } catch (CharacterCodingException e) {
            return false;
        }
    }

    public static String get(CSVRecord rec, String col) {
        return rec.isMapped(col) ? CommonUtil.trimNull(rec.get(col)) : "";
    }


    public static String normalizeType(String type) {
        String v = type.trim().toUpperCase(Locale.ROOT);
        if (v.equals("1") || v.equals("PAGE")) return "1";
        if (v.equals("2") || v.equals("NATIVE")) return "2";
        throw new BadRequestException("type.invalid");
    }

    public static String normalizeYN(String s) {
        String v = s == null ? "" : s.trim().toUpperCase(Locale.ROOT);
        if (v.equals("Y") || v.equals("YES") || v.equals("TRUE") || v.equals("1")) return "Y";
        if (v.equals("N") || v.equals("NO") || v.equals("FALSE") || v.equals("0")) return "N";
        throw new BadRequestException("favorites.invalid");
    }
}

