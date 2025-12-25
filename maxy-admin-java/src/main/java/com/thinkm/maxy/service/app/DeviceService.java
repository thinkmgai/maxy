package com.thinkm.maxy.service.app;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import com.thinkm.common.exception.ConflictException;
import com.thinkm.common.util.CommonUtil;
import com.thinkm.common.util.JsonUtil;
import com.thinkm.common.util.SecurityUtil;
import com.thinkm.common.util.ValidUtil;
import com.thinkm.maxy.mapper.DeviceMapper;
import com.thinkm.maxy.repository.ModelRepository;
import com.thinkm.maxy.vo.DevicePageVO;
import com.thinkm.maxy.vo.DeviceVO;
import com.thinkm.maxy.vo.ModelVO;
import com.thinkm.maxy.vo.PagesVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {
    @Resource
    private final DeviceMapper mapper;
    @Resource
    private final RedisService redisService;
    @Resource
    private final ModelRepository modelRepository;
    @Resource
    private final SecurityUtil securityUtil;
    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;

    /**
     * 장치 리스트 조회
     *
     * @param vo {@link DeviceVO}
     * @return deviceList
     */
    public List<DeviceVO> getDeviceList(DeviceVO vo) {
        long s1 = System.currentTimeMillis();
        List<DeviceVO> deviceList = mapper.selectDeviceList(vo);
        long e1 = System.currentTimeMillis();
        log.debug("getDeviceList: {} ms", e1 - s1);

        for (DeviceVO device : deviceList) {
            String email = device.getEmailAddr();
            if (email != null && !email.isEmpty()) {
                try {
                    device.setEmailAddr(securityUtil.AES128Decrypt(email));
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                    device.setEmailAddr("");
                }
            }

            String phoneNo = device.getPhoneNo();
            if (phoneNo != null && !phoneNo.isEmpty()) {
                try {
                    device.setPhoneNo(securityUtil.AES128Decrypt(phoneNo));
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                    device.setPhoneNo("");
                }
            }
        }

        log.debug("decrypt time: {} ms", System.currentTimeMillis() - e1);

        // user id masking
        if (userIdMasking) {
            for (DeviceVO device : deviceList) {
                device.setUserId(CommonUtil.maskUserId(device.getUserId(), userIdMasking, 2));
            }
        }

        return deviceList;
    }

    /**
     * 로깅 대상 등록
     *
     * @param vo {@link DeviceVO}
     */
    public void regMonitoringTarget(DeviceVO vo) throws BadRequestException {
        if (vo.getDeviceListStr().isEmpty()) {
            log.warn("getDeviceListStr is empty.");
            return;
        }

        vo.makeVOList();
        List<DeviceVO> deviceList = vo.getDeviceList();
        if (!deviceList.isEmpty()) {
            for (DeviceVO device : deviceList) {
                ValidUtil.isValidParams(ReturnCode.ERR_EMPTY_PARAMS,
                        device.getDeviceId(), device.getServerType(), device.getPackageNm());
            }
            List<DeviceVO> duplTargetAppDeviceList = mapper.selectDeviceByDeviceId(vo);

            if (duplTargetAppDeviceList != null) {
                log.info("duplTargetAppDeviceList.size() :{}", deviceList.size());
            } else {
                log.info("duplTargetAppDeviceList is null");
            }

            if (!Objects.requireNonNull(duplTargetAppDeviceList).isEmpty()) {
                throw new ConflictException(ReturnCode.ERR_DUPL_TARGETDEVICE);
            }

            Map<String, Object> redisMap = new HashMap<>();
            for (DeviceVO device : vo.getDeviceList()) {
                device.setRegDt(vo.getRegDt());
                device.setRegNo(vo.getRegNo());

                if ("Y".equals(device.getUseYn())) {
                    device.setMakeType("AUTO");
                } else {
                    device.setMakeType("MANUAL");
                }

                mapper.insertTargetDevice(device);

                // redis db 등록
                redisMap.put("deviceId", device.getDeviceId());
                redisMap.put("packageNm", device.getPackageNm());
                redisMap.put("serverType", device.getServerType());
                redisMap.put("userNm", device.getUserNm() != null ? device.getUserNm() : "-");
                redisMap.put("userId", device.getUserId() != null ? device.getUserId() : "-");
                redisMap.put("birthDay", device.getBirthDay() != null ? device.getBirthDay() : "-");
                redisMap.put("vipYn", device.getVipYn() != null ? device.getVipYn() : "N");
                redisMap.put("emailAddr", device.getEmailAddr() != null ? device.getEmailAddr() : "-");
                redisMap.put("sex", device.getSex() != null ? device.getSex() : "X");
                redisMap.put("cntryCd", device.getCntryCd() != null ? device.getCntryCd() : "KR");
                redisMap.put("residence", device.getResidence() != null ? device.getResidence() : "-");
                redisMap.put("phoneNo", device.getPhoneNo() != null ? device.getPhoneNo() : "-");

                String key = String.join(":", "cache", device.getPackageNm(), device.getServerType(), device.getDeviceId());

                redisService.delete(key);
                redisService.setHash(key, redisMap);
            }

        } else {
            throw new BadRequestException(ReturnCode.ERR_DUPL_TARGETDEVICE);
        }
    }

    /**
     * 로깅 대상 장치 리스트 조회
     *
     * @param vo {@link DeviceVO}
     * @return targetDeviceList
     */
    public Map<String, Object> getTargetDeviceList(DeviceVO vo) throws Exception {
        List<DeviceVO> targetDeviceList = mapper.selectTargetDeviceList(vo);

        for (DeviceVO deviceVO : targetDeviceList) {
            if (deviceVO.getEmailAddr() != null) {
                deviceVO.setEmailAddr(securityUtil.AES128Decrypt(deviceVO.getEmailAddr()));
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("targetDeviceList", targetDeviceList);
        return result;
    }

    /**
     * 로깅 페이지 장치 리스트 조회
     *
     * @param vo {@link DeviceVO}
     * @return targetDeviceList
     */
    public List<DeviceVO> getTargetDeviceListForPageMap(DeviceVO vo) {
        return mapper.selectTargetDeviceListForPageMap(vo);
    }

    /**
     * 디바이스 페이지 목록 조회
     *
     * @param vo {@link DeviceVO}
     * @return targetDevicePageList
     */
    public List<DevicePageVO> getTargetDevicePageList(DeviceVO vo) {
        return mapper.selectTargetDevicePageList(vo);
    }

    /**
     * 앱 페이지 목록 조회
     *
     * @param vo {@link DeviceVO}
     * @return targetDevicePageList
     */
    public List<PagesVO> getAppPageList(DevicePageVO vo) {
        return mapper.selectAppPageList(vo);
    }


    /**
     * 디바이스 페이지 등록
     *
     * @param vo {@link DevicePageVO}
     */
    public void insertTargetDevicePage(DevicePageVO vo) {
        mapper.deleteAllTargetDevicePage(vo);
        mapper.insertTargetDevicePage(vo);
    }

    /**
     * 로깅 대상 조회 - deviceId
     *
     * @param vo {@link DeviceVO}
     * @return DeviceVO
     */
    public DeviceVO getTargetDeviceByDeviceId(DeviceVO vo) {
        return mapper.selectTargetDeviceByDeviceId(vo);
    }

    /**
     * 디바이스 수정 - deviceId
     *
     * @param vo {@link DeviceVO}
     */
    public void updateDevice(DeviceVO vo) {
        mapper.updateDevice(vo);
    }

    /**
     * 디바이스 등록- deviceId
     *
     * @param vo {@link DeviceVO}
     */
    public void insertDevice(DeviceVO vo) {
        mapper.insertDevice(vo);
    }

    /**
     * 디바이스 조회 - deviceId
     *
     * @param vo {@link DeviceVO}
     * @return DeviceVO
     */
    public DeviceVO getDevice(DeviceVO vo) {
        return mapper.selectOneDevice(vo);
    }


    /**
     * 로깅 대상 상세보기 수정
     *
     * @param vo {@link DeviceVO}
     */
    public void modifyTargetDeviceDetail(DeviceVO vo) throws Exception {

        // 이메일 암호화
        String emailAddr = vo.getEmailAddr();
        if (StringUtils.isNotEmpty(emailAddr)
            && ValidUtil.isValidEmail(emailAddr)) {
            vo.setEmailAddr(securityUtil.AES128Encrypt(emailAddr));
        } else {
            vo.setEmailAddr("");
        }

        String phoneNo = vo.getPhoneNo();
        if (phoneNo != null && !phoneNo.isEmpty()) {
            try {
                vo.setPhoneNo(securityUtil.AES128Encrypt(phoneNo));
            } catch (Exception e) {
                log.error(e.getMessage(), e);
                vo.setPhoneNo("");
            }
        }

        // update 수정
        if ("Y".equals(vo.getVipYn())) {
            mapper.updateTargetDeviceDetailVip(vo);
        } else {
            mapper.updateTargetDeviceDetail(vo);
        }

    }

    /**
     * 로깅 대상 정보 redis 등록
     *
     * @param device {@link DeviceVO}
     */
    public void setTargetDeviceToRedis(DeviceVO device) {
        DeviceVO res = mapper.selectTargetDeviceByTargetId(device);

        if (res != null) {
            String key = String.join(":", "cache", res.getPackageNm(), res.getServerType(), res.getDeviceId());
            Map<String, Object> rsMap = new HashMap<>();

            rsMap.put("deviceId", res.getDeviceId());
            rsMap.put("packageNm", res.getPackageNm());
            rsMap.put("serverType", res.getServerType());
            rsMap.put("vipYn", res.getVipYn() != null ? res.getVipYn() : "N");
            rsMap.put("emailAddr", res.getEmailAddr() != null ? res.getEmailAddr() : "-");
            rsMap.put("phoneNo", res.getPhoneNo() != null ? res.getPhoneNo() : "-");
            rsMap.put("sex", res.getSex() != null ? res.getSex() : "X");
            rsMap.put("userNm", res.getUserNm() != null ? res.getUserNm() : "-");
            rsMap.put("userId", res.getUserId() != null ? res.getUserId() : "-");
            rsMap.put("residence", res.getResidence() != null ? res.getResidence() : "-");
            rsMap.put("cntryCd", res.getCntryCd() != null ? res.getCntryCd() : "KR");
            rsMap.put("birthDay", res.getBirthDay() != null ? res.getBirthDay() : "-");

            redisService.delete(key);
            redisService.setHash(key, rsMap);
        }
    }

    /**
     * 로깅 대상 등록
     *
     * @param vo {@link DeviceVO}
     */
    public void regTargetDevice(DeviceVO vo) throws Exception {

        // 이메일 암호화
        String emailAddr = vo.getEmailAddr();
        if (emailAddr != null
            && !emailAddr.isEmpty()
            && ValidUtil.isValidEmail(emailAddr)) {
            vo.setEmailAddr(securityUtil.AES128Encrypt(emailAddr));
        } else {
            vo.setEmailAddr("");
        }
        String phoneNo = vo.getPhoneNo();
        if (phoneNo != null && !phoneNo.isEmpty()) {
            vo.setPhoneNo(securityUtil.AES128Encrypt(phoneNo));
        } else {
            vo.setPhoneNo("");
        }

        if ("Y".equals(vo.getUseYn())) {
            vo.setMakeType("AUTO");
        } else {
            vo.setMakeType("MANUAL");
        }

        // insert
        mapper.insertRegTargetDevice(vo);
    }

    /**
     * 로깅 대상 삭제
     *
     * @param vo {@link DeviceVO}
     */
    public void deleteTargetDevice(DeviceVO vo) {
        // delete 수행
        mapper.deleteTargetDevice(vo);
    }


    /**
     * 로깅 대상 삭제 장치 리스트 조회
     *
     * @param vo {@link DeviceVO}
     */
    public void selectAndDelTargetDeviceByTargetId(DeviceVO vo) {
        List<DeviceVO> delList = mapper.selectTargetDeviceByTargetIds(vo);
        // redis 삭제
        if (delList != null) {
            delList.stream().parallel().forEach(del -> {
                String key = String.join(":", "cache", del.getPackageNm(), del.getServerType(), del.getDeviceId());
                redisService.delete(key);
            });
        }
    }

    /**
     * 장치 모델 목록 전체 조회
     *
     * @return 장치 모델 목록
     */
    public List<ModelVO> getModelList() {
        return mapper.selectModelList();
    }

    public void modifyModelInfo(ModelVO vo) {
        mapper.updateModelInfo(vo);
    }

    public void addModelInfo(ModelVO vo) {
        mapper.insertModelInfo(vo);
    }

    public void delModelInfo(ModelVO vo) {
        mapper.deleteModelInfo(vo);
    }

    /**
     * Device Model 목록 조회하여 메모리에 적재
     */
    @Async
    public void refreshModelList() {
        long s0 = System.currentTimeMillis();
        log.debug("start select model list.");
        List<ModelVO> modelList = mapper.selectModelList();

        Map<String, Map<String, String>> modelInfoMap = new HashMap<>();
        for (ModelVO item : modelList) {
            Map<String, String> tmp = Map.of(
                    "nameKo", item.getNameKo(),
                    "nameEn", item.getNameEn()
            );
            modelInfoMap.put(item.getDeviceModel(), tmp);
        }

        modelRepository.setModelInfo(modelInfoMap);

        modelRepository.setModelInfoJson(JsonUtil.toJson(modelInfoMap));

        log.info("refresh model list. {}ms", System.currentTimeMillis() - s0);
    }
}
