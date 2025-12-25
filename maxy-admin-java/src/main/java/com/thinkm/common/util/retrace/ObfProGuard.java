package com.thinkm.common.util.retrace;

import com.thinkm.maxy.repository.RetraceRepository;
import com.thinkm.maxy.vo.ReTraceInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import proguard.obfuscate.MappingReader;
import proguard.retrace.FrameInfo;
import proguard.retrace.FramePattern;
import proguard.retrace.FrameRemapper;

import javax.annotation.Resource;
import java.io.File;
import java.io.IOException;
import java.io.LineNumberReader;
import java.io.StringReader;
import java.util.Iterator;

@Slf4j
@Component
@RequiredArgsConstructor
public class ObfProGuard {

    // For example: "com.example.Foo.bar"
    private static final String REGULAR_EXPRESSION_CLASS_METHOD = "%c\\.%m";
    // For example:
    // "(Foo.java:123:0) ~[0]"
    // "()(Foo.java:123:0)"     (DGD-1732, unknown origin, possibly Sentry)
    // or no source line info   (DGD-1732, Sentry)
    private static final String REGULAR_EXPRESSION_SOURCE_LINE = "(?:\\(\\))?(?:\\((?:%s)?(?::?%l)?(?::\\d+)?\\))?\\s*(?:~\\[.*\\])?";
    // For example: "at o.afc.b + 45(:45)"
    // Might be present in recent stacktraces accessible from crashlytics.
    private static final String REGULAR_EXPRESSION_OPTIONAL_SOURCE_LINE_INFO = "(?:\\+\\s+[0-9]+)?";
    // For example: "    at com.example.Foo.bar(Foo.java:123:0) ~[0]"
    private static final String REGULAR_EXPRESSION_AT = ".*?\\bat\\s+" + REGULAR_EXPRESSION_CLASS_METHOD + "\\s*" + REGULAR_EXPRESSION_OPTIONAL_SOURCE_LINE_INFO + REGULAR_EXPRESSION_SOURCE_LINE;
    // For example: "java.lang.ClassCastException: com.example.Foo cannot be cast to com.example.Bar"
    // Every line can only have a single matched class, so we try to avoid
    // longer non-obfuscated class names.
    private static final String REGULAR_EXPRESSION_CAST1 = ".*?\\bjava\\.lang\\.ClassCastException: %c cannot be cast to .{5,}";
    private static final String REGULAR_EXPRESSION_CAST2 = ".*?\\bjava\\.lang\\.ClassCastException: .* cannot be cast to %c";
    // For example: "java.lang.NullPointerException: Attempt to read from field 'java.lang.String com.example.Foo.bar' on a null object reference"
    private static final String REGULAR_EXPRESSION_NULL_FIELD_READ = ".*?\\bjava\\.lang\\.NullPointerException: Attempt to read from field '%t %c\\.%f' on a null object reference";
    // For example: "java.lang.NullPointerException: Attempt to write to field 'java.lang.String com.example.Foo.bar' on a null object reference"
    private static final String REGULAR_EXPRESSION_NULL_FIELD_WRITE = ".*?\\bjava\\.lang\\.NullPointerException: Attempt to write to field '%t %c\\.%f' on a null object reference";
    // For example: "java.lang.NullPointerException: Attempt to invoke virtual method 'void com.example.Foo.bar(int,boolean)' on a null object reference"
    private static final String REGULAR_EXPRESSION_NULL_METHOD = ".*?\\bjava\\.lang\\.NullPointerException: Attempt to invoke (?:virtual|interface) method '%t %c\\.%m\\(%a\\)' on a null object reference";
    // For example: "Something: com.example.FooException: something"
    private static final String REGULAR_EXPRESSION_THROW = "(?:.*?[:\"]\\s+)?%c(?::.*)?";
    // For example: java.lang.NullPointerException: Cannot invoke "com.example.Foo.bar.foo(int)" because the return value of "com.example.Foo.bar.foo2()" is null
    private static final String REGULAR_EXPRESSION_RETURN_VALUE_NULL1 = ".*?\\bjava\\.lang\\.NullPointerException: Cannot invoke \\\".*\\\" because the return value of \\\"%c\\.%m\\(%a\\)\\\" is null";
    private static final String REGULAR_EXPRESSION_RETURN_VALUE_NULL2 = ".*?\\bjava\\.lang\\.NullPointerException: Cannot invoke \\\"%c\\.%m\\(%a\\)\\\" because the return value of \\\".*\\\" is null";
    // DIRTY FIX:
    // We need to call another regex because Java 16 stacktrace may have multiple methods in the same line.
    // For Example: java.lang.NullPointerException: Cannot invoke "dev.lone.itemsadder.Core.f.a.b.b.b.c.a(org.bukkit.Location, boolean)" because the return value of "dev.lone.itemsadder.Core.f.a.b.b.b.c.a()" is null
    public static final String REGULAR_EXPRESSION2 = "(?:" + REGULAR_EXPRESSION_RETURN_VALUE_NULL2 + ")";
    //For example: Cannot invoke "java.net.ServerSocket.close()" because "com.example.Foo.bar" is null
    private static final String REGULAR_EXPRESSION_BECAUSE_IS_NULL = ".*?\\bbecause \\\"%c\\.%f\\\" is null";
    // For Android native stack trace: "#04 pc 516408443778 /data/app/.../base.vdex
    // (N2.a.onClick+530)"
    // Pattern: #[digits] pc [hex_address] [path] (ClassName.methodName+offset)
    // Simplified pattern to match just the class.method part in parentheses
    private static final String REGULAR_EXPRESSION_ANDROID_NATIVE = ".*?\\(" + REGULAR_EXPRESSION_CLASS_METHOD
            + "(?:\\+\\d+)?\\)";
    // Android native stack trace pattern
    public static final String REGULAR_EXPRESSION3 = "(?:" + REGULAR_EXPRESSION_ANDROID_NATIVE + ")";
    // The overall regular expression for a line in the stack trace.
    public static final String REGULAR_EXPRESSION = "(?:" + REGULAR_EXPRESSION_AT + ")|" +
            "(?:" + REGULAR_EXPRESSION_CAST1 + ")|" +
            "(?:" + REGULAR_EXPRESSION_CAST2 + ")|" +
            "(?:" + REGULAR_EXPRESSION_NULL_FIELD_READ + ")|" +
            "(?:" + REGULAR_EXPRESSION_NULL_FIELD_WRITE + ")|" +
            "(?:" + REGULAR_EXPRESSION_NULL_METHOD + ")|" +
            "(?:" + REGULAR_EXPRESSION_RETURN_VALUE_NULL1 + ")|" +
            "(?:" + REGULAR_EXPRESSION_BECAUSE_IS_NULL + ")|" +
            "(?:" + REGULAR_EXPRESSION_ANDROID_NATIVE + ")|" +
            "(?:" + REGULAR_EXPRESSION_THROW + ")";

