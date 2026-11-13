const margin = { top: 40, right: 30, bottom: 50, left: 70};
const width = 800;
const height = 400;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const tooltipWidth = 100;
const tooltipHeight = 32;
const barColor = "black";

// Paul Tol "Muted" palette (9 colours + pale grey)
const colorSafe10 = [
    "#332288", // indigo
    "#88CCEE", // cyan
    "#44AA99", // teal
    "#117733", // green
    "#999933", // olive
    "#DDCC77", // sand
    "#CC6677", // rose
    "#882255", // wine
    "#AA4499", // purple
    "#DDDDDD"  // pale grey
];

//IBM Design Colorblind Safe Palette
const colorSafe5 = [
    "#648FFF",
    "#785EF0",
    "#DC267F",
    "#FE6100",
    "#FFB000"
]