
//import nearAPI from 'near-api-js';

const { KeyPair, keyStores, connect, Contract } = require ('near-api-js');
const { generateShip } = require('./screenshot');
const { upload } = require('./web3');
const fs = require('fs');

const ACCOUNT_ID = '';  // NEAR account tied to the keyPair
const NETWORK_ID = 'testnet';

const KEY_PATH = `keys/${ACCOUNT_ID}.json`;

const credentials = JSON.parse(fs.readFileSync(KEY_PATH));
const keyStore = new keyStores.InMemoryKeyStore();
keyStore.setKey(NETWORK_ID, ACCOUNT_ID, KeyPair.fromString(credentials.private_key));


const config = {
  networkId: "testnet",
  keyStore, 
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
};

const BUSY = 0;
const LOBBY = 1;
const SETUP = 2;
const WAIT_PLAYERS = 3;
const SOLVING_TURN = 4;
const OVER = 5;


const GAME_STATE = {
  [BUSY]: BUSY,
  [LOBBY]: LOBBY,
  [SETUP]: SETUP,
  [WAIT_PLAYERS]: WAIT_PLAYERS,
  [SOLVING_TURN]: SOLVING_TURN,
  [OVER]: OVER
};

const MIN_PLAYERS = 2;
const MAIN_INTERVAL = 2 * 60 * 1000;
const BREAK_INTERVAL = 60 * 1000;
let timer = 0;

const heartBeat = async (contract) => {
  const game = await contract.getGame({});
  const diffTime = (Date.now() - timer);
  console.log('beat', diffTime/1000, JSON.stringify(game));
  switch (game.state) {
    case OVER:
      if (diffTime >= BREAK_INTERVAL) {
        // the last player alive should be the winner
        const {id: shipId, owner_id: winnerId} = await contract.getLastWinner({});
        if (winnerId) {
          // get a screenshot
          await generateShip(parseInt(shipId));
          // upload to ipfs
          const cid = await upload(`./ss13k-${shipId}.gif`);
          // mint the nft
          await contract.nft_mint({
            args: {
              owner_id: ACCOUNT_ID,
              token_id: shipId,
              metadata: {
                title: `spaceship #${shipId}`,
                description: '',
                media: `https://cloudflare-ipfs.com/ipfs/${cid}/ss13k-${shipId}.gif`,
                media_hash: '',
                copies: '1',
                issued_at: '',
                expires_at: '',
                starts_at: '',
                updated_at: '',
                extra: `battle ${game.id}`,
                reference: '',
                reference_hash: ''
              }
            },
            gas: '300000000000000'
          });
          fs.unlink(`./ss13k-${shipId}.gif`, console.log);
          // finally transfer the nft - to be displayed in the wallet 
          await contract.nft_transfer({
            args: {receiver_id: winnerId, token_id: shipId, approval_id: '0', memo:''},
            gas: '300000000000000'
          });

          // remove the image from this directory

        }
        console.log('going to start a new game');
        await contract.newGame({args: {}, gas: '300000000000000'});
        await contract.addCredit({args:{}, gas: '300000000000000', amount: '100000000000000000000000'});
        await contract.joinGame({args:{}, gas: '300000000000000' });
        timer = Date.now();
      }
    break;
    case LOBBY:
      if (game.waitingPlayers >= MIN_PLAYERS && diffTime>=MAIN_INTERVAL) {
        console.log('the game is about to start');
        await contract.startGame({args:{}, gas: '300000000000000'});
        timer = Date.now();
      }
    break;
    case WAIT_PLAYERS:
      if (game.totalPlayers === game.playersReady || diffTime >= MAIN_INTERVAL) {
        console.log('executing new turn');
        await contract.solveTurn({args:{}, gas: '300000000000000'});
        timer = Date.now();
      }
    break;
  }
  setTimeout(() => {
    try {
      heartBeat(contract)
    } catch (e) {
      setTimeout(()=>heartBeat(contract), 15000);
    }
  }, 5000);
};

const main = async () => {
  const near = await connect(config);

  const account = await near.account(ACCOUNT_ID);
  const contract = new Contract(
    account,
    ACCOUNT_ID,
    {
      viewMethods: ['getGame', 'getLastWinner'],
      changeMethods: ['newGame', 'startGame', 'solveTurn', 'addCredit', 'joinGame', 'nft_mint', 'nft_transfer'],
      sender: account
    }
  );
  timer = Date.now();
  heartBeat(contract);
}

main();


