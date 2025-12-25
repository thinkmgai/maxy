package com.thinkm.common.util.sourcemap;

public record OriginalPosition(String source, int line, int column, String name, int sourceIndex, String snippet) {
}