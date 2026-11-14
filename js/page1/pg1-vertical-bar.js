function drawChart3(data) {
    // Close the popup first so the chart returns to its card before it is redrawn
    if (typeof closeZoom === "function") closeZoom();

    const container = d3.select("#chart3");

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
    addZoomButton("#chart3");

    const customAgeOrder = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
    const rollup = d3.rollup(data, v => d3.sum(v, d => d['Hospitalisations']), d => d['Age group']);
    let chartData = customAgeOrder.map(age => ({ age, count: rollup.get(age) || 0 }));

    const x = d3.scaleBand().range([0, innerWidth]).domain(chartData.map(d => d.age)).padding(0.2);

    // X Axis & Label (Right end of X axis)
    svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x)).selectAll("text").style("font-size", "14px");
    svg.append("text").attr("x", innerWidth).attr("y", innerHeight + 40).style("text-anchor", "end").style("font-size", "20px").style("fill", "#000").text("Age group");

    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count) || 1000]).range([innerHeight, 0]);

    // Y Axis & Label (Top of Y axis)
    svg.append("g").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size", "14px");
    svg.append("text").attr("x", -10).attr("y", -16).style("text-anchor", "start").style("font-size", "20px").style("fill", "#000").text("Hospitalisations");

    // Shared tooltip from tooltip.js
    const tip = createSvgTooltip(svg);

    svg.selectAll("rect.bar")
        .data(chartData).enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.age)).attr("y", d => y(d.count))
        .attr("width", x.bandwidth()).attr("height", d => innerHeight - y(d.count))
        .attr("fill", "#f59e0b")
        .on("mouseenter", (event, d) => {
            tip.show(
                [
                    { label: "Age Group", value: d.age },
                    { label: "Hospitalisations", value: d.count.toLocaleString() }
                ],
                x(d.age) + x.bandwidth() / 2, y(d.count),
                { minX: 0, maxX: innerWidth, minY: -margin.top }
            );
        })
        .on("mouseleave", () => tip.hide());
}