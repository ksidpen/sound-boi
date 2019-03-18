const SoundBoard = require('./lib/board').SoundBoard

const main = async () => {
  let board = new SoundBoard();
  let sample = require("./sample/board-config-1.js");
  await board.start();
  await board.load(sample);
};

main().catch(console.error);
