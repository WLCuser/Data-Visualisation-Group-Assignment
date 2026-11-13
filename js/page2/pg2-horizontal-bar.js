d3.csv("data/state-and-territory-hospitalisation-injury-clean.csv", d => {
    if (d["Breakdown type"] !== "road user") return null;
    return {
        year: +d["calendar year"],
        state: d["state or territory"],
        RoadUser: d["Breakdown value"],
        Hospitalisations: +d["count of cases excluding died in hospitals within 30 days"],
        BedDays: +d["bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawBarChart(data);
    registerChart("#chart2", data, drawBarChart);
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

const drawBarChart = data => {

    // Margins for this chart only (does not change the shared margin)
    const margin = { top: 40, right: 30, bottom: 60, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#chart2")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Stack order: first key is at the left; also the legend order
    const states = ["NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"];

    // Total hospitalisations per road user per state (all years added together)
    const nested = d3.rollup(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.RoadUser,
        d => d.state
    );

    // Wide format: one row per road user, one column per state; largest total first
    const wideData = Array.from(nested, ([RoadUser, byState]) => {
        const row = { RoadUser };
        states.forEach(s => {
            row[s] = byState.get(s) ?? 0;
        });
        row.total = d3.sum(states, s => row[s]);
        return row;
    }).sort((a, b) => d3.descending(a.total, b.total));

    // Stack the states
    const stackedData = d3.stack().keys(states)(wideData);   // one series per state

    // One object per segment. Each has a "total" field, because the shared tooltip code reads d.total.
    const segments = stackedData.flatMap(series =>
        series.map(d => ({
            RoadUser: d.data.RoadUser,
            state: series.key,
            x0: d[0],
            x1: d[1],
            total: d[1] - d[0]
        }))
    );

    const color = d3.scaleOrdinal()
        .domain(states)
        .range(colorSafe10.slice(0, 8));

    // One band per road user, with room between the bars
    const yScale = d3.scaleBand()
        .domain(wideData.map(d => d.RoadUser))
        .range([0, innerHeight])
        .padding(0.25);

    // Values run left to right, up to the longest stack (plus room for its total label)
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(wideData, d => d.total) * 1.12])
        .nice()
        .range([0, innerWidth]);

    const bottomAxis = d3.axisBottom(xScale);
    const leftAxis = d3.axisLeft(yScale);

    innerChart
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(bottomAxis);

    innerChart
        .append("g")
        .call(leftAxis)
        .selectAll(".tick text")
        .call(wrapLabels, margin.left - 20);

    // Axis labels
    innerChart
        .append("text")
        .text("Hospitalisations")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    innerChart
        .append("text")
        .text("Road user")
        .attr("x", -margin.left + 50)
        .attr("y", -10)
        .attr("text-anchor", "start");

    // Stacked bars: one rect per road user per state
    innerChart
        .selectAll("rect")
        .data(segments)
        .join("rect")
        .attr("x", d => xScale(d.x0))
        .attr("y", d => yScale(d.RoadUser))
        .attr("width", d => xScale(d.x1) - xScale(d.x0))
        .attr("height", yScale.bandwidth())
        .attr("fill", d => color(d.state))
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

    // Total for each road user at the end of its bar
    innerChart
        .selectAll("text.total-label")
        .data(wideData)
        .join("text")
        .attr("class", "total-label")
        .attr("x", d => xScale(d.total) + 5)
        .attr("y", d => yScale(d.RoadUser) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .style("font-size", "11px")
        .text(d => d3.format(",")(d.total));

    // Legend (bottom right of the chart area, where the bars are short)
    const legend = innerChart
        .append("g")
        .attr("transform", `translate(${innerWidth - 90}, ${innerHeight - 140})`);

    states.forEach((state, i) => {
        const legendRow = legend
            .append("g")
            .attr("transform", `translate(0, ${i * 16})`);

        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(state));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .attr("text-anchor", "start")
            .attr("fill", "currentColor")
            .style("alignment-baseline", "middle")
            .text(state);
    });
};