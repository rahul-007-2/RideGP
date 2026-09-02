import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signOut = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  const signIn = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
