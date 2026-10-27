d3.csv("data/First-Nations-Remoteness.csv", d => {
    return {
        year: +d["Calendar year"],
        status: d["First Nations status"],
        remoteness: d["ABS remoteness area"],
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d["Bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawStacked(data);
    registerChart("#chart4", data, drawStacked);
});

const drawStacked = data => {
    // Stack order: first key is at the bottom
    const statuses = ["Non-Indigenous", "First Nations people"];

    const svg = d3.select("#chart4")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Total hospitalisations per remoteness area per status
    const nested = d3.rollup(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.remoteness,
        d => d.status
    );

    // Wide format: one row per remoteness area, one column per status
    const wideData = Array.from(nested, ([remoteness, byStatus]) => {
        const row = { remoteness };
        statuses.forEach(s => {
            row[s] = byStatus.get(s) ?? 0;
        });
        return row;
    });

    // Stack the statuses
    const stackGenerator = d3.stack().keys(statuses);
    const stackedData = stackGenerator(wideData);   // one series per status

    const color = d3.scaleOrdinal()
        .domain(statuses)
        .range(["steelblue", "green"]);

    // X: one band per remoteness area
    const xScale = d3.scaleBand()
        .domain(wideData.map(d => d.remoteness))
        .range([0, innerWidth])
        .padding(0.2);

    // Y: hospitalisations, up to the tallest stack
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
        .nice()
        .range([innerHeight, 0]);

    // Axes
    innerChart
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

    innerChart
        .append("g")
        .call(d3.axisLeft(yScale));

    innerChart
        .append("text")
        .text("Hospitalisations")
        .attr("x", -margin.left)
        .attr("y", -10)
        .attr("text-anchor", "start");

    innerChart
        .append("text")
        .text("Remoteness area")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    // Stacked bars: one group per status, one rect per remoteness area
    innerChart
        .selectAll("g.series")
        .data(stackedData)
        .join("g")
        .attr("class", "series")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", d => xScale(d.data.remoteness))
        .attr("y", d => yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .attr("height", d => yScale(d[0]) - yScale(d[1]));

    // Legend (top right)
    const legend = svg
        .append("g")
        .attr("transform", `translate(${width - 200}, ${margin.top})`);

    statuses.slice().reverse().forEach((status, i) => {   // top item matches top of stack
        const row = legend
            .append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(status));

        row.append("text")
            .attr("x", 20)
            .attr("y", 5)
            .style("alignment-baseline", "middle")
            .style("font-size", "12px")
            .text(status);
    });
};