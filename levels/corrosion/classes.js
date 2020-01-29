class SpaceObject {
  basicDraw(colour) {
    const cx = this.rect.centerx();
    const cy = this.rect.centery();

    ctx.strokeStyle = colour;
    setDash(this.dashed);
    ctx.beginPath();

    ctx.moveTo(this.pointList[0].x + cx, this.pointList[0].y + cy);
    for (var i = 1; i < this.pointList.length; i++) {
      ctx.lineTo(this.pointList[i].x + cx, this.pointList[i].y + cy);
    }

    ctx.closePath();
    ctx.stroke();
  }

  checkRemove() {
    //Remove off screen
    if (this.rect.right() < 0 || //Left of screen
        this.rect.x > w || //Right of screen
        this.rect.bottom() < 0 || //Top of screen
        this.rect.y > MAIN_SCREEN_HEIGHT) { //Bottom

      this.toBeRemoved = true;
    }
  }

  move(dTime) {
    const MAX_SPEED = 250;
    if (this.dx > MAX_SPEED) {
        this.dx = MAX_SPEED;
    } else if (this.dx < -MAX_SPEED) {
        this.dx = -MAX_SPEED;
    }
    if (this.dy > MAX_SPEED) {
        this.dy = MAX_SPEED;
    } else if (this.dy < -MAX_SPEED) {
        this.dy = -MAX_SPEED;
    }

    this.rect.x += this.dx * dTime;
    this.rect.y += this.dy * dTime;

    if (this.rect.right() < 0) { //To left of screen
      this.rect.x = w;
    } else if (this.rect.x > w) { //Right
      this.rect.x = -this.rect.width;
    }

    if (this.rect.bottom() < 0) { //Top
      this.rect.y = MAIN_SCREEN_HEIGHT;
    } else if (this.rect.y > MAIN_SCREEN_HEIGHT) { //Bottom
      this.rect.y = -this.rect.height;
    }
  }

  // KLUDGE - only AICrossHair, AIShip use approach
  //        - only PlayerCrossHair, PlayerShip use control
  control(holdW, holdS, holdA, holdD, dTime) {
    const PLAYER_SPEED = 300;
    if (holdW) {
      this.dy -= PLAYER_SPEED * dTime;
    } else if (holdS) {
      this.dy += PLAYER_SPEED * dTime;
    }
    if (holdA) {
      this.dx -= PLAYER_SPEED * dTime;
    } else if (holdD) {
      this.dx += PLAYER_SPEED * dTime;
    }
  }

  approach(distance) {
    var newDistance;
    var closestID = -1;
    var tempDistance;

    for (var i = 0; i < asteroids.length; i++) {
      //Find nearest asteroid

      if (this.checkViability(asteroids[i]) &&
          //Don't go after asteroids that'll be removed this frame
          !asteroids[i].toBeRemoved) {

        newDistance = asteroids[i].rect.dist(this.rect);

        if (closestID == -1 || newDistance < tempDistance) {
          closestID = i;
          tempDistance = newDistance;
        }
      }
    }

    if (closestID != -1) {
      var currentDistance = asteroids[closestID].rect.dist(this.rect);
      var buffer = 0.5 * distance;

      // TODO, try * 2, the * 10 matches a direct 50 multiply of the old, / 5
      if (currentDistance > distance + buffer) {
          this.dx = (asteroids[closestID].rect.centerx() - this.rect.centerx()) * 10;
          this.dy = (asteroids[closestID].rect.centery() - this.rect.centery()) * 10;
      }
      else if (currentDistance < distance - buffer) {
          this.dx = (asteroids[closestID].rect.centerx() + this.rect.centerx()) * 10;
          this.dy = (asteroids[closestID].rect.centery() + this.rect.centery()) * 10;
      }
    }

    return closestID;
  }
}

class Ship extends SpaceObject {
  MAX_CHARGE = 6;
  SIZE = 16;

  CHARGE_BAR_WIDTH = 50;
  CHARGE_BAR_HEIGHT = 10;

  constructor() {
    super();
    this.rect = new Rect(w / 2, h / 2, 50, 50)
    this.rotation = 0;

    this.dx = 0;
    this.dy = 0;
    this.charge = this.MAX_CHARGE;

    this.invincibleTimer = 5;
  }

