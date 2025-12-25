package com.thinkm.maxy.controller.front;

import com.thinkm.MaxyVersion;
import com.thinkm.common.code.CommonCode;
import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.service.common.MenuService;
import com.thinkm.maxy.vo.MaxyUser;
import com.thinkm.maxy.vo.MenuVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/fm/0000")
@RequiredArgsConstructor
@Tag(name = "Front Management", description = "관리 API")
public class FrontManagementController {
    private final MenuService menuService;

    @Operation(summary = "그룹 관리 화면", description = "front/management/management 뷰 페이지로 이동")
    @Auditable(action = AuditType.NAVIGATION, method = "관리")
    @GetMapping(value = "/view.maxy")
    public ModelAndView goGroupManagementView(HttpServletRequest request) throws Exception {
        ModelAndView mv = new ModelAndView("front/management/management");
        MaxyUser maxyUser = (MaxyUser) request.getSession().getAttribute(CommonCode.loginUserKey());
        MenuVO vo = MenuVO.builder()
                .roleGbn(maxyUser.getRoleGbn())
                .build();
        List<MenuVO> menuList = menuService.getFrontGroupManagementMenuList(vo);
        mv.addObject("menuList", JsonUtil.toJson(menuList));
        mv.addObject("version", "v" + MaxyVersion.VERSION.getVersion());
        return mv;
    }
}