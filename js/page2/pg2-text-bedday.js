d3.csv("data/state-and-territory-hospitalisation-injury-clean.csv", d => {
    return {
        year: +d["calendar year"],
        state: d["state or territory"],
        Hospitalisations: +d["count of cases excluding died in hospitals within 30 days"],
        BedDays: +d["bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawBedDays(data);
    registerChart("#chart6", data, drawBedDays);
});

const drawBedDays = data => {

    // Rows in a fixed order, with the full name and the same colour as the state has in the other charts
    // (Okabe-Ito, colour-blind friendly). The colour is only a small marker: the name is written out.
    const states = [
        { code: "NSW", name: "New South Wales",              colour: "#0072B2" },
        { code: "Vic", name: "Victoria",                     colour: "#E69F00" },
        { code: "Qld", name: "Queensland",                   colour: "#009E73" },
        { code: "WA",  name: "Western Australia",            colour: "#CC79A7" },
        { code: "SA",  name: "South Australia",              colour: "#56B4E9" },
        { code: "Tas", name: "Tasmania",                     colour: "#D55E00" },
        { code: "ACT", name: "Australian Capital Territory", colour: "#F0E442" },
        { code: "NT",  name: "Northern Territory",           colour: "#000000" }
    ];

    // Drawn inside an svg, because the shared code removes the svg and calls this function again
    // every time a filter changes
    const svg = d3.select("#chart6")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    // Keep this as the first g in the svg: the shared tooltip code looks for it
    const innerChart = svg
        .append("g")
        .attr("transform", "translate(30, 20)");

    // Average bed days per hospitalisation = total bed days / total cases, per state
    const averages = d3.rollup(
        data,
        v => {
            const cases = d3.sum(v, d => d.Hospitalisations);
            return cases > 0 ? d3.sum(v, d => d.BedDays) / cases : undefined;
        },
        d => d.state
    );

    // "all years", or the year when one year is selected
    const [firstYear, lastYear] = d3.extent(data, d => d.year);
    const yearLabel = firstYear === undefined || firstYear !== lastYear ? "all years" : `${firstYear}`;

    innerChart
        .append("text")
        .text(`Average bed days per hospitalisation (${yearLabel})`)
        .attr("x", 0)
        .attr("y", 30)
        .attr("fill", "#111")
        .style("font-size", "28px")
        .style("font-weight", "bold");

    // Only the states that are left after the filters
    const rows = states.filter(s => averages.get(s.code) !== undefined);

    if (rows.length === 0) {
        innerChart
            .append("text")
            .text("No data for this selection")
            .attr("x", 0)
            .attr("y", 80)
            .attr("fill", "#111")
            .style("font-size", "22px");
        return;
    }

    const rowHeight = 40;

    rows.forEach((s, i) => {
        const y = 85 + i * rowHeight;

        // Colour marker (circles on purpose: the shared mouse code only reacts to rects and paths in this chart)
        innerChart
            .append("circle")
            .attr("cx", 10)
            .attr("cy", y - 7)
            .attr("r", 8)
            .attr("fill", s.colour)
            .attr("stroke", "#333")
            .attr("stroke-width", 1);

        innerChart
            .append("text")
            .text(s.name)
            .attr("x", 32)
            .attr("y", y)
            .attr("fill", "#111")
            .style("font-size", "22px");

        innerChart
            .append("text")
            .text(`${d3.format(".2f")(averages.get(s.code))} bed days`)
            .attr("x", 380)
            .attr("y", y)
            .attr("fill", "#111")
            .style("font-size", "22px")
            .style("font-weight", "bold");
    });
};