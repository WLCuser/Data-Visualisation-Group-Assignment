d3.csv("data/First-Nations-hospitalised-injuries-clean.csv", d => {
    if (d["Breakdown type"] !== "age group") return null;
    return {
        year: +d["Calendar year"],
        status: d["First Nations status"],
        Hospitalisations: +d.Hospitalisations,
        BedDays: +d["Bed days excluding died in hospitals within 30 days"]
    };
}).then(data => {
    console.log(data);
    drawText(data);
    registerChart("#chart6", data, drawText, false);
});

const drawText = (data, selectedYear = "all") => {
    // Remove the previous box so only one exists
    d3.select("#chart6").selectAll(".text-summary").remove();

    const filtered = selectedYear === "all"
        ? data
        : data.filter(d => d.year === selectedYear);

    const averages = d3.rollups(
        filtered,
        v => d3.sum(v, d => d.BedDays) / d3.sum(v, d => d.Hospitalisations),
        d => d.status
    );

    const color = d3.scaleOrdinal()
        .domain(["First Nations people", "Non-Indigenous"])
        .range(["green", "steelblue"]);

    const container = d3.select("#chart6")
        .append("div")
        .attr("class", "text-summary");

    container.append("h3")
        .text(selectedYear === "all"
            ? "Average bed days per hospitalisation (all years)"
            : `Average bed days per hospitalisation (${selectedYear})`);

    container.selectAll("p")
        .data(averages)
        .join("p")
        .style("font-size", "16px")
        .html(([status, avg]) =>
            `<span style="color:${color(status)}; font-weight:bold;">${status}</span>: ${avg.toFixed(2)} bed days`
        );
};