    @Resource
    private final RetraceRepository retraceRepository;

    /**
     * De-obfuscates a given stack trace.
     */
    private String retrace(File mappingFile, LineNumberReader stackTraceReader) throws IOException {
        // Create a pattern for stack frames.
        // The settings.
        boolean verbose = false;
        FramePattern pattern1 = new FramePattern(REGULAR_EXPRESSION, verbose);
        FramePattern pattern2 = new FramePattern(REGULAR_EXPRESSION2, verbose);
        FramePattern pattern3 = new FramePattern(REGULAR_EXPRESSION3, verbose);

        // Create a remapper.
        FrameRemapper mapper = new FrameRemapper();

        // Read the mapping file.
        MappingReader mappingReader = new MappingReader(mappingFile);
        mappingReader.pump(mapper);

        StringBuilder builder = new StringBuilder();
        // Read and process the lines of the stack trace.
        while (true) {
            // Read a line.
            String obfuscatedLine = stackTraceReader.readLine();
            if (obfuscatedLine == null) {
                break;
            }

            // Try to match it against the regular expression.
            FrameInfo obfuscatedFrame1 = pattern1.parse(obfuscatedLine);
            FrameInfo obfuscatedFrame2 = pattern2.parse(obfuscatedLine);
            FrameInfo obfuscatedFrame3 = pattern3.parse(obfuscatedLine);

            String deobf = handle(obfuscatedFrame1, mapper, pattern1, obfuscatedLine);
            // DIRTY FIX:
            // I have to execute it two times because recent Java stacktraces may have multiple fields/methods in the same line.
            // For example: java.lang.NullPointerException: Cannot invoke "com.example.Foo.bar.foo(int)" because the return value of "com.example.Foo.bar.foo2()" is null
            deobf = handle(obfuscatedFrame2, mapper, pattern2, deobf);
            // Handle Android native stack trace format
            deobf = handle(obfuscatedFrame3, mapper, pattern3, deobf);

            builder.append(deobf).append("\n");
        }

        return builder.toString();
    }

