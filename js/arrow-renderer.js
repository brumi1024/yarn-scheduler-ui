window.drawArrows = (queueElements, queues) => {
  const svg = document.getElementById("arrow-svg");
  svg.innerHTML = svg.innerHTML.split("</defs>")[0] + "</defs>";
  const svgRect = svg.getBoundingClientRect();

  queues.values().forEach(q => {
    const queueRect = queueElements.get(q.queuePath).getBoundingClientRect();
    q.queues?.queue?.forEach(child => {
      const childRect = queueElements.get(child.queuePath).getBoundingClientRect();
      console.log(parent.queuePath + " => " + child.queuePath)
      drawArrowToChild(queueRect, childRect, svgRect, svg);
    })
    if (q.parentPath) {
      const parentRect = queueElements.get(q.parentPath).getBoundingClientRect();
      drawArrowToChild(parentRect, queueRect, svgRect, svg);
    }
  })

  queues.values().forEach(parent => {
    const parentRect = queueElements.get(parent.queuePath).getBoundingClientRect();
    parent.queues?.queue?.forEach(child => {
      const childRect = queueElements.get(child.queuePath).getBoundingClientRect();
      console.log(parent.queuePath + " => " + child.queuePath)
      drawArrowToChild(parentRect, childRect, svgRect, svg);
    })
  })
}

function drawArrowToChild(parentRect, childRect, svgRect, svg) {
  // Calculate center Y for both boxes, relative to the SVG container
  const startY = parentRect.top + parentRect.height / 2 - svgRect.top;
  const endY = childRect.top + childRect.height / 2 - svgRect.top;

  // Start at the right edge of the parent box, relative to the SVG
  const startX = parentRect.right - svgRect.left;
  // End at the left edge of the child box, relative to the SVG
  const endX = childRect.left - svgRect.left;

  // Nudge the arrow a bit inside the card to avoid overshooting
  const nudge = 8;
  const adjustedStartX = startX - nudge;
  const adjustedEndX = endX + nudge;

  // Use a quadratic curve for a nice effect
  const midX = adjustedStartX + (adjustedEndX - adjustedStartX) / 2;
  const pathData = `M ${adjustedStartX} ${startY} Q ${midX} ${startY} ${adjustedEndX} ${endY}`;

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  path.setAttribute("class", "arrow-line");
  path.setAttribute("marker-end", "url(#arrowhead)");
  svg.appendChild(path);
}