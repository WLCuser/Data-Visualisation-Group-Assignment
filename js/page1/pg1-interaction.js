let activeFilters = {
    year: 'All',
    gender: 'All',
    roaduser: 'All',
    age: 'All',
    remoteness: 'All'
};

function setupFilters(data, callback) {
    const rawYears = [...new Set(data.map(d => d['Calendar year'])).values()].filter(d => !isNaN(d)).sort((a,b) => a-b);
    const years = ['All', ...rawYears];
    const genders = ['All', ...new Set(data.map(d => d['Sex'])).values()].filter(Boolean);
    const roadUsers = ['All', ...new Set(data.map(d => d['Road user'])).values()].filter(Boolean);
    
    const customAgeOrder = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
    const rawAges = [...new Set(data.map(d => d['Age group'])).values()].filter(Boolean);
    const ages = ['All', ...customAgeOrder.filter(age => rawAges.includes(age))];

    const remoteness = ['All', ...new Set(data.map(d => d['ABS remoteness area'])).values()].filter(Boolean);

    createButtons('#filters_year', 'year', years, data, callback);
    createButtons('#filters_gender', 'gender', genders, data, callback);
    createButtons('#filters_roaduser', 'roaduser', roadUsers, data, callback);
    createButtons('#filters_age', 'age', ages, data, callback);
    createButtons('#filters_remoteness', 'remoteness', remoteness, data, callback);
}

function createButtons(selector, key, values, data, callback) {
    const container = d3.select(selector);
    const labelText = container.select("b").text() || `${key}:`;
    container.html(`<b>${labelText} </b>`);

    // Wrap buttons in a flex container so long lists (like Road user) wrap neatly
    const btnContainer = container.append("div")
        .style("display", "flex")
        .style("flex-wrap", "wrap")
        .style("gap", "6px")
        .style("flex", "1");

    btnContainer.selectAll("button")
        .data(values)
        .enter()
        .append("button")
        .text(d => d)
        .attr("class", d => `filter-btn ${d === 'All' ? 'active' : ''}`)
        .on("click", function(event, d) {
            btnContainer.selectAll("button").classed("active", false);
            d3.select(this).classed("active", true);
            activeFilters[key] = d;
            
            const filtered = getFilteredData(data);
            callback(filtered);
        });
}

function getFilteredData(rawData) {
    return rawData.filter(d => {
        return (activeFilters.year === 'All' || d['Calendar year'] == activeFilters.year) &&
               (activeFilters.gender === 'All' || d['Sex'] === activeFilters.gender) &&
               (activeFilters.roaduser === 'All' || d['Road user'] === activeFilters.roaduser) &&
               (activeFilters.age === 'All' || d['Age group'] === activeFilters.age) &&
               (activeFilters.remoteness === 'All' || d['ABS remoteness area'] === activeFilters.remoteness);
    });
}