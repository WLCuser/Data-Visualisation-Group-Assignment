function drawChart1(currentFilteredData, fullMasterData) {
    // Close the popup first so the chart returns to its card before it is redrawn
    if (typeof closeZoom === "function") closeZoom();

    const container = d3.select("#chart1");

    // Clear only elements, so the title text from index.html stays in the card
    container.selectAll("*").remove();

    // margin, width, height, innerWidth, innerHeight come from shared-constant.js
    // viewBox lets the SVG scale to the card and up inside the zoom popup
    const svgRoot = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

    const svg = svgRoot.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Zoom button comes from zoom.js
    addZoomButton("#chart1");

    // The year filter must NOT remove data, otherwise the line collapses to one point.
    // So start from the full data and apply every filter except year here.
    // Maps each activeFilters key (from your main script) to its CSV column.
    const filterColumns = {
        gender:     'Sex',
        roaduser:   'Road user',
        age:        'Age group',
        remoteness: 'ABS remoteness area'
    };

    const allData = (fullMasterData && fullMasterData.length > 0) ? fullMasterData : currentFilteredData;
    const sourceData = allData.filter(d =>
        Object.entries(filterColumns).every(([key, column]) =>
            activeFilters[key] === 'All' || d[column] === activeFilters[key]
        )
    );

    const rollup = d3.rollup(sourceData, v => d3.sum(v, d => d['Hospitalisations']), d => d['Calendar year']);
    const chartData = Array.from(rollup, ([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

    const x = d3.scaleLinear().domain([2011, 2021]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count) * 1.1 || 1000]).range([innerHeight, 0]);

    // X Axis & Label (Label positioned at the right end of X axis)
    svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format("d"))).selectAll("text").style("font-size", "14px");
    svg.append("text").attr("x", innerWidth).attr("y", innerHeight + 40).style("text-anchor", "end").style("font-size", "20px").style("fill", "#000").text("Calendar year");

    // Y Axis & Label (Label positioned right above the top of Y axis)
    svg.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size", "14px");
    svg.append("text").attr("x", -10).attr("y", -16).style("text-anchor", "start").style("font-size", "20px").style("fill", "#000").text("Hospitalisations");

    const line = d3.line().x(d => x(d.year)).y(d => y(d.count));
    svg.append("path").datum(chartData).attr("fill", "none").attr("stroke", "#4682b4").attr("stroke-width", 3).attr("d", line);

    // Shared tooltip from tooltip.js
    const tip = createSvgTooltip(svg);

    svg.selectAll("circle")
        .data(chartData).enter().append("circle")
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.count))
        .attr("r", 8)
        .attr("fill", "#4682b4")
        .style("opacity", d => (activeFilters.year === 'All' || d.year == activeFilters.year) ? 1 : 0.3)
        .on("mouseenter", (event, d) => {
            tip.show(
                [
                    { label: "Year", value: d.year },
                    { label: "Hospitalisations", value: d.count.toLocaleString() }
                ],
                x(d.year), y(d.count) - 8,
                { minX: 0, maxX: innerWidth, minY: -margin.top }
            );
        })
        .on("mouseleave", () => tip.hide());
}