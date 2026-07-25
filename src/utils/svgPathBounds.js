/**
 * Approximate bounding box for an SVG path `d` string.
 * Ported from my-world WorldMap — not a full SVG parser, good enough for country shapes.
 */
export function getApproxPathBounds(d) {
  if (!d || typeof d !== 'string') {
    return null;
  }

  const tokens = [];
  const re = /([a-zA-Z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let match;
  while ((match = re.exec(d))) {
    if (match[1]) {
      tokens.push({ type: 'cmd', value: match[1] });
    } else {
      tokens.push({ type: 'num', value: parseFloat(match[2]) });
    }
  }

  let i = 0;
  let cmd = null;
  let currX = 0;
  let currY = 0;
  let startX = 0;
  let startY = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const include = (x, y) => {
    if (Number.isNaN(x) || Number.isNaN(y)) return;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  while (i < tokens.length) {
    if (tokens[i].type === 'cmd') {
      cmd = tokens[i].value;
      i += 1;
    }
    if (!cmd) break;

    const upper = cmd.toUpperCase();
    const isRel = cmd !== upper;

    switch (upper) {
      case 'M':
      case 'L':
      case 'T': {
        while (
          i + 1 < tokens.length &&
          tokens[i].type === 'num' &&
          tokens[i + 1].type === 'num'
        ) {
          let x = tokens[i].value;
          let y = tokens[i + 1].value;
          i += 2;
          if (isRel) {
            x += currX;
            y += currY;
          }
          currX = x;
          currY = y;
          include(x, y);
          if (upper === 'M') {
            startX = x;
            startY = y;
          }
        }
        break;
      }
      case 'H': {
        while (i < tokens.length && tokens[i].type === 'num') {
          let x = tokens[i].value;
          i += 1;
          if (isRel) x += currX;
          currX = x;
          include(x, currY);
        }
        break;
      }
      case 'V': {
        while (i < tokens.length && tokens[i].type === 'num') {
          let y = tokens[i].value;
          i += 1;
          if (isRel) y += currY;
          currY = y;
          include(currX, y);
        }
        break;
      }
      case 'C': {
        while (
          i + 5 < tokens.length &&
          tokens[i].type === 'num' &&
          tokens[i + 1].type === 'num' &&
          tokens[i + 2].type === 'num' &&
          tokens[i + 3].type === 'num' &&
          tokens[i + 4].type === 'num' &&
          tokens[i + 5].type === 'num'
        ) {
          let x1 = tokens[i].value;
          let y1 = tokens[i + 1].value;
          let x2 = tokens[i + 2].value;
          let y2 = tokens[i + 3].value;
          let x = tokens[i + 4].value;
          let y = tokens[i + 5].value;
          i += 6;
          if (isRel) {
            x1 += currX;
            y1 += currY;
            x2 += currX;
            y2 += currY;
            x += currX;
            y += currY;
          }
          include(x1, y1);
          include(x2, y2);
          include(x, y);
          currX = x;
          currY = y;
        }
        break;
      }
      case 'S':
      case 'Q': {
        while (
          i + 3 < tokens.length &&
          tokens[i].type === 'num' &&
          tokens[i + 1].type === 'num' &&
          tokens[i + 2].type === 'num' &&
          tokens[i + 3].type === 'num'
        ) {
          let x1 = tokens[i].value;
          let y1 = tokens[i + 1].value;
          let x = tokens[i + 2].value;
          let y = tokens[i + 3].value;
          i += 4;
          if (isRel) {
            x1 += currX;
            y1 += currY;
            x += currX;
            y += currY;
          }
          include(x1, y1);
          include(x, y);
          currX = x;
          currY = y;
        }
        break;
      }
      case 'A': {
        while (
          i + 6 < tokens.length &&
          tokens[i].type === 'num' &&
          tokens[i + 1].type === 'num' &&
          tokens[i + 2].type === 'num' &&
          tokens[i + 3].type === 'num' &&
          tokens[i + 4].type === 'num' &&
          tokens[i + 5].type === 'num' &&
          tokens[i + 6].type === 'num'
        ) {
          const x = isRel ? currX + tokens[i + 5].value : tokens[i + 5].value;
          const y = isRel ? currY + tokens[i + 6].value : tokens[i + 6].value;
          i += 7;
          include(x, y);
          currX = x;
          currY = y;
        }
        break;
      }
      case 'Z': {
        include(startX, startY);
        currX = startX;
        currY = startY;
        break;
      }
      default: {
        i += 1;
        break;
      }
    }
  }

  if (
    minX === Infinity ||
    minY === Infinity ||
    maxX === -Infinity ||
    maxY === -Infinity
  ) {
    return null;
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const padX = width * 0.15;
  const padY = height * 0.15;

  return {
    minX: minX - padX,
    minY: minY - padY,
    width: width + padX * 2,
    height: height + padY * 2,
  };
}
