# 새로운 차트 동기화 통합 가이드

## 개요
기존 차트 클래스에 툴팁 동기화 기능을 추가하거나, 새로운 차트를 동기화 시스템에 통합하는 방법을 설명합니다.

## 단계별 통합 가이드

### 1단계: 필수 메서드 구현

새로운 차트 클래스에 다음 메서드들을 추가해야 합니다:

```javascript
class NewChartClass {
    constructor(options) {
        this.id = options.id;
        this.chart = null;
        this.synchronizer = null; // 동기화 관리자 참조
    }

    /**
     * 1. 툴팁 동기화 기능 활성화
     */
    enableTooltipSync(synchronizer) {
        this.synchronizer = synchronizer;
        
        // 차트를 동기화 관리자에 등록
        synchronizer.registerChart(this.id, this);
        
        // 마우스 이벤트 리스너 설정
        this._setupSyncEventListeners();
    }

    /**
     * 2. 마우스 이벤트 리스너 설정
     */
    _setupSyncEventListeners() {
        if (!this.chart || !this.chart.container) {
            return;
        }

        const container = this.chart.container;
        
        // 기존 이벤트 리스너 제거 (중복 방지)
        if (this._mouseMoveHandler) {
            container.removeEventListener('mousemove', this._mouseMoveHandler);
        }
        if (this._mouseLeaveHandler) {
            container.removeEventListener('mouseleave', this._mouseLeaveHandler);
        }

        // 마우스 이동 이벤트
        this._mouseMoveHandler = (event) => {
            if (!this.synchronizer || !this.synchronizer.isEnabled) return;
            
            const timestamp = this.getTimeAtMousePosition(event);
            if (timestamp !== null) {
                this.synchronizer.showTooltipsAtTime(timestamp, this.id);
            }
        };

        // 마우스 아웃 이벤트
        this._mouseLeaveHandler = (event) => {
            if (!this.synchronizer || !this.synchronizer.isEnabled) return;
            
            this.synchronizer.hideAllTooltips(this.id);
        };

        // 이벤트 리스너 등록
        container.addEventListener('mousemove', this._mouseMoveHandler);
        container.addEventListener('mouseleave', this._mouseLeaveHandler);
    }

    /**
     * 3. 마우스 위치에서 시간값 계산
     */
    getTimeAtMousePosition(event) {
        if (!this.chart || !this.chart.xAxis || !this.chart.xAxis[0]) {
            return null;
        }

        try {
            const xAxis = this.chart.xAxis[0];
            
            // Highcharts의 경우
            if (typeof Highcharts !== 'undefined' && Highcharts.offset) {
                const chartPosition = Highcharts.offset(this.chart.container);
                const mouseX = event.clientX - chartPosition.left;
                return Math.round(xAxis.toValue(mouseX));
            }
            
            // 일반적인 경우
            const rect = this.chart.container.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            return Math.round(xAxis.toValue(mouseX));
        } catch (error) {
            return null;
        }
    }

    /**
     * 4. 특정 시간의 툴팁 표시
     */
    showTooltipAtTime(timestamp) {
        if (!this.chart || !this.chart.series || !timestamp) {
            return false;
        }

        try {
            // 가장 가까운 데이터 포인트 찾기 (허용 오차: 30초)
            let closestPoint = null;
            let minDistance = Infinity;
            const allowedTolerance = 30000; // 30초 허용 오차

            // 모든 시리즈에서 가장 가까운 포인트 찾기
            this.chart.series.forEach(series => {
                if (!series.data || series.data.length === 0) return;

                series.data.forEach(point => {
                    const distance = Math.abs(point.x - timestamp);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = point;
                    }
                });
            });

            // 허용 오차 범위 내의 포인트만 표시
            if (closestPoint && minDistance <= allowedTolerance) {
                // 툴팁 표시
                this.chart.tooltip.refresh(closestPoint);
                
                // 크로스헤어 표시 (선택사항)
                if (this.chart.xAxis && this.chart.xAxis[0]) {
                    this.chart.xAxis[0].drawCrosshair(null, closestPoint);
                }
                
                return true;
            } else {
                // 허용 오차 범위 밖이면 툴팁 숨김
                this.hideTooltip();
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * 5. 툴팁 숨김
     */
    hideTooltip() {
        if (!this.chart) return;

        try {
            // 툴팁 숨기기
            if (this.chart.tooltip) {
                this.chart.tooltip.hide();
            }
            
            // 크로스헤어 숨기기 (선택사항)
            if (this.chart.xAxis && this.chart.xAxis[0]) {
                this.chart.xAxis[0].hideCrosshair();
            }
        } catch (error) {
            // 오류 무시
        }
    }

    /**
     * 6. 동기화 재활성화 (데이터 업데이트 후 호출)
     */
    _reactivateTooltipSync() {
        if (!this.synchronizer) return;
        
        // 이벤트 리스너 재설정
        this._setupSyncEventListeners();
    }
}
```

### 2단계: 데이터 업데이트 시 동기화 재활성화

실시간 데이터 업데이트가 있는 차트의 경우, `setData` 메서드에 동기화 재활성화 코드를 추가합니다:

