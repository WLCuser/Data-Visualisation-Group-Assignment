function drawChart2(data) {
    // Close the popup first so the chart returns to its card before it is redrawn
    if (typeof closeZoom === "function") closeZoom();

    const container = d3.select("#chart2");

    // Clear only elements, so the title text from index.html stays in the card
    container.selectAll("*").remove();

    // Guard against missing data so the chart still draws its axes and zoom button
    data = data || [];

    // Shared top/right/bottom margins, width and height come from shared-constant.js.
    // Left margin is wider here because the road user labels are long.
    const leftMargin = 180;
    const chartWidth = width - leftMargin - margin.right;
    const chartHeight = innerHeight;

    // viewBox lets the SVG scale to the card and up inside the zoom popup
    const svgRoot = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

    const svg = svgRoot.append("g")
        .attr("transform", `translate(${leftMargin},${margin.top})`);

    // Zoom button comes from zoom.js
    addZoomButton("#chart2");

    // Wraps SVG text onto multiple lines and keeps it vertically centred on its tick
    const wrapLabels = (selection, maxWidth) => {
        selection.each(function () {
            const text = d3.select(this),
                  x = text.attr("x"),
                  words = text.text().split(/\s+/),
                  lines = [];
            let current = "";

            text.text(null).attr("dy", null);
            const probe = text.append("tspan");

            words.forEach(w => {
                const test = current ? current + " " + w : w;
                probe.text(test);
                if (probe.node().getComputedTextLength() > maxWidth && current) {
                    lines.push(current);
                    current = w;
                } else {
                    current = test;
                }
            });
            lines.push(current);
            probe.remove();

            lines.forEach((line, i) => {
                text.append("tspan")
                    .attr("x", x)
                    .attr("dy", i === 0 ? `${0.32 - (lines.length - 1) * 0.55}em` : "1.1em")
                    .text(line);
            });
        });
    };

    const rollup = d3.rollup(data, v => d3.sum(v, d => d['Hospitalisations']), d => d['Road user']);
    const chartData = Array.from(rollup, ([roadUser, count]) => ({ roadUser, count })).sort((a,b) => b.count - a.count);

    const y = d3.scaleBand().range([0, chartHeight]).domain(chartData.map(d => d.roadUser)).padding(0.2);
    svg.append("g").call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("font-size", "12px")
        .call(wrapLabels, leftMargin - 12);

    const x = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count) || 1000]).range([0, chartWidth]);

    // X Axis & Label (Right end of X axis)
    svg.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).ticks(5)).selectAll("text").style("font-size", "12px");
    svg.append("text").attr("x", chartWidth).attr("y", chartHeight + 40).style("text-anchor", "end").style("font-size", "20px").style("fill", "#000").text("Hospitalisations");

    // Y Axis Label (Top of Y axis)
    svg.append("text").attr("x", -10).attr("y", -16).style("text-anchor", "start").style("font-size", "20px").style("fill", "#000").text("Road user");

    // Shared tooltip from tooltip.js
    const tip = createSvgTooltip(svg);

    svg.selectAll("rect.bar")
        .data(chartData).enter().append("rect")
        .attr("class", "bar")
        .attr("x", x(0)).attr("y", d => y(d.roadUser))
        .attr("width", d => x(d.count)).attr("height", y.bandwidth())
        .attr("fill", "#0ea5e9")
        .on("mouseenter", (event, d) => {
            tip.show(
                [
                    { label: "Road User", value: d.roadUser },
                    { label: "Hospitalisations", value: d.count.toLocaleString() }
                ],
                x(d.count), y(d.roadUser),
                { minX: 0, maxX: chartWidth, minY: -margin.top }
            );
        })
        .on("mouseleave", () => tip.hide());

    // Message shown when the selected filters leave no data
    if (data.length === 0) {
        svg.append("text")
            .attr("x", chartWidth / 2).attr("y", chartHeight / 2)
            .style("text-anchor", "middle").style("font-size", "20px").style("fill", "#64748b")
            .text("No data for the selected filters");
    }
}