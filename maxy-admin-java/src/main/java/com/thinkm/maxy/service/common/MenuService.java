package com.thinkm.maxy.service.common;

import com.thinkm.common.code.AuthCode;
import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.maxy.mapper.MenuMapper;
import com.thinkm.maxy.vo.MenuVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MenuService {

    @Resource
    private final MenuMapper menuMapper;

    public List<MenuVO> getAllMenuList() {
        List<MenuVO> menuList = menuMapper.selectAllMenuList();

        for (MenuVO menu : menuList) {
            menu.setRoleNm(AuthCode.getNameByValue(menu.getRoleGbn()));
        }

        return menuList;
    }

    /**
     * 그룹관리자의 관리 메뉴 목록 조회
     *
     * @return 그룹 관리자 관리 메뉴 목록
     */
    public List<MenuVO> getGroupManagementMenuList(MenuVO vo) {
        return menuMapper.selectGroupManagementMenuList(vo);
    }

    /**
     * 그룹관리자의 관리 메뉴 목록 조회
     *
     * @return 그룹 관리자 관리 메뉴 목록
     */
    public List<MenuVO> getFrontGroupManagementMenuList(MenuVO vo) {
        return menuMapper.selectFrontGroupManagementMenuList(vo);
    }


    /**
     * 슈퍼관리자의 관리 메뉴 목록 조회
     *
     * @return 슈퍼 관리자 관리 메뉴 목록
     */
    public List<MenuVO> getSystemManagementMenuList() {
        return menuMapper.selectSystemManagementMenuList();
    }

    /**
     * 메뉴 권한 수정
     *
     * @param request {@link HttpServletRequest}
     * @param vo      {@link MenuVO}
     */
    public void updateMenuList(HttpServletRequest request, MenuVO vo) {
        // 메뉴 id로 해당 메뉴 정보 가져오기
        MenuVO menu = menuMapper.selectMenuListByMenuId(vo);

        // 해당 메뉴 있는 경우만 수정
        if (StringUtils.isNotEmpty(menu.getMenuId())) {

            // regNo, regDt 세팅
            vo.setRegInfo(request);

            // 순서는 1 부터 시작
            if (vo.getOrderSeq() != null && vo.getOrderSeq() > 0) {
                menuMapper.updateMenuOrderByMenuId(vo);
            }

            // 사용여부 수정
            if (StringUtils.isNotEmpty(vo.getDeleteYn())) {
                // 관리자 메뉴는 사용여부 수정 불가
                if ("SM0000".equalsIgnoreCase(menu.getMenuId())) {
                    throw new BadRequestException(ReturnCode.ERR_AUTH_MODIFY_MENU);
                }

                // 메뉴 url 이 없으면 해당 메뉴 + 하위 메뉴 전부 update
                if (StringUtils.isEmpty(menu.getMenuUrl())) {
                    vo.setUpMenuId(menu.getMenuId());
                }

                menuMapper.updateMenuByMenuId(vo);
            }

            // 접근 권한 수정
            if (StringUtils.isNotEmpty(vo.getRoleGbn())) {

                // 슈퍼 관리자 구분자 추가 (삭제 회피)
                vo.setSuperRoleGbn(CommonCode.ROLE_ADMIN_CODE.getValue());
                // 권한 구분 세팅
                String roleGbn = vo.getRoleGbn();

                // 만약 대분류이면
                if (vo.getGrpLevel() == 1) {
                    // 하위 메뉴 권한도 변경
                    List<MenuVO> menus = menuMapper.selectMenuListByUpMenuId(vo);
                    if (!menus.isEmpty()) {
                        // 슈퍼 관리자 제외하고 삭제
                        menus.forEach(item -> {
                            vo.setMenuId(item.getMenuId());
                            menuMapper.deleteMenuRoleByMenuIdAndRoleGbn(vo);
                        });
                        // 권한 추가
                        menus.forEach(item -> {
                            vo.setMenuId(item.getMenuId());
                            modifyPermissions(vo, roleGbn);
                        });
                    } else {
                        throw new BadRequestException(ReturnCode.ERR_NO_DATA);
                    }
                } else {
                    // 슈퍼 관리자 제외하고 삭제
                    menuMapper.deleteMenuRoleByMenuIdAndRoleGbn(vo);
                    modifyPermissions(vo, roleGbn);
                }
            }
        } else {
            // 해당 메뉴 없으면 400 에러 리턴
            throw new BadRequestException(ReturnCode.ERR_NO_DATA);
        }
    }

    /**
     * 메뉴 유저 권한 변경 메서드
     *
     * @param vo      MenuVO
     * @param roleGbn 권한
     */
    private void modifyPermissions(MenuVO vo, String roleGbn) {
        // 권한 구분 목록
        List<String> roleGbnList = new ArrayList<>();
        // 슈퍼 관리자는 무조건 추가
        roleGbnList.add(CommonCode.ROLE_ADMIN_CODE.getValue());

        if (!CommonCode.ROLE_ADMIN_CODE.equals(roleGbn)) {
            // 접근권한이 그룹 (0012) 이면 그룹 추가
            if (CommonCode.ROLE_GROUP_CODE.equals(roleGbn)) {
                roleGbnList.add(CommonCode.ROLE_GROUP_CODE.getValue());
            }
            // 접근권한이 일반 (0013) 이면 일반, 그룹 모두 추가
            if (CommonCode.ROLE_GENERAL_CODE.equals(roleGbn)) {
                roleGbnList.add(CommonCode.ROLE_GROUP_CODE.getValue());
                roleGbnList.add(CommonCode.ROLE_GENERAL_CODE.getValue());
            }
        }

        vo.setRoleGbnList(roleGbnList);
        // insert 로직 수행
        menuMapper.insertMenuRole(vo);
    }
}
