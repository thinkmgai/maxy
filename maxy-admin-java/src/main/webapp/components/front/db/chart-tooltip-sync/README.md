# 차트 툴팁 동기화 시스템

## 개요
여러 시계열 차트에서 마우스 호버 시 동일한 X축 시간값을 가진 모든 차트의 툴팁을 동시에 표시하는 기능입니다.

## 파일 구조
```
/components/front/db/chart-tooltip-sync/
├── chart-tooltip-synchronizer.js  # 핵심 동기화 관리자 클래스
├── README.md                      # 사용법 가이드 (이 파일)
└── INTEGRATION_GUIDE.md           # 새로운 차트 통합 가이드
```

## 기본 사용법

### 1. 동기화 관리자 초기화
```javascript
// 전역 동기화 관리자 생성
const tooltipSynchronizer = new ChartTooltipSynchronizer();
```

### 2. 차트에 동기화 기능 추가
각 차트 클래스에 다음 메서드들을 구현해야 합니다:

#### 필수 메서드
```javascript
class YourChartClass {
    /**
     * 툴팁 동기화 기능 활성화
     * @param {ChartTooltipSynchronizer} synchronizer - 동기화 관리자
     */
    enableTooltipSync(synchronizer) {
        this.synchronizer = synchronizer;
        
        // 차트를 동기화 관리자에 등록
        synchronizer.registerChart(this.id, this);
        
        // 마우스 이벤트 리스너 설정
        this._setupSyncEventListeners();
    }

    /**
     * 특정 시간의 툴팁 표시
     * @param {number} timestamp - 시간값 (밀리초)
     * @returns {boolean} - 성공 여부
     */
    showTooltipAtTime(timestamp) {
        // 가장 가까운 데이터 포인트 찾기
        const closestPoint = this._findClosestDataPoint(timestamp);
        
        if (closestPoint) {
            // 툴팁 표시
            this.chart.tooltip.refresh(closestPoint);
            
            // 크로스헤어 표시 (선택사항)
            if (this.chart.xAxis && this.chart.xAxis[0]) {
                this.chart.xAxis[0].drawCrosshair(null, closestPoint);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 툴팁 숨김
     */
    hideTooltip() {
        if (this.chart && this.chart.tooltip) {
            this.chart.tooltip.hide();
        }
        
        // 크로스헤어 숨김 (선택사항)
        if (this.chart.xAxis && this.chart.xAxis[0]) {
            this.chart.xAxis[0].hideCrosshair();
        }
    }
}
```

### 3. 대시보드에서 동기화 설정
```javascript
// 대시보드 초기화 시
const Dashboard = {
    v: {
        tooltipSynchronizer: null,
        chart: {}
    },
    
    init: {
        async initDashboard() {
            // 1. 동기화 관리자 초기화
            this.v.tooltipSynchronizer = new ChartTooltipSynchronizer();
            
            // 2. 차트들 생성
            this.v.chart.chart1 = new YourChartClass({id: 'chart1'});
            this.v.chart.chart2 = new YourChartClass({id: 'chart2'});
            
            await this.v.chart.chart1.init();
            await this.v.chart.chart2.init();
            
            // 3. 동기화 기능 활성화
            this.v.chart.chart1.enableTooltipSync(this.v.tooltipSynchronizer);
            this.v.chart.chart2.enableTooltipSync(this.v.tooltipSynchronizer);
        }
    }
};
```

## 주요 API

### ChartTooltipSynchronizer 클래스

#### 메서드
- `registerChart(chartId, chartInstance)` - 차트 등록
- `unregisterChart(chartId)` - 차트 등록 해제
- `setEnabled(enabled)` - 동기화 기능 활성화/비활성화
- `setChartActive(chartId, active)` - 특정 차트 활성화/비활성화
- `showTooltipsAtTime(timestamp, excludeChartId)` - 특정 시간의 툴팁 표시
- `hideAllTooltips(excludeChartId)` - 모든 툴팁 숨김
- `getRegisteredCharts()` - 등록된 차트 목록 조회
- `getStatus()` - 현재 상태 조회
- `destroy()` - 리소스 정리

#### 사용 예시
```javascript
// 동기화 비활성화
synchronizer.setEnabled(false);

// 특정 차트만 제외
synchronizer.setChartActive('chart1', false);

// 수동으로 특정 시간의 툴팁 표시
synchronizer.showTooltipsAtTime(Date.now() - 60000);

// 상태 확인
console.log(synchronizer.getStatus());
console.log(synchronizer.getRegisteredCharts());
```

