/**
 * SVG Preview Generation for Drum Shell
 * Simple 2D views: Top and Side
 */

/**
 * Parse dimension string like "12 in" or "6 mm" to a number (converted to inches)
 */
export const parseDimension = (value, defaultVal = 0) => {
  if (typeof value === 'number') return value;
  if (!value) return defaultVal;
  const str = String(value).trim().toLowerCase();
  const match = str.match(/^([\d.]+)\s*(in|inch|inches|mm|cm|m)?$/i);
  if (!match) return defaultVal;
  let num = parseFloat(match[1]);
  const unit = match[2] || 'in';
  if (unit === 'mm') num /= 25.4;
  else if (unit === 'cm') num /= 2.54;
  else if (unit === 'm') num *= 39.37;
  return num || defaultVal;
};

/**
 * Build SVG preview with Top and Side views
 * @param {Object} parameters - Drum configuration parameters
 * @returns {string} SVG markup
 */
export const buildPreviewSvg = (parameters) => {
  const p = parameters || {};

  // Parse dimensions
  const diam = parseDimension(p.ShellDiam, 12);
  const height = parseDimension(p.ShellHeight, 6);
  const thick = parseDimension(p.ShellThick, 0.25);
  const thickMm = (thick * 25.4).toFixed(1); // Convert to mm for display
  const segments = parseInt(p.NumSegments, 10) || 2;
  const lugTop = parseDimension(p.LugTopDist, 2);
  const lugSpace = parseDimension(p.LugSpacing, 2);
  const lapPct = parseFloat(p.LapSizePercent) || 22;
  const lugDiam = parseDimension(p.LugHoleDiam, 0.25);

  // Scale: 8px per inch for tighter fit, clamped for display
  const scale = 8;
  const maxDim = 20;
  const clampedDiam = Math.min(diam, maxDim);
  const clampedHeight = Math.min(height, maxDim);

  const topRadius = (clampedDiam * scale) / 2;
  const sideWidth = clampedDiam * scale;
  const sideHeight = clampedHeight * scale;
  const thickPx = Math.max(2, thick * scale);
  const lugR = Math.max(2, (lugDiam * scale) / 2);

  // Tighter layout
  const padding = 50;
  const leftMargin = 55; // Extra space for left dimension labels
  const topCx = leftMargin + topRadius;
  const topCy = padding + topRadius;
  const sideX = leftMargin;
  const sideY = padding + topRadius * 2 + 75;

  const svgWidth = leftMargin + Math.max(topRadius * 2, sideWidth) + 50;
  const svgHeight = sideY + sideHeight + 75; // Space for thickness dimension below

  // Clamp visual thickness to max 1/4 of radius for reasonable display
  const visualThickPx = Math.min(thickPx, topRadius / 4);
  
  // Top view: pie slices, cut lines and lap joints
  let topPieSlices = '';
  let topCutLines = '';
  const segAngle = 360 / segments;
  const innerRadius = topRadius - visualThickPx;
  const midRadius = topRadius - visualThickPx / 2; // Middle of shell thickness
  
  // Calculate lap arc angle
  const lapAngleDeg = segAngle * (lapPct / 100);
  
  // Create pie slices (ring segments) with alternating fills
  for (let i = 0; i < segments; i++) {
    const startAngle = i * segAngle;
    const endAngle = (i + 1) * segAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    // Outer arc points
    const outerStartX = topCx + topRadius * Math.cos(startRad);
    const outerStartY = topCy + topRadius * Math.sin(startRad);
    const outerEndX = topCx + topRadius * Math.cos(endRad);
    const outerEndY = topCy + topRadius * Math.sin(endRad);
    
    // Inner arc points
    const innerStartX = topCx + innerRadius * Math.cos(startRad);
    const innerStartY = topCy + innerRadius * Math.sin(startRad);
    const innerEndX = topCx + innerRadius * Math.cos(endRad);
    const innerEndY = topCy + innerRadius * Math.sin(endRad);
    
    // Large arc flag (1 if segment > 180 degrees)
    const largeArc = segAngle > 180 ? 1 : 0;
    
    // Pie slice path: outer arc -> line to inner -> inner arc (reverse) -> line back
    const fill = i % 2 === 0 ? '#f5f5f5' : '#fff';
    topPieSlices += `<path d="M${outerStartX},${outerStartY} A${topRadius},${topRadius} 0 ${largeArc},1 ${outerEndX},${outerEndY} L${innerEndX},${innerEndY} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${innerStartX},${innerStartY} Z" fill="${fill}" stroke="none"/>`;
  }
  
  for (let i = 0; i < segments; i++) {
    const angle = i * segAngle;
    const angleRad = (angle * Math.PI) / 180;
    
    // Cut line extends from outer to inner radius (dotted)
    const outerX = topCx + topRadius * Math.cos(angleRad);
    const outerY = topCy + topRadius * Math.sin(angleRad);
    const innerX = topCx + innerRadius * Math.cos(angleRad);
    const innerY = topCy + innerRadius * Math.sin(angleRad);
    
    // One segment showing the cut through the shell thickness
    topCutLines += `<line x1="${outerX}" y1="${outerY}" x2="${innerX}" y2="${innerY}" stroke="#333" stroke-width="0" stroke-dasharray="2,3"/>`;
    
    // Lap joint arc - curved line showing overlap region through middle of shell
    const lapStartAngle = angle;
    const lapEndAngle = angle - lapAngleDeg;
    const lapStartRad = (lapStartAngle * Math.PI) / 180;
    const lapEndRad = (lapEndAngle * Math.PI) / 180;
    
    const lapStartX = topCx + midRadius * Math.cos(lapStartRad);
    const lapStartY = topCy + midRadius * Math.sin(lapStartRad);
    const lapEndX = topCx + midRadius * Math.cos(lapEndRad);
    const lapEndY = topCy + midRadius * Math.sin(lapEndRad);
    
    // Lap arc with lighter color and different dash pattern to distinguish from cuts
    topCutLines += `<path d="M${lapStartX},${lapStartY} A${midRadius},${midRadius} 0 0,0 ${lapEndX},${lapEndY}" fill="none" stroke="#3889fb" stroke-width="1" stroke-dasharray="1,1"/>`;
  }

  // Side view: lug hole positions
  const lugTopPx = Math.min(lugTop * scale, sideHeight - 10);
  const lugBottomPx = Math.min(lugTopPx + lugSpace * scale, sideHeight - 10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect width="100%" height="100%" fill="#fff"/>
  
  <!-- TOP VIEW -->
  <text x="${topCx}" y="30" font-family="Arial, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">TOP VIEW</text>
  
  <!-- Pie slices (segment fills) -->
  ${topPieSlices}
  <!-- Outer circle -->
  <circle cx="${topCx}" cy="${topCy}" r="${topRadius}" fill="none" stroke="#000" stroke-width="1"/>
  <!-- Inner circle (thickness) -->
  <circle cx="${topCx}" cy="${topCy}" r="${innerRadius}" fill="none" stroke="#000" stroke-width="1"/>
  <!-- Cut lines and lap joints -->
  ${topCutLines}
  
  <!-- Parameters in center of top view -->
  <text x="${topCx}" y="${topCy - 8}" font-family="Arial, sans-serif" font-size="7" text-anchor="middle">${segments} Pieces</text>
  <text x="${topCx}" y="${topCy}" font-family="Arial, sans-serif" font-size="7" text-anchor="middle">${lapPct}% Overlap</text>
  <text x="${topCx}" y="${topCy + 8}" font-family="Arial, sans-serif" font-size="7" text-anchor="middle">${thickMm}mm Shell</text>
  
  <!-- Diameter dimension -->
  <line x1="${topCx - topRadius}" y1="${topCy + topRadius + 15}" x2="${topCx + topRadius}" y2="${topCy + topRadius + 15}" stroke="#3889fb" stroke-width=".5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="${topCx}" y="${topCy + topRadius + 28}" font-family="Arial, sans-serif" font-size="10" text-anchor="middle">⌀${diam}"</text>
  
  <!-- Dividing line between views -->
  <line x1="20" y1="${sideY - 40}" x2="${svgWidth - 20}" y2="${sideY - 40}" stroke="#e2e2e2" stroke-width="1"/>
  
  <!-- SIDE VIEW -->
  <text x="${sideX + sideWidth / 2}" y="${sideY - 18}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" text-anchor="middle">SIDE VIEW</text>
  
  <!-- Shell outline - walls shown as double lines spreading with thickness -->
  <!-- Top edge -->
  <line x1="${sideX}" y1="${sideY}" x2="${sideX + sideWidth}" y2="${sideY}" stroke="#000" stroke-width="1"/>
  <!-- Bottom edge -->
  <line x1="${sideX}" y1="${sideY + sideHeight}" x2="${sideX + sideWidth}" y2="${sideY + sideHeight}" stroke="#000" stroke-width="1"/>
  <!-- Left wall - outer -->
  <line x1="${sideX}" y1="${sideY}" x2="${sideX}" y2="${sideY + sideHeight}" stroke="#3889fb" stroke-width="1"/>
  <!-- Left wall - inner -->
  <line x1="${sideX + visualThickPx}" y1="${sideY}" x2="${sideX + visualThickPx}" y2="${sideY + sideHeight}" stroke="#3889fb" stroke-width="1"/>
  <!-- Right wall - outer -->
  <line x1="${sideX + sideWidth}" y1="${sideY}" x2="${sideX + sideWidth}" y2="${sideY + sideHeight}" stroke="#000" stroke-width="1"/>
  <!-- Right wall - inner -->
  <line x1="${sideX + sideWidth - visualThickPx}" y1="${sideY}" x2="${sideX + sideWidth - visualThickPx}" y2="${sideY + sideHeight}" stroke="#000" stroke-width="1"/>
  
  <!-- Thickness dimension (below left wall) -->
  <line x1="${sideX}" y1="${sideY + sideHeight + 8}" x2="${sideX + visualThickPx}" y2="${sideY + sideHeight + 8}" stroke="#3889fb" stroke-width=".5"/>
  <!-- Tick marks -->
  <line x1="${sideX}" y1="${sideY + sideHeight + 5}" x2="${sideX}" y2="${sideY + sideHeight + 11}" stroke="#3889fb" stroke-width=".5"/>
  <line x1="${sideX + visualThickPx}" y1="${sideY + sideHeight + 5}" x2="${sideX + visualThickPx}" y2="${sideY + sideHeight + 11}" stroke="#3889fb" stroke-width=".5"/>
  <!-- Measurement -->
  <text x="${(sideX + sideX + visualThickPx) / 2}" y="${sideY + sideHeight + 18}" font-family="Arial, sans-serif" font-size="7" text-anchor="middle">${thickMm}mm Shell Thickness</text>
  
  <!-- Lug holes (left side) -->
  <circle cx="${sideX + 15}" cy="${sideY + lugTopPx}" r="${lugR}" fill="none" stroke="#000" stroke-width="1"/>
  <circle cx="${sideX + 15}" cy="${sideY + lugBottomPx}" r="${lugR}" fill="none" stroke="#000" stroke-width="1"/>
  <!-- Lug holes (right side) -->
  <circle cx="${sideX + sideWidth - 15}" cy="${sideY + lugTopPx}" r="${lugR}" fill="none" stroke="#000" stroke-width="1"/>
  <circle cx="${sideX + sideWidth - 15}" cy="${sideY + lugBottomPx}" r="${lugR}" fill="none" stroke="#000" stroke-width="1"/>
  
  <!-- Lug hole diameter dimension (horizontal line through bottom-right lug) -->
  <line x1="${sideX + sideWidth - 15 - lugR}" y1="${sideY + lugBottomPx}" x2="${sideX + sideWidth - 15 + lugR}" y2="${sideY + lugBottomPx}" stroke="#3889fb" stroke-width="1" marker-start="url(#smallArrow)" marker-end="url(#smallArrow)"/>
  <text x="${sideX + sideWidth - 15}" y="${sideY + lugBottomPx + lugR + 5}" font-family="Arial, sans-serif" font-size="4" text-anchor="middle">⌀${lugDiam}"</text>
  
  <!-- Height dimension -->
  <line x1="${sideX + sideWidth + 12}" y1="${sideY}" x2="${sideX + sideWidth + 12}" y2="${sideY + sideHeight}" stroke="#3889fb" stroke-width=".5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="${sideX + sideWidth + 16}" y="${sideY + sideHeight / 2}" font-family="Arial, sans-serif" font-size="9" dominant-baseline="middle">${height}"</text>
  
  <!-- Lug top distance (from top to first lug center) -->
  <line x1="${sideX - 18}" y1="${sideY}" x2="${sideX - 18}" y2="${sideY + lugTopPx}" stroke="#3889fb" stroke-width=".5"/>
  <line x1="${sideX - 22}" y1="${sideY}" x2="${sideX - 14}" y2="${sideY}" stroke="#3889fb" stroke-width=".5"/>
  <line x1="${sideX - 25}" y1="${sideY + lugTopPx}" x2="${sideX - 11}" y2="${sideY + lugTopPx}" stroke="#3889fb" stroke-width=".5"/>
  <text x="${sideX - 28}" y="${sideY + lugTopPx / 2}" font-family="Arial, sans-serif" font-size="8" text-anchor="end" dominant-baseline="middle">${lugTop}"</text>
  
  <!-- Lug spacing (between lug centers) -->
  <line x1="${sideX - 18}" y1="${sideY + lugTopPx}" x2="${sideX - 18}" y2="${sideY + lugBottomPx}" stroke="#3889fb" stroke-width=".5"/>
  <line x1="${sideX - 22}" y1="${sideY + lugBottomPx}" x2="${sideX - 14}" y2="${sideY + lugBottomPx}" stroke="#3889fb" stroke-width=".5"/>
  <text x="${sideX - 28}" y="${sideY + (lugTopPx + lugBottomPx) / 2}" font-family="Arial, sans-serif" font-size="8" text-anchor="end" dominant-baseline="middle">${lugSpace}"</text>
  
  <!-- Arrow markers -->
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
      <path d="M0,0 L6,3 L0,6 Z" fill="#3889fb"/>
    </marker>
    <marker id="smallArrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto-start-reverse">
      <path d="M0,0 L4,2 L0,4 Z" fill="#3889fb"/>
    </marker>
  </defs>
</svg>`;
};
