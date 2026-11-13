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