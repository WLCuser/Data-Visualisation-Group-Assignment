d3.csv("data/First-Nations-Counterparty.csv", d => {
    return {
        year: +d["Calendar year"],
        status: d["First Nations status"],
        counterparty: d["Counterparty"],
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d["Bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawDonutChart(data);
});

const drawDonutChart = data => {
    const radius = Math.min(width, height) / 2 - 20;
    const statuses = ["First Nations people", "Non-Indigenous"];

    // Totals per counterparty and status: Map(counterparty -> Map(status -> total))
    const nested = d3.rollup(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.counterparty,
        d => d.status
    );

    // INNER ring data: one total per counterparty (statuses combined), largest first
    const innerData = Array.from(nested, ([counterparty, byStatus]) => ({
        counterparty,
        total: d3.sum(byStatus.values())
    })).sort((a, b) => b.total - a.total);

    // OUTER ring data: two entries per counterparty, in the same counterparty order
    const outerData = innerData.flatMap(({ counterparty }) =>
        statuses.map(status => ({
            counterparty,
            status,
            total: nested.get(counterparty).get(status) ?? 0
        }))
    );

    // Colors
    const counterpartyColor = d3.scaleOrdinal()
        .domain(innerData.map(d => d.counterparty))
        .range(d3.schemeSet2);

    const statusColor = d3.scaleOrdinal()
        .domain(statuses)
        .range(["green", "steelblue"]);

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

    // Inner ring labels (skip very small slices)
    innerChart
        .append("g")
        .attr("class", "inner-labels")
        .selectAll("text")
        .data(innerSlices)
        .join("text")
        .attr("transform", d => `translate(${innerArc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text(d => (d.endAngle - d.startAngle > 0.3 ? d.data.counterparty : ""));

    // Outer ring: split by status within each counterparty
    innerChart
        .append("g")
        .attr("class", "outer-ring")
        .selectAll("path")
        .data(pie(outerData))
        .join("path")
        .attr("d", outerArc)
        .attr("fill", d => statusColor(d.data.status))
        .attr("stroke", "white")
        .attr("stroke-width", 2);

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

    // Legend 2: status (outer ring), bottom left
    const statusLegend = svg
        .append("g")
        .attr("transform", `translate(20, ${height - 65})`);

    statusLegend
        .append("text")
        .attr("y", 0)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Outer ring: status");

    statuses.forEach((status, i) => {
        const row = statusLegend
            .append("g")
            .attr("transform", `translate(0, ${15 + i * 20})`);

        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", statusColor(status));

        row.append("text")
            .attr("x", 18)
            .attr("y", 5)
            .style("alignment-baseline", "middle")
            .style("font-size", "12px")
            .text(status);
    });
};