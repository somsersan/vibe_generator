export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (name: string, email: string) => void;
  logout: () => void;
}

