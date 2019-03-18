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
  port: process.env.PORT || 8080,
  sound: {
    cachePath: process.env.CACHE_PATH ||  'cache',
  }
}

const fastify = require('fastify')()
const SoundBoard = require("./lib/board").SoundBoard;

const main = async (config) => {
  let sample = require("./sample/board-config-1.js");
  let board = new SoundBoard(config);
  await board.start();
  await board.load(sample);

  // configure board remotely
  let boardConfigRoute = '/'
  fastify.post(boardConfigRoute, async (req, reply) => {
    let newBoardConfig = req.body

    if (!newBoardConfig)
      reply.status(422).send({message: 'no board config provided'})
    
    if (!newBoardConfig.boards)
      reply.status(422).send({message: 'no boards in board config provided'})

    if (!newBoardConfig.boards.some(board=> board.length === 8 && board[0].length === 8))
      reply.status(422).send({message: 'contains invalid board configs'})

    await board.load(newBoardConfig);

    reply.send({ status: true })
  })
  await fastify.listen(config.port)
  console.log('listeneing on', config.port, boardConfigRoute)
};

main(config).catch(console.error);
