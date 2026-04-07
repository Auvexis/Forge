const OFFSET = -2.5;

export const getNodeIntersection = (sourceNode: any, targetNode: any) => {
  const sourcePos = sourceNode.internals.positionAbsolute;
  const targetPos = targetNode.internals.positionAbsolute;

  const sw = sourceNode.measured?.width ?? 64;
  const sh = sourceNode.measured?.height ?? 64;
  const tw = targetNode.measured?.width ?? 64;
  const th = targetNode.measured?.height ?? 64;

  const sx = sourcePos.x + sw / 2;
  const sy = sourcePos.y + sh / 2;
  const tx = targetPos.x + tw / 2;
  const ty = targetPos.y + th / 2;

  const angle = Math.atan2(ty - sy, tx - sx);

  const sourceX = sx + (sw / 2 - OFFSET) * Math.cos(angle);
  const sourceY = sy + (sh / 2 - OFFSET) * Math.sin(angle);

  const targetX = tx - (tw / 2 - OFFSET) * Math.cos(angle);
  const targetY = ty - (th / 2 - OFFSET) * Math.sin(angle);

  return { sx: sourceX, sy: sourceY, tx: targetX, ty: targetY };
};
