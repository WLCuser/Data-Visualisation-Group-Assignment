// Where the state and territory shapes come from. To work offline, download this file,
// save it in your data folder and change the address to "data/states.min.geojson".
const GEOJSON_URL = "https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.min.geojson";

// Set to true to write the state codes (NSW, Vic ...) on the map
const SHOW_LABELS = false;

// The shape file uses full names, the CSV uses short codes
const stateCodes = {
    "New South Wales": "NSW",
    "Victoria": "Vic",
    "Queensland": "Qld",
    "Western Australia": "WA",
    "South Australia": "SA",
    "Tasmania": "Tas",
    "Australian Capital Territory": "ACT",
    "Northern Territory": "NT"
};

let australiaStates;   // filled in once the shapes have loaded

Promise.all([
    d3.csv("data/state-and-territory-hospitalisation-injury-clean.csv", d => {
        return {
            year: +d["calendar year"],
            state: d["state or territory"],
            Hospitalisations: +d["count of cases excluding died in hospitals within 30 days"],
            BedDays: +d["bed days excluding died in hospitals within 30 days"]
        };
    }),
    d3.json(GEOJSON_URL)
]).then(([data, geo]) => {
    console.log(data);
    australiaStates = prepareStates(geo);
    drawMap(data);
    registerChart("#chart1", data, drawMap);
    createTooltip("#chart1");
    handleMouseEvents("#chart1");
}).catch(error => {
    console.error("The map could not be drawn:", error);
    d3.select("#chart1").append("p").text("The map could not be loaded. Check the console for details.");
});

// Prepares the shape file:
// - keeps only the 8 states and territories
// - drops far-away islands (Macquarie Island, Lord Howe Island and so on) and broken shapes
// - turns the longitude and latitude into flat Mercator x and y positions right here.
//   The map is then drawn as plain flat shapes, so it does not matter which way the
//   rings in the file run (D3's globe maths fills the wrong area when they run the wrong way).
const prepareStates = geo => {
    const toMercator = ([lon, lat]) => [
        lon * Math.PI / 180,
        Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))
    ];

    return geo.features
        .filter(f => stateCodes[f.properties.STATE_NAME])
        .map(f => {
            const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;

            const kept = polygons
                .filter(polygon => {
                    const ring = polygon[0];
                    if (!ring || ring.length < 4) return false;   // empty or broken shape
                    const lon = d3.mean(ring, p => p[0]);
                    const lat = d3.mean(ring, p => p[1]);
                    return lon > 111 && lon < 155 && lat > -44.5 && lat < -8.5;
                })
                .map(polygon =>
                    polygon
                        .filter(ring => ring.length >= 4)
                        .map(ring => ring.map(toMercator))
                );

            return {
                type: "Feature",
                properties: {
                    name: f.properties.STATE_NAME,
                    code: stateCodes[f.properties.STATE_NAME]
                },
                geometry: { type: "MultiPolygon", coordinates: kept }
            };
        })
        .filter(f => f.geometry.coordinates.length > 0);
};

