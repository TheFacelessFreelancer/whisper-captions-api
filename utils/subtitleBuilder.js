const alignmentMap = {
  "top-safe": { an: 8, marginV: 120 },
  "center":   { an: 5, marginV: 0 },
  "bottom-safe": { an: 2, marginV: 240 },
};

const alignmentSettings = alignmentMap[alignment] || alignmentMap["bottom-safe"];
const anTag = alignmentSettings.an;
const marginOverride = customY !== undefined ? 0 : alignmentSettings.marginV;