```javascript
class NewChartClass {
    setData(newData) {
        // 기존 데이터 업데이트 로직
        if (this.chart.series.length === 0) {
            this.chart.addSeries({
                name: 'Data',
                data: newData
            });
        } else {
            this.chart.series[0].setData(newData, false);
        }
        
        this.chart.redraw();
        
        // 동기화 기능 재활성화
        if (this.synchronizer && this.synchronizer.isEnabled) {
            this._reactivateTooltipSync();
        }
    }
}
```

### 3단계: 대시보드에 차트 등록

대시보드의 차트 초기화 로직에 새로운 차트를 추가합니다:

```javascript
// dashboard.jsp 또는 대시보드 초기화 스크립트에서
async function initDashboard() {
    // 동기화 관리자 초기화
    const tooltipSynchronizer = new ChartTooltipSynchronizer();
    
    // 새로운 차트 생성
    const newChart = new NewChartClass({
        id: 'newChart',
        title: 'New Chart',
        // 기타 옵션들...
    });
    
    await newChart.init();
    
    // 동기화 기능 활성화
    newChart.enableTooltipSync(tooltipSynchronizer);
    
    // 차트를 전역 객체에 저장
    Dashboard.v.chart.newChart = newChart;
}
```

### 4단계: 데이터 업데이트 시 동기화 확인

WebSocket이나 AJAX로 데이터를 받아 업데이트할 때 동기화 상태를 확인합니다:

```javascript
// 데이터 수신 시
function onDataReceived(newData) {
    // 차트 데이터 업데이트
    Dashboard.v.chart.newChart.setData(newData);
    
    // 동기화 상태 확인 및 재활성화 (선택사항)
    ensureChartSynchronization('newChart');
}

function ensureChartSynchronization(chartName) {
    const synchronizer = Dashboard.v.tooltipSynchronizer;
    const chart = Dashboard.v.chart[chartName];
    
    if (!synchronizer || !chart) return;
    
    // 차트가 등록되어 있는지 확인
    const registeredCharts = synchronizer.getRegisteredCharts();
    const isRegistered = registeredCharts.some(c => c.id === chartName);
    
    if (!isRegistered) {
        // 재등록
        synchronizer.registerChart(chartName, chart);
        chart.enableTooltipSync(synchronizer);
    } else {
        // 동기화 재활성화
        if (typeof chart._reactivateTooltipSync === 'function') {
            chart._reactivateTooltipSync();
        }
    }
}
```

## 차트 타입별 특별 고려사항

### Highcharts 기반 차트
```javascript
// Highcharts 이벤트 시스템 사용 (권장)
_setupSyncEventListeners() {
    if (this._mouseMoveEventId) {
        Highcharts.removeEvent(this.chart.container, 'mousemove', this._mouseMoveEventId);
    }
    
    this._mouseMoveEventId = Highcharts.addEvent(this.chart.container, 'mousemove', (e) => {
        // 동기화 로직
    });
}
```

### D3.js 기반 차트
```javascript
// D3 이벤트 시스템 사용
_setupSyncEventListeners() {
    d3.select(this.chart.container)
        .on('mousemove', (event) => {
            // 동기화 로직
        })
        .on('mouseleave', (event) => {
            // 툴팁 숨김 로직
        });
}
```

### Canvas 기반 차트
```javascript
// Canvas 좌표 계산
getTimeAtMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Canvas 좌표를 데이터 좌표로 변환
    const dataX = this.xScale.invert(x);
    return dataX;
}
```

## 테스트 및 검증

### 1. 기본 동작 테스트
```javascript
// 브라우저 콘솔에서 실행
// 1. 동기화 상태 확인
console.log(Dashboard.v.tooltipSynchronizer.getStatus());

// 2. 등록된 차트 확인
console.log(Dashboard.v.tooltipSynchronizer.getRegisteredCharts());

// 3. 수동 동기화 테스트
Dashboard.v.tooltipSynchronizer.showTooltipsAtTime(Date.now() - 60000);
```

### 2. 성능 테스트
```javascript
// 동기화 성능 측정
let syncCount = 0;
const originalShow = Dashboard.v.tooltipSynchronizer.showTooltipsAtTime;

Dashboard.v.tooltipSynchronizer.showTooltipsAtTime = function(...args) {
    const start = performance.now();
    const result = originalShow.apply(this, args);
    const end = performance.now();
    
    syncCount++;
    console.log(`동기화 #${syncCount}: ${end - start}ms`);
    
    return result;
};
```

## 문제 해결 체크리스트

### 동기화가 작동하지 않는 경우
- [ ] `enableTooltipSync()` 메서드가 호출되었는가?
- [ ] `showTooltipAtTime()` 메서드가 구현되었는가?
- [ ] 차트에 데이터가 있는가?
- [ ] 마우스 이벤트 리스너가 설정되었는가?
- [ ] `getTimeAtMousePosition()` 메서드가 올바른 값을 반환하는가?

### 성능 문제가 발생하는 경우
- [ ] 차트 데이터 양이 너무 많지 않은가?
- [ ] 불필요한 차트를 비활성화했는가?
- [ ] 쓰로틀링이 적절히 작동하는가?

### 메모리 누수가 의심되는 경우
- [ ] 페이지 언로드 시 `destroy()` 메서드가 호출되는가?
- [ ] 이벤트 리스너가 적절히 제거되는가?
- [ ] 차트 인스턴스 참조가 정리되는가?

## 예제 템플릿

완전한 차트 클래스 템플릿은 `chart-template.js` 파일을 참고하세요.