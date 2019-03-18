const dotenv = require("dotenv");

try {
  let result = dotenv.config();
  if (result.error) {
    throw result.error;
  }
} catch (err) {
  console.error('no .env file');
}

const config = {
  sound: {
    cachePath: process.env.CACHE_PATH ||  'cache',
  }
}

const SoundBoard = require("./lib/board").SoundBoard;

const main = async (config) => {
  let board = new SoundBoard(config);
  let sample = require("./sample/board-config-1.js");
  await board.start();
  await board.load(sample);
};

main(config).catch(console.error);
