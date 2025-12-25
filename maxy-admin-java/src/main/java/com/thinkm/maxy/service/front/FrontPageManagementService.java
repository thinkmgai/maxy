package com.thinkm.maxy.service.front;

import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.front.management.page.DeletePagesRequestDto;
import com.thinkm.maxy.dto.front.management.page.MarkPagesRequestDto;
import com.thinkm.maxy.dto.front.management.page.PageListRequestDto;
import com.thinkm.maxy.dto.front.management.page.PageListResponseDto;
import com.thinkm.maxy.mapper.FrontCommonMapper;
import com.thinkm.maxy.vo.FrontUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 프런트 관리자 화면에서 사용하는 페이지 즐겨찾기 관리 기능을 담당하는 서비스입니다.
 * <p>DB에 저장된 URL 즐겨찾기 목록을 조회하고, 즐겨찾기/삭제 요청을 페이지 서비스에 위임합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FrontPageManagementService {

    private final FrontCommonMapper frontCommonMapper;
    private final FrontPageService frontPageService;

    /**
     * 사용자별 즐겨찾기 페이지 목록을 조회해 응답 DTO로 변환한다.
     *
     * @param dto 조회 조건 DTO
     * @return 즐겨찾기 페이지 상세 목록
     */
    public PageListResponseDto getUrls(FrontUrl.Type type, PageListRequestDto dto) {
        FrontUrl param = new FrontUrl(dto.getPackageNm(), dto.getServerType(), type, dto.getUserNo());
        List<FrontUrl> urlList = frontCommonMapper.selectAllUrl(param);
        List<PageListResponseDto.PageDetail> result = new ArrayList<>();
        if (urlList == null) {
            return new PageListResponseDto();
        }
        for (FrontUrl item : urlList) {
            result.add(JsonUtil.convertValue(item, PageListResponseDto.PageDetail.class));
        }

        return new PageListResponseDto(result);
    }

    /**
     * 단일 페이지의 즐겨찾기 여부를 갱신한다.
     *
     * @param dto 즐겨찾기 대상 및 상태를 담은 DTO
     */
    public void mark(FrontUrl.Type type, MarkPagesRequestDto dto) {
        frontPageService.mark(dto.getPackageNm(),
                dto.getServerType(),
                type,
                dto.getUserNo(),
                dto.getReqUrl(),
                dto.isMark());
    }

    /**
     * 전달받은 URL 목록을 일괄 삭제한다.
     *
     * @param dto 삭제 대상 목록 DTO
     */
    public void delete(FrontUrl.Type type, DeletePagesRequestDto dto) {
        frontPageService.deleteMarkUrl(dto.getItems(), type);
    }
}
