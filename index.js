'use strict';

const game = require('./src/game');

// Start game!
game.start().then(data => {
  console.log(`\n##### Game over !!! #####\n\nGame ID: ${data.gameId}\n  Score: ${data.score}\n  Turns: ${data.turn}\n\n`);
});
