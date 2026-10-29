d3.csv("data/state-and-territory-hospitalisation-injury-roaduser.csv", d => {
    return {
        year: +d["calendar year"],
        state: d["state or territory"],
        RoadUser: d["road user"],
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

    // Total hospitalisations per road user per state (all years added together)
    const totals = d3.rollups(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.RoadUser,
        d => d.state
    ).flatMap(([RoadUser, values]) =>
        values.map(([state, total]) => ({ RoadUser, state, total }))
    );

    // Road users ordered by overall total, largest first
    const roadUserOrder = d3.rollups(
        totals,
        v => d3.sum(v, d => d.total),
        d => d.RoadUser
    )
        .sort((a, b) => d3.descending(a[1], b[1]))
        .map(d => d[0]);

    // Domain order controls bar order within each group and legend order
    const color = d3.scaleOrdinal()
        .domain(["NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"])
        .range(d3.schemeTableau10.slice(0, 8));

    // Outer band (vertical): one slot per road user
    const yScale = d3.scaleBand()
        .domain(roadUserOrder)
        .range([0, innerHeight])
        .paddingInner(0.1);

    // Inner band (vertical): one slot per state inside each road user slot
    const ySubScale = d3.scaleBand()
        .domain(color.domain())
        .range([0, yScale.bandwidth()])
        .padding(0.1);

    // Values run left to right
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(totals, d => d.total)])
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

    // Bars
    innerChart
        .selectAll("rect")
        .data(totals)
        .join("rect")
        .attr("x", 0)
        .attr("y", d => yScale(d.RoadUser) + ySubScale(d.state))
        .attr("width", d => xScale(d.total))
        .attr("height", ySubScale.bandwidth())
        .attr("fill", d => color(d.state));

    // Legend (bottom right of the chart area, where the bars are short)
    const legend = innerChart
        .append("g")
        .attr("transform", `translate(${innerWidth - 90}, ${innerHeight - 140})`);

    color.domain().forEach((state, i) => {
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