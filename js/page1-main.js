let rawData = [];
let activeFilters = {
    year: 'All',
    gender: 'All',
    roaduser: 'All',
    age: 'All',
    remoteness: 'All'
};

document.addEventListener("DOMContentLoaded", function() {
    // Load your cleaned national dataset
    d3.csv("data/national_traffic_clean.csv").then(function(data) {
        // Clean numerical fields
        data.forEach(d => {
            d['Calendar year'] = +d['Calendar year'];
            d['Hospitalisations'] = +d['Hospitalisations'];
        });

        rawData = data;
        console.log("Page 1 loaded rows:", rawData.length);

        setupFilters(rawData);
        renderDashboard(rawData);
    }).catch(error => {
        console.error("Error loading national_traffic_clean.csv:", error);
    });
});

function setupFilters(data) {
    // 1. Properly include 'All' and sort years numerically
    const rawYears = [...new Set(data.map(d => d['Calendar year'])).values()].filter(d => !isNaN(d)).sort((a,b) => a-b);
    const years = ['All', ...rawYears];

    const genders = ['All', ...new Set(data.map(d => d['Sex'])).values()].filter(Boolean);
    const roadUsers = ['All', ...new Set(data.map(d => d['Road user'])).values()].filter(Boolean);
    
    // 2. Fix Age Group custom chronological ordering so 8-16 appears correctly!
    const customAgeOrder = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
    const rawAges = [...new Set(data.map(d => d['Age group'])).values()].filter(Boolean);
    const ages = ['All', ...customAgeOrder.filter(age => rawAges.includes(age))];

    const remoteness = ['All', ...new Set(data.map(d => d['ABS remoteness area'])).values()].filter(Boolean);

    createButtons('#filters_year', 'year', years);
    createButtons('#filters_gender', 'gender', genders);
    createButtons('#filters_roaduser', 'roaduser', roadUsers);
    createButtons('#filters_age', 'age', ages);
    createButtons('#filters_remoteness', 'remoteness', remoteness);
}

function createButtons(selector, key, values) {
    const container = d3.select(selector);
    const labelText = container.select("b").text();
    container.html(`<b>${labelText} </b>`);

    container.selectAll("button")
        .data(values)
        .enter()
        .append("button")
        .text(d => d)
        .attr("class", d => `filter-btn ${d === 'All' ? 'active' : ''}`)
        .on("click", function(event, d) {
            container.selectAll("button").classed("active", false);
            d3.select(this).classed("active", true);
            activeFilters[key] = d;
            
            const filtered = getFilteredData();
            renderDashboard(filtered);
        });
}

function getFilteredData() {
    return rawData.filter(d => {
        return (activeFilters.year === 'All' || d['Calendar year'] == activeFilters.year) &&
               (activeFilters.gender === 'All' || d['Sex'] === activeFilters.gender) &&
               (activeFilters.roaduser === 'All' || d['Road user'] === activeFilters.roaduser) &&
               (activeFilters.age === 'All' || d['Age group'] === activeFilters.age) &&
               (activeFilters.remoteness === 'All' || d['ABS remoteness area'] === activeFilters.remoteness);
    });
}

function renderDashboard(data) {
    // Chart 1: Line Chart (Annual Hospitalisations)
    const lineContainer = d3.select("#chart1");
    lineContainer.html("<b>Chart 1 - Line chart: Annual hospitalised injuries</b><br>");
    
    const yearRollup = d3.rollup(data, v => d3.sum(v, d => d['Hospitalisations']), d => d['Calendar year']);
    const lineData = Array.from(yearRollup, ([year, count]) => ({ year, count })).sort((a,b) => a.year - b.year);
    
    // Simple summary text proof that data is interactive and reactive
    lineContainer.append("div")
        .style("margin-top", "10px")
        .style("font-size", "13px")
        .html(`Filtered records: <b>${data.length}</b> total hospitalisations across ${lineData.length} years.`);

    // Chart 2, 3, 4 placeholders or basic D3 render blocks can go here safely
    d3.select("#chart2").html("<b>Chart 2 - Horizontal bar chart: Annual hospitalisations by road user</b><br><i>Active filter count: " + data.length + " rows</i>");
    d3.select("#chart3").html("<b>Chart 3 - Vertical bar chart: Annual hospitalisations by age group</b><br><i>Active filter count: " + data.length + " rows</i>");
    d3.select("#chart4").html("<b>Chart 4 - Stacked vertical bar chart: Annual hospitalisations by remoteness</b><br><i>Active filter count: " + data.length + " rows</i>");
}