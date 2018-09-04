'use strict';

const fetch = require('node-fetch');

const apiBaseUrl = 'https://www.dragonsofmugloar.com/api/v2';

// Game state
let state;
let hasPurchased = {};


/**
 * Get game data
 *
 * @return {Promise<IGameResult>}
 */
const getGame = async () => await fetch(`${apiBaseUrl}/game/start`, { method: 'POST' }).then(res => res.json());

/**
 * Get items in shop
 *
 * @return {Promise<IShopItem[]>}
 */
const shopItems = async () => {
  /** @param {IShopItem[]} list */
  let list = await fetch(`${apiBaseUrl}/${state.gameId}/shop`).then(res => res.json());

  return list
    .filter(i => i.cost <= state.gold)
    .map(/** @param {IShopItem} i */ i => {
      if (hasPurchased.hasOwnProperty(i.id)) {
        i['purchased'] = hasPurchased[i.id]
      } else {
        i['purchased'] = 0;
      }

      return i;
    })
    .sort((a, b) => {
      if (a.purchased === b.purchased) {
        return a.cost - b.cost;
      } else {
        return a.purchased - b.purchased;
      }
    })
};

/**
 * Solve message
 *
 * @param {string} adId
 * @return {Promise<boolean>|Promise<null>}
 */
const solveMessage = async (adId) => {
  /** @param {IMessageSolveResult} res */
  let res = await fetch(`${apiBaseUrl}/${state.gameId}/solve/${adId}`, { method: 'POST' }).then(res => res.json());

  // On error: 'No ad by this ID exists'
  if (res.hasOwnProperty('error')) {
    return null;
  }

  // Update state
  Object.assign(state, {
    lives: res.lives,
    gold: res.gold,
    score: res.score,
    turn: res.turn,
  });

  return res.success;
};

/**
 * Get messages
 *
 * @param {number} risk
 * @return {Promise<IMessage[]>}
 */
const fetchMessages = async (risk) => {
  try {
    /** @ param {IMessage[]} list */
    let list = await fetch(`${apiBaseUrl}/${state.gameId}/messages`).then(res => res.json());

    // Sort list by solving probability (asc) and reward (desc)
    return list.map(msg => {
      switch (msg.probability) {
        case 'Piece of cake':
          msg.risk = 0;
          break;
        case 'Walk in the park':
          msg.risk = 1;
          break;
        case 'Sure thing':
          msg.risk = 2;
          break;
        case 'Quite likely':
          msg.risk = 3;
          break;
        case 'Hmmm....':
          msg.risk = 4;
          break;
        case 'Gamble':
          msg.risk = 5;
          break;
        case 'Playing with fire':
          msg.risk = 6;
          break;
        case 'Rather detrimental':
          msg.risk = 7;
          break;
        case 'Suicide mission':
          msg.risk = 8;
          break;
        default:
          msg.risk = 9;
      }

      return msg;
    }).sort((a, b) => {
      if (a.risk === b.risk) {
        return b.reward - a.reward;
      } else {
        return a.risk - b.risk;
      }
    }).filter(msg => msg.risk <= risk)
  } catch (e) {
    console.error('f_E', e);
  }

  console.log('fetchMessages NULL');

  return null;
};

/**
 * Purchase item
 *
 * @param {IShopItem} item
 * @return {Promise<*>}
 */
const purchaseItem = async (item) => {
  console.log(` Purchase - ${item.name}`);
  try {
    /** @param {IPurchaseItemResult} res */
    let res = await fetch(`${apiBaseUrl}/${state.gameId}/shop/buy/${item.id}`, { method: 'POST' }).then(res => res.json());

    // Update state
    Object.assign(state, {
      lives: res.lives,
      gold: res.gold,
      turn: res.turn,
    });

    if (res.shoppingSuccess) {
      // Increase counter
      if (hasPurchased.hasOwnProperty(item.id)) {
        hasPurchased[item.id]++;
      } else {
        hasPurchased[item.id] = 1;
      }
    }

    return res.shoppingSuccess;
  } catch (e) {}

  return false;
};

/**
 * Solve message list
 *
 * @param {Array} list
 * @return {Promise<void>}
 */
const solveMessageList = (list) => {
  return new Promise(async (resolve, reject) => {
    for (let i in list) {
      try {
        let success = await solveMessage(list[i].adId);
        if (!success && success !== null) {
          // fetch new list if live lost, ignore API error
          return reject();
        }
      } catch (e) {
        // ignore API errors, like 503 - Service Unavailable
      }
    }

    resolve();
  });
};


/**
 * Game loop
 *
 * @return {Promise<IGameResult>}
 */
const start = async () => {

  // Initialize empty state
  state = {
    gameId: null,
    lives: 0,
    gold: 0,
    level: 0,
    score: 0,
    highScore: 0,
    turn: 0,
  };

  hasPurchased = {};
  let loopCount = 0;
  let risk = 3;

  // Start new game
  let game = await getGame();

  // Game state
  Object.assign(state, game);

  console.log(`\nStart game... ${state.gameId}`);

  // Game main loop
  do {
    console.log(`Fetch new messages... [${loopCount}]`);
    let messages = await fetchMessages(risk);

    // if no messages then increase risk level
    if (messages && !messages.length) {
      if (risk < 10) {
        risk++;

        console.log(`Increase risk level to ${risk}`);
      }
    }

    // Solve message list
    try {
      await solveMessageList(messages);
    } catch (e) {}

    let healing = true;
    let buyIndex = 0;
    let itemList;

    // Buy items loop
    do {
      itemList = await shopItems();
      if (itemList) {
        // Buy [hpot] once in buy loop or if lives below 5
        let hPot = itemList.find(i => i.id === 'hpot');
        if (hPot && hPot[0] && (state.lives < 5 || healing)) {
          await purchaseItem(hPot[0]);
          healing = false;
        } else {
          // Buy other things
          if (typeof itemList[buyIndex] !== "undefined") {
            await purchaseItem(itemList[buyIndex]);
          } else {
            // try to buy another [hpot] if possible
            let hPot = itemList.find(i => i.id === 'hpot');
            if (hPot && hPot[0] && state.gold >= hPot[0].cost) {
              await purchaseItem(hPot[0]);
            }

            // exit loop if no items to buy
            break;
          }
        }
      }

      buyIndex++;
    } while (itemList);

    loopCount++;
  } while (state.lives > 0);

  return state;
};



module.exports = {
  start,
};
