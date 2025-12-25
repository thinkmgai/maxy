/**
 * 차트 툴팁 동기화 관리자 클래스
 * 여러 시계열 차트에서 마우스 호버 시 동일한 X축 시간값을 가진 모든 차트의 툴팁을 동시에 표시
 */
class ChartTooltipSynchronizer {
    constructor() {
        // 등록된 차트들을 관리하는 Map (chartId -> chartInfo)
        this.registeredCharts = new Map();
        
        // 동기화 기능 활성화 여부
        this.isEnabled = true;
        
        // 성능 최적화를 위한 쓰로틀링 설정 (60fps = 16ms)
        this.throttleDelay = 16;
        this.lastSyncTime = 0;
        
        // 정리 작업이 완료되었는지 추적
        this.isDestroyed = false;
        
        // 페이지 언로드 시 자동 정리
        this._setupAutoCleanup();
    }

    /**
     * 차트를 동기화 관리자에 등록
     * @param {string} chartId - 차트 고유 ID
     * @param {Object} chartInstance - 차트 인스턴스
     */
    registerChart(chartId, chartInstance) {
        if (this.isDestroyed || !chartId || !chartInstance) {
            return false;
        }

        // 차트 타입 확인
        const chartType = this._getChartType(chartInstance);
        if (!chartType) {
            return false;
        }

        // 차트 정보 등록
        this.registeredCharts.set(chartId, {
            id: chartId,
            instance: chartInstance,
            type: chartType,
            isActive: true
        });
        
        return true;
    }

    /**
     * 특정 시간값에 대한 모든 차트 툴팁 표시
     * @param {number} timestamp - X축 시간값 (밀리초)
     * @param {string} excludeChartId - 제외할 차트 ID (이벤트 발생 차트)
     */
    showTooltipsAtTime(timestamp, excludeChartId = null) {
        if (this.isDestroyed || !this.isEnabled || !this._isValidTimestamp(timestamp)) {
            return;
        }

        // 쓰로틀링 적용
        const now = performance.now();
        if (now - this.lastSyncTime < this.throttleDelay) {
            return;
        }
        this.lastSyncTime = now;

        // 등록된 모든 차트에 대해 동기화 처리
        this.registeredCharts.forEach((chartInfo, chartId) => {
            // 제외 차트이거나 비활성화된 차트는 스킵
            if (chartId === excludeChartId || !chartInfo.isActive) {
                return;
            }

            // 툴팁 표시
            this._showTooltipForChart(chartInfo, timestamp);
        });
    }

    /**
     * 모든 차트 툴팁 숨기기
     * @param {string} excludeChartId - 제외할 차트 ID (선택사항)
     */
    hideAllTooltips(excludeChartId = null) {
        this.registeredCharts.forEach((chartInfo, chartId) => {
            if (chartId === excludeChartId || !chartInfo.isActive) {
                return;
            }

            this._hideTooltipForChart(chartInfo);
        });
    }

    /**
     * 등록된 차트 목록 반환
     * @returns {Array} - 차트 정보 배열
     */
    getRegisteredCharts() {
        if (this.isDestroyed) {
            return [];
        }

        const charts = [];
        this.registeredCharts.forEach((chartInfo, chartId) => {
            charts.push({
                id: chartId,
                type: chartInfo.type,
                isActive: chartInfo.isActive
            });
        });
        return charts;
    }

    /**
     * 동기화 관리자 정리 (메모리 누수 방지)
     */
    destroy() {
        if (this.isDestroyed) {
            return;
        }

        // 모든 툴팁 숨김
        this.hideAllTooltips();

        // 등록된 차트 정보 정리
        this.registeredCharts.clear();

        // 자동 정리 시스템 해제
        this._cleanupAutoCleanup();

        // 정리 완료 플래그 설정
        this.isDestroyed = true;
    }

    /**
     * 차트 타입 확인 (내부 메서드)
     * @param {Object} chartInstance - 차트 인스턴스
     * @returns {string|null} - 차트 타입 ('scatter', 'timeline') 또는 null
     */
    _getChartType(chartInstance) {
        if (chartInstance.constructor.name === 'MaxyFrontIntervalScatter') {
            return 'scatter';
        } else if (chartInstance.constructor.name === 'MaxyFrontPerformanceTimeLine') {
            return 'timeline';
        }
        return null;
    }

    /**
     * 특정 차트에 대한 툴팁 표시 처리 (내부 메서드)
     * @param {Object} chartInfo - 차트 정보 객체
     * @param {number} timestamp - 시간값 (밀리초)
     * @returns {boolean} - 성공 여부
     */
    _showTooltipForChart(chartInfo, timestamp) {
        try {
            // 차트 인스턴스 유효성 검증
            if (!chartInfo.instance || typeof chartInfo.instance.showTooltipAtTime !== 'function') {
                return false;
            }

            // 차트의 showTooltipAtTime 메서드 호출
            const result = chartInfo.instance.showTooltipAtTime(timestamp);
            return result !== false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 특정 차트에 대한 툴팁 숨김 처리 (내부 메서드)
     * @param {Object} chartInfo - 차트 정보 객체
     * @returns {boolean} - 성공 여부
     */
    _hideTooltipForChart(chartInfo) {
        try {
            // 차트 인스턴스 유효성 검증
            if (!chartInfo.instance || typeof chartInfo.instance.hideTooltip !== 'function') {
                return false;
            }

            // 툴팁 숨김 처리
            chartInfo.instance.hideTooltip();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 시간값 유효성 검사 (내부 메서드)
     * @param {number} timestamp - 검사할 시간값
     * @returns {boolean} - 유효성 여부
     */
    _isValidTimestamp(timestamp) {
        return typeof timestamp === 'number' && 
               !isNaN(timestamp) && 
               isFinite(timestamp) && 
               timestamp > 0;
    }

    /**
     * 자동 정리 시스템 설정 (내부 메서드)
     */
    _setupAutoCleanup() {
        this._autoCleanupHandler = () => {
            if (!this.isDestroyed) {
                this.destroy();
            }
        };

        window.addEventListener('beforeunload', this._autoCleanupHandler);
        window.addEventListener('unload', this._autoCleanupHandler);
        
        if ('onpagehide' in window) {
            window.addEventListener('pagehide', this._autoCleanupHandler);
        }
    }

    /**
     * 자동 정리 시스템 해제 (내부 메서드)
     */
    _cleanupAutoCleanup() {
        if (this._autoCleanupHandler) {
            window.removeEventListener('beforeunload', this._autoCleanupHandler);
            window.removeEventListener('unload', this._autoCleanupHandler);
            
            if ('onpagehide' in window) {
                window.removeEventListener('pagehide', this._autoCleanupHandler);
            }
            
            this._autoCleanupHandler = null;
        }
    }
}