const drawMap = data => {

    // Small margins for this chart only, so the map fills the card
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#chart1")
        .append("svg")
        .attr("viewBox", `0,0,${width},${height}`);

    // Keep this as the first g in the svg: the shared tooltip code looks for it
    const innerChart = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const fmt = d3.format(",");

    // Total hospitalisations per state (all the rows that are left after the filters)
    const totals = d3.rollup(
        data,
        v => d3.sum(v, d => d.Hospitalisations),
        d => d.state
    );
    const maxTotal = d3.max(totals.values()) || 1;

    // Five colour classes of equal size, from light to dark blue
    const colours = [0, 2, 4, 6, 8].map(i => d3.schemeBlues[9][i]);
    const niceMax = d3.scaleLinear().domain([0, maxTotal]).nice(5).domain()[1];
    const step = niceMax / colours.length;

    const color = d3.scaleThreshold()
        .domain([1, 2, 3, 4].map(k => k * step))
        .range(colours);

    // States left out by the filters get a diagonal hatch instead of a plain grey, so they can't be
    // mistaken for the lightest blue (a pattern does not rely on colour)
    const hatch = svg
        .append("defs")
        .append("pattern")
        .attr("id", "no-data-hatch")
        .attr("width", 6)
        .attr("height", 6)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("patternTransform", "rotate(45)");

    hatch.append("rect")
        .attr("width", 6)
        .attr("height", 6)
        .attr("fill", "#f4f4f4");

    hatch.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", 0).attr("y2", 6)
        .attr("stroke", "#777")
        .attr("stroke-width", 2);

    const noData = "url(#no-data-hatch)";
    const fillFor = code => (totals.has(code) ? color(totals.get(code)) : noData);

    // What the data covers, e.g. "2011–2021", or just "2018" when one year is selected
    const [firstYear, lastYear] = d3.extent(data, d => d.year);
    const yearLabel = firstYear === undefined ? ""
        : firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;

    // Fit the (flat) map into the chart area. y is flipped because north is up
    const projection = d3.geoIdentity()
        .reflectY(true)
        .fitExtent([[0, 0], [innerWidth, innerHeight]], { type: "FeatureCollection", features: australiaStates });
    const path = d3.geoPath(projection);

    // Big states first, so the small ones (ACT) are drawn on top
    const features = australiaStates
        .slice()
        .sort((a, b) => d3.descending(path.area(a), path.area(b)));

    // States and territories
    const statePaths = innerChart
        .append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => fillFor(d.properties.code))
        .style("fill-rule", "evenodd")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 0.6);

    // Optional state labels (ACT is too small to hold its label, so it gets a short line to the side)
    if (SHOW_LABELS) {
        const labels = innerChart
            .append("g")
            .attr("class", "state-labels")
            .style("pointer-events", "none");

        features.forEach(f => {
            const code = f.properties.code;
            const [cx, cy] = path.centroid(f);
            const isDark = d3.lab(fillFor(code)).l < 60;

            if (code === "ACT") {
                labels.append("line")
                    .attr("x1", cx).attr("y1", cy)
                    .attr("x2", cx + 24).attr("y2", cy + 6)
                    .attr("stroke", "#555");

                labels.append("text")
                    .attr("x", cx + 28)
                    .attr("y", cy + 6)
                    .attr("dy", "0.35em")
                    .attr("fill", "#222")
                    .style("font-size", "14px")
                    .text(code);
            } else {
                labels.append("text")
                    .attr("x", cx)
                    .attr("y", cy)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "middle")
                    .attr("fill", isDark ? "white" : "#222")
                    .style("font-size", "14px")
                    .style("font-weight", "bold")
                    .text(code);
            }
        });
    }

    // Legend: five coloured steps with the class limits underneath (bottom right)
    const boxWidth = 28;
    const boxHeight = 10;

    const legend = innerChart
        .append("g")
        .attr("transform", `translate(${innerWidth - colours.length * boxWidth - 14}, ${innerHeight - 30})`);

    legend.append("text")
        .text("Hospitalisations")
        .attr("x", 0)
        .attr("y", -5)
        .style("font-size", "20px");

    colours.forEach((c, i) => {
        legend.append("rect")
            .attr("x", i * boxWidth)
            .attr("width", boxWidth)
            .attr("height", boxHeight)
            .attr("fill", c)
            .attr("stroke", "#aaa")
            .attr("stroke-width", 0.5);
    });

    // "No data" entry, only shown when the filters leave a state without data
    if (features.some(f => !totals.has(f.properties.code))) {
        legend.append("rect")
            .attr("x", -72)
            .attr("width", 16)
            .attr("height", boxHeight)
            .attr("fill", noData)
            .attr("stroke", "#aaa")
            .attr("stroke-width", 0.5);

        legend.append("text")
            .text("No data")
            .attr("x", -52)
            .attr("y", boxHeight - 1)
            .style("font-size", "14px");
    }

    d3.range(colours.length + 1).forEach(i => {
        legend.append("text")
            .text(d3.format("~s")(i * step))
            .attr("x", i * boxWidth)
            .attr("y", boxHeight + 11)
            .attr("text-anchor", "middle")
            .style("font-size", "12px");
    });

    // Hover tooltip, drawn here because the shared tooltip code only handles the circles of a line chart
    const tip = innerChart
        .append("g")
        .attr("class", "map-tooltip")
        .style("opacity", 0)
        .style("pointer-events", "none");

    const tipBox = tip.append("rect")
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", "#222")
        .attr("fill-opacity", 0.85);

    const tipText = tip.append("text")
        .attr("fill", "white")
        .style("font-size", "14px");

    statePaths
        .on("mouseenter", function () {
            d3.select(this).raise().attr("stroke", "#222").attr("stroke-width", 1.5);
            tip.raise();
        })
        .on("mousemove", (e, d) => {
            const code = d.properties.code;
            const suffix = yearLabel ? `, ${yearLabel}` : "";

            tipText.selectAll("tspan").remove();
            tipText.append("tspan")
                .attr("x", 8)
                .attr("y", 16)
                .style("font-weight", "bold")
                .text(d.properties.name);
            tipText.append("tspan")
                .attr("x", 8)
                .attr("y", 32)
                .text(totals.has(code) ? `${fmt(totals.get(code))} hospitalisations${suffix}` : "No data");

            const box = tipText.node().getBBox();
            const tipWidth = box.x + box.width + 8;
            tipBox
                .attr("width", tipWidth)
                .attr("height", box.y + box.height + 6);

            // Keep the tooltip inside the chart: flip it to the left near the right edge
            const [x, y] = d3.pointer(e, innerChart.node());
            const tipX = x + 12 + tipWidth > innerWidth ? x - 12 - tipWidth : x + 12;

            tip
                .attr("transform", `translate(${tipX}, ${y + 12})`)
                .style("opacity", 1);
        })
        .on("mouseleave", function () {
            d3.select(this).attr("stroke", "#aaa").attr("stroke-width", 0.6);
            tip.style("opacity", 0);
        });
};