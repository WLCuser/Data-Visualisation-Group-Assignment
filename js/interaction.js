// Charts that the filters control (each chart registers itself)
const charts = [];

// Current selection
const selected = { year: "all", status: "all" };

// filterYear = false: the year filter dims points instead of removing rows (line chart)
const registerChart = (chartId, data, draw, filterYear = true) => {
    charts.push({ chartId, data, draw, filterYear });
};

// Replaces your updateHistogram: filter each chart's data, remove its svg, draw it again
const updateCharts = () => {
    charts.forEach(({ chartId, data, draw, filterYear }) => {

        const updatedData = data.filter(d =>
            (selected.status === "all" || d.status === selected.status) &&
            (!filterYear || selected.year === "all" || d.year === selected.year)
        );

        d3.select(chartId).select("svg").remove();
        draw(updatedData, selected.year);
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