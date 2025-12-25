package com.thinkm.maxy.controller.front;

import com.thinkm.common.config.audit.AuditType;
import com.thinkm.common.config.audit.Auditable;
import com.thinkm.common.exception.AuthException;
import com.thinkm.maxy.dto.front.management.page.DeletePagesRequestDto;
import com.thinkm.maxy.dto.front.management.page.MarkPagesRequestDto;
import com.thinkm.maxy.dto.front.management.page.PageListRequestDto;
import com.thinkm.maxy.dto.front.management.page.PageListResponseDto;
import com.thinkm.maxy.service.front.FrontPageManagementService;
import com.thinkm.maxy.vo.FrontUrl;
import com.thinkm.maxy.vo.MaxyUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;

@Slf4j
@RestController
@RequestMapping("/fm/0303")
@RequiredArgsConstructor
@Tag(name = "Front Page Management", description = "페이지 즐겨찾기 관리 API")
public class FrontPageManagementController {

    private final FrontPageManagementService service;

    @Operation(summary = "페이지 즐겨찾기 관리 화면", description = "front/management/page 뷰 페이지로 이동")
    @Auditable(action = AuditType.NAVIGATION, method = "페이지 관리")
    @GetMapping(value = "/view.maxy")
    public ModelAndView goGroupManagementView() {
        return new ModelAndView("front/management/page");
    }

    @PostMapping(value = "/pages.maxy")
    public ResponseEntity<PageListResponseDto> getPages(HttpServletRequest request, PageListRequestDto dto) {
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }
        Long userNo = user.getUserNo();
        if (userNo != null) {
            dto.withUserNo(userNo);
        } else {
            throw new AuthException();
        }

        PageListResponseDto result = service.getUrls(dto.getType(), dto);

        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/{type}/mark.maxy")
    public ResponseEntity<?> markPage(HttpServletRequest request,
                                      @PathVariable String type,
                                      MarkPagesRequestDto dto) {
        FrontUrl.Type markType = FrontUrl.Type.valueOf(type.toUpperCase());
        MaxyUser user = MaxyUser.getMaxyUserFromSessionInfo(request);
        if (user == null) {
            throw new AuthException();
        }
        Long userNo = user.getUserNo();
        if (userNo != null) {
            dto.withUserNo(userNo);
        } else {
            throw new AuthException();
        }

        service.mark(markType, dto);

        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/{type}/delete.maxy")
    public ResponseEntity<?> deletePages(@PathVariable String type, @RequestBody DeletePagesRequestDto dto) {
        FrontUrl.Type markType = FrontUrl.Type.valueOf(type.toUpperCase());
        service.delete(markType, dto);

        return ResponseEntity.ok().build();
    }
}