  draw() {
    //Connecting these points traces out ship
    this.pointList = [];
    var size;

    for (var angle of [0, 140, 220]) {
      var temp = rotatePoint(0, 0, 0, -this.SIZE,
                   //"angle" is in degrees, this.rotation in radians and clockwise from vertical
                   angle * TAU / 360 + this.rotation + TAU / 4
                   );

      temp.y *= -1; // Flip y coordinates so rotations are done in conventional math form but match screen
      this.pointList.push(temp);
    }

    if (this.invincibleTimer > 0) {
      ctx.fillStyle = 'gold';
    } else {
      ctx.fillStyle = 'aqua';
    }
    this.basicDraw(ctx.fillStyle);

    drawBar(this.charge, this.MAX_CHARGE, this.CHARGE_BAR_WIDTH,
            this.CHARGE_BAR_HEIGHT, this.rect, 'orange');
  }

  chargeShip(dTime) {
    this.charge += dTime * this.chargeRate; //One bullet charge per seconds
    if (this.charge > this.MAX_CHARGE) {
      this.charge = this.MAX_CHARGE;
    }
  }

  shoot() {
    if (this.charge > 1) {
      bullets.push(new Bullet(this.getTipCoords(), this.rotation));
      this.charge -= 1;
    }
  }

  getTipCoords() {
    var angle = 0;

    var temp = rotatePoint(0, 0, 0, -this.SIZE,
                           //"angle" is in degrees, this.rotation in radians and clockwise from vertical
                           angle * TAU / 360 + this.rotation + TAU / 4
                           );

    temp.y *= -1; //Flip y coordinates so rotations are done in conventional math form but match screen

    return {x: this.rect.centerx() + temp.x,
            y: this.rect.centery() + temp.y};
  }
}

class PlayerShip extends Ship {
  dashed = false;
  chargeRate = 1;
}

class AI_Ship extends Ship {
  dashed = true;

  constructor(mode) {
    super();
    this.AI_Mode = mode;
    this.chargeRate = 1 / 3;

    if (mode == 'Left') {
      this.rect.x = w / 4;
    } else if (mode == 'Right') {
      this.rect.x = w * 3/4;
    }
  }

  auto() {
    var closestID = this.approach(120);

    // Aim
    if (closestID != -1) {
      // Look into making part of library.js
      var dx = asteroids[closestID].rect.centerx() - this.rect.centerx();
      var dy = asteroids[closestID].rect.centery() - this.rect.centery();

      this.rotation = Math.atan2(dy,dx);

      if (asteroids[closestID].rect.dist(this.rect) < 100) {
          this.shoot();
      }
    }
  }

  checkViability(asteroid) {
    return asteroid.type == 'Small' && checkPositionViability(asteroid, this.AI_Mode);
  }
}


const ASTEROID_HEALTH_BAR_WIDTH = 100;
const ASTEROID_HEALTH_BAR_HEIGHT = 15;
const MAX_ASTEROID_SPEED = 200;

class Asteroid extends SpaceObject {
  constructor(x, y, size, sideCount) {
    super();

    this.toBeRemoved = false;
    this.rect = new Rect(x, y, size, size);

    this.maxHealth = this.getMaxHealth(size);

    this.health = this.maxHealth;
    //Connecting these points traces out an asteroid
    this.pointList = [];

    var angle = randUniform(0, 360);
    var speed = randUniform(50, MAX_ASTEROID_SPEED);

    this.dx = Math.cos(angle) * speed;
    this.dy = Math.sin(angle) * speed;

    for (var i = 0; i < sideCount; i++) {
      var temp = rotatePoint(0, 0, 0, -size,
                             i * (360 / (sideCount - 1)) * 360 / TAU
                             );

      //Randomize points
      this.pointList.push({x: Math.round(temp.x + randUniform(-size/2, size/2)),
                           y: Math.round(temp.y + randUniform(-size/2, size/2))});
    }
  }

	getMaxHealth(size) {
    var baseHealth = Math.pow(size, 2)
    //Pipe quality upgrades
    if (usingUpgrade(6)) {
      baseHealth *= 0.8;
    }

    if (usingUpgrade(7)) {
      baseHealth *= 0.75;
    }

    if (usingUpgrade(8)) {
      baseHealth *= 0.5;
    }

    return baseHealth;
	}

	draw() {
		this.basicDraw(this.colour); //Draw asteroid
		if (this.maxHealth != this.health) {
			drawBar(this.health, this.maxHealth, ASTEROID_HEALTH_BAR_WIDTH,
			        ASTEROID_HEALTH_BAR_HEIGHT, this.rect, 'red');
		}
	}

	explode(explosions) {
		explosions.addR(this.rect);
		this.toBeRemoved = true;
    var particleCount = randint(50, 60);

    //Tiny pieces coming off asteroid
    for (var i = 0; i < particleCount; i++) {
      asteroids.push(new AsteroidParticleFX(this));
    }
	}
}

