function drawChart2(data) {
    const container = d3.select("#chart2");
    container.html("<b>Chart 2 - Horizontal bar chart: Annual hospitalisations by road user</b>");

    const margin = {top: 30, right: 30, bottom: 40, left: 160},
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

    const rollup = d3.rollup(data, v => d3.sum(v, d => d['Hospitalisations']), d => d['Road user']);
    const chartData = Array.from(rollup, ([roadUser, count]) => ({ roadUser, count })).sort((a,b) => b.count - a.count);

    const y = d3.scaleBand().range([0, height]).domain(chartData.map(d => d.roadUser)).padding(0.2);
    svg.append("g").call(d3.axisLeft(y).tickSize(0));

    const x = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count) || 1000]).range([0, width]);
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(4));

    svg.selectAll("rect")
        .data(chartData).enter().append("rect")
        .attr("x", x(0)).attr("y", d => y(d.roadUser))
        .attr("width", d => x(d.count)).attr("height", y.bandwidth())
        .attr("fill", "#0ea5e9")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Road User: <b>${d.roadUser}</b><br>Hospitalisations: <b>${d.count.toLocaleString()}</b>`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}