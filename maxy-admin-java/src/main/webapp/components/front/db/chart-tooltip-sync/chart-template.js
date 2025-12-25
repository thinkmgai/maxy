/**
 * 차트 툴팁 동기화 템플릿
 * 새로운 차트 클래스를 만들 때 이 템플릿을 복사해서 사용하세요.
 */
class ChartTemplate {
    constructor(options) {
        this.id = options.id;
        this.title = options.title;
        this.chart = null;
        this.synchronizer = null; // 동기화 관리자 참조
        
        // 이벤트 핸들러 참조 (정리용)
        this._mouseMoveHandler = null;
        this._mouseLeaveHandler = null;
    }

    /**
     * 차트 초기화
     */
    async init() {
        // 차트 생성 로직을 여기에 구현
        // 예: Highcharts, D3.js, Canvas 등
        
        // Highcharts 예시:
        this.chart = Highcharts.chart(this.id + '__chart', {
            chart: {
                type: 'line' // 또는 다른 차트 타입
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: {
                title: { text: this.title }
            },
            series: []
        });
    }

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
     * 마우스 이벤트 리스너 설정 (내부 메서드)
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

        // 마우스 이동 이벤트 핸들러
        this._mouseMoveHandler = (event) => {
            if (!this.synchronizer || !this.synchronizer.isEnabled) return;
            
            const timestamp = this.getTimeAtMousePosition(event);
            if (timestamp !== null) {
                this.synchronizer.showTooltipsAtTime(timestamp, this.id);
            }
        };

        // 마우스 아웃 이벤트 핸들러
        this._mouseLeaveHandler = (event) => {
            if (!this.synchronizer || !this.synchronizer.isEnabled) return;
            
            this.synchronizer.hideAllTooltips(this.id);
        };

        // 이벤트 리스너 등록
        container.addEventListener('mousemove', this._mouseMoveHandler);
        container.addEventListener('mouseleave', this._mouseLeaveHandler);
    }

    /**
     * 마우스 위치에서 시간값 계산
     * @param {MouseEvent} event - 마우스 이벤트
     * @returns {number|null} 시간값 (밀리초) 또는 null
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
            
            // xAxis.toValue가 없는 경우 수동 계산
            if (typeof xAxis.toValue === 'function') {
                return Math.round(xAxis.toValue(mouseX));
            } else {
                // 수동 좌표 변환 (차트 라이브러리에 따라 다름)
                const plotLeft = this.chart.plotLeft || 0;
                const plotWidth = this.chart.plotWidth || this.chart.container.clientWidth;
                const relativeX = (mouseX - plotLeft) / plotWidth;
                
                // 시간 범위 계산 (데이터에서 min/max 추출)
                const timeRange = this._getTimeRange();
                if (timeRange) {
                    return Math.round(timeRange.min + (timeRange.max - timeRange.min) * relativeX);
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * 데이터에서 시간 범위 추출 (내부 메서드)
     * @returns {Object|null} {min, max} 또는 null
     */
    _getTimeRange() {
        if (!this.chart || !this.chart.series || this.chart.series.length === 0) {
            return null;
        }

        let min = Infinity;
        let max = -Infinity;

        this.chart.series.forEach(series => {
            if (series.data && series.data.length > 0) {
                series.data.forEach(point => {
                    if (point.x < min) min = point.x;
                    if (point.x > max) max = point.x;
                });
            }
        });

        return min !== Infinity ? { min, max } : null;
    }

    /**
     * 특정 시간의 툴팁 표시
     * @param {number} timestamp - 시간값 (밀리초)
     * @returns {boolean} - 성공 여부
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
                if (this.chart.tooltip && typeof this.chart.tooltip.refresh === 'function') {
                    this.chart.tooltip.refresh(closestPoint);
                }
                
                // 크로스헤어 표시 (Highcharts의 경우)
                if (this.chart.xAxis && this.chart.xAxis[0] && 
                    typeof this.chart.xAxis[0].drawCrosshair === 'function') {
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
     * 툴팁 숨김
     */
    hideTooltip() {
        if (!this.chart) return;

        try {
            // 툴팁 숨기기
            if (this.chart.tooltip && typeof this.chart.tooltip.hide === 'function') {
                this.chart.tooltip.hide();
            }
            
            // 크로스헤어 숨기기 (Highcharts의 경우)
            if (this.chart.xAxis && this.chart.xAxis[0] && 
                typeof this.chart.xAxis[0].hideCrosshair === 'function') {
                this.chart.xAxis[0].hideCrosshair();
            }
        } catch (error) {
            // 오류 무시
        }
    }

    /**
     * 차트 데이터 설정
     * @param {Array} data - 새로운 데이터
     */
    setData(data) {
        if (!this.chart || !data) return;

        try {
            // 데이터 형식 변환 (필요한 경우)
            const formattedData = data.map(item => ({
                x: item.timestamp || item.time || item.x,
                y: item.value || item.count || item.y
            }));

            // 차트 데이터 업데이트
            if (this.chart.series.length === 0) {
                // 시리즈가 없으면 새로 추가
                this.chart.addSeries({
                    name: this.title,
                    data: formattedData
                });
            } else {
                // 기존 시리즈 데이터 업데이트
                this.chart.series[0].setData(formattedData, false);
            }

            // 차트 다시 그리기
            this.chart.redraw();

            // 동기화 기능 재활성화
            if (this.synchronizer && this.synchronizer.isEnabled) {
                this._reactivateTooltipSync();
            }
        } catch (error) {
            console.error('차트 데이터 설정 중 오류:', error);
        }
    }

    /**
     * 동기화 재활성화 (데이터 업데이트 후 호출)
     */
    _reactivateTooltipSync() {
        if (!this.synchronizer) return;
        
        // 이벤트 리스너 재설정
        this._setupSyncEventListeners();
    }

    /**
     * 차트 정리 (메모리 누수 방지)
     */
    destroy() {
        // 이벤트 리스너 제거
        if (this.chart && this.chart.container) {
            if (this._mouseMoveHandler) {
                this.chart.container.removeEventListener('mousemove', this._mouseMoveHandler);
            }
            if (this._mouseLeaveHandler) {
                this.chart.container.removeEventListener('mouseleave', this._mouseLeaveHandler);
            }
        }

        // 동기화 관리자에서 차트 제거
        if (this.synchronizer) {
            this.synchronizer.unregisterChart(this.id);
        }

        // 차트 인스턴스 정리
        if (this.chart && typeof this.chart.destroy === 'function') {
            this.chart.destroy();
        }

        // 참조 정리
        this.chart = null;
        this.synchronizer = null;
        this._mouseMoveHandler = null;
        this._mouseLeaveHandler = null;
    }
}

// 사용 예시:
/*
// 1. 차트 생성
const myChart = new ChartTemplate({
    id: 'myChart',
    title: 'My Chart'
});

// 2. 초기화
await myChart.init();

// 3. 동기화 기능 활성화
const synchronizer = new ChartTooltipSynchronizer();
myChart.enableTooltipSync(synchronizer);

// 4. 데이터 설정
myChart.setData([
    { timestamp: Date.now() - 60000, value: 10 },
    { timestamp: Date.now() - 30000, value: 20 },
    { timestamp: Date.now(), value: 15 }
]);

// 5. 정리 (페이지 언로드 시)
window.addEventListener('beforeunload', () => {
    myChart.destroy();
    synchronizer.destroy();
});
*/