import { createContext, useContext, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UserContextType {
  phoneNumber: string | null;
  name: string | null;
  isIdentified: boolean;
}

const UserContext = createContext<UserContextType>({ phoneNumber: null, name: null, isIdentified: false });

export function UserProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const phoneNumber = searchParams.get('phoneNumber');
  const name = searchParams.get('name');

  return (
    <UserContext.Provider value={{ phoneNumber, name, isIdentified: !!(phoneNumber && name) }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
