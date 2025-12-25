package com.thinkm.maxy.dto.front.management.page;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@RequiredArgsConstructor
public class DeletePagesRequestDto {
    private List<MarkPagesRequestDto> items;
}
