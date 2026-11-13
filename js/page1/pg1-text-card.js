function drawChart5(data) {
    // Close the popup first so the content returns to its card before it is redrawn
    if (typeof closeZoom === "function") closeZoom();

    const container = d3.select("#chart5");

    // Clear only elements, so the title text from index.html stays in the card
    container.selectAll("*").remove();

    // Determine title text based on year filter
    let yearTitle = activeFilters.year === 'All' ? '(all years)' : `(${activeFilters.year})`;

    // Group data by Road user and take the AVERAGE bed days
    const rollup = d3.rollup(data, v => d3.mean(v, d => +d['Avg_Bed_Days']), d => d['Road user']);
    let summaryData = Array.from(rollup, ([category, total]) => ({ category, total }))
                           .filter(d => d.total != null && !isNaN(d.total))
                           .sort((a, b) => b.total - a.total)
                           .slice(0, 6); // Top 6 items

    // The "text-summary" class is what openZoom moves into the popup,
    // so the subtitle lives inside it to appear in both places
    let listContainer = container.append("div")
        .attr("class", "text-summary")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("gap", "8px");

    listContainer.append("div")
        .style("font-size", "15px")
        .style("font-weight", "bold")
        .style("margin", "10px 0 4px 0")
        .style("color", "#1e293b")
        .text(`Average bed days per filter selection ${yearTitle}`);

    // Zoom button comes from zoom.js
    addZoomButton("#chart5");

    if (summaryData.length === 0) {
        listContainer.append("div").style("font-size", "14px").style("color", "#64748b").text("No data available for selected filters.");
        return;
    }

    const colors = colorSafe10;

    summaryData.forEach((d, i) => {
        let row = listContainer.append("div")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("align-items", "center")
            .style("font-size", "14px")
            .style("border-bottom", "1px solid #f1f5f9")
            .style("padding-bottom", "4px");

        let leftCol = row.append("div").style("display", "flex").style("align-items", "center").style("gap", "8px");

        leftCol.append("span")
            .style("width", "10px")
            .style("height", "10px")
            .style("border-radius", "50%")
            .style("background-color", colors[i % colors.length]);

        leftCol.append("span").style("color", "#334155").text(d.category);

        row.append("b").style("color", "#0f172a").text(`${d.total.toFixed(2)} days`);
    });
}