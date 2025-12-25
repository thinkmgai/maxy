package com.thinkm.maxy.service.common;

import com.thinkm.common.code.AuthCode;
import com.thinkm.common.code.CommonCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.maxy.mapper.MenuMapper;
import com.thinkm.maxy.vo.MenuVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MenuServiceTest {

    @Mock
    private MenuMapper menuMapper;

    @InjectMocks
    private MenuService menuService;

    @Test
    void 전체메뉴조회시_권한명주입() {
        MenuVO menu = new MenuVO();
        menu.setRoleGbn(AuthCode.ADMIN_SUPER.getValue());
        when(menuMapper.selectAllMenuList()).thenReturn(List.of(menu));

        List<MenuVO> result = menuService.getAllMenuList();

        assertEquals(AuthCode.ADMIN_SUPER.getName(), result.get(0).getRoleNm());
    }

    @Test
    void 메뉴없으면_예외() {
        when(menuMapper.selectMenuListByMenuId(any())).thenReturn(new MenuVO());

        assertThrows(BadRequestException.class,
                () -> menuService.updateMenuList(mock(HttpServletRequest.class), new MenuVO()));
    }

    @Test
    void 정렬및삭제플래그_적용() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        MenuVO menuFromDb = new MenuVO();
        menuFromDb.setMenuId("MENU001");
        menuFromDb.setMenuUrl("");
        when(menuMapper.selectMenuListByMenuId(any())).thenReturn(menuFromDb);

        MenuVO input = Mockito.spy(new MenuVO());
        input.setOrderSeq(2);
        input.setDeleteYn("Y");

        doNothing().when(input).setRegInfo(request);

        menuService.updateMenuList(request, input);

        verify(menuMapper).updateMenuOrderByMenuId(input);
        verify(menuMapper).updateMenuByMenuId(input);
        assertEquals("MENU001", input.getUpMenuId(), "menu without URL should propagate to children");
    }

    @Test
    void 대분류권한변경시_하위메뉴전파() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        MenuVO menuFromDb = new MenuVO();
        menuFromDb.setMenuId("ROOT");
        when(menuMapper.selectMenuListByMenuId(any())).thenReturn(menuFromDb);

        MenuVO child1 = new MenuVO();
        child1.setMenuId("CHILD1");
        MenuVO child2 = new MenuVO();
        child2.setMenuId("CHILD2");
        when(menuMapper.selectMenuListByUpMenuId(any())).thenReturn(List.of(child1, child2));

        MenuVO input = Mockito.spy(new MenuVO());
        input.setGrpLevel(1);
        input.setRoleGbn(CommonCode.ROLE_GROUP_CODE.getValue());
        doNothing().when(input).setRegInfo(request);

        menuService.updateMenuList(request, input);

        verify(menuMapper, times(2)).deleteMenuRoleByMenuIdAndRoleGbn(input);
        verify(menuMapper, times(2)).insertMenuRole(input);
        assertThat(input.getRoleGbnList())
                .containsExactlyInAnyOrder(CommonCode.ROLE_ADMIN_CODE.getValue(), CommonCode.ROLE_GROUP_CODE.getValue());
    }

    @Test
    void 대분류권한변경시하위없으면_예외() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(menuMapper.selectMenuListByMenuId(any())).thenReturn(new MenuVO() {{
            setMenuId("ROOT");
        }});
        when(menuMapper.selectMenuListByUpMenuId(any())).thenReturn(List.of());

        MenuVO input = Mockito.spy(new MenuVO());
        input.setGrpLevel(1);
        input.setRoleGbn(CommonCode.ROLE_GROUP_CODE.getValue());
        doNothing().when(input).setRegInfo(request);

        assertThrows(BadRequestException.class, () -> menuService.updateMenuList(request, input));
    }
}
