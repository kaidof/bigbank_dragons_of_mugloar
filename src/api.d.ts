/**
 * API response definitions
 */

interface IGameResult {
  gameId: string;
  lives: number;
  gold: number;
  level: number;
  score: number;
  highScore: number;
  turn: number;
}

interface IMessage {
  adId: string;
  message: string;
  reward: number;
  expiresIn: number;
  probability: string;
  risk?: number;
}

interface IMessageSolveResult {
  success: boolean;
  lives: number;
  gold: number;
  score: number;
  highScore: number;
  turn: number;
}

interface IShopItem {
  id: string;
  name: string;
  cost: number;
  purchased?: number;
}

interface IPurchaseItemResult {
  shoppingSuccess: boolean;
  gold: number;
  lives: number;
  level: number;
  turn: number;
}
