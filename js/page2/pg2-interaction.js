// Charts that the filters control (each chart registers itself)
const charts = [];

// Current selection
// NEW: "state" is the State or territory filter. It stays "all" on pages without state
// buttons, so it never changes what the First Nations charts show.
const selected = { year: "all", status: "all", state: "all" };

// NEW: builds the "Calendar year" and "State or territory" button rows by itself, the first
// time a chart registers data that has a "state" field (the State and Territory page).
// Pages whose data has no "state" field, such as the First Nations page, skip all of this.
let stateFiltersBuilt = false;

const buildStateFilters = (data) => {
    if (stateFiltersBuilt || !data.length || data[0].state === undefined) return;
    stateFiltersBuilt = true;

    // Button looks come from the page's own .filter / .active CSS if it has any.
    // The :where() rules are only a fallback: they have zero specificity, so the page's CSS wins.
    if (!document.querySelector("#auto-filter-style")) {
        const style = document.createElement("style");
        style.id = "auto-filter-style";
        style.textContent = `
            .auto-filters { margin: 12px 16px 0; }
            .auto-filters .filter-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
            :where(.auto-filters .filter) { padding: 6px 14px; margin: 0 6px 4px 0; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; }
            :where(.auto-filters .filter.active) { background: #3a8fd9; border-color: #3a8fd9; color: white; }
        `;
        document.head.appendChild(style);
    }

    const block = document.createElement("div");
    block.className = "auto-filters";

    // Add a row only if the page does not already have a container with that id
    const addRow = (id, label) => {
        if (document.querySelector(`#${id}`)) return;
        const row = document.createElement("div");
        row.className = "filter-row";
        row.innerHTML = `<strong>${label}</strong><div id="${id}"></div>`;
        block.appendChild(row);
    };

    addRow("filters_year", "Calendar year:");
    addRow("filters_state", "State or territory:");

    if (block.children.length) {
        // Put the rows just above the charts: find the element that holds both chart 1 and chart 2
        let anchor = document.querySelector("#chart1");
        const other = document.querySelector("#chart2");
        while (anchor && other && !anchor.contains(other)) anchor = anchor.parentElement;

        if (!anchor || anchor === document.body || anchor === document.documentElement) {
            document.body.prepend(block);
        } else {
            anchor.parentNode.insertBefore(block, anchor);
        }
    }

    populateFilters(data);
};

// filterYear = false: the year filter dims points instead of removing rows (line chart)
const registerChart = (chartId, data, draw, filterYear = true) => {
    charts.push({ chartId, data, draw, filterYear });
    buildStateFilters(data);   // NEW: does nothing unless the data has a "state" field
};

// Replaces your updateHistogram: filter each chart's data, remove its svg, draw it again
const updateCharts = () => {
    charts.forEach(({ chartId, data, draw, filterYear }) => {

        const updatedData = data.filter(d =>
            (selected.status === "all" || d.status === selected.status) &&
            (!filterYear || selected.year === "all" || d.year === selected.year) &&
            (selected.state === "all" || d.state === selected.state)   // NEW: state or territory
        );

        d3.select(chartId).select("svg").remove();
        draw(updatedData, selected.year);

        createTooltip(chartId);
        handleMouseEvents(chartId);
    });
};

const populateFilters = (data) => {

    // Replaces filters_screen: built from the data, plus an "all" option
    const filters_year = [
        { id: "all", label: "All", isActive: true },
        ...[...new Set(data.map(d => d.year))]
            .sort((a, b) => a - b)
            .map(y => ({ id: y, label: String(y), isActive: false }))
    ];

    const filters_status = [
        { id: "all", label: "Both", isActive: true },
        ...[...new Set(data.map(d => d.status))]
            .map(s => ({ id: s, label: s, isActive: false }))
    ];

    // Your original button code, written once and used for both groups
    const makeButtons = (containerId, filters, key) => {

        d3.select(containerId)
            .selectAll(".filter")
            .data(filters)
            .join("button")
            .attr("class", d => `filter ${d.isActive ? "active" : ""}`)
            .text(d => d.label)

            .on("click", (e, d) => {

                //If the clicked filter is not already active, update the active state of the filters
                if (!d.isActive) {
                    filters.forEach(filter => {
                        filter.isActive = d.id === filter.id ? true : false;
                    });

                    //Update the filter buttons based on which one was clicked
                    d3.selectAll(`${containerId} .filter`)
                        .classed("active", filter => filter.id === d.id ? true : false);

                    console.log("Clicked filter data:", d);

                    selected[key] = d.id;
                    updateCharts();
                }
            });
    };

    makeButtons("#filters_year", filters_year, "year");
    makeButtons("#filters_status", filters_status, "status");

    // NEW: State or territory buttons. Only built on a page that has a #filters_state
    // container, and the data needs a "state" field, so the First Nations page is not affected.
    if (!d3.select("#filters_state").empty()) {
        const filters_state = [
            { id: "all", label: "All states", isActive: true },
            ...[...new Set(data.map(d => d.state))]
                .map(s => ({ id: s, label: s, isActive: false }))
        ];

        makeButtons("#filters_state", filters_state, "state");
    }
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
    const selector = chartId === "#chart1" ? "circle"
                   : chartId === "#chart5" ? "path"
                   : "rect";

    innerChart.selectAll(selector)
        .on("mouseenter", (e, d) => {
            if (!d) return;   // skip shapes without data, such as legend squares

            let text = "";
            let x = 0;
            let y = 0;

            if (chartId === "#chart1") {                       // line chart
                text = `${d.total}`;
                x = Number(e.target.getAttribute("cx"));
                y = Number(e.target.getAttribute("cy"));

            } else if (chartId === "#chart2") {                // horizontal bars
                text = `${d.total}`;
                x = Number(e.target.getAttribute("x")) + Number(e.target.getAttribute("width"));
                y = Number(e.target.getAttribute("y"));

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
}