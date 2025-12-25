package com.thinkm.maxy.service.common;

import com.google.gson.reflect.TypeToken;
import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.maxy.dto.batch.JobStatusResponseDto;
import com.thinkm.maxy.mapper.BatchInfoMapper;
import com.thinkm.maxy.vo.BatchHistoryVO;
import com.thinkm.maxy.vo.BatchInfoVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BatchService {

    private static final Type stringMapToken = new TypeToken<Map<String, String>>() {
    }.getType();
    private static final Type typeToken = new TypeToken<List<JobStatusResponseDto>>() {
    }.getType();

    private final BatchInfoMapper mapper;
    private final RestTemplate restTemplate;

    @Value("${network.batch.url}")
    private String batchUrl;

    /**
     * 배치 등록
     *
     * @param vo {@link BatchInfoVO}
     */
    public void insertMaxyBatchInfo(BatchInfoVO vo) {
        mapper.insertMaxyBatchInfo(vo);
    }

    /**
     * 배치 수정
     *
     * @param vo {@link BatchInfoVO}
     */
    public void updateBatchJobs(BatchInfoVO vo) {
        mapper.updateBatchJobs(vo);
    }

    /**
     * 배치 수동수행 수정
     *
     * @param vo {@link BatchInfoVO}
     */
    public void updateMaxyBatchType(BatchInfoVO vo) {
        mapper.updateMaxyBatchType(vo);
    }

    /**
     * 배치 History 정보 가져오기
     *
     * @param vo {@link BatchHistoryVO}
     * @return batchHistoryList
     */
    public List<BatchHistoryVO> getBatchHistory(BatchHistoryVO vo) {
        return mapper.selectBatchHistory(vo);
    }

    /**
     * 배치 히스토리 삭제
     *
     * @param vo {@link BatchHistoryVO}
     */
    public void deleteMaxyBatchHistory(BatchHistoryVO vo) {
        setBatchRunIdList(vo);
        mapper.deleteMaxyBatchHistory(vo);

    }

    /**
     * 히스토리 삭제를 위한 batchRunId 배열 세팅
     *
     * @param vo {@link BatchHistoryVO}
     */
    public void setBatchRunIdList(BatchHistoryVO vo) {
        String batchRunId = String.valueOf(vo.getBatchRunIds());

        long[] batchRunIdArr = Arrays.stream(batchRunId.split(",")).mapToLong(Long::parseLong)
                .toArray();

        ArrayList<Long> batchRunIdList = (ArrayList<Long>) Arrays.stream(batchRunIdArr)
                .boxed()
                .collect(Collectors.toList());

        vo.setBatchRunIdList(batchRunIdList);
    }

    public List<BatchHistoryVO> findEndlessBatchHistory() {
        return mapper.selectBatchHistoryListWithEndDtIsNull();
    }

    public void deleteBatchJob(BatchInfoVO vo) {
        if (vo.getId() != null && vo.getId() >= 0) {
            mapper.deleteBatchJob(vo);
        } else {
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }
    }

    public List<BatchInfoVO> getBatchJobList(BatchInfoVO vo) {
        List<BatchInfoVO> result = mapper.selectMaxyBatchJobs(vo);

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(batchUrl + "/jobs/all", String.class);
            List<JobStatusResponseDto> list = JsonUtil.fromJson(response.getBody(), typeToken);
            if (list != null && !list.isEmpty()) {

                list.forEach(item -> {
                    if ("NORMAL".equalsIgnoreCase(item.getState())) {
                        return;
                    }
                    try {
                        log.debug("item id: {}, state: {}", item.getJobName(), item.getState());
                        Long jobId = Long.parseLong(item.getJobName().split("_")[1]);
                        result.stream()
                                .filter(r -> r.getId().equals(jobId))
                                .findFirst()
                                .ifPresent(r -> r.setBatchYn("N"));
                    } catch (NumberFormatException e) {
                        log.error(e.getMessage(), e);
                    }
                });
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }

        return result;
    }

    public void runBatch(Long id) {
        ResponseEntity<String> response = restTemplate.postForEntity(batchUrl + "/jobs/" + id + "/run", null, String.class);
        int status = response.getStatusCodeValue();
        if (status != 200) {
            log.error("Batch run failed. status: {}", status);
        } else {
            log.debug("Batch run success. status: {}", status);
        }
        String body = response.getBody();
        if (body != null && !body.isEmpty()) {
            log.debug("Batch run response: {}", body);
        } else {
            log.debug("Batch run response is empty.");
        }
    }

    public void stopBatch(Long id) {
        ResponseEntity<String> response = restTemplate.postForEntity(batchUrl + "/jobs/" + id + "/stop", null, String.class);
        int status = response.getStatusCodeValue();
        if (status != 200) {
            log.error("Batch stop failed. status: {}", status);
        } else {
            log.debug("Batch stop success. status: {}", status);
        }
        String body = response.getBody();
        if (body != null && !body.isEmpty()) {
            log.debug("Batch stop response: {}", body);
        } else {
            log.debug("Batch stop response is empty.");
        }
    }

    public int getSleepDate() {
        int sleepDate = 15;
        BatchInfoVO info = mapper.selectBatchJobById(5);
        if (info == null || info.getParameters() == null || info.getParameters().isEmpty()) {
            return sleepDate;
        }
        String parameter = info.getParameters();
        try {
            Map<String, String> map = JsonUtil.fromJson(parameter, stringMapToken);
            String sleepDateVal = map.get("sleep");
            sleepDate = Integer.parseInt(sleepDateVal);
        } catch (Exception e) {
            log.error("{}: {}", e.getMessage(), parameter, e);
        }

        return sleepDate;
    }
}
