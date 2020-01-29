function drawSphere(rect, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  //Radius is slightly smaller than collision rect
  var radius = (rect.width + rect.height) / 2 - 1;
  ctx.arc(rect.centerx(), rect.centery(), radius, 0, TAU);
  ctx.fill();
}
