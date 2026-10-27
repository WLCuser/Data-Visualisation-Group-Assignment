d3.csv("data/First-Nations-Age.csv", d => {
    return {
        year: +d["Calendar year"],
        status: d["First Nations status"],
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d["Bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawLineChart(data);
});

const drawLineChart = data => {
    const svg = d3.select("#chart1")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Total hospitalisations per status per year
    const totals = d3.rollups(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.status,
        d => d.year
    ).flatMap(([status, values]) =>
        values.map(([year, total]) => ({ status, year, total }))
    );

    // One array of points per status, sorted by year, for the lines
    const byStatus = d3.group(
        totals.sort((a, b) => a.year - b.year),
        d => d.status
    );

    const xScale = d3.scaleLinear()
        .domain(d3.extent(totals, d => d.year))
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(totals, d => d.total)])
        .nice()
        .range([innerHeight, 0]);

    const color = d3.scaleOrdinal()
        .domain(["First Nations people", "Non-Indigenous"])
        .range(["green", "steelblue"]);

    const bottomAxis = d3.axisBottom(xScale)
        .ticks(11)
        .tickFormat(d3.format("d"));

    const leftAxis = d3.axisLeft(yScale);

    innerChart
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(bottomAxis);

    innerChart
        .append("g")
        .call(leftAxis);

    innerChart
        .append("text")
        .text("Hospitalisations")
        .attr("x", -margin.left)
        .attr("y", -10)
        .attr("text-anchor", "start");

    innerChart
        .append("text")
        .text("Calendar year")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    // Circles (written first, raised to the top below)
    innerChart
        .selectAll("circle")
        .data(totals)
        .join("circle")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.total))
        .attr("r", 4)
        .attr("fill", d => color(d.status));

    // Lines: one per status
    const lineGenerator = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.total));

    innerChart
        .selectAll("path.line")
        .data(byStatus)
        .join("path")
        .attr("class", "line")
        .attr("d", ([, pts]) => lineGenerator(pts))
        .attr("fill", "none")
        .attr("stroke", ([status]) => color(status))
        .attr("stroke-width", 2);

    // Legend (bottom, horizontal)
    const legend = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${height - 25})`);

    color.domain().forEach((status, i) => {
        const legendItem = legend
            .append("g")
            .attr("transform", `translate(${i * 170}, 0)`);

        legendItem.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(status));

        legendItem.append("text")
            .attr("x", 16)
            .attr("y", 5)
            .attr("text-anchor", "start")
            .attr("fill", "currentColor")
            .style("alignment-baseline", "middle")
            .style("font-size", "12px")
            .text(status);
    });
};