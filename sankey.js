const width = 800;
const height = 900;

const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

d3.csv("offense.csv").then((res) => {
  const key = res.columns.slice(1);
  const data = [];

  //-------set up color-------//
  const color = d3
    .scaleOrdinal()
    .domain([
      "crime_against_persons",
      "crime_against_property",
      "crime_against_society",
    ])
    .range(["#A7F09C", "#F0B087", "#AE7BF0"]);
  //-------set up sankey-------//
  const sankey = d3
    .sankey()
    .nodeSort(null)
    .linkSort(null)
    .nodeWidth(5)
    .nodePadding(30)
    .extent([
      [5, 5],
      [width, height],
    ]);

  //-----clean data-------//
  for (let i = 0; i < res.length; i++) {
    if (i < 7) {
      for (k of key) {
        let item = {};
        item["crime_against"] = "Crime Against Persons";
        item["type"] = res[i].type;
        item["race"] = k;
        item["value"] = res[i][k];
        data.push(item);
      }
    } else if (i < 14) {
      for (k of key) {
        let item = {};
        item["crime_against"] = "Crime Against Property";
        item["type"] = res[i].type;
        item["race"] = k;
        item["value"] = res[i][k];
        data.push(item);
      }
    } else {
      for (k of key) {
        let item = {};
        item["crime_against"] = "Crime Against Society";
        item["race"] = k;
        item["value"] = res[i][k];
        data.push(item);
      }
    }
  }

  //nodes{names:crime against persons}
  //links{source:0, target,2, value}
  console.log(data);

  const nodes = [];
  const links = [];
  const nameKey = Object.keys(data[0]).slice(0, -1);

  //--nodes--//
  let index = 0;
  const nodeByKey = new Map();
  const indexByKey = new Map();

  for (const d of data) {
    for (const k of nameKey) {
      const key = JSON.stringify([k, d[k]]);
      if (!nodeByKey.has(key) && d[k]) {
        const node = { name: d[k] };
        nodes.push(node);
        nodeByKey.set(key, node);
        indexByKey.set(key, index++);
      }
    }
  }
  console.log(nodes, indexByKey);

  //--links--//
  //namekey: "crime_against", "type", "race"
  for (let i = 1; i < nameKey.length; i++) {
    const a = nameKey[i - 1];
    const b = nameKey[i];
    const prefix = nameKey.slice(0, i + 1);
    const linkByKey = new Map();
    for (const d of data) {
      const source = JSON.stringify([a, d[a]]);
      const target = JSON.stringify([b, d[b]]);
      const value = +d.value;
      const linkKey = JSON.stringify(prefix.map((item) => item + d[item]));
      let link = linkByKey.get(linkKey);
      //??------some of data has value of 0
      if (link) {
        link["value"] += value;
      } else {
        const sourceIndex = indexByKey.has(source)
          ? indexByKey.get(source)
          : indexByKey.get(JSON.stringify([nameKey[i - 2], d[nameKey[i - 2]]]));
        if (!indexByKey.has(target)) continue;
        const targetIndex = indexByKey.get(target);

        link = {};
        link["source"] = sourceIndex;
        link["target"] = targetIndex;
        link["value"] = value;
        link["names"] = prefix.map((item) => d[item]);
        linkByKey.set(linkKey, link);
        links.push(link);
      }
    }
  }
  console.log("nodes: ", nodes, "links: ", links);
  const sk_nodes = sankey({
    nodes: nodes,
    links: links,
  }).nodes;
  const sk_links = sankey({
    nodes: nodes,
    links: links,
  }).links;
  console.log("sankey: ", sk_nodes, sk_links);

  //-----draw

  svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("rect")
    .data(sk_nodes)
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", "black")
    .append("title")
    .text((d) => d.name);
  svg
    .append("g")
    .attr("class", "links")
    .selectAll("path")
    .data(sk_links)
    .join("path")
    .attr("fill", "none")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("data-source", (d) => d.source.index)
    .attr("data-target", (d) => d.target.index)
    .attr("stroke", (d) => color(d.names[0]))
    .attr("stroke-width", (d) => d.width)
    .style("mix-blend-mode", "multiply")
    .on("mouseover", (event, d) => {
      //--set all links to light color
      // d3.selectAll("path").attr("opacity", 0.3);
      d3.select(event.path[0]).attr("opacity", 1);

      const allLinks = d3.selectAll(".links path");
      const source = d.source.index;
      const target = d.target.index;
      const length = d.names.length;
      [...allLinks].forEach((d) => {
        if ((length == 2) & (d.getAttribute("data-source") == target)) {
          d3.select(d).attr("opacity", 1);
        } else if ((length == 3) & (d.getAttribute("data-target") == source)) {
          d3.select(d).attr("opacity", 1);
        }
      });
    })
    .on("mouseout", () => {
      d3.selectAll(".links path").attr("opacity", 0.3);
    })
    .append("title")
    .text((d) => d.names);

  svg
    .on("mouseenter", function () {
      console.log("mouseenter");

      d3.selectAll("path").attr("opacity", 0.3);
    })
    .on("mouseleave", function () {
      console.log("mouseleave");
      d3.selectAll("path").attr("opacity", 1);
    });

  //---labels---//
  const chart = document.getElementById("chart");
  const labelWrap = document.createElement("div");
  labelWrap.classList.add("label-wrap");
  chart.append(labelWrap);
  sk_nodes.forEach((d) => {
    const label = document.createElement("p");
    label.classList.add("label");
    const labelText = document.createTextNode(d.name);
    label.append(labelText);
    label.style.left = d.x0 <= width / 2 ? d.x0 - 130 + "px" : d.x0 + 10 + "px";
    label.style.textAlign = d.x0 <= width / 2 ? "right" : "left";
    label.style.top = (d.y0 + d.y1) / 2 + "px";
    labelWrap.append(label);
  });
});