class LargeAsteroid extends Asteroid {
  constructor(x, y) {
    var size = randint(25, 35);
    var sideCount = randint(5, 8); //TODO - fix bug with even side counts
    sideCount = 7;

    super(x, y, size, sideCount);

    this.colour = 'green';
    this.type = 'Large';
    this.dashed = false;
  }
}

//Produced by blowing up large asteroid
class SmallAsteroid extends Asteroid {
  constructor(largeAsteroid) {
    var size = randint(10, 15);
    var sideCount = 7;

    var x = largeAsteroid.rect.centerx();
    var y = largeAsteroid.rect.centery();

    super(x, y, size, sideCount);

    this.colour = 'red';
    this.type = 'Small';
    this.dashed = false;
  }
}

//Spawned when blowing up any asteroid
class AsteroidParticleFX extends Asteroid {
  constructor(originAsteroid) {
    var size = randint(2, 7);
    var sideCount = randint(5, 8);

    var x = originAsteroid.rect.centerx();
    var y = originAsteroid.rect.centery();

    super(x, y, size, sideCount);

    this.colour = 'white';
    this.type = 'Tiny';

    this.despawnTimer = randUniform(0, 3);

    if (randint(0, 1)) {
      this.dashed = true;
    } else {
      this.dashed = false;
    }
  }

  move(dTime) {
    this.checkRemove();

    this.rect.x += this.dx * dTime;
    this.rect.y += this.dy * dTime;
  }
}

const BULLET_VISUAL_LENGTH = 10;
const BULLET_HIT_LENGTH = 10;
const BULLET_SPEED = 800;

class Bullet extends SpaceObject {
  constructor(shipTipCoords, shipRotation) {
    super();

    this.rect = new Rect(shipTipCoords.x - BULLET_HIT_LENGTH / 2,
                         shipTipCoords.y - BULLET_HIT_LENGTH / 2,
                         BULLET_HIT_LENGTH, BULLET_HIT_LENGTH);

    this.rotation = shipRotation;

    this.dx = BULLET_SPEED * Math.cos(this.rotation);
    this.dy = BULLET_SPEED * Math.sin(this.rotation);
  }

  move(dTime) {
    this.rect.x += this.dx * dTime;
    this.rect.y += this.dy * dTime;
  }

  draw() {
    //Connecting these points traces out bullet
    var pointOne = rotatePoint(0, 0, 0, -BULLET_VISUAL_LENGTH,
                               this.rotation + TAU / 4
                               );

    var pointTwo = rotatePoint(0, 0, 0, -BULLET_VISUAL_LENGTH,
                               //Point 2 is 180 degrees from point 1
                               this.rotation + TAU * 3/4
                               );

    pointOne.y *= -1; //Flip y coordinates so rotations are done in conventional math form but match screen
    pointTwo.y *= -1;

    this.pointList = [pointOne, pointTwo];
    this.basicDraw('orange');
  }
}

class CorrosionCrossHair extends SpaceObject {
  constructor() {
    super();

    this.rect = new Rect(w / 2, h / 2, 1, 1);

    this.dx = 0;
    this.dy = 0;
    this.laserOn = false;
  }

  draw() {
    if (this.laserOn) {
        var frame = Math.round(Math.random() * corrosionLaserStrength * 8);
        drawExplosionImage(frame, this.rect.x, this.rect.y);
    }

    drawCrossHair(this.rect.centerx(), this.rect.centery(),
                  this.dashed, this.radius);
  }
}

class PlayerCrossHair extends CorrosionCrossHair {
  dashed = false;
  constructor() {
    super();
    this.radius = w;
  }

  getPower(dTime) {
    return 50 * dTime;
  }
}

const AI_LASER_MULTIPLIER = 1 / 2;
class AICrossHair extends CorrosionCrossHair {
  constructor(mode) {
    super();
    this.dashed = true;
    this.radius = 100;
    this.AI_Mode = mode;
  }

  auto() {
    //Makes the laser look like it's scanning the asteroid surface back and forth
    var closestID = this.approach(16);

    this.laserOn = false;
    if (closestID != -1 &&
        asteroids[closestID].rect.dist(this.rect) < asteroids[closestID].rect.width &&
        corrosionLaserStrength > 0.35) { //Don't fire when charge is 35%

      this.laserOn = true;
    }
  }

  getPower(dTime) {
    var power = 20 * AI_LASER_MULTIPLIER;
    if (usingUpgrade(2)) {
      power *= 2;
    }

    return power * dTime;
  }

  checkViability(asteroid) {
    //getPositionViability is defined at each instance
    return asteroid.type == 'Large' && checkPositionViability(asteroid, this.AI_Mode);
  }
}
