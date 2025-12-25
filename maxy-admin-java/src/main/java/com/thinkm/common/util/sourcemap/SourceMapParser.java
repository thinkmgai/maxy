package com.thinkm.common.util.sourcemap;

import com.fasterxml.jackson.databind.JsonNode;
import com.thinkm.common.util.JsonUtil;
import lombok.Getter;
import lombok.Setter;

import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class SourceMapParser {

    private static final String BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    private static final int[] BASE64_MAP = new int[128];

    static {
        Arrays.fill(BASE64_MAP, -1);
        for (int i = 0; i < BASE64_CHARS.length(); i++) {
            BASE64_MAP[BASE64_CHARS.charAt(i)] = i;
        }
    }

    private SourceMapParser() {
    }

    public static ParsedSourceMap parse(String json) throws IOException {
        JsonNode root = JsonUtil.readTree(json);

        if (root.has("sections")) {
            throw new IllegalArgumentException("Indexed source maps (sections) are not supported.");
        }

        String mappings = optText(root, "mappings");
        List<String> sources = readStringArray(root.get("sources"));
        List<String> names = readStringArray(root.get("names"));
        List<String> sourcesContent = root.has("sourcesContent")
                ? readStringArray(root.get("sourcesContent"))
                : null;

        List<List<Segment>> lines = parseMappings(mappings);

        ParsedSourceMap parsed = new ParsedSourceMap();
        parsed.setVersion(root.path("version").asInt());
        parsed.setFile(optText(root, "file"));
        parsed.setSourceRoot(optText(root, "sourceRoot"));
        parsed.setSources(sources);
        parsed.setNames(names);
        parsed.setSourcesContent(sourcesContent);
        parsed.setLines(lines);

        return parsed;
    }

    private static String optText(JsonNode node, String field) {
        JsonNode n = node.get(field);
        return n != null && !n.isNull() ? n.asText() : "";
    }

    private static List<String> readStringArray(JsonNode node) {
        if (node == null || !node.isArray()) {
            return Collections.emptyList();
        }
        List<String> list = new ArrayList<>(node.size());
        for (JsonNode n : node) {
            list.add(n.isNull() ? "" : n.asText());
        }
        return list;
    }

    private static List<List<Segment>> parseMappings(String mappings) {
        List<List<Segment>> lines = new ArrayList<>();
        int generatedLine = 0;
        int index = 0;

        int prevGenCol = 0;
        int prevSrc = 0;
        int prevOrigLine = 0;
        int prevOrigCol = 0;
        int prevName = 0;

        while (index < mappings.length()) {
            char ch = mappings.charAt(index);

            if (ch == ';') {
                generatedLine++;
                index++;
                prevGenCol = 0;
                prevSrc = 0;
                prevOrigLine = 0;
                prevOrigCol = 0;
                prevName = 0;
                continue;
            }

            if (ch == ',') {
                index++;
                continue;
            }

            Segment seg = new Segment();

            VLQResult r = decodeVLQ(mappings, index);
            prevGenCol += r.value();
            seg.setGeneratedColumn(prevGenCol);
            index = r.nextIndex();

            if (index >= mappings.length()
                || mappings.charAt(index) == ','
                || mappings.charAt(index) == ';') {
                addSegment(lines, generatedLine, seg);
                continue;
            }

            r = decodeVLQ(mappings, index);
            prevSrc += r.value();
            seg.setSource(prevSrc);
            index = r.nextIndex();

            r = decodeVLQ(mappings, index);
            prevOrigLine += r.value();
            seg.setOriginalLine(prevOrigLine);
            index = r.nextIndex();

            r = decodeVLQ(mappings, index);
            prevOrigCol += r.value();
            seg.setOriginalColumn(prevOrigCol);
            index = r.nextIndex();

            if (index < mappings.length()
                && mappings.charAt(index) != ','
                && mappings.charAt(index) != ';') {
                r = decodeVLQ(mappings, index);
                prevName += r.value();
                seg.setName(prevName);
                index = r.nextIndex();
            }

            addSegment(lines, generatedLine, seg);
        }

        for (List<Segment> arr : lines) {
            if (arr != null && !arr.isEmpty()) {
                arr.sort(Comparator.comparingInt(Segment::getGeneratedColumn));
            }
        }

        return lines;
    }

    private static void addSegment(List<List<Segment>> lines, int line, Segment seg) {
        while (lines.size() <= line) {
            lines.add(null);
        }
        List<Segment> row = lines.get(line);
        if (row == null) {
            row = new ArrayList<>();
            lines.set(line, row);
        }
        row.add(seg);
    }

    private static VLQResult decodeVLQ(String str, int indexRef) {
        int result = 0;
        int shift = 0;
        boolean continuation;
        int index = indexRef;

        do {
            if (index >= str.length()) {
                throw new IllegalArgumentException("Unexpected end of VLQ sequence");
            }
            char ch = str.charAt(index++);
            if (ch >= BASE64_MAP.length || BASE64_MAP[ch] < 0) {
                throw new IllegalArgumentException("Invalid VLQ character: " + ch);
            }
            int digit = BASE64_MAP[ch];
            continuation = (digit & 32) != 0;
            digit &= 31;
            result += digit << shift;
            shift += 5;
        } while (continuation);

        boolean negate = (result & 1) == 1;
        result >>= 1;
        return new VLQResult(negate ? -result : result, index);
    }

    public static OriginalPosition originalPositionFor(ParsedSourceMap parsed, int line1, int column1) {
        int line = line1 - 1;
        int column = column1 - 1;

        if (line < 0 || line >= parsed.getLines().size()) {
            return null;
        }

        List<Segment> segments = parsed.getLines().get(line);
        if (segments == null || segments.isEmpty()) {
            return null;
        }

        Segment seg = getSegment(segments, column);
        if (seg.getSource() == null) {
            return null;
        }

        String source = resolveSource(parsed, seg.getSource());
        int origLine = seg.getOriginalLine() != null ? seg.getOriginalLine() + 1 : 1;
        int origCol = seg.getOriginalColumn() != null ? seg.getOriginalColumn() + 1 : 1;
        String name = seg.getName() != null && seg.getName() < parsed.getNames().size()
                ? parsed.getNames().get(seg.getName())
                : null;

        String snippet = null;
        if (parsed.getSourcesContent() != null
            && seg.getSource() < parsed.getSourcesContent().size()) {
            String text = parsed.getSourcesContent().get(seg.getSource());
            if (text != null) {
                snippet = codeFrame(text, origLine, origCol, 3);
            }
        }

        return new OriginalPosition(source, origLine, origCol, name, seg.getSource(), snippet);
    }

    private static Segment getSegment(List<Segment> segments, int column) {
        int lo = 0;
        int hi = segments.size() - 1;
        int idx = -1;

        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            int gc = segments.get(mid).getGeneratedColumn();
            if (gc == column) {
                idx = mid;
                break;
            }
            if (gc < column) {
                idx = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        if (idx == -1) {
            idx = 0;
        }

        return segments.get(idx);
    }

    private static String resolveSource(ParsedSourceMap parsed, int sourceIndex) {
        String root = parsed.getSourceRoot() != null ? parsed.getSourceRoot() : "";
        String src = sourceIndex >= 0 && sourceIndex < parsed.getSources().size()
                ? parsed.getSources().get(sourceIndex)
                : "";

        if (root.isEmpty()) {
            return src;
        }
        if (root.endsWith("/") && src.startsWith("/")) {
            return root + src.substring(1);
        }
        if (root.endsWith("/") || src.startsWith("/")) {
            return root + src;
        }
        return root + "/" + src;
    }

    private static final Pattern STACK_LINE_PATTERN = Pattern.compile(
            "^\\s*at\\s+(?:[^()]*\\(\\s*)?(.+?)(?::(\\d+)(?::(\\d+))?)\\s*\\)?\\s*$"
    );
    private static final Pattern STACK_WITH_FUNC_PATTERN = Pattern.compile(
            "\\bat\\s+[^()]*\\(\\s*(.+?)(?::(\\d+)(?::(\\d+))?)\\s*\\)"
    );
    private static final Pattern STACK_SIMPLE_PATTERN = Pattern.compile(
            "(?:^|\\s|@|\\()(?:(?:[^()]*?)\\(\\s*)?(.+?)(?::(\\d+)(?::(\\d+))?)(?=\\s|\\)|$)"
    );

    public static List<StackFrameRef> parseConsoleStackFrames(String text) {
        List<StackFrameRef> results = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return results;
        }

        String[] lines = text.split("\\R");

        // 형태: at B (page-b0aedb59bf76801a.js:1:8190)
        //      at 4bd1b696-053d5bec6121fa8c.js:1:157114
        for (String raw : lines) {
            Matcher m = STACK_LINE_PATTERN.matcher(raw);
            if (m.find()) {
                String file = normalizeFrameFile(m.group(1));
                if (file.isEmpty()) {
                    continue;
                }
                int line = Integer.parseInt(m.group(2));
                String colGroup = m.group(3);
                int col = (colGroup != null) ? Integer.parseInt(colGroup) : 1;

                results.add(new StackFrameRef(file, line, col, raw.trim()));
            }
        }

        return results;
    }


    public static List<StackFrameRef> parseConsoleForPositions(String text) {
        List<StackFrameRef> results = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return results;
        }

        String[] lines = text.split("\\R");

        for (String raw : lines) {
            Matcher m = STACK_WITH_FUNC_PATTERN.matcher(raw);
            if (!m.find()) {
                m = STACK_SIMPLE_PATTERN.matcher(raw);
            }

            if (m.find()) {
                String file = normalizeFrameFile(m.group(1));
                if (file.isEmpty()) {
                    continue;
                }
                int line = Integer.parseInt(m.group(2));
                String colGroup = (m.groupCount() >= 3) ? m.group(3) : null;
                int col = (colGroup != null) ? Integer.parseInt(colGroup) : 1; // 컬럼 없으면 1로 가정

                results.add(new StackFrameRef(file, line, col, raw.trim()));
            }
        }

        return results;
    }


    public static String codeFrame(String text, int line1, int column1, int contextLines) {
        String[] lines = text.split("\\R");
        int idx = line1 - 1;
        int from = Math.max(0, idx - contextLines);
        int to = Math.min(lines.length, idx + contextLines + 1);
        int width = String.valueOf(to).length();

        StringBuilder sb = new StringBuilder();
        for (int i = from; i < to; i++) {
            String mark = (i == idx) ? ">" : " ";
            String gutter = String.format("%" + width + "d", i + 1);
            sb.append(mark).append(' ').append(gutter).append(" | ")
                    .append(i < lines.length ? lines[i] : "").append('\n');
            if (i == idx) {
                int caretPos = Math.max(0, column1 - 1);
                sb.append("  ")
                        .append(" ".repeat(width))
                        .append(" | ")
                        .append(" ".repeat(caretPos))
                        .append("^\n");
            }
        }
        return sb.toString();
    }

    private record VLQResult(int value, int nextIndex) {
    }

    private static String normalizeFrameFile(String file) {
        if (file == null) {
            return "";
        }
        String trimmed = file.trim();
        if (trimmed.isEmpty()) {
            return "";
        }

        if (trimmed.endsWith(")")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1).trim();
        }

        int lastParen = trimmed.lastIndexOf('(');
        if (lastParen >= 0 && lastParen + 1 < trimmed.length()) {
            String candidate = trimmed.substring(lastParen + 1).trim();
            if (looksLikePath(candidate)) {
                trimmed = candidate;
            }
        }
        return trimmed;
    }

    private static boolean looksLikePath(String candidate) {
        if (candidate.isEmpty()) {
            return false;
        }
        return candidate.startsWith("http")
                || candidate.startsWith("/")
                || candidate.startsWith("./")
                || candidate.startsWith("../")
                || candidate.startsWith("webpack")
                || candidate.contains(".js")
                || candidate.contains(".ts")
                || candidate.contains(".tsx");
    }

    @Setter
    @Getter
    public static final class ParsedSourceMap {
        private int version;
        private String file;
        private String sourceRoot;
        private List<String> sources;
        private List<String> names;
        private List<String> sourcesContent;
        private List<List<Segment>> lines;

    }

    @Setter
    @Getter
    public static final class Segment {
        private int generatedColumn;
        private Integer source;
        private Integer originalLine;
        private Integer originalColumn;
        private Integer name;

    }
}
