
import React, { createContext, useContext, useState, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";

export type AnimalType = "goat" | "sheep" | "cow" | "camel";
export type OrderStatus = 
  | "pending" 
  | "payment-confirmed" 
  | "animal-assigned" 
  | "scheduled" 
  | "slaughtered" 
  | "processed" 
  | "distributed" 
  | "completed";

export interface Animal {
  id: string;
  type: AnimalType;
  location: string;
  status: "available" | "assigned" | "processed";
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  animalType: AnimalType;
  quantity: number;
  onBehalfOf: string[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  animalId?: string;
  trackingUpdates: {
    status: OrderStatus;
    timestamp: Date;
    updatedBy?: string;
    notes?: string;
  }[];
}

interface OrderContextType {
  orders: Order[];
  animals: Animal[];
  createOrder: (orderData: Omit<Order, "id" | "status" | "createdAt" | "trackingUpdates">) => Promise<Order>;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByUserId: (userId: string) => Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<void>;
  assignAnimalToOrder: (orderId: string, animalId: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "ord-001",
      userId: "2",
      userName: "Donor User",
      animalType: "goat",
      quantity: 1,
      onBehalfOf: ["Ahmed Ali"],
      totalAmount: 250,
      status: "payment-confirmed",
      createdAt: new Date(2023, 5, 10),
      trackingUpdates: [
        { status: "pending", timestamp: new Date(2023, 5, 10) },
        { status: "payment-confirmed", timestamp: new Date(2023, 5, 11) }
      ]
    },
    {
      id: "ord-002",
      userId: "2",
      userName: "Donor User",
      animalType: "cow",
      quantity: 1/7, // 1/7th share in a cow
      onBehalfOf: ["Fatima Khan"],
      totalAmount: 350,
      status: "animal-assigned",
      createdAt: new Date(2023, 5, 12),
      animalId: "ani-002",
      trackingUpdates: [
        { status: "pending", timestamp: new Date(2023, 5, 12) },
        { status: "payment-confirmed", timestamp: new Date(2023, 5, 12) },
        { status: "animal-assigned", timestamp: new Date(2023, 5, 14) }
      ]
    }
  ]);
  
  const [animals, setAnimals] = useState<Animal[]>([
    { id: "ani-001", type: "goat", location: "Karachi", status: "available" },
    { id: "ani-002", type: "cow", location: "Lahore", status: "assigned" },
    { id: "ani-003", type: "sheep", location: "Islamabad", status: "available" },
  ]);
  
  const { toast } = useToast();

  const createOrder = async (orderData: Omit<Order, "id" | "status" | "createdAt" | "trackingUpdates">) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      status: "pending",
      createdAt: new Date(),
      trackingUpdates: [{ status: "pending", timestamp: new Date() }]
    };
    
    setOrders(prev => [...prev, newOrder]);
    
    toast({
      title: "Order Created",
      description: `Order #${newOrder.id} has been successfully created.`,
    });
    
    return newOrder;
  };

  const getOrderById = (id: string) => {
    return orders.find(order => order.id === id);
  };

  const getOrdersByUserId = (userId: string) => {
    return orders.filter(order => order.userId === userId);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, notes?: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status,
          trackingUpdates: [
            ...order.trackingUpdates,
            { status, timestamp: new Date(), notes }
          ]
        };
      }
      return order;
    }));
    
    toast({
      title: "Status Updated",
      description: `Order #${orderId} has been updated to ${status.replace('-', ' ')}.`,
    });
  };

  const assignAnimalToOrder = async (orderId: string, animalId: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const animal = animals.find(a => a.id === animalId);
    
    if (!animal) {
      toast({
        title: "Error",
        description: "Animal not found.",
        variant: "destructive",
      });
      return;
    }
    
    if (animal.status !== "available") {
      toast({
        title: "Error",
        description: "This animal is not available for assignment.",
        variant: "destructive",
      });
      return;
    }
    
    // Update animal status
    setAnimals(prev => prev.map(a => {
      if (a.id === animalId) {
        return { ...a, status: "assigned" };
      }
      return a;
    }));
    
    // Update order with animal assignment
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          animalId,
          status: "animal-assigned",
          trackingUpdates: [
            ...order.trackingUpdates,
            { 
              status: "animal-assigned", 
              timestamp: new Date(), 
              notes: `Assigned ${animal.type} (ID: ${animalId})`
            }
          ]
        };
      }
      return order;
    }));
    
    toast({
      title: "Animal Assigned",
      description: `${animal.type.charAt(0).toUpperCase() + animal.type.slice(1)} has been assigned to order #${orderId}.`,
    });
  };

  return (
    <OrderContext.Provider value={{ 
      orders, 
      animals, 
      createOrder, 
      getOrderById, 
      getOrdersByUserId, 
      updateOrderStatus,
      assignAnimalToOrder 
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
};
