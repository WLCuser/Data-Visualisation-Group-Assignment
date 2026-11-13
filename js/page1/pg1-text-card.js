function drawChart5(data) {
    const container = d3.select("#chart5");
    
    // Determine title text based on year filter
    let yearTitle = activeFilters.year === 'All' ? '(all years)' : `(${activeFilters.year})`;

    container.html(`
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>Chart 5 - Summary: Average metrics by category</b>
            <button class="chart-zoom-btn" title="Expand chart">🔍</button>
        </div>
        <div style="font-size: 13px; font-weight: bold; margin: 10px 0 12px 0; color: #1e293b;">
            Average hospitalisations per filter selection ${yearTitle}
        </div>
    `);

    // Group data by Road user or Age group to display list items
    const rollup = d3.rollup(data, v => d3.sum(v, d => d['Hospitalisations']), d => d['Road user']);
    let summaryData = Array.from(rollup, ([category, total]) => ({ category, total }))
                           .sort((a, b) => b.total - a.total)
                           .slice(0, 6); // Top 6 items

    let listContainer = container.append("div").style("display", "flex").style("flex-direction", "column").style("gap", "8px");

    if (summaryData.length === 0) {
        listContainer.append("div").style("font-size", "12px").style("color", "#64748b").text("No data available for selected filters.");
        return;
    }

    const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b'];

    summaryData.forEach((d, i) => {
        let row = listContainer.append("div")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("align-items", "center")
            .style("font-size", "12px")
            .style("border-bottom", "1px solid #f1f5f9")
            .style("padding-bottom", "4px");

        let leftCol = row.append("div").style("display", "flex").style("align-items", "center").style("gap", "8px");
        
        leftCol.append("span")
            .style("width", "10px")
            .style("height", "10px")
            .style("border-type", "solid")
            .style("border-radius", "50%")
            .style("background-color", colors[i % colors.length]);

        leftCol.append("span").style("color", "#334155").text(d.category);

        row.append("b").style("color", "#0f172a").text(`${d.total.toLocaleString()} cases`);
    });
}