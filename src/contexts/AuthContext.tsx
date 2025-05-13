
import React, { useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { AuthContext, User, UserRole } from "@/hooks/use-auth";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Mock users for demo purposes
  const mockUsers = [
    { id: "1", name: "Admin User", email: "admin@example.com", password: "password", role: "admin" as UserRole },
    { id: "2", name: "Donor User", email: "donor@example.com", password: "password", role: "donor" as UserRole },
    { id: "3", name: "Field Staff", email: "staff@example.com", password: "password", role: "field-staff" as UserRole }
  ];

  const login = async (email: string, password: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Find user with matching credentials
      const matchedUser = mockUsers.find(u => u.email === email && u.password === password);
      
      if (matchedUser) {
        const { password, ...userWithoutPassword } = matchedUser;
        setUser(userWithoutPassword as User);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userWithoutPassword.name}!`,
        });
        
        // Store in localStorage for persistence
        localStorage.setItem("qurbani-user", JSON.stringify(userWithoutPassword));
      } else {
        throw new Error("Invalid email or password");
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Check if user already exists
      if (mockUsers.some(u => u.email === email)) {
        throw new Error("Email already in use");
      }
      
      // Create new user (in a real app, this would be an API call)
      const newUser = {
        id: `${mockUsers.length + 1}`,
        name,
        email,
        role: "donor" as UserRole,
      };
      
      // In a real app, we'd store this in a database
      // For now, we'll just log it and set the user
      console.log("New user registered:", { ...newUser, password });
      setUser(newUser);
      
      toast({
        title: "Registration Successful",
        description: `Welcome, ${name}!`,
      });
      
      // Store in localStorage for persistence
      localStorage.setItem("qurbani-user", JSON.stringify(newUser));
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("qurbani-user");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  // Check if user is stored in localStorage on initial load
  React.useEffect(() => {
    const storedUser = localStorage.getItem("qurbani-user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("qurbani-user");
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
