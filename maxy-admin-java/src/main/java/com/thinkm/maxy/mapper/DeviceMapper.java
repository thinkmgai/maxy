package com.thinkm.maxy.mapper;

import com.thinkm.maxy.vo.DevicePageVO;
import com.thinkm.maxy.vo.DeviceVO;
import com.thinkm.maxy.vo.ModelVO;
import com.thinkm.maxy.vo.PagesVO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface DeviceMapper {

    List<DeviceVO> selectDeviceList(DeviceVO vo);

    List<DeviceVO> selectDeviceByDeviceId(DeviceVO vo);

    DeviceVO selectDateInfoByDeviceId(DeviceVO vo);

    void insertTargetDevice(DeviceVO vo);

    List<DeviceVO> selectTargetDeviceList(DeviceVO vo);

    List<DeviceVO> selectTargetDeviceListForPageMap(DeviceVO vo);

    List<DevicePageVO> selectTargetDevicePageList(DeviceVO vo);

    List<PagesVO> selectAppPageList(DevicePageVO vo);

    void insertTargetDevicePage(DevicePageVO vo);

    DeviceVO selectTargetDeviceByDeviceId(DeviceVO vo);

    DeviceVO selectOneDevice(DeviceVO vo);

    void updateDevice(DeviceVO vo);

    void insertDevice(DeviceVO vo);

    void updateTargetDeviceDetail(DeviceVO vo);

    void insertRegTargetDevice(DeviceVO vo);

    void deleteTargetDevice(DeviceVO vo);

    void updateTargetDeviceDetailVip(DeviceVO vo);

    List<DeviceVO> selectTargetDeviceByTargetIds(DeviceVO vo);

    DeviceVO selectTargetDeviceByTargetId(DeviceVO vo);

    List<ModelVO> selectModelList();

    void updateModelInfo(ModelVO vo);

    void insertModelInfo(ModelVO vo);

    void deleteModelInfo(ModelVO vo);

    void deleteAllTargetDevicePage(DevicePageVO vo);
}
