package com.thinkm.maxy.controller.common;

import com.thinkm.MaxyVersion;
import com.thinkm.common.code.CommonCode;
import com.thinkm.common.code.ElasticIndex;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.service.common.MenuService;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.MenuVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Management Controller", description = "관리 화면 API 컨트롤러")
public class ManagementController {

    private final MenuService menuService;

    @Value("${maxy.production:true}")
    private boolean production;

    @Operation(summary = "그룹 관리 화면 이동",
            description = "그룹 관리 메인 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "GM0000 JSP를 반환합니다."))
    @GetMapping(value = "/gm/0000/goGroupManagementView.maxy")
    public ModelAndView goGroupManagementView(HttpServletRequest request) {
        ModelAndView mv = new ModelAndView("gm/GM0000");
        MaxyUser maxyUser = (MaxyUser) request.getSession().getAttribute(CommonCode.loginUserKey());
        MenuVO vo = MenuVO.builder()
                .roleGbn(maxyUser.getRoleGbn())
                .build();
        List<MenuVO> menuList = menuService.getGroupManagementMenuList(vo);
        mv.addObject("menuList", JsonUtil.toJson(menuList));
        mv.addObject("version", "v" + MaxyVersion.VERSION.getVersion());
        return mv;
    }

    @Operation(summary = "시스템 관리 화면 이동",
            description = "시스템 관리 메인 화면으로 이동합니다.",
            security = @SecurityRequirement(name = "JSESSIONID"))
    @ApiResponses(@ApiResponse(responseCode = "200", description = "SM0000 JSP를 반환합니다."))
    @GetMapping(value = "/sm/0000/goSystemManagementView.maxy")
    public ModelAndView goSystemManagementView() {
        ModelAndView mv = new ModelAndView("sm/SM0000");
        List<MenuVO> menuList = menuService.getSystemManagementMenuList();
        mv.addObject("menuList", JsonUtil.toJson(menuList));
        mv.addObject("version", "v" + MaxyVersion.VERSION.getVersion());
        mv.addObject("prod", production);
        if (!production) {
            mv.addObject("indices", ElasticIndex.values());
        }
        return mv;
    }
}
