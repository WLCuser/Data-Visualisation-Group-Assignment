d3.csv("data/First-Nations-hospitalised-injuries-clean.csv", d => {
    if (d["Breakdown type"] !== "road user") return null;
    return {
        year: +d["Calendar year"],
        status: d["First Nations status"],
        RoadUser: d["Breakdown value"],
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d["Bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawDumbbellChart(data);
    registerChart("#chart2", data, drawDumbbellChart);
    createTooltip("#chart2");
    handleMouseEvents("#chart2");
});

// Wraps long tick labels on a LEFT axis, vertically centred on the tick
const wrapLabels = (selection, maxWidth) => {
    selection.each(function () {
        const text = d3.select(this);
        const x = text.attr("x");
        const words = text.text().split(/\s+/);
        text.text(null);

        // Work out the lines first by measuring with a temporary tspan
        const lines = [];
        let line = [];
        const probe = text.append("tspan");
        words.forEach(word => {
            probe.text([...line, word].join(" "));
            if (probe.node().getComputedTextLength() > maxWidth && line.length) {
                lines.push(line.join(" "));
                line = [word];
            } else {
                line.push(word);
            }
        });
        lines.push(line.join(" "));
        probe.remove();

        // Draw the lines, shifting the first one up so the block is centred
        lines.forEach((l, i) => {
            text.append("tspan")
                .attr("x", x)
                .attr("dy", i === 0 ? `${0.32 - (lines.length - 1) * 0.55}em` : "1.1em")
                .text(l);
        });
    });
};

const drawDumbbellChart = data => {

    const margin = { top: 40, right: 30, bottom: 60, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#chart2")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Total hospitalisations per status per road user
    const totals = d3.rollups(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.status,
        d => d.RoadUser
    ).flatMap(([status, values]) =>
        values.map(([RoadUser, total]) => ({ status, RoadUser, total }))
    );

    // Convert to % share of each group's own total
    const statusTotals = d3.rollup(totals, v => d3.sum(v, d => d.total), d => d.status);
    const shares = totals.map(d => ({
        ...d,
        share: (d.total / statusTotals.get(d.status)) * 100
    }));

    // One row per road user, biggest share on top
    const rows = d3.groups(shares, d => d.RoadUser)
        .map(([RoadUser, values]) => ({
            RoadUser,
            min: d3.min(values, d => d.share),
            max: d3.max(values, d => d.share)
        }))
        .sort((a, b) => b.max - a.max);

    const color = d3.scaleOrdinal()
        .domain(["First Nations people","Non-Indigenous"])
        .range(colorSafe10);

    const yScale = d3.scaleBand()
        .domain(rows.map(d => d.RoadUser))
        .range([0, innerHeight])
        .paddingInner(0.2);

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(shares, d => d.share)])
        .nice()
        .range([0, innerWidth]);

    const cy = RoadUser => yScale(RoadUser) + yScale.bandwidth() / 2;

    innerChart
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d => d + "%"));

    innerChart
        .append("g")
        .call(d3.axisLeft(yScale))
        .selectAll(".tick text")
        .call(wrapLabels, margin.left - 20);

    // Axis labels
    innerChart
        .append("text")
        .text("Percentage of group's hospitalisations (%)")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    innerChart
        .append("text")
        .text("Road User")
        .attr("x", -margin.left + 50)
        .attr("y", -10)
        .attr("text-anchor", "start");

    // Faint guide line across each row
    innerChart
        .selectAll("line.guide")
        .data(rows)
        .join("line")
        .attr("class", "guide")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", d => cy(d.RoadUser))
        .attr("y2", d => cy(d.RoadUser))
        .attr("stroke", "#ddd");

    // Connector between the two groups
    innerChart
        .selectAll("line.connector")
        .data(rows)
        .join("line")
        .attr("class", "connector")
        .attr("x1", d => xScale(d.min))
        .attr("x2", d => xScale(d.max))
        .attr("y1", d => cy(d.RoadUser))
        .attr("y2", d => cy(d.RoadUser))
        .attr("stroke", "#999")
        .attr("stroke-width", 3);

    // Dots (one per group per road user)
    innerChart
        .selectAll("circle.dot")
        .data(shares)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.share))
        .attr("cy", d => cy(d.RoadUser))
        .attr("r", 6)
        .attr("fill", d => color(d.status));

    // Legend
    const legend = innerChart
        .append("g")
        .attr("transform", `translate(${innerWidth - 160}, ${innerHeight - 50})`);

    color.domain().forEach((status, i) => {
        const legendRow = legend
            .append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("circle")
            .attr("cx", 5)
            .attr("cy", 5)
            .attr("r", 5)
            .attr("fill", color(status));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 5)
            .attr("text-anchor", "start")
            .attr("fill", "currentColor")
            .style("alignment-baseline", "middle")
            .text(status);
    });
};