## 실시간 데이터 업데이트 지원

데이터가 실시간으로 업데이트되는 환경에서는 `setData` 메서드 호출 후 동기화를 재활성화해야 합니다:

```javascript
class YourChartClass {
    setData(newData) {
        // 차트 데이터 업데이트
        this.chart.series[0].setData(newData);
        this.chart.redraw();
        
        // 동기화 기능 재활성화
        if (this.synchronizer && this.synchronizer.isEnabled) {
            this._reactivateTooltipSync();
        }
    }
    
    _reactivateTooltipSync() {
        // 이벤트 리스너 재설정
        this._setupSyncEventListeners();
    }
}
```

## 동기화 정책

### 허용 오차 범위 내 동기화
- 동기화는 **30초 허용 오차 범위** 내에서 가장 가까운 데이터 포인트에서 작동합니다
- 정확히 일치하지 않더라도 30초 이내의 가장 가까운 데이터를 찾아서 툴팁을 표시합니다
- 이는 실시간 데이터에서 각 차트의 timestamp가 약간씩 다를 수 있음을 고려한 정책입니다

### 예시
```javascript
// 차트 A 데이터: [1640995200000, 1640995260000, 1640995320000]
// 차트 B 데이터: [1640995205000, 1640995265000, 1640995325000] // 5초 차이
// 차트 C 데이터: [1640995100000, 1640995400000] // 데이터 간격이 큰 경우

// 마우스가 1640995260000 시간에 위치할 때:
// - 차트 A: 1640995260000 데이터의 툴팁 표시 (정확히 일치)
// - 차트 B: 1640995265000 데이터의 툴팁 표시 (5초 차이, 허용 범위 내)
// - 차트 C: 툴팁 숨김 (가장 가까운 데이터가 160초 차이로 허용 범위 초과)

// 마우스가 1640995300000 시간에 위치할 때 (데이터가 없는 시간):
// - 차트 A: 1640995320000 데이터의 툴팁 표시 (20초 차이, 허용 범위 내)
// - 차트 B: 1640995325000 데이터의 툴팁 표시 (25초 차이, 허용 범위 내)
// - 차트 C: 툴팁 숨김 (가장 가까운 데이터가 100초 차이로 허용 범위 초과)
```

### 툴팁 숨김 정책
- 허용 오차 범위(30초) 내에 데이터가 없는 차트는 자동으로 툴팁이 숨겨집니다
- 이는 관련 없는 시간대의 데이터가 표시되는 것을 방지하기 위함입니다
- 각 차트는 독립적으로 툴팁 표시/숨김이 결정됩니다

### 허용 오차 범위 조정
필요에 따라 허용 오차 범위를 조정할 수 있습니다:
```javascript
// 각 차트의 showTooltipAtTime 메서드에서
const allowedTolerance = 30000; // 30초 (기본값)
// const allowedTolerance = 60000; // 1분으로 늘리기
// const allowedTolerance = 10000; // 10초로 줄이기
```

## 성능 최적화

- **쓰로틀링**: 60fps(16ms) 기반 자동 쓰로틀링 적용
- **메모리 관리**: 페이지 언로드 시 자동 리소스 정리
- **오류 격리**: 개별 차트 오류가 전체 동기화에 영향을 주지 않음
- **정확한 일치**: 불필요한 근사치 계산을 피해 성능 향상

## 브라우저 호환성

- **모던 브라우저**: Chrome, Firefox, Safari, Edge (최신 버전)
- **필수 기능**: ES6 Map, WeakMap, addEventListener
- **선택 기능**: requestAnimationFrame (성능 최적화용)

## 문제 해결

### 동기화가 작동하지 않는 경우
1. 차트가 동기화 관리자에 등록되었는지 확인
2. `showTooltipAtTime` 메서드가 구현되었는지 확인
3. 차트에 데이터가 있는지 확인
4. 브라우저 콘솔에서 오류 메시지 확인

### 성능 문제가 발생하는 경우
1. 불필요한 차트를 비활성화: `setChartActive(chartId, false)`
2. 동기화 자체를 비활성화: `setEnabled(false)`
3. 차트 데이터 양 확인 및 최적화

## 예제 코드

완전한 구현 예제는 다음 파일들을 참고하세요:
- `performance-timeline.js` - Timeline 차트 구현 예제
- `interval-scatter.js` - Scatter 차트 구현 예제
- `dashboard.jsp` - 대시보드 통합 예제