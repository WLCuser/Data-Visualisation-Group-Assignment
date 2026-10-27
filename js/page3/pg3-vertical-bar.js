d3.csv("data/First-Nations-Age.csv", d => {
    return {
        year: +d["Calendar year"],
        status: d["First Nations status"],
        age: d["Age group"],
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d["Bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawAgeChart(data);
    registerChart("#chart3", data, drawAgeChart);
    populateFilters(data);
});

const drawAgeChart = data => {
    const svg = d3.select("#chart3")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Total hospitalisations per status per age group
    const totals = d3.rollups(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.status,
        d => d.age
    ).flatMap(([status, values]) =>
        values.map(([age, total]) => ({ status, age, total }))
    );

    const color = d3.scaleOrdinal()
        .domain(["First Nations people", "Non-Indigenous"])
        .range(["green", "steelblue"]);

    // Outer band: one slot per age group (in natural age order)
    const xScale = d3.scaleBand()
        .domain(totals.map(d => d.age))
        .range([0, innerWidth])
        .paddingInner(0.2);

    // Inner band: one slot per status inside each age group slot
    const xSubScale = d3.scaleBand()
        .domain(color.domain())
        .range([0, xScale.bandwidth()])
        .padding(0.05);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(totals, d => d.total)])
        .nice()
        .range([innerHeight, 0]);

    const bottomAxis = d3.axisBottom(xScale);
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
        .text("Age group")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    // Bars
    innerChart
        .selectAll("rect")
        .data(totals)
        .join("rect")
        .attr("x", d => xScale(d.age) + xSubScale(d.status))
        .attr("y", d => yScale(d.total))
        .attr("width", xSubScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.total))
        .attr("fill", d => color(d.status));

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