// Charts that the filters control (each chart registers itself)
const charts = [];

// Current selection
// NEW: "state" is the State or territory filter. It stays "all" on pages without the
// state dropdown, so it never changes what the First Nations charts show.
const selected = { year: "all", status: "all", state: "all" };

// NEW: builds the "Calendar year" and "State or territory" dropdown boxes by itself, the first
// time a chart registers data that has a "state" field (the State and Territory page).
// Pages whose data has no "state" field, such as the First Nations page, skip all of this
// and keep using populateFilters and their buttons exactly as before.
let stateFiltersBuilt = false;

const buildStateFilters = (data) => {
    if (stateFiltersBuilt || !data.length || data[0].state === undefined) return;
    stateFiltersBuilt = true;

    // Layout and a plain look for the dropdowns. The :where() rules are only a fallback:
    // they have zero specificity, so any CSS the page already has for these wins.
    if (!document.querySelector("#auto-filter-style")) {
        const style = document.createElement("style");
        style.id = "auto-filter-style";
        style.textContent = `
            .auto-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 28px; margin: 12px 16px 0; }
            .auto-filters label { display: flex; align-items: center; gap: 10px; font-weight: bold; }
            :where(.auto-filters select) { padding: 6px 10px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; }
        `;
        document.head.appendChild(style);
    }

    // Options: an "all" choice first, then the years and the states found in the data
    const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
    const states = [...new Set(data.map(d => d.state))];

    const block = document.createElement("div");
    block.className = "auto-filters";
    block.innerHTML = `
        <label>Calendar year:
            <select id="year_select">
                <option value="all">All</option>
                ${years.map(y => `<option value="${y}">${y}</option>`).join("")}
            </select>
        </label>
        <label>State or territory:
            <select id="state_select">
                <option value="all">All states</option>
                ${states.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
        </label>
    `;

    // Put the dropdowns just above the charts: find the element that holds both chart 1 and chart 2
    let anchor = document.querySelector("#chart1");
    const other = document.querySelector("#chart2");
    while (anchor && other && !anchor.contains(other)) anchor = anchor.parentElement;

    if (!anchor || anchor === document.body || anchor === document.documentElement) {
        document.body.prepend(block);
    } else {
        anchor.parentNode.insertBefore(block, anchor);
    }

    // Choosing an option updates the selection and redraws every chart
    d3.select("#year_select").on("change", e => {
        selected.year = e.target.value === "all" ? "all" : +e.target.value;   // years are numbers in the data
        updateCharts();
    });

    d3.select("#state_select").on("change", e => {
        selected.state = e.target.value;
        updateCharts();
    });
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