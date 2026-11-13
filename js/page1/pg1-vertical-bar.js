function drawChart3(data) {
    const container = d3.select("#chart3");
    container.html(`
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>Chart 3 - Vertical bar chart: Annual hospitalisations by age group</b>
            <button class="chart-zoom-btn" title="Expand chart">🔍</button>
        </div>
    `);

    const margin = {top: 30, right: 15, bottom: 35, left: 55},
          width = 440 - margin.left - margin.right,
          height = 190 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let tooltip = d3.select("body").select(".d3-tip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tip").style("opacity", 0);

    const customAgeOrder = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
    const rollup = d3.rollup(data, v => d3.sum(v, d => d['Hospitalisations']), d => d['Age group']);
    let chartData = customAgeOrder.map(age => ({ age, count: rollup.get(age) || 0 }));

    const x = d3.scaleBand().range([0, width]).domain(chartData.map(d => d.age)).padding(0.2);
    
    // X Axis & Label (Right end of X axis)
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").style("font-size", "9px");
    svg.append("text").attr("x", width).attr("y", height + 30).style("text-anchor", "end").style("font-size", "10px").style("fill", "#000").text("Age group");

    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count) || 1000]).range([height, 0]);
    
    // Y Axis & Label (Top of Y axis)
    svg.append("g").call(d3.axisLeft(y).ticks(4)).selectAll("text").style("font-size", "9px");
    svg.append("text").attr("x", -10).attr("y", -12).style("text-anchor", "start").style("font-size", "10px").style("fill", "#000").text("Hospitalisations");

    svg.selectAll("rect")
        .data(chartData).enter().append("rect")
        .attr("x", d => x(d.age)).attr("y", d => y(d.count))
        .attr("width", x.bandwidth()).attr("height", d => height - y(d.count))
        .attr("fill", "#f59e0b")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Age Group: <b>${d.age}</b><br>Hospitalisations: <b>${d.count.toLocaleString()}</b>`)
                   .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}