function drawChart1(filteredData, fullMasterData) {
    const container = d3.select("#chart1");
    container.html("<b>Chart 1 - Line chart: Annual hospitalised injuries</b>");

    const margin = {top: 30, right: 30, bottom: 40, left: 65},
          width = 520 - margin.left - margin.right,
          height = 300 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let tooltip = d3.select("body").select(".d3-tip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "d3-tip").style("opacity", 0);
    }

    // Use full master dataset so the trend line never collapses
    const sourceData = (fullMasterData && fullMasterData.length > 0) ? fullMasterData : filteredData;

    const rollup = d3.rollup(sourceData, v => d3.sum(v, d => d['Hospitalisations']), d => d['Calendar year']);
    const chartData = Array.from(rollup, ([year, count]) => ({ year, count })).sort((a,b) => a.year - b.year);

    const x = d3.scaleLinear()
        .domain(d3.extent(chartData, d => d.year).length ? d3.extent(chartData, d => d.year) : [2011, 2021])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count) ? d3.max(chartData, d => d.count) * 1.1 : 1000])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g").call(d3.axisLeft(y));

    const line = d3.line().x(d => x(d.year)).y(d => y(d.count));

    // Draw full trend line across all years
    svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "#4682b4")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Draw points: Highlight selected year, dim unselected points with lower saturation/opacity
    svg.selectAll("circle")
        .data(chartData)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", d => (activeFilters.year === 'All' || d.year == activeFilters.year) ? 6 : 4)
        .attr("fill", "#4682b4")
        .style("opacity", d => (activeFilters.year === 'All' || d.year == activeFilters.year) ? 1 : 0.25)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Year: <b>${d.year}</b><br>Hospitalisations: <b>${d.count.toLocaleString()}</b>`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}