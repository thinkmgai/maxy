package com.thinkm.maxy.service.common;

import com.thinkm.common.util.sourcemap.SourceMapParser;
import com.thinkm.common.util.sourcemap.StackFrameRef;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;

import java.util.List;

@Slf4j
class SourceMapParserTest {

    @Test
    void parseConsoleForPositions() {
        String text = """
                page-b0aedb59bf76801a.js:1 Uncaught (in promise) Error: Intentional login click error
                at B (page-b0aedb59bf76801a.js:1:8190)
                at sY (4bd1b696-053d5bec6121fa8c.js:1:151226)
                at 4bd1b696-053d5bec6121fa8c.js:1:157114
                at nU (4bd1b696-053d5bec6121fa8c.js:1:20179)
                at s1 (4bd1b696-053d5bec6121fa8c.js:1:152459)
                at fC (4bd1b696-053d5bec6121fa8c.js:1:188384)
                at fx (4bd1b696-053d5bec6121fa8c.js:1:188206)
                """;
        List<StackFrameRef> list = SourceMapParser.parseConsoleForPositions(text);
        for (StackFrameRef frame : list) {
            log.info("{}", frame);
        }
        assert list.size() == 2;
    }

    @Test
    void parseConsoleForPositionsHandlesInlineHttpStack() {
        String text = """
                Uncaught TypeError: Cannot read properties of undefined (reading 'callbackid") Cannot read properties undefined (reading 'callbackid') TypeError: Cannot read properties of undefined (reading 'callbackid")
                Object.callBackResult (https://sb.kbankcorp.co.kr:8080/spa/top-dir/dir3/page-b0aedb59bf76801a.js:1:8190)
                at <anonymous>:1:16
                """;

        List<StackFrameRef> list = SourceMapParser.parseConsoleForPositions(text);
        assert !list.isEmpty();
        StackFrameRef first = list.get(0);
        // /top-dir/dir2/page-b0aedb59bf76801a.js 파일과,
        // /top-dir/dir3/page-b0aedb59bf76801a.js 에 동일한 파일이 또 있음.
        assert first.file().contains("https://sb.kbankcorp.co.kr:8080/spa/top-dir/dir3/page-b0aedb59bf76801a.js");
        assert first.line() == 1;
        assert first.column() == 8190;
    }

    @Test
    void parseConsoleForPositionsHandlesTopDirStack() {
        String text = """
                Uncaught TypeError: Cannot read properties of undefined (reading 'callbackid") Cannot read properties undefined (reading 'callbackid') TypeError: Cannot read properties of undefined (reading 'callbackid")
                Object.callBackResult (https://sb.kbankcorp.co.kr:8080/spa/top-dir/dir3/page-b0aedb59bf76801a.js:1:8190)
                at <anonymous>:1:16
                """;

        List<StackFrameRef> list = SourceMapParser.parseConsoleForPositions(text);
        assert !list.isEmpty();
        StackFrameRef first = list.get(0);
        assert first.file().contains("https://sb.kbankcorp.co.kr:8080/spa/top-dir/dir3/page-b0aedb59bf76801a.js");
        assert first.line() == 1;
        assert first.column() == 8190;
    }
}
