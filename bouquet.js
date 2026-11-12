// 「あなたのブーケ」。メニューをやりきった日ごとに1輪咲き、90輪でブーケが完成する
// 花の位置はひまわりの種の並び（黄金角）で、中心から外へ順に埋まる

const BOUQUET_COLORS = [
  { fill: "#F1D3CB", edge: "#D9A79A", core: "#C98F82" }, // ブラッシュ
  { fill: "#FFFDF8", edge: "#D8C3A0", core: "#C9AD7E" }, // アイボリー
  { fill: "#EEDDBF", edge: "#CDB088", core: "#B0915F" }, // シャンパン
  { fill: "#E3B2A6", edge: "#C4857A", core: "#A86A5F" }, // ダスティローズ
];

function bouquetSVG(total, bloomed, opts = {}) {
  const cx = 150, cy = 122, R = 104, squash = 0.84;
  const GA = Math.PI * (3 - Math.sqrt(5));
  const pos = [];
  for (let i = 0; i < total; i++) {
    const r = R * Math.sqrt((i + 0.6) / total);
    const a = i * GA;
    pos.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * squash, s: 18 - 5 * (r / R) });
  }

  // 下地（ふんわりした円と、細い金の輪）
  let back = `<ellipse cx="${cx}" cy="${cy}" rx="${R + 20}" ry="${(R + 20) * squash}" fill="#F7F1E7"/>`;
  back += `<ellipse cx="${cx}" cy="${cy}" rx="${R + 26}" ry="${(R + 26) * squash}" fill="none" stroke="#E2D2B4" stroke-width=".8" stroke-dasharray="1 4"/>`;

  let out = "";
  // 茎（ブーケの下から、リボンでまとめて下に広がる）
  out += `<g stroke="#9DB196" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".9">`;
  for (let k = -5; k <= 5; k++) {
    const top = cx + k * 11, bottom = cx + k * 4.2;
    out += `<path d="M${top} ${cy + 64} Q ${cx + k * 3} 262 ${bottom} 318"/>`;
  }
  out += `</g>`;

  // 葉（外まわり。大きさと間隔を少しずつずらして、自然に見せる）
  const LEAF = [[-12, 15, 0], [14, 19, 1], [38, 13, 0], [62, 17, 1], [118, 17, 1], [142, 13, 0], [166, 19, 1], [192, 15, 0],
    [214, 18, 1], [236, 12, 0], [258, 16, 1], [282, 14, 0], [304, 18, 1], [326, 12, 0]];
  out += `<g stroke-width=".8">`;
  for (const [deg0, len, tone] of LEAF) {
    const ang = (deg0 * Math.PI) / 180;
    const x = cx + (R + 2) * Math.cos(ang), y = cy + (R + 2) * Math.sin(ang) * squash;
    const deg = deg0 + 90;
    const fill = tone ? "#B7C7AF" : "#CBD7C4";
    out += `<path d="M0 ${len} C ${len * 0.55} ${len * 0.3} ${len * 0.45} ${-len * 0.6} 0 ${-len} C ${-len * 0.45} ${-len * 0.6} ${-len * 0.55} ${len * 0.3} 0 ${len}Z" fill="${fill}" stroke="#8EA38A" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg})"/>`;
    out += `<path d="M0 ${len * 0.8} L0 ${-len * 0.8}" stroke="#8EA38A" opacity=".5" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg})"/>`;
  }
  out += `</g>`;
  // 茎の上端は下地の円で隠す（茎 → 下地 → 葉 の順）
  const stemsEnd = out.indexOf("</g>") + 4;
  out = out.slice(0, stemsEnd) + back + out.slice(stemsEnd);

  // 花（外側から描いて、中心の花を上に重ねる）
  for (let i = total - 1; i >= 0; i--) {
    const p = pos[i];
    if (i < bloomed) {
      const isNew = opts.newest && i === bloomed - 1;
      out += flowerSVG(p.x, p.y, p.s, BOUQUET_COLORS[(i * 7) % 4], i % 3, i * 41, isNew);
    } else {
      // まだ咲いていない日はつぼみ
      out += `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${(p.s * 0.26).toFixed(1)}" ry="${(p.s * 0.34).toFixed(1)}" fill="#EEF2EA" stroke="#C9D5C2" stroke-width=".8" transform="rotate(${(i * 53) % 60 - 30} ${p.x.toFixed(1)} ${p.y.toFixed(1)})"/>`;
    }
  }

  // リボン
  out += `<g transform="translate(${cx} 262)">
    <path d="M0 0 C -26 -20 -46 -4 -36 10 C -28 20 -10 8 0 0Z" fill="#F4EEE3" stroke="#B0915F" stroke-width="1.2"/>
    <path d="M0 0 C 26 -20 46 -4 36 10 C 28 20 10 8 0 0Z" fill="#F4EEE3" stroke="#B0915F" stroke-width="1.2"/>
    <path d="M-3 3 L -16 40 L -9 36 L -6 44 Z" fill="#F4EEE3" stroke="#B0915F" stroke-width="1.1"/>
    <path d="M3 3 L 16 40 L 9 36 L 6 44 Z" fill="#F4EEE3" stroke="#B0915F" stroke-width="1.1"/>
    <ellipse rx="6" ry="5.5" fill="#E8DCC6" stroke="#B0915F" stroke-width="1.2"/>
  </g>`;

  const label = opts.label || `ブーケ ${bloomed}輪／${total}輪`;
  return `<svg class="bouquet-svg" viewBox="0 0 300 330" role="img" aria-label="${label}">${out}</svg>`;
}

