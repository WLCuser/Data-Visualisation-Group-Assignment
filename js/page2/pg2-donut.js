d3.csv("data/state-hospitalisation-injury-counterparty.csv", d => {
    return {
        year: +d["calendar year"],
        state: d["state or territory"],
        counterparty: d.counterparty,
        Hospitalisations: +d["count of cases excluding died in hospitals within 30 days"],
        BedDays: +d["bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawDonutChart(data);
    registerChart("#chart5", data, drawDonutChart);
    createTooltip("#chart5");
    handleMouseEvents("#chart5");
});

const drawDonutChart = data => {
    const radius = Math.min(width, height) / 2 - 20;

    // Order of the states inside each counterparty slice (also the legend order)
    const states = ["NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"];

    // Totals per counterparty and state: Map(counterparty -> Map(state -> total))
    const nested = d3.rollup(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.counterparty,
        d => d.state
    );

    // INNER ring data: one total per counterparty (states combined), largest first
    const innerData = Array.from(nested, ([counterparty, byState]) => ({
        counterparty,
        total: d3.sum(byState.values())
    })).sort((a, b) => b.total - a.total);

    const grandTotal = d3.sum(innerData, d => d.total);

    // OUTER ring data: one entry per state per counterparty, in the same counterparty order
    const outerData = innerData.flatMap(({ counterparty }) =>
        states.map(state => ({
            counterparty,
            state,
            total: nested.get(counterparty).get(state) ?? 0
        }))
    );

    // Colors
    const counterpartyColor = d3.scaleOrdinal()
        .domain(innerData.map(d => d.counterparty))
        .range(d3.schemeSet2);

    const stateColor = d3.scaleOrdinal()
        .domain(states)
        .range(d3.schemeTableau10.slice(0, 8));

    // Same pie settings for both rings, so the angles line up
    const pie = d3.pie()
        .value(d => d.total)
        .sort(null);

    const innerArc = d3.arc()
        .innerRadius(radius * 0.35)
        .outerRadius(radius * 0.65);

    const outerArc = d3.arc()
        .innerRadius(radius * 0.68)
        .outerRadius(radius * 1);

    const svg = d3.select("#chart5")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Inner ring: total distribution by counterparty
    const innerSlices = pie(innerData);

    innerChart
        .append("g")
        .attr("class", "inner-ring")
        .selectAll("path")
        .data(innerSlices)
        .join("path")
        .attr("d", innerArc)
        .attr("fill", d => counterpartyColor(d.data.counterparty))
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    // Inner ring labels: each counterparty's share of all cases (skip very small slices).
    // Percentages instead of names, because the counterparty names are too long for the ring.
    innerChart
        .append("g")
        .attr("class", "inner-labels")
        .selectAll("text")
        .data(innerSlices)
        .join("text")
        .attr("transform", d => `translate(${innerArc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text(d => (d.endAngle - d.startAngle > 0.3 ? d3.format(".1%")(d.data.total / grandTotal) : ""));

    // Outer ring: split by state within each counterparty
    innerChart
        .append("g")
        .attr("class", "outer-ring")
        .selectAll("path")
        .data(pie(outerData))
        .join("path")
        .attr("d", outerArc)
        .attr("fill", d => stateColor(d.data.state))
        .attr("stroke", "white")
        .attr("stroke-width", 1);

    // Centre of the donut: overall total
    innerChart
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", -2)
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(d3.format(",")(grandTotal));

    innerChart
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", 14)
        .style("font-size", "11px")
        .text("cases");

    // Legend 1: counterparty (inner ring), top left
    const counterpartyLegend = svg
        .append("g")
        .attr("transform", "translate(20, 20)");

    counterpartyLegend
        .append("text")
        .attr("y", 0)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Inner ring: counterparty");

    counterpartyColor.domain().forEach((counterparty, i) => {
        const row = counterpartyLegend
            .append("g")
            .attr("transform", `translate(0, ${15 + i * 20})`);

        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", counterpartyColor(counterparty));

        row.append("text")
            .attr("x", 18)
            .attr("y", 5)
            .style("alignment-baseline", "middle")
            .style("font-size", "12px")
            .text(counterparty);
    });

    // Legend 2: state or territory (outer ring), top right
    const stateLegend = svg
        .append("g")
        .attr("transform", `translate(${width - 190}, 20)`);

    stateLegend
        .append("text")
        .attr("y", 0)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Outer ring: state or territory");

    states.forEach((state, i) => {
        const row = stateLegend
            .append("g")
            .attr("transform", `translate(0, ${15 + i * 18})`);

        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", stateColor(state));

        row.append("text")
            .attr("x", 18)
            .attr("y", 5)
            .style("alignment-baseline", "middle")
            .style("font-size", "12px")
            .text(state);
    });
};