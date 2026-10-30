d3.csv("data/state-and-territory-hospitalisation-injury-agegroup.csv", d => {
    return {
        year: +d["calendar year"],
        state: d["state or territory"],
        ageGroup: d["age group"],
        Hospitalisations: +d["count of cases excluding died in hospitals within 30 days"],
        BedDays: +d["bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawStacked(data);
    registerChart("#chart4", data, drawStacked);
    createTooltip("#chart4");
    handleMouseEvents("#chart4");
});

const drawStacked = data => {
    // Stack order: first key is at the bottom (youngest at the bottom).
    // Listed by hand because sorting the labels alphabetically would put "8-16" last.
    const ageGroups = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];

    const svg = d3.select("#chart4")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Total hospitalisations per state per age group
    const nested = d3.rollup(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.state,
        d => d.ageGroup
    );

    // Wide format: one row per state, one column per age group
    // Rows are sorted so the state with the most cases comes first
    const wideData = Array.from(nested, ([state, byAge]) => {
        const row = { state };
        ageGroups.forEach(a => {
            row[a] = byAge.get(a) ?? 0;
        });
        row.total = d3.sum(ageGroups, a => row[a]);
        return row;
    }).sort((a, b) => d3.descending(a.total, b.total));

    // Stack the age groups
    const stackGenerator = d3.stack().keys(ageGroups);
    const stackedData = stackGenerator(wideData);   // one series per age group

    // Ordered categories, so a light-to-dark style sequential palette fits better than random colours
    const color = d3.scaleOrdinal()
        .domain(ageGroups)
        .range(d3.quantize(d3.interpolateViridis, ageGroups.length));

    // X: one band per state or territory
    const xScale = d3.scaleBand()
        .domain(wideData.map(d => d.state))
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
        .call(d3.axisLeft(yScale).tickFormat(d3.format(",")));

    innerChart
        .append("text")
        .text("Hospitalisations")
        .attr("x", -margin.left)
        .attr("y", -10)
        .attr("text-anchor", "start");

    innerChart
        .append("text")
        .text("State or territory")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    // Stacked bars: one group per age group, one rect per state
    innerChart
        .selectAll("g.series")
        .data(stackedData)
        .join("g")
        .attr("class", "series")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", d => xScale(d.data.state))
        .attr("y", d => yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .attr("height", d => yScale(d[0]) - yScale(d[1]));

    // Legend (top right, where the bars are short)
    const legend = svg
        .append("g")
        .attr("transform", `translate(${width - 200}, ${margin.top})`);

    legend.append("text")
        .text("Age group")
        .attr("x", 0)
        .attr("y", -8)
        .style("font-size", "12px")
        .style("font-weight", "bold");

    ageGroups.slice().reverse().forEach((ageGroup, i) => {   // top item matches top of stack
        const row = legend
            .append("g")
            .attr("transform", `translate(0, ${i * 18})`);

        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(ageGroup));

        row.append("text")
            .attr("x", 20)
            .attr("y", 5)
            .style("alignment-baseline", "middle")
            .style("font-size", "12px")
            .text(ageGroup);
    });
};