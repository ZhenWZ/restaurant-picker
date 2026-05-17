export type UserRole = "user" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  role: UserRole;
  loginMethod: string | null;
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string | null;
};

export type Restaurant = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  emoji: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RestaurantWithRating = Restaurant & {
  rating: {
    average: number;
    count: number;
  };
};

export type Rating = {
  id: number;
  userId: string;
  restaurantId: number;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlacklistEntry = {
  id: number;
  userId: string;
  restaurantId: number;
  createdAt: string;
};

export type PickResult = Pick<
  Restaurant,
  "id" | "name" | "description" | "category" | "emoji"
>;

export * from "./_core/errors";
