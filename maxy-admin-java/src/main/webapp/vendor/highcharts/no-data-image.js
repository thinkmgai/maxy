(function(H) {
    H.wrap(H.Chart.prototype, 'showNoData', function(p, str) {
        var chart = this,
            options = chart.options,
            text = options.lang.text,
            noDataOptions = options && options.noData;

        if (options && options.lang.noDataImage) {
            if (!chart.noDataLabel && chart.renderer) {
                chart.noDataLabel = chart.renderer.text(
                    {}
                )
                // if (!chart.styledMode) {
                //     chart.noDataLabel
                //         .attr(noDataOptions.attr)
                //         .css(noDataOptions.style);
                // }
                chart.noDataLabel.add();
                chart.noDataLabel.align(H.extend(chart.noDataLabel.getBBox(), noDataOptions.position), false, 'plotBox');
            }
        } else {
            p.apply(this, Array.prototype.slice.call(arguments, 1));
        }
    });
}(Highcharts))