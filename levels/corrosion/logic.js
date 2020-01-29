var playerShip;
var crossHair;

var AI_CrossHairs;
var AI_Ships;

var asteroids;
var bullets

var laserMode;
var corrosionHealth;
var corrosionLaserStrength;

function setDash(dashed) {
  if (dashed) {
    ctx.setLineDash([3, 3]);
  } else {
    ctx.setLineDash([])
  }
}

function drawCrossHair(origX, origY, dashed, radius) {
  ctx.strokeStyle = 'white';

  setDash(dashed)

  const x = Math.round(origX);
  const y = Math.round(origY);

  //Vertical
  ctx.beginPath();
  ctx.moveTo(x, y - radius);

  var bottom = y + radius;
  if (bottom > MAIN_SCREEN_HEIGHT) {
    bottom = MAIN_SCREEN_HEIGHT;
  }

  ctx.lineTo(x, bottom)
  ctx.stroke();

  //Horizontal
  ctx.beginPath();
  ctx.moveTo(x - radius, y);
  ctx.lineTo(x + radius, y)
  ctx.stroke();
}

function calculateCorrosionMass(asteroids) {
  var mass = 0;
  var type;

  for (var asteroid of asteroids) {
    type = asteroid.type;
    if (type == 'Large') {
      mass += 3;
    } else if (type == 'Small') {
      mass += 1;
    } else if (type == 'Tiny') {
      mass += 0;
    } else {
      prompt('Asteroid type error');
    }
  }

  return mass;
}

// http://stackoverflow.com/questions/2259476/rotating-a-point-about-another-point-2d
function rotatePoint(originX, originY, pointX, pointY, angle) {
	var COS = Math.cos(angle);
	var SIN = Math.sin(angle);

	return {x: COS * (pointX - originX) - SIN * (pointY - originY) + originX,
				  y: SIN * (pointX - originX) - COS * (pointY - originY) + originY};
}

//ObjectRect - player's ship, asteroids, etc
function drawBar(value, maxValue, barWidth, barHeight, objectRect, barColour) {
  var barOuterRect = new Rect(objectRect.centerx() - barWidth / 2, //x
                              objectRect.y - barHeight * 2,
                              barWidth, barHeight
                              );

  //Set bar coordinates
  var barInnerRect = barOuterRect.inflate(-5, -5);

  //Display bar
  ctx.fillStyle = 'black';
  barOuterRect.draw();
  ctx.fillStyle = 'grey';
  barInnerRect.draw();

  ctx.fillStyle = barColour;

  ctx.fillRect(barInnerRect.x, barInnerRect.y,
               barInnerRect.width * value / maxValue,
               barInnerRect.height);
}

function runAIShips(dTime, usingUpgrade) {
  // AI Ship (neutralization) upgrades
  var ships = [];
  if (usingUpgrade(4)) {
    ships.push(...['Left', 'Right']);
  }
  if (usingUpgrade(3)) {
    ships.push('Centre');
  }

  for (var type of ships) {
    AI_Ships[type].auto();
    AI_Ships[type].chargeShip(dTime);
    AI_Ships[type].move(dTime);
    AI_Ships[type].draw();
  }
}

function runPlayerShip(holdW, holdS, holdA, holdD, dTime, debugging) {
  if (laserMode) {
    crossHair.move(dTime);
    crossHair.draw();
    crossHair.control(holdW, holdS, holdA, holdD, dTime);

  } else {
    playerShip.move(dTime);
    playerShip.draw();
    playerShip.control(holdW, holdS, holdA, holdD, dTime);
    playerShip.chargeShip(dTime);

    //Find rotation based off mouse position
    var dx = mx - playerShip.rect.centerx();
    var dy = my - playerShip.rect.centery();
    playerShip.rotation = Math.atan2(dy,dx);

    if (debugging) {
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.moveTo(playerShip.rect.centerx(),playerShip.rect.centery());
      ctx.lineTo(playerShip.rect.centerx() + dx,playerShip.rect.centery());
      ctx.lineTo(playerShip.rect.centerx() + dx,playerShip.rect.centery());
      ctx.lineTo(playerShip.rect.centerx() + dx,playerShip.rect.centery() + dy);
      ctx.lineTo(playerShip.rect.centerx(),playerShip.rect.centery());
      ctx.stroke();
      ctx.fillText(dx, playerShip.rect.centerx()+dx/2,playerShip.rect.centery());
      ctx.fillText(dy, playerShip.rect.centerx()+dx,playerShip.rect.centery()+dy/2);
      ctx.fillText(playerShip.rotation, playerShip.rect.centerx()+dx/2,playerShip.rect.centery()+dy/2);
    }
  }

  if (playerShip.invincibleTimer > 0) {
    playerShip.invincibleTimer -= dTime;
  }
}

function zapAsteroid(currentCrossHair, asteroids, i, explosions, dTime, levelIncome) {
  var distance = asteroids[i].rect.dist(currentCrossHair.rect);

  if (distance < 100 && currentCrossHair.laserOn) {
    var intensity = 1 / distance * 300 * currentCrossHair.getPower(dTime);
    asteroids[i].health -= intensity * corrosionLaserStrength;

    if (asteroids[i].health < 0) { //Blow up asteroid
      asteroids[i].explode(explosions);
      levelIncome.Corrosion += randint(100, 300);

      //Make smaller components of asteroid
      var asteroidCount = randint(2, 3);
      for (j = 0; j < asteroidCount; j++) {
        asteroids.push(new SmallAsteroid(asteroids[i]));
      }
    }
  }
}
