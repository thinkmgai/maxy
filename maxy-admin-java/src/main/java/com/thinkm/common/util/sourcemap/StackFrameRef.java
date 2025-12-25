package com.thinkm.common.util.sourcemap;

public record StackFrameRef(String file, int line, int column, String raw) {
}