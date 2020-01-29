//min and max are inclusive for both random functions
function randUniform(min, max) {
  return min + Math.random() * (max - min + 1);
}

//Chance of true is 1 / odds
function randChance(odds) {
  return Math.random() < 1 / odds;
}

//Chance of true per second is 1 / odds
function randDChance(odds, dTime) {
  //dTime is 2, double odds
  //dTime is 0.5, halve odds

  return randChance(odds / dTime);
}

function randint(min, max) {
  return Math.floor(randUniform(min, max));
}
