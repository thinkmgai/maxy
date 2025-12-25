package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.MenuVO;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MenuMapper {

    List<MenuVO> selectMenuList(MenuVO vo);

    List<MenuVO> selectMenuListByRoleGbn(MenuVO vo);

    List<MenuVO> selectAllMenuList();

    MenuVO selectMenuListByMenuId(MenuVO vo);

    void updateMenuByMenuId(MenuVO vo);

    void deleteMenuRoleByMenuIdAndRoleGbn(MenuVO vo);

    void insertMenuRole(MenuVO vo);

    void updateMenuOrderByMenuId(MenuVO vo);

    List<MenuVO> selectMenuListByUpMenuId(MenuVO vo);

    List<MenuVO> selectGroupManagementMenuList(MenuVO vo);

    List<MenuVO> selectFrontGroupManagementMenuList(MenuVO vo);

    List<MenuVO> selectMenuRoleList(MenuVO vo);

    List<MenuVO> selectSystemManagementMenuList();
}
