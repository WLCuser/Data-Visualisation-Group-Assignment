function drawChart4(data) {
    // Close the popup first so the chart returns to its card before it is redrawn
    if (typeof closeZoom === "function") closeZoom();

    const container = d3.select("#chart4");

    // Clear only elements, so the title text from index.html stays in the card
    container.selectAll("*").remove();

    if (!data || data.length === 0) return;

    // Shared top/bottom margins, width and height come from shared-constant.js.
    // Left/right are local: the legend sits to the right and needs room for its labels.
    const leftMargin = 80;
    const rightMargin = 200;
    const chartWidth = width - leftMargin - rightMargin;
    const chartHeight = innerHeight;

    // viewBox lets the SVG scale to the card and up inside the zoom popup
    const svgRoot = container.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("width", "100%")
        .style("height", "auto");

    const svg = svgRoot.append("g")
        .attr("transform", `translate(${leftMargin},${margin.top})`);

    // Zoom button comes from zoom.js
    addZoomButton("#chart4");

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

    const x = d3.scaleBand().domain(years).range([0, chartWidth]).padding(0.25);

    // X Axis & Label (Right end of X axis)
    svg.append("g").attr("transform", `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickSize(0)).selectAll("text").style("font-size", "14px");
    svg.append("text").attr("x", chartWidth).attr("y", chartHeight + 40).style("text-anchor", "end").style("font-size", "16px").style("fill", "#000").text("Calendar year");

    let maxVal = d3.max(chartData, d => d3.sum(remotenessTypes, key => d[key])) || 1000;
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([chartHeight, 0]);

    // Y Axis & Label (Top of Y axis)
    svg.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size", "14px");
    svg.append("text").attr("x", -10).attr("y", -16).style("text-anchor", "start").style("font-size", "16px").style("fill", "#000").text("Hospitalisations");

    const color = d3.scaleOrdinal().domain(remotenessTypes).range(colorSafe10);
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
    const legend = svg.append("g").attr("transform", `translate(${chartWidth + 20}, 5)`);
    remotenessTypes.forEach((rem, i) => {
        let legendRow = legend.append("g").attr("transform", `translate(0, ${i * 24})`);
        legendRow.append("rect").attr("width", 14).attr("height", 14).attr("fill", color(rem));
        legendRow.append("text").attr("x", 20).attr("y", 12).style("font-size", "14px").style("fill", "#334155").text(rem);
    });
}