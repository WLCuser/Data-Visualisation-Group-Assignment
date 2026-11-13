// Charts that the filters control (each chart registers itself)
const charts = [];

// Current selection
const selected = { year: "all", status: "all" };

// filterYear = false: the year filter dims points instead of removing rows (line chart)
const registerChart = (chartId, data, draw, filterYear = true) => {
    charts.push({ chartId, data, draw, filterYear });
    addZoomButton(chartId); 
};

const updateYearTitle = () => {
    let text = selected.year;

    if (selected.year === "all") {
        const years = charts.flatMap(c => c.data.map(d => d.year));
        text = years.length ? `${d3.min(years)}–${d3.max(years)}` : "All years";
    }

    d3.select("#year_title").text(text);
};

// Replaces your updateHistogram: filter each chart's data, remove its svg, draw it again
const updateCharts = () => {

    updateYearTitle();

    charts.forEach(({ chartId, data, draw, filterYear }) => {

        const updatedData = data.filter(d =>
            (selected.status === "all" || d.status === selected.status) &&
            (!filterYear || selected.year === "all" || d.year === selected.year)
        );

        d3.select(chartId).select("svg").remove();
        draw(updatedData, selected.year);

        createTooltip(chartId);
        handleMouseEvents(chartId);
    });
};

const populateFilters = (data) => {

    const filters_year = [
        { id: "all", label: "All" },
        ...[...new Set(data.map(d => d.year))]
            .sort((a, b) => a - b)
            .map(y => ({ id: y, label: String(y) }))
    ];

    const filters_status = [
        { id: "all", label: "Both" },
        ...[...new Set(data.map(d => d.status))]
            .map(s => ({ id: s, label: s }))
    ];

    const makeDropdown = (containerId, filters, key) => {

        // One <select> per container (join avoids duplicates if this runs twice)
        const select = d3.select(containerId)
            .selectAll("select")
            .data([null])
            .join("select")
            .attr("class", "filter-select")
            .on("change", function () {
                // Use the bound datum instead of the option's string value,
                // so numeric years keep their type (d.year === selected.year)
                const d = filters[this.selectedIndex];

                selected[key] = d.id;
                console.log("Selected filter:", d);
                updateCharts();
            });

        // One <option> per filter
        select.selectAll("option")
            .data(filters)
            .join("option")
            .attr("value", d => d.id)
            .text(d => d.label);
    };

    makeDropdown("#filters_year", filters_year, "year");
    makeDropdown("#filters_status", filters_status, "status");
};

const createTooltip = (chartId) => {

    const innerChart = d3.select(`${chartId} svg g`);

    const tooltip = innerChart
        .append("g")
        .attr("class", "tooltip")
        .style("opacity", 0);

    tooltip
        .append("rect")
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", barColor)
        .attr("fill-opacity", 0.75);

    tooltip
        .append("text")
        .text("NA")
        .attr("x", tooltipWidth / 2)
        .attr("y", tooltipHeight / 2 + 2)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .attr("fill", "white")
        .style("font-weight", 900);
}

const handleMouseEvents = (chartId) => {

    const innerChart = d3.select(`${chartId} svg g`);

    // Which shape to hover on in each chart
    const selector = chartId === "#chart1" || chartId === "#chart2" ? "circle"
                   : chartId === "#chart5" ? "path"
                   : "rect";

    innerChart.selectAll(selector)
        .on("mouseenter", (e, d) => {
            if (!d) return;   // skip shapes without data, such as legend items

            let text = "";
            let x = 0;
            let y = 0;

            if (chartId === "#chart1") {                       // line chart
                text = `${d.total}`;
                x = Number(e.target.getAttribute("cx"));
                y = Number(e.target.getAttribute("cy"));

            } else if (chartId === "#chart2") {                // dumbbell
                text = `${d.share.toFixed(1)}%`;
                x = Number(e.target.getAttribute("cx"));
                y = Number(e.target.getAttribute("cy"));

            } else if (chartId === "#chart3") {                // vertical bars
                text = `${d.total}`;
                x = Number(e.target.getAttribute("x")) + Number(e.target.getAttribute("width")) / 2;
                y = Number(e.target.getAttribute("y"));

            } else if (chartId === "#chart4") {                // stacked bars
                text = `${d[1] - d[0]}`;
                x = Number(e.target.getAttribute("x")) + Number(e.target.getAttribute("width")) / 2;
                y = Number(e.target.getAttribute("y"));

            } else if (chartId === "#chart5") {                // donut
                text = `${d.data.total}`;
                [x, y] = d3.pointer(e, innerChart.node());
            }

            innerChart.select(".tooltip text")
                .text(text);

            innerChart.select(".tooltip")
                .attr("transform", `translate(${x - 0.5 * tooltipWidth}, ${y - 1.5 * tooltipHeight})`)
                .transition()
                .duration(200)
                .style("opacity", 1);
        })

        .on("mouseleave", () => {
            innerChart.select(".tooltip")
                .style("opacity", 0)
                .attr("transform", `translate(0,500)`);
        });
};

// ---------- Enlarge-chart popup (shared by all charts) ----------
let zoomOverlay = null;
let zoomed = null;   // remembers which element to put back

const closeZoom = () => {
    if (!zoomed) return;
    zoomed.parent.appendChild(zoomed.node);   // return the chart to its card
    zoomed = null;
    zoomOverlay.classed("open", false);
};

const getZoomOverlay = () => {
    if (zoomOverlay) return zoomOverlay;

    zoomOverlay = d3.select("body")
        .append("div")
        .attr("class", "zoom-overlay")
        .on("click", e => { if (e.target === zoomOverlay.node()) closeZoom(); });

    const box = zoomOverlay.append("div").attr("class", "zoom-box");
    box.append("button")
        .attr("class", "zoom-close")
        .attr("aria-label", "Close")
        .text("✕")
        .on("click", closeZoom);
    box.append("h2").attr("class", "zoom-title");
    box.append("div").attr("class", "zoom-body");

    d3.select(document).on("keydown.zoom", e => { if (e.key === "Escape") closeZoom(); });
    return zoomOverlay;
};

const openZoom = (chartId) => {
    if (zoomed) return;
    const card = document.querySelector(chartId);
    const content = card.querySelector(":scope > svg, :scope > .text-summary");
    if (!content) return;

    // The chart title is the plain text inside the card
    const title = [...card.childNodes]
        .filter(n => n.nodeType === 3)
        .map(n => n.textContent)
        .join("")
        .trim();

    const overlay = getZoomOverlay();
    overlay.select(".zoom-title").text(title);
    overlay.select(".zoom-body").node().appendChild(content);
    zoomed = { node: content, parent: card };
    overlay.classed("open", true);
};

const addZoomButton = (chartId) => {
    const card = d3.select(chartId);
    if (!card.select(".zoom-btn").empty()) return;   // add only once
    card.append("button")
        .attr("class", "zoom-btn")
        .attr("title", "Enlarge chart")
        .attr("aria-label", "Enlarge chart")
        .text("🔍")
        .on("click", () => openZoom(chartId));
};