    private String handle(FrameInfo obfuscatedFrame, FrameRemapper mapper, FramePattern pattern, String obfuscatedLine) {
        StringBuilder result = new StringBuilder();
        if (obfuscatedFrame != null) {
            // Transform the obfuscated frame back to one or more
            // original frames.
            Iterator<FrameInfo> retracedFrames =
                    mapper.transform(obfuscatedFrame).iterator();

            String previousLine = null;

            while (retracedFrames.hasNext()) {
                // Retrieve the next retraced frame.
                FrameInfo retracedFrame = retracedFrames.next();

                // Format the retraced line.
                String retracedLine =
                        pattern.format(obfuscatedLine, retracedFrame);

                // Clear the common first part of ambiguous alternative
                // retraced lines, to present a cleaner list of
                // alternatives.
                String trimmedLine =
                        previousLine != null &&
                                obfuscatedFrame.getLineNumber() == 0 ?
                                trim(retracedLine, previousLine) :
                                retracedLine;

                // Print out the retraced line.
                if (trimmedLine != null) {

                    result.append(trimmedLine);
                }

                previousLine = retracedLine;
            }
        } else {

            // Print out the original line.
            result.append(obfuscatedLine);
        }
        return result.toString();
    }

    /**
     * Returns the first given string, with any leading characters that it has
     * in common with the second string replaced by spaces.
     */
    private String trim(String string1, String string2) {
        StringBuilder line = new StringBuilder(string1);

        // Find the common part.
        int trimEnd = firstNonCommonIndex(string1, string2);
        if (trimEnd == string1.length()) {
            return null;
        }

        // Don't clear the last identifier characters.
        trimEnd = lastNonIdentifierIndex(string1, trimEnd) + 1;

        // Clear the common characters.
        for (int index = 0; index < trimEnd; index++) {
            if (!Character.isWhitespace(string1.charAt(index))) {
                line.setCharAt(index, ' ');
            }
        }

        return line.toString();
    }

    /**
     * Returns the index of the first character that is not the same in both
     * given strings.
     */
    private int firstNonCommonIndex(String string1, String string2) {
        int index = 0;
        while (index < string1.length() &&
                index < string2.length() &&
                string1.charAt(index) == string2.charAt(index)) {
            index++;
        }

        return index;
    }

    /**
     * Returns the index of the last character that is not an identifier
     * character in the given string, at or before the given index.
     */
    private int lastNonIdentifierIndex(String line, int index) {
        while (index >= 0 &&
                Character.isJavaIdentifierPart(line.charAt(index))) {
            index--;
        }

        return index;
    }

    /**
     * Android Stack ReTrace
     *
     * @param info             앱 정보
     * @param obfuscatedString 난독화된 Stack Trace
     * @return ReTrace 된 Stack Trace
     */
    protected String retrace(ReTraceInfo info, String obfuscatedString) {
        // 1. 앱 정보로 RULE_MAP 에서 매핑 파일 경로 찾기
        // 2. Mapping 파일과 StackTrace 정보를 retrace 에 전달
        // 2-1. Mapping: File
        // 2-2. StackTrace: InputStream/String
        // 3. retrace(StackTrace): String

        String key = info.key();
        String filePath = retraceRepository.getRULE_INFO_MAP().get(key);

        long s1 = System.currentTimeMillis();
        String result;
        try {
            File mappingFile = new File(filePath);
            LineNumberReader reader = new LineNumberReader(new StringReader(obfuscatedString));

            // Execute ReTrace with the collected settings.
            result = retrace(mappingFile, reader);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return obfuscatedString;
        }
        log.info("[RETRACE]: " + (System.currentTimeMillis() - s1) + " ms");
        return result;
    }
}
