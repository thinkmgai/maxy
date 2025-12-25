package com.thinkm.maxy.service.front;

import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.front.common.AppInfoRequestDto;
import com.thinkm.maxy.dto.front.management.sessionreplay.BlockTargetRequestDto;
import com.thinkm.maxy.dto.front.management.sessionreplay.BlockTargetResponseDto;
import com.thinkm.maxy.mapper.SessionReplayBlockMapper;
import com.thinkm.maxy.vo.SessionReplayBlockTargetVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FrontSessionReplayBlockService {

    private final SessionReplayBlockMapper sessionReplayBlockMapper;

    /**
     * 세션 리플레이 차단 대상 목록 조회
     */
    public BlockTargetResponseDto getBlockTargets(AppInfoRequestDto dto) {
        SessionReplayBlockTargetVO param = new SessionReplayBlockTargetVO();
        param.setPackageNm(dto.getPackageNm());
        param.setServerType(dto.getServerType());
        
        List<SessionReplayBlockTargetVO> voList = sessionReplayBlockMapper.selectBlockTargets(param);
        
        List<BlockTargetResponseDto.BlockTargetDetail> result = new ArrayList<>();
        if (voList != null) {
            for (SessionReplayBlockTargetVO vo : voList) {
                result.add(JsonUtil.convertValue(vo, BlockTargetResponseDto.BlockTargetDetail.class));
            }
        }
        
        return new BlockTargetResponseDto(result);
    }

    /**
     * 세션 리플레이 차단 대상 추가 (단건)
     */
    @Transactional
    public void addBlockTarget(BlockTargetRequestDto dto, Long regNo) {
        String now = java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .format(java.time.LocalDateTime.now());
        
        SessionReplayBlockTargetVO vo = new SessionReplayBlockTargetVO();
        vo.setPackageNm(dto.getPackageNm());
        vo.setServerType(dto.getServerType());
        vo.setSelector(dto.getSelector());
        vo.setTarget(dto.getTarget());
        vo.setRemark(dto.getRemark());
        vo.setRegDt(now);
        vo.setRegNo(regNo);
        
        sessionReplayBlockMapper.insertBlockTarget(vo);
    }

    /**
     * 세션 리플레이 차단 대상 수정 (단건)
     */
    @Transactional
    public void updateBlockTarget(BlockTargetRequestDto dto, Long regNo) {
        String now = java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .format(java.time.LocalDateTime.now());
        
        SessionReplayBlockTargetVO vo = new SessionReplayBlockTargetVO();
        vo.setSeq(dto.getSeq());
        vo.setSelector(dto.getSelector());
        vo.setTarget(dto.getTarget());
        vo.setRemark(dto.getRemark());
        vo.setRegDt(now);
        vo.setRegNo(regNo);
        
        sessionReplayBlockMapper.updateBlockTarget(vo);
    }

    /**
     * 세션 리플레이 차단 대상 삭제 (다건)
     */
    @Transactional
    public void deleteBlockTargets(List<Long> seqs) {
        if (seqs == null || seqs.isEmpty()) {
            return;
        }
        
        List<SessionReplayBlockTargetVO> voList = seqs.stream()
            .map(seq -> {
                SessionReplayBlockTargetVO vo = new SessionReplayBlockTargetVO();
                vo.setSeq(seq);
                return vo;
            })
            .collect(Collectors.toList());
        
        sessionReplayBlockMapper.deleteBlockTargets(voList);
    }
}
