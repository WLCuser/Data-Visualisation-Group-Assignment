d3.csv("data/state-and-territory-hospitalisation-injury-annual.csv", d => {
    return {
        year: +d["calendar year"],
        period: d["6-monthly"],
        state: d["state or territory"],
        cases: +d["count of cases excluding died in hospitals within 30 days"],
        bedDays: +d["bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawLineChart(data);
    registerChart("#chart1", data, drawLineChart, false);
    createTooltip("#chart1");
    handleMouseEvents("#chart1");
});

const drawLineChart = (data, selectedYear = "all") => {
    const svg = d3.select("#chart1")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Total cases per state per year (adds the two half-years together)
    const totals = d3.rollups(
        data,
        v => d3.sum(v, d => d.cases),
        d => d.state,
        d => d.year
    ).flatMap(([state, values]) =>
        values.map(([year, total]) => ({ state, year, total }))
    );

    const byState = d3.group(
        totals.sort((a, b) => a.year - b.year),
        d => d.state
    );

    const xScale = d3.scaleLinear()
        .domain(d3.extent(totals, d => d.year))
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(totals, d => d.total)])
        .nice()
        .range([innerHeight, 0]);

    // 8 states need 8 colours
    const color = d3.scaleOrdinal()
        .domain(["NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"])
        .range(d3.schemeTableau10.slice(0, 8));

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
        .text("Hospitalisations (traffic injury cases)")
        .attr("x", -margin.left)
        .attr("y", -10)
        .attr("text-anchor", "start");

    innerChart
        .append("text")
        .text("Calendar year")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    // Lines: one per state
    const lineGenerator = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.total));

    innerChart
        .selectAll("path.line")
        .data(byState)
        .join("path")
        .attr("class", "line")
        .attr("d", ([, pts]) => lineGenerator(pts))
        .attr("fill", "none")
        .attr("stroke", ([state]) => color(state))
        .attr("stroke-width", 2);

    // Circles, drawn after the lines so they sit on top
    innerChart
        .selectAll("circle")
        .data(totals)
        .join("circle")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.total))
        .attr("r", 5)
        .attr("fill", d => color(d.state))
        .attr("opacity", d => (selectedYear === "all" || d.year === selectedYear ? 1 : 0.25));

    // Legend (bottom, horizontal), spacing reduced so 8 items fit
    const legend = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${height - 25})`);

    color.domain().forEach((state, i) => {
        const legendItem = legend
            .append("g")
            .attr("transform", `translate(${i * 65}, 0)`);

        legendItem.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(state));

        legendItem.append("text")
            .attr("x", 16)
            .attr("y", 5)
            .attr("text-anchor", "start")
            .attr("fill", "currentColor")
            .style("alignment-baseline", "middle")
            .style("font-size", "12px")
            .text(state);
    });
};