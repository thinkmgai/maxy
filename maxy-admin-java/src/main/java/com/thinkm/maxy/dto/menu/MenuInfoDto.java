package com.thinkm.maxy.dto.menu;

import com.thinkm.maxy.vo.MenuVO;

import java.util.List;

public record MenuInfoDto(
        String menuId,
        String menuNm,
        String menuUrl,
        Integer grpLevel,
        String appType) {
    private static MenuInfoDto of(MenuVO vo) {
        return new MenuInfoDto(vo.getMenuId(),
                vo.getMenuNm(),
                vo.getMenuUrl(),
                vo.getGrpLevel(),
                vo.getAppType());
    }

    public static List<MenuInfoDto> of(List<MenuVO> voList) {
        return voList.stream().map(MenuInfoDto::of).toList();
    }
}
