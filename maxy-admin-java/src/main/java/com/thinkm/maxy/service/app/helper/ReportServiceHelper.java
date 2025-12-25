package com.thinkm.maxy.service.app.helper;

import com.thinkm.common.util.CommonUtil;
import com.thinkm.maxy.vo.ReportVO;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;

import java.awt.*;
import java.io.IOException;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@AllArgsConstructor
public class ReportServiceHelper {
    private final String TITLE;
    private final int FONT_SIZE_16;
    private final int FONT_SIZE_10;
    private final float MARGIN;
    private final float ROW_HEIGHT;
    private final float LINE_GAP;
    private final String DEFAULT_FONT_PATH;
    private final String BOLD_FONT_PATH;

    /**
     * 셀 그리기 - 텍스트 길이에 따라 높이 자동 조정
     *
     * @param stream   PDF 페이지 컨텐츠 스트림
     * @param x        셀의 x 좌표
     * @param y        셀의 y 좌표
     * @param width    셀의 너비
     * @param text     셀에 표시할 텍스트
     * @param textType 텍스트 타입
     * @param isHead   헤더 여부, 셀 채우기 여부(true: 헤더, false: 데이터)
     * @param font     사용할 폰트
     * @param fontSize 폰트 크기
     * @return 실제 사용된 셀 높이
     */
    public float drawCell(PDPageContentStream stream, float x, float y, float width, String text,
                          ReportVO.ReportColumnType textType, Boolean isHead, PDType0Font font, int fontSize) throws IOException {
        // 텍스트 처리
        String processedText = processText(text, textType);

        // 텍스트 줄바꿈 및 높이 계산
        List<String> lines = calculateWrappedText(processedText, width, font, fontSize);

        // 라인 높이 계산 (폰트 높이 + 여백)
        float lineHeight = font.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * fontSize + 2;

        // 최소 높이 설정 (기존 ROW_HEIGHT 이상)
        float totalHeight = Math.max(ROW_HEIGHT, lineHeight * lines.size() + 6); // 상하 여백 3씩 추가

        // 셀 배경 그리기
        drawCellBackground(stream, x, y, width, totalHeight, isHead);

        // 텍스트 그리기
        drawCellText(stream, x, y, width, totalHeight, lines, font, fontSize);

        return totalHeight;
    }

    /**
     * 텍스트 유형에 따라 표시 형식 가공
     * 숫자, 바이트, 시간, 퍼센트 등 다양한 형식으로 변환
     *
     * @param text     원본 텍스트
     * @param textType 텍스트 유형 (NUMBER, BYTE, TIME, PERCENT 등)
     * @return 가공된 텍스트
     */
    public String processText(String text, ReportVO.ReportColumnType textType) {
        // 텍스트가 비어있거나 null인 경우 대시 표시
        if (text == null || text.trim().isEmpty()) {
            return "-";
        }

        // 탭 문자와 기타 제어 문자 처리
        text = sanitizeText(text);

        // 텍스트 유형이 null인 경우 원본 텍스트 반환
        if (textType == null) {
            return text;
        }

        // 텍스트 유형에 따라 텍스트 형식 가공
        try {
            NumberFormat numberFormat = NumberFormat.getNumberInstance(Locale.US);

            return switch (textType) {
                case NUMBER -> {
                    // 숫자 형식으로 변환 (소수점 반올림)
                    double value = Double.parseDouble(text);
                    yield numberFormat.format(Math.round(value));
                }
                case DECIMAL -> {
                    // 숫자 형식으로 변환 (소수점 4자리까지)
                    double value = Double.parseDouble(text);
                    DecimalFormat decimalFormat = new DecimalFormat("#.####"); // 소수점 4자리까지
                    yield decimalFormat.format(value);
                }
                case BYTE -> // 바이트 단위 변환 (KB → MB, MB → GB)
                        CommonUtil.convertMem("kb", text);
                case TIME -> {
                    // 시간 형식으로 변환 (밀리초 → 가독성 있는 형식)
                    double value = Double.parseDouble(text);
                    yield CommonUtil.convertTime(Math.round(value), true, false, true);
                }
                case PERCENT -> {
                    // 퍼센트 형식으로 변환 (소수점 반올림 후 % 추가)
                    double value = Double.parseDouble(text);
                    yield Math.round(value) + "%";
                }
                default -> text; // 기본값은 원본 텍스트 유지
            };
        } catch (NumberFormatException e) {
            // 숫자 변환 실패 시 원본 텍스트 유지하고 로그 기록
            log.warn("숫자 변환 실패 (텍스트: '{}', 유형: '{}'): {}", text, textType, e.getMessage());
            return text;
        }
    }

