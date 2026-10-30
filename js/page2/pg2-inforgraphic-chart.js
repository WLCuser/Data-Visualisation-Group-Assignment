d3.csv("data/state-and-territory-hospitalisation-injury-sex.csv", d => {
    return {
        year: +d["calendar year"],
        state: d["state or territory"],
        sex: d.sex,
        Hospitalisations: +d["count of cases excluding died in hospitals within 30 days"],
        BedDays: +d["bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawInfographic(data);
    registerChart("#chart3", data, drawInfographic);
    createTooltip("#chart3");
    handleMouseEvents("#chart3");
});

// Wraps a block of left-aligned SVG text onto several lines.
// Set the text's x and y first; the first line sits at y, the rest follow below.
const wrapText = (selection, maxWidth, lineHeight = 1.3) => {
    selection.each(function () {
        const text = d3.select(this);
        const x = text.attr("x");
        const y = text.attr("y");
        const words = text.text().split(/\s+/);
        text.text(null);

        let line = [];
        let tspan = text.append("tspan").attr("x", x).attr("y", y);
        words.forEach(word => {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("dy", `${lineHeight}em`)
                    .text(word);
            }
        });
    });
};

const drawInfographic = data => {

    // Margins for this chart only (room for the title and stats on top, key points on the right)
    const margin = { top: 125, right: 260, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#chart3")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // ---------- Data ----------

    const fmt = d3.format(",");
    const pct = d3.format(".1%");

    // Total hospitalisations per state per sex (all years and half-years added together)
    const totals = d3.rollups(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.state,
        d => d.sex
    ).flatMap(([state, values]) =>
        values.map(([sex, total]) => ({ state, sex, total }))
    );

    // Total per state, and each sex's share of that state's cases
    const stateTotals = d3.rollup(totals, v => d3.sum(v, d => d.total), d => d.state);
    totals.forEach(d => {
        d.share = d.total / stateTotals.get(d.state);
    });

    // States ordered by overall total, largest first
    const stateOrder = Array.from(stateTotals)
        .sort((a, b) => d3.descending(a[1], b[1]))
        .map(d => d[0]);

    // National totals
    const sexTotals = d3.rollup(data, v => d3.sum(v, d => d.Hospitalisations), d => d.sex);
    const maleTotal = sexTotals.get("Male");
    const femaleTotal = sexTotals.get("Female");
    const grandTotal = maleTotal + femaleTotal;

    // ---------- Scales ----------

    // Domain order controls bar order inside each state and legend order
    const color = d3.scaleOrdinal()
        .domain(["Male", "Female"])
        .range(["#4e79a7", "#f28e2b"]);

    // Outer band (vertical): one slot per state
    const yScale = d3.scaleBand()
        .domain(stateOrder)
        .range([0, innerHeight])
        .paddingInner(0.2);

    // Inner band (vertical): one slot per sex inside each state slot
    const ySubScale = d3.scaleBand()
        .domain(color.domain())
        .range([0, yScale.bandwidth()])
        .padding(0.08);

    // Values run left to right; extra room on the right so the labels fit
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(totals, d => d.total) * 1.35])
        .nice()
        .range([0, innerWidth]);

    // ---------- Title and headline stats ----------

    svg.append("text")
        .text("Traffic injury hospitalisations by sex, state and territory")
        .attr("x", 10)
        .attr("y", 24)
        .attr("fill", "currentColor")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    const stats = [
        { big: fmt(grandTotal), caption: "traffic injury hospitalisations, 2011–2021", fill: "currentColor", x: 10 },
        { big: pct(maleTotal / grandTotal), caption: `male (${fmt(maleTotal)} cases)`, fill: color("Male"), x: 240 },
        { big: pct(femaleTotal / grandTotal), caption: `female (${fmt(femaleTotal)} cases)`, fill: color("Female"), x: 410 }
    ];

    stats.forEach(s => {
        svg.append("text")
            .text(s.big)
            .attr("x", s.x)
            .attr("y", 64)
            .attr("fill", s.fill)
            .style("font-size", "28px")
            .style("font-weight", "bold");

        svg.append("text")
            .text(s.caption)
            .attr("x", s.x)
            .attr("y", 82)
            .attr("fill", "currentColor")
            .style("font-size", "11px")
            .call(wrapText, 200);
    });

    // ---------- Axes ----------

    innerChart
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(fmt));

    innerChart
        .append("g")
        .call(d3.axisLeft(yScale));

    innerChart
        .append("text")
        .text("State or territory")
        .attr("x", -margin.left + 10)
        .attr("y", -10)
        .attr("text-anchor", "start");

    innerChart
        .append("text")
        .text("Hospitalisations (2011–2021)")
        .attr("x", innerWidth)
        .attr("y", innerHeight + margin.bottom - 10)
        .attr("text-anchor", "end");

    // ---------- Bars and labels ----------

    innerChart
        .selectAll("rect")
        .data(totals)
        .join("rect")
        .attr("x", 0)
        .attr("y", d => yScale(d.state) + ySubScale(d.sex))
        .attr("width", d => xScale(d.total))
        .attr("height", ySubScale.bandwidth())
        .attr("fill", d => color(d.sex));

    // Value label at the end of each bar: count and that sex's share of the state's cases
    innerChart
        .selectAll("text.value-label")
        .data(totals)
        .join("text")
        .attr("class", "value-label")
        .attr("x", d => xScale(d.total) + 5)
        .attr("y", d => yScale(d.state) + ySubScale(d.sex) + ySubScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .style("font-size", "11px")
        .text(d => `${fmt(d.total)} (${pct(d.share)})`);

    // Legend (bottom right of the chart area, where the bars are short)
    const legend = innerChart
        .append("g")
        .attr("transform", `translate(${innerWidth - 90}, ${innerHeight - 50})`);

    color.domain().forEach((sex, i) => {
        const legendRow = legend
            .append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(sex));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .attr("text-anchor", "start")
            .attr("fill", "currentColor")
            .style("alignment-baseline", "middle")
            .text(sex);
    });

    // ---------- Key points (text worked out from the data) ----------

    const femaleShares = totals.filter(d => d.sex === "Female");
    const highestFemale = d3.greatest(femaleShares, d => d.share);
    const lowestFemale = d3.least(femaleShares, d => d.share);

    const topState = stateOrder[0];
    const topStateTotal = stateTotals.get(topState);

    const [firstYear, lastYear] = d3.extent(data, d => d.year);
    const yearTotal = (sex, year) =>
        d3.sum(data.filter(d => d.sex === sex && d.year === year), d => d.Hospitalisations);
    const change = sex =>
        (yearTotal(sex, lastYear) - yearTotal(sex, firstYear)) / yearTotal(sex, firstYear);
    const signedPct = d3.format("+.0%");

    const keyPoints = [
        {
            heading: `Most cases: ${topState}`,
            body: `${fmt(topStateTotal)} hospitalisations, ${pct(topStateTotal / grandTotal)} of the national total.`
        },
        {
            heading: `Highest female share: ${highestFemale.state}`,
            body: `${pct(highestFemale.share)} of ${highestFemale.state}'s cases were female, compared with ${pct(lowestFemale.share)} in ${lowestFemale.state}, the lowest.`
        },
        {
            heading: `Change, ${firstYear} to ${lastYear}`,
            body: `Female cases ${signedPct(change("Female"))}, male cases ${signedPct(change("Male"))}.`
        }
    ];

    const panelX = width - margin.right + 25;

    // Thin divider between the chart and the key points
    svg.append("line")
        .attr("x1", panelX - 15)
        .attr("x2", panelX - 15)
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#ccc");

    keyPoints.forEach((kp, i) => {
        const y = margin.top + 10 + i * 105;

        svg.append("text")
            .text(kp.heading)
            .attr("x", panelX)
            .attr("y", y)
            .attr("fill", "currentColor")
            .style("font-size", "13px")
            .style("font-weight", "bold");

        svg.append("text")
            .text(kp.body)
            .attr("x", panelX)
            .attr("y", y + 20)
            .attr("fill", "currentColor")
            .style("font-size", "12px")
            .call(wrapText, margin.right - 40);
    });
};