function drawChart4(data) {
    const container = d3.select("#chart4");
    container.html(`
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>Chart 4 - Stacked vertical bar chart: Annual hospitalisations by remoteness</b>
            <button class="chart-zoom-btn" title="Expand chart">🔍</button>
        </div>
    `);

    if (!data || data.length === 0) return;

    const margin = {top: 30, right: 90, bottom: 35, left: 55},
          width = 440 - margin.left - margin.right,
          height = 190 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right + 70)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let tooltip = d3.select("body").select(".d3-tip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tip").style("opacity", 0);

    let nested = {};
    let remotenessSet = new Set();

    data.forEach(d => {
        let yr = d['Calendar year'];
        let rem = d['ABS remoteness area'] || 'Unknown';
        remotenessSet.add(rem);
        if (!nested[yr]) nested[yr] = {};
        nested[yr][rem] = (nested[yr][rem] || 0) + (+d['Hospitalisations'] || 0);
    });

    let years = Object.keys(nested).sort((a, b) => a - b);
    let remotenessTypes = Array.from(remotenessSet).filter(Boolean).sort();

    let chartData = years.map(yr => {
        let obj = { year: yr };
        remotenessTypes.forEach(rem => { obj[rem] = nested[yr][rem] || 0; });
        return obj;
    });

    const x = d3.scaleBand().domain(years).range([0, width]).padding(0.25);
    
    // X Axis & Label (Right end of X axis)
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickSize(0)).selectAll("text").style("font-size", "9px");
    svg.append("text").attr("x", width).attr("y", height + 30).style("text-anchor", "end").style("font-size", "10px").style("fill", "#000").text("Calendar year");

    let maxVal = d3.max(chartData, d => d3.sum(remotenessTypes, key => d[key])) || 1000;
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([height, 0]);
    
    // Y Axis & Label (Top of Y axis)
    svg.append("g").call(d3.axisLeft(y).ticks(4)).selectAll("text").style("font-size", "9px");
    svg.append("text").attr("x", -10).attr("y", -12).style("text-anchor", "start").style("font-size", "10px").style("fill", "#000").text("Hospitalisations");

    const color = d3.scaleOrdinal().domain(remotenessTypes).range(['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899']);
    const stack = d3.stack().keys(remotenessTypes);
    const series = stack(chartData);

    svg.selectAll("g.layer")
        .data(series).enter().append("g").attr("fill", d => color(d.key))
        .selectAll("rect").data(d => d).enter().append("rect")
        .attr("x", d => x(d.data.year))
        .attr("y", d => y(d[1]))
        .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
        .attr("width", x.bandwidth())
        .on("mouseover", (event, d) => {
            let subCategory = d3.select(event.currentTarget.parentNode).datum().key;
            let val = d[1] - d[0];
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Year: <b>${d.data.year}</b><br>Remoteness: <b>${subCategory}</b><br>Hospitalisations: <b>${val.toLocaleString()}</b>`)
                   .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));

    // Legend on the Right Side
    const legend = svg.append("g").attr("transform", `translate(${width + 10}, 5)`);
    remotenessTypes.forEach((rem, i) => {
        let legendRow = legend.append("g").attr("transform", `translate(0, ${i * 15})`);
        legendRow.append("rect").attr("width", 10).attr("height", 10).attr("fill", color(rem));
        legendRow.append("text").attr("x", 14).attr("y", 9).style("font-size", "9px").style("fill", "#334155").text(rem);
    });
}