    /**
     * 텍스트에서 PDF 폰트가 지원하지 않는 제어 문자들을 처리
     * 탭 문자는 공백으로 변환하고, 기타 제어 문자는 제거
     *
     * @param text 원본 텍스트
     * @return 정제된 텍스트
     */
    public String sanitizeText(String text) {
        if (text == null) {
            return null;
        }

        // 탭 문자를 공백으로 변환
        text = text.replace('\t', ' ');
        
        // 기타 제어 문자 제거 (개행 문자는 유지)
        // U+0000 ~ U+001F 범위의 제어 문자 중 탭(\t), 개행(\n), 캐리지 리턴(\r)을 제외하고 제거
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) {
            if (c >= 32 || c == '\n' || c == '\r') {
                sb.append(c);
            }
            // 탭 문자는 이미 공백으로 변환했으므로 여기서는 처리하지 않음
        }
        
        return sb.toString();
    }

    /**
     * 셀 배경과 테두리 그리기
     * 헤더 셀은 배경색이 있고, 데이터 셀은 테두리만 있음
     *
     * @param stream PDF 페이지 컨텐츠 스트림
     * @param x      셀의 x 좌표 (좌상단)
     * @param y      셀의 y 좌표 (좌상단)
     * @param width  셀의 너비
     * @param height 셀의 높이
     * @param isHead 헤더 여부 (true: 헤더, false: 데이터)
     * @throws IOException 스트림 처리 중 오류 발생 시
     */
    public void drawCellBackground(PDPageContentStream stream, float x, float y, float width, float height, boolean isHead) throws IOException {
        // 셀 영역 정의 (좌표계는 좌하단이 원점, y축은 위로 증가)
        stream.addRect(x, y, width, -height);

        // 셀 스타일 설정
        stream.setLineWidth(0.5f);                  // 셀 테두리 선 굵기
        stream.setStrokingColor(Color.black);       // 셀 테두리 선 색상

        if (isHead) {
            // 헤더 셀인 경우 배경색 설정
            stream.setNonStrokingColor(Color.lightGray);
            stream.fillAndStroke();                 // 배경색 채우기 및 테두리 그리기
        } else {
            // 데이터 셀인 경우 테두리만 그리기
            stream.stroke();
        }
    }

    /**
     * 셀 내부에 텍스트 그리기 (여러 줄 지원)
     *
     * @param stream   PDF 페이지 컨텐츠 스트림
     * @param x        셀의 x 좌표
     * @param y        셀의 y 좌표
     * @param width    셀의 너비
     * @param height   셀의 높이
     * @param lines    그릴 텍스트 라인 목록
     * @param font     사용할 폰트
     * @param fontSize 폰트 크기
     */
    public void drawCellText(PDPageContentStream stream, float x, float y, float width, float height,
                             List<String> lines, PDType0Font font, int fontSize) throws IOException {
        stream.setFont(font, fontSize);
        stream.setNonStrokingColor(Color.black);

        float lineHeight = font.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * fontSize + 2;

        // 텍스트 세로 중앙 정렬을 위한 시작 위치 계산
        float totalTextHeight = lineHeight * lines.size();
        float verticalOffset = (height - totalTextHeight) / 2;
        float startY = y - verticalOffset - lineHeight / 2; // 상단 여백 조정

        for (int i = 0; i < lines.size(); i++) {
            stream.beginText();
            stream.newLineAtOffset(x + 5, startY - (i * lineHeight) - 3);
            stream.showText(lines.get(i));
            stream.endText();
        }
    }

    /**
     * 텍스트 작성
     *
     * @param stream   PDF 페이지 컨텐츠 스트림
     * @param font     폰트
     * @param fontSize 폰트 사이즈
     * @param x        텍스트 X 좌표
     * @param y        텍스트 Y 좌표
     * @param text     텍스트 내용
     */
    public void writeText(PDPageContentStream stream, PDType0Font font, int fontSize, float x, float y, String text) throws IOException {
        stream.beginText();
        stream.setFont(font, fontSize);
        stream.newLineAtOffset(x, y);
        stream.showText(text);
        stream.endText();
    }

    /**
     * 조회된 데이터 없음 안내문
     *
     * @param stream   PDF 페이지 컨텐츠 스트림
     * @param page     PDF 페이지 정보
     * @param font     폰트
     * @param fontSize 폰트 사이즈
     */
    public void noDataText(PDPageContentStream stream, PDPage page, PDType0Font font, int fontSize) throws IOException {
        String NO_DATA_TITLE = "There is no data in this item.";

        float titleWidth = font.getStringWidth(NO_DATA_TITLE) / 1000 * fontSize; // 타이틀 길이
        float titleHeight = font.getFontDescriptor().getFontBoundingBox().getHeight() / 1000 * fontSize; // 타이틀 높이

        stream.beginText();
        stream.setFont(font, fontSize);
        stream.newLineAtOffset((page.getMediaBox().getWidth() - titleWidth) / 2, (page.getMediaBox().getHeight() - titleHeight) / 2); // 가운데 정렬
        stream.showText(NO_DATA_TITLE);
        stream.endText();
    }

    /**
     * 주어진 너비에 맞게 텍스트를 줄바꿈하고 필요한 높이를 계산
     *
     * @param text     표시할 텍스트
     * @param width    셀의 너비
     * @param font     사용할 폰트
     * @param fontSize 폰트 크기
     * @return 줄바꿈된 텍스트 라인 목록
     * @throws IOException 폰트 처리 중 오류 발생 시
     */
    public List<String> calculateWrappedText(String text, float width, PDType0Font font, int fontSize) throws IOException {
        List<String> lines = new ArrayList<>();
        float availableWidth = width - 10; // 좌우 여백 5씩 고려

        // 텍스트가 없거나 null인 경우 대시 표시
        if (text == null || text.isEmpty()) {
            lines.add("-");
            return lines;
        }

        // 공백이 있는 경우 단어 단위로 처리
        if (text.contains(" ")) {
            processTextWithSpaces(text, availableWidth, font, fontSize, lines);
        } else {
            // 공백이 없는 텍스트는 문자 단위로 처리
            processLongWord(text, availableWidth, font, fontSize, lines);
        }

        return lines;
    }

    /**
     * 공백이 있는 텍스트를 단어 단위로 처리하여 줄바꿈
     *
     * @param text           처리할 텍스트
     * @param availableWidth 가용 너비
     * @param font           사용할 폰트
     * @param fontSize       폰트 크기
     * @param lines          결과 라인 목록 (이 목록에 줄바꿈된 텍스트가 추가됨)
     * @throws IOException 폰트 처리 중 오류 발생 시
     */
    public void processTextWithSpaces(String text, float availableWidth, PDType0Font font, int fontSize, List<String> lines) throws IOException {
        String[] words = text.split(" ");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            // 단어 자체가 너무 길면 먼저 처리
            float wordWidth;
            try {
                wordWidth = font.getStringWidth(word) / 1000 * fontSize;
            } catch (IllegalArgumentException e) {
                // 폰트에서 지원하지 않는 문자가 있는 경우 추가 정제 후 재시도
                log.warn("Unsupported characters found on font, text purification and retrying: {}", e.getMessage());
                word = sanitizeText(word);
                wordWidth = font.getStringWidth(word) / 1000 * fontSize;
            }
            
            if (wordWidth > availableWidth) {
                // 현재 라인이 있으면 먼저 추가
                if (!currentLine.isEmpty()) {
                    lines.add(currentLine.toString());
                    currentLine = new StringBuilder();
                }

                // 긴 단어는 별도 처리
                processLongWord(word, availableWidth, font, fontSize, lines);
                continue;
            }

            // 현재 라인 + 새 단어의 너비 계산
            String lineWithWord = !currentLine.isEmpty()
                    ? currentLine + " " + word
                    : word;

            float lineWidth;
            try {
                lineWidth = font.getStringWidth(lineWithWord) / 1000 * fontSize;
            } catch (IllegalArgumentException e) {
                // 폰트에서 지원하지 않는 문자가 있는 경우 추가 정제 후 재시도
                log.warn("Unsupported characters found on font, text purification and retrying: {}", e.getMessage());
                lineWithWord = sanitizeText(lineWithWord);
                lineWidth = font.getStringWidth(lineWithWord) / 1000 * fontSize;
            }

            if (lineWidth > availableWidth) {
                // 현재 라인 추가하고 새 라인 시작
                if (!currentLine.isEmpty()) {
                    lines.add(currentLine.toString());
                    currentLine = new StringBuilder(word);
                } else {
                    currentLine = new StringBuilder(word);
                }
            } else {
                // 현재 라인에 단어 추가
                currentLine = new StringBuilder(lineWithWord);
            }
        }

        // 마지막 라인 추가
        if (!currentLine.isEmpty()) {
            lines.add(currentLine.toString());
        }
    }

    /**
     * 긴 단어나 공백 없는 텍스트를 처리하는 헬퍼 메서드
     * 텍스트를 한 글자씩 처리하여 가용 너비에 맞게 줄바꿈
     *
     * @param word           처리할 텍스트
     * @param availableWidth 가용 너비
     * @param font           사용할 폰트
     * @param fontSize       폰트 크기
     * @param lines          결과 라인 목록 (이 목록에 줄바꿈된 텍스트가 추가됨)
     * @throws IOException 폰트 처리 중 오류 발생 시
     */
    public void processLongWord(String word, float availableWidth, PDType0Font font, int fontSize, List<String> lines) throws IOException {
        // 특수 문자 기준 분할 대신 순수하게 너비 기준으로만 처리
        StringBuilder currentPart = new StringBuilder();

        // 한 글자씩 처리
        for (char c : word.toCharArray()) {
            currentPart.append(c);
            float partWidth;
            try {
                partWidth = font.getStringWidth(currentPart.toString()) / 1000 * fontSize;
            } catch (IllegalArgumentException e) {
                // 폰트에서 지원하지 않는 문자가 있는 경우 해당 문자를 건너뛰고 계속 진행
                log.warn("Unsupported characters found on font, text purification and retrying: {} (word: {})", e.getMessage(), c);
                currentPart.deleteCharAt(currentPart.length() - 1); // 문제가 된 문자 제거
                continue;
            }

            // 너비가 가용 너비를 초과하면 줄바꿈
            if (partWidth > availableWidth) {
                if (currentPart.length() > 1) {
                    // 마지막 문자를 제외하고 추가
                    lines.add(currentPart.substring(0, currentPart.length() - 1));
                    currentPart = new StringBuilder().append(c);
                } else {
                    // 한 문자가 너비를 초과하는 경우 (드문 경우)
                    // 그래도 추가하고 다음 줄로 넘어감
                    lines.add(currentPart.toString());
                    currentPart = new StringBuilder();
                }
            }
        }

        // 남은 부분 처리
        if (!currentPart.isEmpty()) {
            lines.add(currentPart.toString());
        }
    }

    /**
     * 페이지 넘침 확인 및 처리 함수
     * 현재 위치가 페이지 하단 여백에 도달하면 새 페이지를 생성
     *
     * @param document  PDF 문서
     * @param stream    현재 페이지의 컨텐츠 스트림
     * @param yPos      현재 Y 위치
     * @param rowHeight 추가할 행의 높이
     * @param page      현재 페이지
     * @param baseFont  기본 폰트
     * @param boldFont  볼드 폰트
     * @return 새 Y 위치 (새 페이지인 경우 새 페이지의 시작 위치, 아니면 기존 위치)
     * @throws IOException 스트림 처리 중 오류 발생 시
     */
    public float checkPageOverflow(PDDocument document, PDPageContentStream stream, float yPos, float rowHeight, PDPage page, PDType0Font baseFont, PDType0Font boldFont) throws IOException {
        float minY = MARGIN; // 페이지 하단 여백

        if (yPos - rowHeight < minY) {
            // 현재 스트림 닫기
            stream.close();

            // 새 페이지 추가
            PDPage newPage = new PDPage(PDRectangle.A4);
            document.addPage(newPage);

            // 새 스트림 생성
            PDPageContentStream newStream = new PDPageContentStream(document, newPage);

            // 새 페이지 시작 위치
            float newYPos = newPage.getMediaBox().getHeight() - MARGIN;

            return newYPos;
        }

        return yPos;
    }

    /**
     * 고정 높이로 셀 그리기
     * 모든 셀이 동일한 높이를 가지도록 하기 위해 사용
     *
     * @param stream      PDF 페이지 컨텐츠 스트림
     * @param x           셀의 x 좌표
     * @param y           셀의 y 좌표
     * @param width       셀의 너비
     * @param text        셀에 표시할 텍스트
     * @param textType    텍스트 타입 (숫자, 바이트, 시간 등)
     * @param isHead      헤더 여부 (true: 헤더, false: 데이터)
     * @param font        사용할 폰트
     * @param fontSize    폰트 크기
     * @param fixedHeight 고정 높이 값
     * @throws IOException 스트림 처리 중 오류 발생 시
     */
    public void drawCellWithFixedHeight(PDPageContentStream stream, float x, float y, float width, String text,
                                        ReportVO.ReportColumnType textType, Boolean isHead, PDType0Font font, int fontSize, float fixedHeight) throws IOException {
        // 텍스트 처리 (숫자, 바이트, 시간 등의 형식 변환)
        String processedText = processText(text, textType);

        // 텍스트 줄바꿈 계산
        List<String> lines = calculateWrappedText(processedText, width, font, fontSize);

        // 셀 배경 그리기
        drawCellBackground(stream, x, y, width, fixedHeight, isHead);

        // 텍스트 그리기
        drawCellText(stream, x, y, width, fixedHeight, lines, font, fontSize);
    }

    /**
     * 컬럼 너비 계산 - 비율에 따라 계산
     * 각 컬럼의 'width' 속성에 지정된 비율에 따라 전체 테이블 너비를 분배
     *
     * @param tableWidth 전체 테이블 너비 (픽셀 단위)
     * @param columnList 컬럼 정보가 담긴 맵 목록 (각 맵은 'width' 키로 비율 값을 가질 수 있음)
     * @return 각 컬럼의 실제 너비 배열 (픽셀 단위)
     */
    public float[] calculateColumnWidths(float tableWidth, List<Map<String, Object>> columnList) {
        float[] widths = new float[columnList.size()];

        // 컬럼 목록이 비어있는 경우 처리
        if (columnList.isEmpty()) {
            return widths;
        }

        // 1. 총 비율 합계 계산
        int totalPercent = 0;
        for (Map<String, Object> column : columnList) {
            // 'width' 키가 있으면 해당 값 사용, 없으면 0
            int widthPercent = column.containsKey("width") ? (int) column.get("width") : 0;

            // 비율이 지정되지 않은 경우 기본값 10% 사용
            if (widthPercent <= 0) {
                widthPercent = 10;
            }

            totalPercent += widthPercent;
        }

        // 2. 각 컬럼의 너비 계산 (전체 너비에서 비율에 따라 분배)
        for (int i = 0; i < columnList.size(); i++) {
            Map<String, Object> column = columnList.get(i);
            int widthPercent = column.containsKey("width") ? (int) column.get("width") : 10;

            // 비율에 따른 너비 계산 (전체 너비 * 컬럼 비율 / 총 비율)
            widths[i] = tableWidth * widthPercent / totalPercent;
        }

        return widths;
    }
}