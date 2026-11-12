function drawChart1(currentFilteredData, fullMasterData) {
    const container = d3.select("#chart1");
    container.html("<b>Chart 1 - Line chart: Annual hospitalised injuries</b>");

    const margin = {top: 15, right: 15, bottom: 35, left: 55},
          width = 440 - margin.left - margin.right,
          height = 190 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let tooltip = d3.select("body").select(".d3-tip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tip").style("opacity", 0);

    const sourceData = (fullMasterData && fullMasterData.length > 0) ? fullMasterData : currentFilteredData;
    const rollup = d3.rollup(sourceData, v => d3.sum(v, d => d['Hospitalisations']), d => d['Calendar year']);
    const chartData = Array.from(rollup, ([year, count]) => ({ year, count })).sort((a,b) => a.year - b.year);

    const x = d3.scaleLinear().domain([2011, 2021]).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count) * 1.1 || 1000]).range([height, 0]);

    // X Axis & Label
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d"))).selectAll("text").style("font-size", "9px");
    svg.append("text").attr("x", width / 2).attr("y", height + 30).style("text-anchor", "middle").style("font-size", "10px").style("fill", "#000").text("Calendar year");

    // Y Axis & Label
    svg.append("g").call(d3.axisLeft(y).ticks(4)).selectAll("text").style("font-size", "9px");
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -40).attr("x", -height / 2).style("text-anchor", "middle").style("font-size", "10px").style("fill", "#000").text("Hospitalisations");

    const line = d3.line().x(d => x(d.year)).y(d => y(d.count));
    svg.append("path").datum(chartData).attr("fill", "none").attr("stroke", "#4682b4").attr("stroke-width", 2).attr("d", line);

    svg.selectAll("circle")
        .data(chartData).enter().append("circle")
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.count))
        .attr("r", d => (activeFilters.year === 'All' || d.year == activeFilters.year) ? 5 : 3)
        .attr("fill", "#4682b4")
        .style("opacity", d => (activeFilters.year === 'All' || d.year == activeFilters.year) ? 1 : 0.3)
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Year: <b>${d.year}</b><br>Hospitalisations: <b>${d.count.toLocaleString()}</b>`)
                   .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}