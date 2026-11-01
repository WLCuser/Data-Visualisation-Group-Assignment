function drawChart4(data) {
    const container = d3.select("#chart4");
    container.html("<b>Chart 4 - Stacked vertical bar chart: Annual hospitalisations by remoteness</b>");

    if (!data || data.length === 0) return;

    const margin = {top: 30, right: 30, bottom: 40, left: 65},
          width = 520 - margin.left - margin.right,
          height = 300 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let tooltip = d3.select("body").select(".d3-tip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "d3-tip").style("opacity", 0);
    }

    let nested = {};
    let remotenessSet = new Set();

    data.forEach(d => {
        let yr = d['Calendar year'];
        let rem = d['ABS remoteness area'] || 'Unknown';
        remotenessSet.add(rem);
        if (!nested[yr]) nested[yr] = {};
        nested[yr][rem] = (nested[yr][rem] || 0) + (+d['Hospitalisations'] || 0);
    });

    let years = Object.keys(nested).sort((a, b) => a - b);
    let remotenessTypes = Array.from(remotenessSet).filter(Boolean).sort();

    if (years.length === 0 || remotenessTypes.length === 0) return;

    let chartData = years.map(yr => {
        let obj = { year: yr };
        remotenessTypes.forEach(rem => { obj[rem] = nested[yr][rem] || 0; });
        return obj;
    });

    const x = d3.scaleBand().domain(years).range([0, width]).padding(0.25);
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickSize(0));

    let maxVal = d3.max(chartData, d => d3.sum(remotenessTypes, key => d[key])) || 1000;
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([height, 0]);
    svg.append("g").call(d3.axisLeft(y).ticks(4));

    const color = d3.scaleOrdinal().domain(remotenessTypes).range(['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899']);
    const stack = d3.stack().keys(remotenessTypes);
    const series = stack(chartData);

    svg.selectAll("g.layer")
        .data(series).enter().append("g").attr("fill", d => color(d.key))
        .selectAll("rect").data(d => d).enter().append("rect")
        .attr("x", d => x(d.data.year))
        .attr("y", d => y(d[1]))
        .attr("height", d => Math.max(0, y(d[0]) - y(d[1])))
        .attr("width", x.bandwidth())
        .on("mouseover", (event, d) => {
            let subCategory = d3.select(event.currentTarget.parentNode).datum().key;
            let val = d[1] - d[0];
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Year: <b>${d.data.year}</b><br>Remoteness: <b>${subCategory}</b><br>Hospitalisations: <b>${val.toLocaleString()}</b>`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(500).style("opacity", 0));
}