function flowerSVG(x, y, s, c, kind, rot, isNew) {
  const X = x.toFixed(1), Y = y.toFixed(1);
  const cls = isNew ? ` class="bloom-new" style="transform-origin:${X}px ${Y}px"` : "";
  let g = "";
  if (kind === 0) {
    // ばら：重なった輪
    g += `<circle cx="${X}" cy="${Y}" r="${(s * 0.62).toFixed(1)}" fill="${c.fill}" stroke="${c.edge}" stroke-width="1"/>`;
    g += `<path d="M${(x - s * 0.36).toFixed(1)} ${Y} a ${(s * 0.36).toFixed(1)} ${(s * 0.36).toFixed(1)} 0 1 1 ${(s * 0.5).toFixed(1)} ${(s * 0.22).toFixed(1)}" fill="none" stroke="${c.edge}" stroke-width="1"/>`;
    g += `<path d="M${(x - s * 0.14).toFixed(1)} ${(y - s * 0.04).toFixed(1)} a ${(s * 0.16).toFixed(1)} ${(s * 0.16).toFixed(1)} 0 1 1 ${(s * 0.22).toFixed(1)} ${(s * 0.12).toFixed(1)}" fill="none" stroke="${c.core}" stroke-width="1"/>`;
  } else if (kind === 1) {
    // 5枚の花びら
    for (let k = 0; k < 5; k++) {
      const a = rot + k * 72;
      g += `<ellipse cx="${X}" cy="${(y - s * 0.34).toFixed(1)}" rx="${(s * 0.3).toFixed(1)}" ry="${(s * 0.38).toFixed(1)}" fill="${c.fill}" stroke="${c.edge}" stroke-width=".9" transform="rotate(${a % 360} ${X} ${Y})"/>`;
    }
    g += `<circle cx="${X}" cy="${Y}" r="${(s * 0.16).toFixed(1)}" fill="${c.core}"/>`;
  } else {
    // かすみ草のような小花
    const pts = [[0, -0.28], [0.26, 0.14], [-0.26, 0.14]];
    for (const [dx, dy] of pts) {
      g += `<circle cx="${(x + dx * s).toFixed(1)}" cy="${(y + dy * s).toFixed(1)}" r="${(s * 0.26).toFixed(1)}" fill="${c.fill}" stroke="${c.edge}" stroke-width=".9"/>`;
    }
    g += `<circle cx="${X}" cy="${Y}" r="${(s * 0.1).toFixed(1)}" fill="${c.core}"/>`;
  }
  return `<g${cls}>${g}</g>`;
}

// 小さな1輪（カレンダー・ボタン用）
function miniFlower(color = BOUQUET_COLORS[0]) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${flowerSVG(12, 12, 20, color, 1, 0, false)}</svg>`;
}
