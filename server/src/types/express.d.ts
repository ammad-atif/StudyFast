import { IUser } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: IUser | null;
    }
  }
}

export {};
