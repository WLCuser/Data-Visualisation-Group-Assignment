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

    createDropdown('#filters_year', 'year', years, data, callback);
    createDropdown('#filters_gender', 'gender', genders, data, callback);
    createDropdown('#filters_roaduser', 'roaduser', roadUsers, data, callback);
    createDropdown('#filters_age', 'age', ages, data, callback);
    createDropdown('#filters_remoteness', 'remoteness', remoteness, data, callback);
}

function createDropdown(selector, key, values, data, callback) {
    const container = d3.select(selector);
    const labelText = container.select("b").text();
    container.html(`<b>${labelText} </b>`);

    const select = container.append("select")
        .attr("class", "filter-dropdown")
        .on("change", function() {
            activeFilters[key] = this.value;
            const filtered = getFilteredData(data);
            callback(filtered);
        });

    select.selectAll("option")
        .data(values)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);
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